import * as path from "https://deno.land/std@0.147.0/path/mod.ts";
import { events } from "../deps.ts";
import * as SQLa from "../render/mod.ts";
import * as ex from "../execute/mod.ts";
import * as eng from "./engine.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export class FileSysSqlProxyEventEmitter<Context extends SQLa.SqlEmitContext>
  extends events.EventEmitter<{
    executedDQL(
      result:
        | ex.QueryExecutionRowsSupplier<Any, Context>
        | ex.QueryExecutionRecordSupplier<Any, Context>
        | ex.QueryExecutionRecordsSupplier<Any, Context>,
    ): void;
    persistedExecutedRows(
      ctx: Context,
      rows: ex.QueryExecutionRowsSupplier<Any, Context>,
      fsPath: string,
    ): void;
    persistedExecutedRecords(
      ctx: Context,
      records: ex.QueryExecutionRecordsSupplier<Any, Context>,
      fsPath: string,
    ): void;
  }> {
}

export interface FileSysSqlProxyInit<Context extends SQLa.SqlEmitContext> {
  readonly resultsStoreHome: (
    exec?: {
      readonly ctx: Context;
      readonly query: ex.SqlBindParamsTextSupplier<Context>;
    },
  ) => string;
  readonly onResultsStoreHomeStatError?: (home: string, err: Error) => void;
  readonly prepareEE?: (
    suggested: FileSysSqlProxyEventEmitter<Context>,
  ) => FileSysSqlProxyEventEmitter<Context>;
  readonly reviveQueryExecRows?: (
    fsJsonPath: string,
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
  ) => Promise<
    ex.QueryExecutionRowsSupplier<Any, Context> & ex.RevivableQueryExecution
  >;
  readonly reviveQueryExecRecords?: (
    fsJsonPath: string,
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
  ) => Promise<
    ex.QueryExecutionRecordsSupplier<Any, Context> & ex.RevivableQueryExecution
  >;
}

export type FileSysSqlProxyEngine = eng.SqlEngine;

export function fileSysSqlProxyEngine<Context extends SQLa.SqlEmitContext>() {
  const instances = new Map<string, FileSysSqlProxy<Context>>();
  const result: FileSysSqlProxyEngine = {
    identity: "File System Proxy SQL Engine",
  };
  return {
    ...result,
    fsProxy: (rssPI: FileSysSqlProxyInit<Context>) => {
      const home = rssPI.resultsStoreHome();
      let instance = instances.get(home);
      if (!instance) {
        instance = new FileSysSqlProxy(rssPI);
        instances.set(home, instance);
      }
      return instance;
    },
    canonicalFsProxy: (
      fsProxy: FileSysSqlProxy<Context>,
      canonicalSupplier: () =>
        | eng.SqlReadRowsConn<Any, Any, Context> // when canonical is available
        | eng.SqlReadRecordsConn<Any, Any, Context> // when canonical is available
        | undefined, // in case canonical is not available,
      identity = fsProxy.identity,
    ) => {
      return new CanonicalFileSysSqlProxy(fsProxy, canonicalSupplier, identity);
    },
  };
}

async function reviveQueryExecFsRows<Context extends SQLa.SqlEmitContext>(
  fsJsonPath: string,
  _ctx: Context,
  query: ex.SqlBindParamsTextSupplier<Context>,
): Promise<
  ex.QueryExecutionRowsSupplier<Any, Context> & ex.RevivableQueryExecution
> {
  try {
    const json = await Deno.readTextFile(fsJsonPath);
    const result:
      & ex.QueryExecutionRowsSupplier<Any, Context>
      & ex.RevivedQueryExecution = {
        ...JSON.parse(json, (key, value) => {
          // assume the query we stored is the same one calling this function so
          // replace it at revival-time
          if (key == "query") return query;
          return value;
        }),
        revivedAt: new Date(),
        revivedFromFsPath: fsJsonPath,
      };
    return result;
  } catch (error) {
    const result:
      & ex.QueryExecutionRowsSupplier<Any, Context>
      & ex.UnrevivableQueryExecution = {
        query,
        error,
        rows: [],
        expiresInMS: "never",
        isUnrevivableQueryExecution: true,
        reason: "exception",
        serializedAt: new Date(),
        fsJsonPath,
      };
    return result;
  }
}

async function reviveQueryExecFsRecords<Context extends SQLa.SqlEmitContext>(
  fsJsonPath: string,
  _ctx: Context,
  query: ex.SqlBindParamsTextSupplier<Context>,
): Promise<
  ex.QueryExecutionRecordsSupplier<Any, Context> & ex.RevivableQueryExecution
> {
  try {
    const json = await Deno.readTextFile(fsJsonPath);
    const result:
      & ex.QueryExecutionRecordsSupplier<Any, Context>
      & ex.RevivedQueryExecution = {
        ...JSON.parse(json, (key, value) => {
          // assume the query we stored is the same one calling this function so
          // replace it at revival-time
          if (key == "query") return query;
          return value;
        }),
        revivedAt: new Date(),
        revivedFromFsPath: fsJsonPath,
      };
    return result;
  } catch (error) {
    const result:
      & ex.QueryExecutionRecordsSupplier<Any, Context>
      & ex.UnrevivableQueryExecution = {
        query,
        error,
        records: [],
        expiresInMS: "never",
        isUnrevivableQueryExecution: true,
        reason: "exception",
        serializedAt: new Date(),
        fsJsonPath,
      };
    return result;
  }
}

export function fsSqlProxyRowsExecutor<Context extends SQLa.SqlEmitContext>(
  fsRevivedJsonSupplier: <Row extends ex.SqlRow>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
  ) => Promise<ex.QueryExecutionRowsSupplier<Row, Context>>,
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
      result = await fsRevivedJsonSupplier(ctx, query);
    } catch (error) {
      result = { query, rows: [], error };
    }

    // "enriching" can be a transformation function, cache store, etc.
    const { enrich } = options ?? {};
    return enrich ? enrich(result) : result;
  };
  return result;
}

export function fsSqlProxyRecordsExecutor<Context extends SQLa.SqlEmitContext>(
  fsRevivedJsonSupplier: <Object extends ex.SqlRecord>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
  ) => Promise<ex.QueryExecutionRecordsSupplier<Object, Context>>,
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
      result = await fsRevivedJsonSupplier(ctx, query);
    } catch (error) {
      result = { query, records: [], error };
    }

    // "enriching" can be a transformation function, cache store, etc.
    const { enrich } = options ?? {};
    return enrich ? enrich(result) : result;
  };
  return result;
}

export class FileSysSqlProxy<Context extends SQLa.SqlEmitContext>
  implements
    eng.SqlEngineInstance<FileSysSqlProxyEngine>,
    eng.SqlReadRowsConn<
      FileSysSqlProxyEngine,
      FileSysSqlProxy<Context>,
      Context
    >,
    eng.SqlReadRecordsConn<
      FileSysSqlProxyEngine,
      FileSysSqlProxy<Context>,
      Context
    >,
    ex.QueryExecutionProxyStore<Context> {
  readonly identity: string;
  readonly resultsStoreHome: string;
  readonly fsspEE: FileSysSqlProxyEventEmitter<Context>;
  readonly rowsExec: ex.QueryRowsExecutor<Context>;
  readonly recordsExec: ex.QueryRecordsExecutor<Context>;

  constructor(readonly fsqEI: FileSysSqlProxyInit<Context>) {
    this.resultsStoreHome = fsqEI.resultsStoreHome();
    try {
      const stat = Deno.statSync(this.resultsStoreHome);
      if (!stat.isDirectory) {
        throw new Error(
          `${this.resultsStoreHome} is not a directory, FileSysSqlProxy is not properly configured`,
        );
      }
    } catch (err) {
      if (fsqEI.onResultsStoreHomeStatError) {
        fsqEI.onResultsStoreHomeStatError(this.resultsStoreHome, err);
      } else {
        throw err;
      }
    }
    this.identity = `FileSysSQL::${this.resultsStoreHome}`;

    const sqlELCEE = new FileSysSqlProxyEventEmitter<Context>();
    this.fsspEE = fsqEI.prepareEE?.(sqlELCEE) ?? sqlELCEE;

    this.rowsExec = fsSqlProxyRowsExecutor(async (ctx, query) => {
      return this.reviveQueryExecRows(
        path.join(
          fsqEI.resultsStoreHome({ ctx, query }),
          (await ex.sqlQueryIdentity(query, ctx)) + ".rows.fsp.json",
        ),
        ctx,
        query,
      );
    });
    this.recordsExec = fsSqlProxyRecordsExecutor(async (ctx, query) => {
      return this.reviveQueryExecRecords(
        path.join(
          fsqEI.resultsStoreHome({ ctx, query }),
          (await ex.sqlQueryIdentity(query, ctx)) + ".records.fsp.json",
        ),
        ctx,
        query,
      );
    });
  }

  async reviveQueryExecRows(
    fsJsonPath: string,
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
  ): Promise<ex.QueryExecutionRowsSupplier<Any, Context>> {
    if (this.fsqEI.reviveQueryExecRows) {
      return await this.fsqEI.reviveQueryExecRows(fsJsonPath, ctx, query);
    }
    return await reviveQueryExecFsRows(fsJsonPath, ctx, query);
  }

  async reviveQueryExecRecords(
    fsJsonPath: string,
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
  ): Promise<ex.QueryExecutionRecordsSupplier<Any, Context>> {
    if (this.fsqEI.reviveQueryExecRecords) {
      return await this.fsqEI.reviveQueryExecRecords(fsJsonPath, ctx, query);
    }
    return await reviveQueryExecFsRecords(fsJsonPath, ctx, query);
  }

  stringifyQueryExecResult(
    ctx: Context,
    qers:
      | ex.QueryExecutionRowsSupplier<Any, Context>
      | ex.QueryExecutionRecordsSupplier<Any, Context>,
    options?: {
      readonly expiresInMS?: ex.RevivableQueryExecExpirationMS;
    },
  ) {
    const serializable: ex.RevivableQueryExecution = {
      ...qers,
      expiresInMS: options?.expiresInMS ?? "never",
      serializedAt: new Date(),
    };
    return JSON.stringify(serializable, (key, value) => {
      // if a value has the signature SQL(ctx) assume it's SQL and we need to
      // store the SQL text not a function; when it's revived the original SQL
      // function will be restored
      if (key == "SQL" && typeof value === "function") return value(ctx);
      return value;
    });
  }

  async persistExecutedRows<Row extends ex.SqlRow>(
    ctx: Context,
    qers: ex.QueryExecutionRowsSupplier<Row, Context>,
    options?: {
      readonly expiresInMS?: ex.RevivableQueryExecExpirationMS;
    },
  ) {
    const fsPath = path.join(
      this.fsqEI.resultsStoreHome({ ctx, query: qers.query }),
      (await ex.sqlQueryIdentity(qers.query, ctx)) + ".rows.fsp.json",
    );
    await Deno.writeTextFile(
      fsPath,
      this.stringifyQueryExecResult(ctx, qers, options),
    );
    await this.fsspEE.emit("persistedExecutedRows", ctx, qers, fsPath);
    return qers;
  }

  async persistExecutedRecords<Object extends ex.SqlRecord>(
    ctx: Context,
    qers: ex.QueryExecutionRecordsSupplier<Object, Context>,
    options?: {
      readonly expiresInMS?: ex.RevivableQueryExecExpirationMS;
    },
  ) {
    const fsPath = path.join(
      this.fsqEI.resultsStoreHome({ ctx, query: qers.query }),
      (await ex.sqlQueryIdentity(qers.query, ctx)) + ".records.fsp.json",
    );
    await Deno.writeTextFile(
      fsPath,
      this.stringifyQueryExecResult(ctx, qers, options),
    );
    await this.fsspEE.emit("persistedExecutedRecords", ctx, qers, fsPath);
    return qers;
  }

  async isPersistedQueryExecResultExpired(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    format: "rows" | "records",
    expiresInMS: ex.RevivableQueryExecExpirationMS,
    // deno-lint-ignore require-await
    onNotExists: (fsPath: string, err: Error) => Promise<boolean> = async () =>
      true, // if the file doesn't exist, assume it's expired
  ): Promise<boolean> {
    if (expiresInMS == "never") return false;

    const fsPath = path.join(
      this.fsqEI.resultsStoreHome({ ctx, query }),
      (await ex.sqlQueryIdentity(query, ctx)) + `.${format}.fsp.json`,
    );
    try {
      const proxyFileInfo = await Deno.stat(fsPath);
      if (proxyFileInfo && proxyFileInfo.mtime) {
        const proxyAgeMS = Date.now() - proxyFileInfo.mtime.valueOf();
        if (proxyAgeMS > expiresInMS) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    } catch (err) {
      return await onNotExists(fsPath, err);
    }
  }

  isRevivedQueryExecResultExpired(
    rqe:
      | ex.QueryExecutionRowsSupplier<Any, Context>
      | ex.QueryExecutionRecordsSupplier<Any, Context>,
  ): boolean {
    // if this is not a revived query, assume it's expired so it can be re-read
    if (!ex.isRevivedQueryExecution(rqe)) return true;

    if (rqe.expiresInMS == "never") return false;
    const rqeAgeInMS = Date.now() - rqe.serializedAt.valueOf();
    return rqeAgeInMS > rqe.expiresInMS;
  }

  async rowsDQL<Row extends ex.SqlRow>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRowsExecutorOptions<Row, Context>,
  ): Promise<ex.QueryExecutionRowsSupplier<Row, Context>> {
    const result = await this.rowsExec<Row>(ctx, query, options);
    this.fsspEE.emit("executedDQL", result);
    return result;
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

/**
 * FileSysSqlProxy implementation that will execute SQL from either a local
 * FileSystem proxy store or retrieve it from the canonical storage engine if
 * the local file system does not contain query execution result. This is useful
 * for circumstances when queries are executed and then stored in Git for use
 * cases where not all users of the Git repo will have access to thecanonical
 * SQL engine.
 */
export class CanonicalFileSysSqlProxy<Context extends SQLa.SqlEmitContext>
  implements
    eng.SqlEngineInstance<FileSysSqlProxyEngine>,
    eng.SqlReadRowsConn<
      FileSysSqlProxyEngine,
      CanonicalFileSysSqlProxy<Context>,
      Context
    >,
    eng.SqlReadRecordsConn<
      FileSysSqlProxyEngine,
      CanonicalFileSysSqlProxy<Context>,
      Context
    > {
  constructor(
    readonly fsProxy: FileSysSqlProxy<Context>,
    readonly canonicalSupplier: () =>
      | eng.SqlReadRowsConn<Any, Any, Context> // when canonical is available
      | eng.SqlReadRecordsConn<Any, Any, Context> // when canonical is available
      | undefined, // in case canonical is not available
    readonly identity = fsProxy.identity,
  ) {
  }

  async rowsDQL<Row extends ex.SqlRow>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRowsExecutorOptions<Row, Context>,
  ): Promise<ex.QueryExecutionRowsSupplier<Row, Context>> {
    const result = await this.fsProxy.rowsDQL<Row>(ctx, query, options);
    if (!result || this.fsProxy.isRevivedQueryExecResultExpired(result)) {
      const ce = this.canonicalSupplier();
      if (
        !eng.isSqlReadRowsConn<
          FileSysSqlProxyEngine,
          CanonicalFileSysSqlProxy<Context>,
          Context
        >(ce)
      ) {
        return {
          query,
          rows: [],
          error: new Error(
            `isSqlReadRowsConn(canonical) false, no support for reading rows`,
          ),
        };
      }

      if (ce) {
        return ce.rowsDQL<Row>(ctx, query, options);
      }
      return {
        query,
        rows: [],
        error: new Error(`invalid proxy and canonical`),
      };
    }
    return result;
  }

  async recordsDQL<Object extends ex.SqlRecord>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRecordsExecutorOptions<Object, Context>,
  ): Promise<ex.QueryExecutionRecordsSupplier<Object, Context>> {
    const result = await this.fsProxy.recordsDQL<Object>(ctx, query, options);
    if (!result || this.fsProxy.isRevivedQueryExecResultExpired(result)) {
      const ce = this.canonicalSupplier();
      if (
        !eng.isSqlReadRecordsConn<
          FileSysSqlProxyEngine,
          CanonicalFileSysSqlProxy<Context>,
          Context
        >(ce)
      ) {
        return {
          query,
          records: [],
          error: new Error(
            `isSqlReadRecordsConn(canonical) false, no support for reading records`,
          ),
        };
      }

      if (ce) {
        return ce.recordsDQL<Object>(ctx, query, options);
      }
      return {
        query,
        records: [],
        error: new Error(`invalid proxy and canonical`),
      };
    }
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
    const result = await this.fsProxy.firstRecordDQL<Object>(
      ctx,
      query,
      options,
    );
    if (!result || this.fsProxy.isRevivedQueryExecResultExpired(result)) {
      const ce = this.canonicalSupplier();
      if (
        !eng.isSqlReadRecordsConn<
          FileSysSqlProxyEngine,
          CanonicalFileSysSqlProxy<Context>,
          Context
        >(ce)
      ) {
        return {
          query,
          records: [],
          record: await options?.onNotFound?.() ?? {} as Any,
          error: new Error(
            `isSqlReadRecordsConn(canonical) false, no support for reading records`,
          ),
        };
      }

      if (ce) {
        return ce.firstRecordDQL<Object>(ctx, query, options);
      }
      return {
        query,
        records: [],
        record: await options?.onNotFound?.() ?? {} as Any,
        error: new Error(`invalid proxy and canonical`),
      };
    }
    return result;
  }
}
