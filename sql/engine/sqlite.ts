import { events } from "../deps.ts";
import * as sqlite from "https://deno.land/x/sqlite@v3.4.0/mod.ts";
import * as SQLa from "../render/mod.ts";
import * as ex from "../execute/mod.ts";
import * as eng from "./engine.ts";

// TODO: use [sqlean](https://github.com/nalgeon/sqlean) for advanced SQL functions
//       use [go-sqlite3-stdlib](https://github.com/multiprocessio/go-sqlite3-stdlib)
//       if integrating with Go.

// deno-lint-ignore no-explicit-any
type Any = any;

export class SqliteEventEmitter<
  Context extends SQLa.SqlEmitContext,
  Engine extends eng.SqlEngine = eng.SqlEngine,
  Instance extends SqliteInstance<Context> = SqliteInstance<Context>,
  Connection extends SqliteInstance<Context> = SqliteInstance<Context>,
> extends events.EventEmitter<{
  openingDatabase(i: Instance): void;
  openedDatabase(i: Instance): void;
  closingDatabase(i: Instance): void;
  closedDatabase(i: Instance): void;

  constructStorage(cc: eng.SqlDefineConn<Engine, Instance, Context>): void;
  constructIdempotent(
    cc:
      | eng.SqlReadRowsConn<Engine, Instance, Context>
      | eng.SqlReadRecordsConn<Engine, Instance, Context>,
  ): void;
  populateSeedData(cc: eng.SqlWriteConn<Engine, Instance, Context>): void;

  executedDDL(result: ex.QueryExecutionRowsSupplier<Any, Context>): void;
  executedDQL(
    result:
      | ex.QueryExecutionRowsSupplier<Any, Context>
      | ex.QueryExecutionRecordSupplier<Any, Context>
      | ex.QueryExecutionRecordsSupplier<Any, Context>,
  ): void;
  executedDML(
    result:
      | ex.QueryExecutionRowsSupplier<Any, Context>
      | ex.QueryExecutionRecordSupplier<Any, Context>
      | ex.QueryExecutionRecordsSupplier<Any, Context>,
  ): void;
}> {
}

export interface SqliteInstanceInit<Context extends SQLa.SqlEmitContext> {
  readonly storageFileName: () => string;
  readonly autoCloseOnUnload?: boolean;
  readonly prepareEE?: (
    suggested: SqliteEventEmitter<Context>,
  ) => SqliteEventEmitter<Context>;
}

export type SqliteEngine = eng.SqlEngine;

export function sqliteEngine<Context extends SQLa.SqlEmitContext>() {
  const instances = new Map<string, SqliteInstance<Context>>();
  const result: SqliteEngine = {
    identity: "SQLite Deno WASM Engine",
  };
  return {
    ...result,
    instance: (ii: SqliteInstanceInit<Context>) => {
      const sfn = ii.storageFileName();
      let instance = instances.get(sfn);
      if (!instance) {
        instance = new SqliteInstance(ii);
        instances.set(sfn, instance);
      }
      return instance;
    },
  };
}

export function sqliteRowsExecutor<Context extends SQLa.SqlEmitContext>(
  db: sqlite.DB,
) {
  const executor: ex.QueryRowsExecutor<Context> = async <Row extends ex.SqlRow>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRowsExecutorOptions<Row, Context>,
  ): Promise<ex.QueryExecutionRowsSupplier<Row, Context>> => {
    // a "proxy" can be a local cache or any other store
    if (options?.proxy) {
      const proxy = await options?.proxy();
      if (proxy) return proxy;
    }

    const rows = db.query<Row>(query.SQL(ctx), query.sqlQueryParams);
    const result: ex.QueryExecutionRowsSupplier<Row, Context> = {
      rows,
      query,
    };

    // "enriching" can be a transformation function, cache store, etc.
    const { enrich } = options ?? {};
    return enrich ? enrich(result) : result;
  };
  return executor;
}

export function sqliteRecordsExecutor<Context extends SQLa.SqlEmitContext>(
  db: sqlite.DB,
) {
  const executor: ex.QueryRecordsExecutor<Context> = async <
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

    const records = db.queryEntries<Object>(
      query.SQL(ctx),
      query.sqlQueryParams,
    );
    const result: ex.QueryExecutionRecordsSupplier<Object, Context> = {
      records,
      query,
    };

    // "enriching" can be a transformation function, cache store, etc.
    const { enrich } = options ?? {};
    return enrich ? enrich(result) : result;
  };
  return executor;
}

export class SqliteInstance<Context extends SQLa.SqlEmitContext>
  implements
    eng.SqlEngineInstance<SqliteEngine>,
    eng.SqlDefineConn<SqliteEngine, SqliteInstance<Context>, Context>,
    eng.SqlReadRowsConn<SqliteEngine, SqliteInstance<Context>, Context>,
    eng.SqlReadRecordsConn<SqliteEngine, SqliteInstance<Context>, Context>,
    eng.SqlWriteConn<SqliteEngine, SqliteInstance<Context>, Context>,
    eng.SqlReflectConn<SqliteEngine, SqliteInstance<Context>, Context> {
  readonly identity: string;
  readonly dbStoreFsPath: string;
  readonly dbStore: sqlite.DB;
  readonly sqliteEE: SqliteEventEmitter<Context>;
  readonly rowsExec: ex.QueryRowsExecutor<Context>;
  readonly recordsExec: ex.QueryRecordsExecutor<Context>;

  constructor(sii: SqliteInstanceInit<Context>) {
    this.dbStoreFsPath = sii.storageFileName();
    this.dbStore = new sqlite.DB(this.dbStoreFsPath, { mode: "create" });
    this.identity = `SQLite::${this.dbStoreFsPath}`;

    const sqlELCEE = new SqliteEventEmitter<Context>();
    this.sqliteEE = sii.prepareEE?.(sqlELCEE) ?? sqlELCEE;

    this.rowsExec = sqliteRowsExecutor(this.dbStore);
    this.recordsExec = sqliteRecordsExecutor(this.dbStore);

    if (sii.autoCloseOnUnload) {
      globalThis.addEventListener("unload", () => this.close());
    }
  }

  close() {
    this.sqliteEE.emitSync("closingDatabase", this);
    this.dbStore.close(true);
    this.sqliteEE.emitSync("closedDatabase", this);
  }

  init() {
    this.sqliteEE.emitSync("openingDatabase", this);

    this.sqliteEE.on("openedDatabase", async () => {
      await this.sqliteEE.emit("constructStorage", this);
      await this.sqliteEE.emit("constructIdempotent", this);
      await this.sqliteEE.emit("populateSeedData", this);
    });

    this.sqliteEE.emitSync("openedDatabase", this);
  }

  async rowsDDL<Row extends ex.SqlRow>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRowsExecutorOptions<Row, Context>,
  ): Promise<ex.QueryExecutionRowsSupplier<Row, Context>> {
    const result = await this.rowsExec<Row>(ctx, query, options);
    this.sqliteEE.emit("executedDDL", result);
    return result;
  }

  async rowsDML<Row extends ex.SqlRow>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRowsExecutorOptions<Row, Context>,
  ): Promise<ex.QueryExecutionRowsSupplier<Row, Context>> {
    const result = await this.rowsExec<Row>(ctx, query, options);
    this.sqliteEE.emit("executedDML", result);
    return result;
  }

  async recordsDML<Object extends ex.SqlRecord>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRecordsExecutorOptions<Object, Context>,
  ): Promise<ex.QueryExecutionRecordsSupplier<Object, Context>> {
    const result = await this.recordsExec<Object>(ctx, query, options);
    this.sqliteEE.emit("executedDML", result);
    return result;
  }

  async rowsDQL<Row extends ex.SqlRow>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRowsExecutorOptions<Row, Context>,
  ): Promise<ex.QueryExecutionRowsSupplier<Row, Context>> {
    const result = await this.rowsExec<Row>(ctx, query, options);
    this.sqliteEE.emit("executedDQL", result);
    return result;
  }

  async recordsDQL<Object extends ex.SqlRecord>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRecordsExecutorOptions<Object, Context>,
  ): Promise<ex.QueryExecutionRecordsSupplier<Object, Context>> {
    const result = await this.recordsExec<Object>(ctx, query, options);
    this.sqliteEE.emit("executedDQL", result);
    return result;
  }

  async firstRecordDQL<Object extends ex.SqlRecord>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRecordsExecutorOptions<Object, Context> & {
      readonly onNotFound?: () => Promise<
        | ex.QueryExecutionRecordSupplier<Object, Context>
        | undefined
      >;
      readonly autoLimitSQL?: (
        SQL: SQLa.SqlTextSupplier<Context>,
      ) => SQLa.SqlTextSupplier<Context>;
    },
  ) {
    return await ex.firstRecordDQL(ctx, query, this.recordsDQL, {
      reportRecordsDQL: async (result) => {
        await this.sqliteEE.emit("executedDQL", result);
      },
      ...options,
    });
  }

  async reflectDomains<DomainID extends string>(
    ctx: Context,
  ): Promise<
    Map<DomainID, (nullable?: boolean) => SQLa.AxiomSqlDomain<Any, Context>>
  > {
    const colTypesQER = await this.rowsDQL<[type: string]>(ctx, {
      SQL: () => `
        SELECT DISTINCT table_info.type
          FROM sqlite_master
          JOIN pragma_table_info(sqlite_master.name) as table_info
         WHERE table_info.type <> ''`,
    });
    return SQLa.typicalDomainFromTextFactory<DomainID, Context>(
      ...colTypesQER.rows.map((r) => r[0] as DomainID),
    );
  }

  async *reflectTables<TableName extends string>(
    ctx: Context,
    options?: {
      readonly filter?: { readonly tableName?: (name: string) => boolean };
    },
  ): AsyncGenerator<
    & SQLa.TableDefinition<TableName, Context>
    & SQLa.SqlDomainsSupplier<
      Context
    >
  > {
    const { filter } = options ?? {};
    const rd = await this.reflectDomains(ctx);
    const tableNameQER = await this.recordsDQL<{ name: string }>(ctx, {
      SQL: () => `SELECT * FROM sqlite_schema WHERE type='table' ORDER BY name`,
    });
    for (const reflectedTableInfo of tableNameQER.records) {
      const { name: tableName } = reflectedTableInfo;
      if (filter?.tableName && !filter.tableName(tableName)) continue;

      const columnsQER = await this.recordsDQL<{
        table_name: string;
        name: string;
        type: string;
        notnull: boolean;
        pk: boolean;
        dflt_value: unknown;
      }>(ctx, {
        SQL: () =>
          `SELECT sqlite_master.name as table_name, table_info.*
             FROM sqlite_master
             JOIN pragma_table_info(sqlite_master.name) as table_info
            WHERE table_name = '${tableName}'`,
      });

      const columns: Record<string, SQLa.AxiomSqlDomain<Any, Context>> = {};
      for (const colDefn of columnsQER.records) {
        let domain = rd.get(colDefn.type)?.(colDefn.notnull ? false : true) ??
          SQLa.textNullable();
        if (colDefn.pk) domain = SQLa.primaryKey(domain);
        columns[colDefn.name] = domain;
        (columns[colDefn.name] as Any).reflectedColumnInfo = colDefn;
      }

      const td = SQLa.tableDefinition(tableName as TableName, columns);
      (td as Any).reflectedTableInfo = reflectedTableInfo;
      yield td;
    }
  }
}
