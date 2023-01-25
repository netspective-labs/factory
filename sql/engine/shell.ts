import * as path from "https://deno.land/std@0.147.0/path/mod.ts";
import { events } from "../deps.ts";
import * as safety from "../../safety/mod.ts";
import * as SQLa from "../render/mod.ts";
import * as ex from "../execute/mod.ts";
import * as eng from "./engine.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export interface SqlRunCmdOptionsSupplier {
  (
    SQL: string,
    resultNature: "rows" | "records",
  ): Deno.RunOptions;
}

export interface SqlCmdExecResult {
  readonly status: Deno.ProcessStatus;
}

export interface SqlCmdSuccessResult extends SqlCmdExecResult {
  readonly stdOut: string;
  readonly json: <TypedResult = unknown>() => TypedResult;
}

export const isSqlCmdSuccessful = safety.typeGuard<SqlCmdSuccessResult>(
  "stdOut",
);

export interface SqlCmdFailureResult extends SqlCmdExecResult {
  readonly stdErr: string;
}

export const isSqlCmdFailure = safety.typeGuard<SqlCmdFailureResult>(
  "stdErr",
);

export class SqlShellCmdEventEmitter<Context extends SQLa.SqlEmitContext>
  extends events.EventEmitter<{
    executedDQL(
      result:
        | ex.QueryExecutionRowsSupplier<Any, Context>
        | ex.QueryExecutionRecordSupplier<Any, Context>
        | ex.QueryExecutionRecordsSupplier<Any, Context>,
    ): void;
  }> {
}

export interface SqlShellCmdInit<Context extends SQLa.SqlEmitContext> {
  readonly identity: string;
  readonly prepareExecuteSqlCmd: SqlRunCmdOptionsSupplier;
  readonly prepareEE?: (
    suggested: SqlShellCmdEventEmitter<Context>,
  ) => SqlShellCmdEventEmitter<Context>;
}

export type SqlShellCmdsEngine = eng.SqlEngine;

export async function executeShellCmd<TypedResult = unknown>(
  runOptsSupplier: () => Deno.RunOptions,
  onCmdFail: (
    status: Deno.ProcessStatus,
    stdErr: string,
    // deno-lint-ignore require-await
  ) => Promise<SqlCmdSuccessResult | SqlCmdFailureResult> = async (
    status,
    stdErr,
  ) => ({ status, stdErr }),
): Promise<SqlCmdSuccessResult | SqlCmdFailureResult> {
  let result: SqlCmdSuccessResult | SqlCmdFailureResult;
  const cmd = Deno.run(runOptsSupplier());

  // see https://github.com/denoland/deno/issues/4568 why this is necessary
  const [stdErrRaw, stdOutRaw, status] = await Promise.all([
    cmd.stderrOutput(),
    cmd.output(),
    cmd.status(),
  ]);
  if (status.success) {
    const stdOut = new TextDecoder().decode(stdOutRaw);
    result = {
      status,
      stdOut,
      json: <JsonResult = TypedResult>() => (JSON.parse(stdOut) as JsonResult),
    };
  } else {
    const stdErr = new TextDecoder().decode(stdErrRaw);
    result = await onCmdFail(status, stdErr);
  }
  cmd.close();
  return result;
}

export function sqlShellCmdRowsExecutor<Context extends SQLa.SqlEmitContext>(
  prepareExecuteSqlCmd: SqlRunCmdOptionsSupplier,
) {
  const result: ex.QueryRowsExecutor<Context> = async <Row extends ex.SqlRow>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRowsExecutorOptions<Row, Context>,
  ): Promise<ex.QueryExecutionRowsSupplier<Row, Context>> => {
    // a "proxy" can be a local cache or any other store
    if (options?.proxy) {
      const proxy = await options?.proxy();
      if (proxy) return proxy;
    }

    let result: ex.QueryExecutionRowsSupplier<Row, Context>;
    try {
      const shellCmdResult = await executeShellCmd(
        () => prepareExecuteSqlCmd(query.SQL(ctx), "rows"),
      );
      if (isSqlCmdSuccessful(shellCmdResult)) {
        result = { query, rows: shellCmdResult.json<Array<Row>>() };
      } else {
        result = { query, rows: [], error: new Error(shellCmdResult.stdErr) };
      }
    } catch (error) {
      result = { query, rows: [], error };
    }

    // "enriching" can be a transformation function, cache store, etc.
    const { enrich } = options ?? {};
    return enrich ? enrich(result) : result;
  };
  return result;
}

export function sqlShellCmdRecordsExecutor<Context extends SQLa.SqlEmitContext>(
  prepareExecuteSqlCmd: SqlRunCmdOptionsSupplier,
) {
  const result: ex.QueryRecordsExecutor<Context> = async <
    Object extends ex.SqlRecord,
  >(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRecordsExecutorOptions<Object, Context>,
  ): Promise<ex.QueryExecutionRecordsSupplier<Object, Context>> => {
    // a "proxy" can be a local cache or any other store
    if (options?.proxy) {
      const proxy = await options?.proxy();
      if (proxy) return proxy;
    }

    let result: ex.QueryExecutionRecordsSupplier<Object, Context>;
    try {
      const shellCmdResult = await executeShellCmd(
        () => prepareExecuteSqlCmd(query.SQL(ctx), "rows"),
      );
      if (isSqlCmdSuccessful(shellCmdResult)) {
        result = { query, records: shellCmdResult.json<Array<Object>>() };
      } else {
        result = {
          query,
          records: [],
          error: new Error(shellCmdResult.stdErr),
        };
      }
    } catch (error) {
      result = { query, records: [], error };
    }

    // "enriching" can be a transformation function, cache store, etc.
    const { enrich } = options ?? {};
    return enrich ? enrich(result) : result;
  };
  return result;
}

export class SqlShellCmdExecutive<Context extends SQLa.SqlEmitContext>
  implements
    eng.SqlEngineInstance<SqlShellCmdsEngine>,
    eng.SqlReadRecordsConn<
      SqlShellCmdsEngine,
      SqlShellCmdExecutive<Context>,
      Context
    > {
  readonly identity: string;
  readonly prepareExecuteSqlCmd: SqlRunCmdOptionsSupplier;
  readonly fsspEE: SqlShellCmdEventEmitter<Context>;
  readonly rowsExec: ex.QueryRowsExecutor<Context>;
  readonly recordsExec: ex.QueryRecordsExecutor<Context>;

  constructor(readonly ssCI: SqlShellCmdInit<Context>) {
    this.identity = ssCI.identity;
    this.prepareExecuteSqlCmd = ssCI.prepareExecuteSqlCmd;

    const sqlELCEE = new SqlShellCmdEventEmitter<Context>();
    this.fsspEE = ssCI.prepareEE?.(sqlELCEE) ?? sqlELCEE;

    this.rowsExec = sqlShellCmdRowsExecutor(this.prepareExecuteSqlCmd);
    this.recordsExec = sqlShellCmdRecordsExecutor(this.prepareExecuteSqlCmd);
  }

  async recordsDQL<Object extends ex.SqlRecord>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRecordsExecutorOptions<Object, Context>,
  ): Promise<ex.QueryExecutionRecordsSupplier<Object, Context>> {
    const result = await this.recordsExec<Object>(ctx, query, options);
    this.fsspEE.emit("executedDQL", result);
    return result;
  }

  async firstRecordDQL<Object extends ex.SqlRecord>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?:
      & ex.QueryRecordsExecutorOptions<Object, Context>
      & {
        readonly onNotFound?: () => Promise<
          | ex.QueryExecutionRecordSupplier<Object, Context>
          | undefined
        >;
        readonly autoLimitSQL?: (
          SQL: SQLa.SqlTextSupplier<Context>,
        ) => SQLa.SqlTextSupplier<Context>;
      },
  ): Promise<ex.QueryExecutionRecordSupplier<Object, Context> | undefined> {
    const result = await ex.firstRecordDQL(
      ctx,
      query,
      this.recordsExec,
      {
        reportRecordsDQL: async (result) => {
          await this.fsspEE.emit("executedDQL", result);
        },
        ...options,
      },
    );
    return result;
  }
}

export class FileSysQueryCmdExecutive<Context extends SQLa.SqlEmitContext>
  extends SqlShellCmdExecutive<Context>
  implements
    eng.SqlReflectConn<
      SqlShellCmdsEngine,
      FileSysQueryCmdExecutive<Context>,
      Context
    > {
  static firstWordRegEx = /^\s*([a-zA-Z0-9]+)/;
  readonly felectCmdPath: string;
  readonly reflectPathsAsTables?: Iterable<string>;
  constructor(
    ssCI?: Partial<Omit<SqlShellCmdInit<Context>, "prepareExecuteSqlCmd">> & {
      readonly felectCmdPath?: string;
      readonly reflectPathsAsTables?: Iterable<string>;
    },
  ) {
    const identity = ssCI?.identity ?? `osQueryi`;
    const felectCmdPath = ssCI?.felectCmdPath ??
      Deno.env.get("RF_SQL_SHELL_FSELECT_LOCATION") ??
      path.join(
        path.dirname(path.fromFileUrl(import.meta.url)),
        "..",
        "shell",
        "bin",
        "fselect",
      );
    super({
      identity,
      prepareExecuteSqlCmd: (suppliedSQL) => {
        // https://github.com/jhspetersson/fselect
        // fselect does not support comments
        let SQL = suppliedSQL.replaceAll(/\-\-.*$/mg, " ");
        // fselect does not like line breaks between SQL tokens
        SQL = SQL.replaceAll(/(\r\n|\r|\n)/mg, " ");
        // fselect does not start with "select" SQL, it goes straight into columns
        const firstWordMatch = SQL.match(
          FileSysQueryCmdExecutive.firstWordRegEx,
        );
        if (firstWordMatch && firstWordMatch.length > 1) {
          if (firstWordMatch[1].toUpperCase() == "SELECT") {
            SQL = SQL.replace(FileSysQueryCmdExecutive.firstWordRegEx, "");
          }
        }
        return {
          cmd: [felectCmdPath, SQL, "into", "json"],
          stdout: "piped",
          stderr: "piped",
        };
      },
    });
    this.felectCmdPath = felectCmdPath;
    this.reflectPathsAsTables = ssCI?.reflectPathsAsTables;
  }

  // deno-lint-ignore require-await
  async reflectDomains<DomainID extends string = "UNTYPED">(
    _ctx: Context,
  ): Promise<
    Map<DomainID, (nullable?: boolean) => SQLa.AxiomSqlDomain<Any, Context>>
  > {
    return SQLa.typicalDomainFromTextFactory<DomainID, Context>(
      "UNTYPED" as DomainID,
    );
  }

  table<TableName extends string>(pathTableName: TableName) {
    // use `fselect --help` at the command line to see all the columns supported
    // TODO: for now, everything is untyped but needs to be typed properly
    return SQLa.tableDefinition(pathTableName, {
      name: SQLa.untypedNullable(),
      extension: SQLa.untypedNullable(),
      path: SQLa.untypedNullable(),
      abspath: SQLa.untypedNullable(),
      directory: SQLa.untypedNullable(),
      absdir: SQLa.untypedNullable(),
      size: SQLa.untypedNullable(),
      fsize: SQLa.untypedNullable(),
      accessed: SQLa.untypedNullable(),
      created: SQLa.untypedNullable(),
      modified: SQLa.untypedNullable(),
      user: SQLa.untypedNullable(),
      group: SQLa.untypedNullable(),
      mime: SQLa.untypedNullable(),
      is_binary: SQLa.untypedNullable(),
      is_text: SQLa.untypedNullable(),
      is_image: SQLa.untypedNullable(),
      line_count: SQLa.untypedNullable(),
      sha1: SQLa.untypedNullable(),
      sha2_256: SQLa.untypedNullable(),
      sha2_512: SQLa.untypedNullable(),
      sha3_512: SQLa.untypedNullable(),
    });
  }

  async *reflectTables<TableName extends string>(
    _ctx: Context,
    options?: {
      readonly filter?: { readonly tableName?: (name: string) => boolean };
    },
  ): AsyncGenerator<
    & SQLa.TableDefinition<TableName, Context>
    & SQLa.SqlDomainsSupplier<Context>
  > {
    const { filter } = options ?? {};
    if (this.reflectPathsAsTables) {
      for (const pathTableName of this.reflectPathsAsTables) {
        if (filter?.tableName && !filter.tableName(pathTableName)) continue;
        yield this.table(pathTableName as TableName);
      }
    }
  }
}

export class GitQueryCmdExecutive<Context extends SQLa.SqlEmitContext>
  extends SqlShellCmdExecutive<Context>
  implements
    eng.SqlReflectConn<
      SqlShellCmdsEngine,
      GitQueryCmdExecutive<Context>,
      Context
    > {
  constructor(
    ssCI?: Partial<Omit<SqlShellCmdInit<Context>, "prepareExecuteSqlCmd">> & {
      readonly mergeStatCmdPath?: string;
    },
  ) {
    const identity = ssCI?.identity ?? `mergestat`;
    const mergeStatCmdPath = ssCI?.mergeStatCmdPath ??
      Deno.env.get("RF_SQL_SHELL_MERGESTAT_LOCATION") ??
      path.join(
        path.dirname(path.fromFileUrl(import.meta.url)),
        "..",
        "shell",
        "bin",
        "mergestat",
      );
    super({
      identity,
      prepareExecuteSqlCmd: (SQL) => {
        return {
          cmd: [mergeStatCmdPath, "-f", "json", SQL],
          stdout: "piped",
          stderr: "piped",
        };
      },
    });
  }

  // deno-lint-ignore require-await
  async reflectDomains<DomainID extends string = "UNTYPED">(
    _ctx: Context,
  ): Promise<
    Map<DomainID, (nullable?: boolean) => SQLa.AxiomSqlDomain<Any, Context>>
  > {
    return SQLa.typicalDomainFromTextFactory<DomainID, Context>(
      "UNTYPED" as DomainID,
    );
  }

  tables() {
    // TODO: for now, everything is untyped but needs to be typed properly
    return {
      commits: SQLa.tableDefinition("commits", {
        hash: SQLa.untypedNullable(),
        date: SQLa.untypedNullable(),
        author_name: SQLa.untypedNullable(),
        author_email: SQLa.untypedNullable(),
        author_when: SQLa.untypedNullable(),
        committer_name: SQLa.untypedNullable(),
        committer_email: SQLa.untypedNullable(),
        committer_when: SQLa.untypedNullable(),
        message: SQLa.untypedNullable(),
        parents: SQLa.untypedNullable(),
      }),
      refs: SQLa.tableDefinition("refs", {
        hash: SQLa.untypedNullable(),
        name: SQLa.untypedNullable(),
        full_name: SQLa.untypedNullable(),
        type: SQLa.untypedNullable(),
        remote: SQLa.untypedNullable(),
        target: SQLa.untypedNullable(),
      }),
      stats: SQLa.tableDefinition("stats", {
        file_path: SQLa.untypedNullable(),
        additions: SQLa.untypedNullable(),
        deletions: SQLa.untypedNullable(),
      }),
      files: SQLa.tableDefinition("files", {
        path: SQLa.untypedNullable(),
        executable: SQLa.untypedNullable(),
        content: SQLa.untypedNullable(),
      }),
    };
  }

  async *reflectTables<
    TableName extends string = "commits" | "refs" | "stats" | "files",
  >(
    _ctx: Context,
    options?: {
      readonly filter?: { readonly tableName?: (name: string) => boolean };
    },
  ): AsyncGenerator<
    & SQLa.TableDefinition<TableName, Context>
    & SQLa.SqlDomainsSupplier<Context>
  > {
    const { filter } = options ?? {};
    const tables = this.tables();
    for (const td of Object.values(tables)) {
      if (filter?.tableName && !filter.tableName(td.tableName)) {
        continue;
      }
      yield td as unknown as (
        & SQLa.TableDefinition<TableName, Context>
        & SQLa.SqlDomainsSupplier<Context>
      );
    }
  }
}
