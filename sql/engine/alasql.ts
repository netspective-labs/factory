import * as alaSQL from "https://cdn.skypack.dev/alasql@1.7.3";
import { events } from "../deps.ts";
import * as SQLa from "../render/mod.ts";
import * as ex from "../execute/mod.ts";
import * as eng from "./engine.ts";

// TODO: we haven't properly "typed" alaSQL yet
// deno-lint-ignore no-explicit-any
export type AlaSqlLibRawInstance = any;

// deno-lint-ignore no-explicit-any
type Any = any;

export class AlaSqlProxyEventEmitter<
  Context extends SQLa.SqlEmitContext,
  Engine extends eng.SqlEngine = eng.SqlEngine,
  Instance extends AlaSqlProxyInstance<Context> = AlaSqlProxyInstance<Context>,
  Connection extends AlaSqlProxyInstance<Context> = AlaSqlProxyInstance<
    Context
  >,
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

export interface AlaSqlProxyInit<Context extends SQLa.SqlEmitContext> {
  readonly instanceID: string;
  readonly prepareEE?: (
    suggested: AlaSqlProxyEventEmitter<Context>,
  ) => AlaSqlProxyEventEmitter<Context>;
}

export type AlaSqlEngine = eng.SqlEngine;

export function alaSqlProxyEngine<Context extends SQLa.SqlEmitContext>() {
  const instances = new Map<string, AlaSqlProxyInstance<Context>>();
  const result: AlaSqlEngine = {
    identity: "AlaSQL Engine",
  };
  return {
    ...result,
    instance: (ii: AlaSqlProxyInit<Context>) => {
      const sfn = ii.instanceID;
      let instance = instances.get(sfn);
      if (!instance) {
        instance = new AlaSqlProxyInstance(ii);
        instances.set(sfn, instance);
      }
      return instance;
    },
  };
}

export function alaSqlRowsExecutor<Context extends SQLa.SqlEmitContext>(
  db: AlaSqlLibRawInstance,
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

    // TODO: add check to make sure "SELECT MATRIX is used" because without
    // "MATRIX" records are returned
    const rows = db.exec(query.SQL(ctx), query.sqlQueryParams);
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

export function alaSqlRecordsExecutor<Context extends SQLa.SqlEmitContext>(
  db: AlaSqlLibRawInstance,
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

    // TODO:
    // by default AlaSQL exec() returns object records; with "SELECT MATRIX"
    // exec() returns a rows array so we need to add some error checking.
    const records = db.exec(query.SQL(ctx), query.sqlQueryParams);
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

export class AlaSqlProxyInstance<Context extends SQLa.SqlEmitContext>
  implements
    eng.SqlEngineInstance<AlaSqlEngine>,
    eng.SqlDefineConn<AlaSqlEngine, AlaSqlProxyInstance<Context>, Context>,
    eng.SqlReadRowsConn<AlaSqlEngine, AlaSqlProxyInstance<Context>, Context>,
    eng.SqlReadRecordsConn<AlaSqlEngine, AlaSqlProxyInstance<Context>, Context>,
    eng.SqlWriteConn<AlaSqlEngine, AlaSqlProxyInstance<Context>, Context>,
    eng.SqlReflectConn<AlaSqlEngine, AlaSqlProxyInstance<Context>, Context>,
    eng.SqlReflectDatabasesConn<
      AlaSqlEngine,
      AlaSqlProxyInstance<Context>,
      Context
    > {
  readonly identity: string;
  readonly alaSqlLibRawInstance: Any; // TODO: properly type the alaSQL.default instance
  readonly alaSqlPrimeDB: AlaSqlLibRawInstance; // the alaSQL primary database instance
  readonly rowsExec: ex.QueryRowsExecutor<Context>;
  readonly recordsExec: ex.QueryRecordsExecutor<Context>;
  readonly dbee: AlaSqlProxyEventEmitter<Context>;
  readonly defnTxLog: Record<string, unknown>[] = [];

  constructor(aspi: AlaSqlProxyInit<Context>) {
    this.alaSqlLibRawInstance = alaSQL.default;
    this.identity = aspi.instanceID;
    this.alaSqlPrimeDB = new alaSQL.default.Database(this.identity);

    const dbee = new AlaSqlProxyEventEmitter<Context>();
    this.dbee = aspi.prepareEE?.(dbee) ?? dbee;

    this.rowsExec = alaSqlRowsExecutor(this.alaSqlPrimeDB);
    this.recordsExec = alaSqlRecordsExecutor(this.alaSqlPrimeDB);
  }

  close() {
    this.dbee.emitSync("closingDatabase", this);
    // nothing to really "close"
    this.dbee.emitSync("closedDatabase", this);
  }

  init() {
    this.dbee.emitSync("openingDatabase", this);

    this.dbee.on("openedDatabase", async () => {
      await this.dbee.emit("constructStorage", this);
      await this.dbee.emit("constructIdempotent", this);
      await this.dbee.emit("populateSeedData", this);
    });

    this.dbee.emitSync("openedDatabase", this);
  }

  async rowsDDL<Row extends ex.SqlRow>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRowsExecutorOptions<Row, Context>,
  ): Promise<ex.QueryExecutionRowsSupplier<Row, Context>> {
    const result = await this.rowsExec<Row>(ctx, query, options);
    this.dbee.emit("executedDDL", result);
    return result;
  }

  async rowsDML<Row extends ex.SqlRow>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRowsExecutorOptions<Row, Context>,
  ): Promise<ex.QueryExecutionRowsSupplier<Row, Context>> {
    const result = await this.rowsExec<Row>(ctx, query, options);
    this.dbee.emit("executedDML", result);
    return result;
  }

  async recordsDML<Object extends ex.SqlRecord>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRecordsExecutorOptions<Object, Context>,
  ): Promise<ex.QueryExecutionRecordsSupplier<Object, Context>> {
    const result = await this.recordsExec<Object>(ctx, query, options);
    this.dbee.emit("executedDML", result);
    return result;
  }

  async rowsDQL<Row extends ex.SqlRow>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRowsExecutorOptions<Row, Context>,
  ): Promise<ex.QueryExecutionRowsSupplier<Row, Context>> {
    const result = await this.rowsExec<Row>(ctx, query, options);
    this.dbee.emit("executedDQL", result);
    return result;
  }

  async recordsDQL<Object extends ex.SqlRecord>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRecordsExecutorOptions<Object, Context>,
  ): Promise<ex.QueryExecutionRecordsSupplier<Object, Context>> {
    const result = await this.recordsExec<Object>(ctx, query, options);
    this.dbee.emit("executedDQL", result);
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
        await this.dbee.emit("executedDQL", result);
      },
      ...options,
    });
  }

  async *reflectDatabases<DatabaseID extends string>(
    _ctx: Context,
  ): AsyncGenerator<{ databaseID: DatabaseID }> {
    for (const dbRow of this.alaSqlLibRawInstance.exec("SHOW DATABASES")) {
      yield { databaseID: dbRow.databaseid as DatabaseID };
    }
  }

  // deno-lint-ignore require-await
  async reflectDomains<DomainID extends string = "UNTYPED">(
    _ctx: Context,
  ): Promise<
    Map<DomainID, (nullable?: boolean) => SQLa.AxiomSqlDomain<Any, Context>>
  > {
    const dataTypes = new Set<string>();
    for (const dbRow of this.alaSqlLibRawInstance.exec("SHOW DATABASES")) {
      const databaseID = dbRow.databaseid;
      for (
        const tRow of this.alaSqlLibRawInstance.exec(
          `SHOW TABLES from ${databaseID}`,
        )
      ) {
        for (
          const cRow of this.alaSqlLibRawInstance.exec(
            `SHOW COLUMNS from ${tRow.tableid} from ${databaseID}`,
          )
        ) {
          dataTypes.add(cRow.dbtypeid);
        }
      }
    }

    return SQLa.typicalDomainFromTextFactory<DomainID, Context>(
      ...(Array.from(dataTypes.values()) as DomainID[]),
    );
  }

  async *reflectTables<TableName extends string>(
    ctx: Context,
    options?: {
      readonly filter?: {
        readonly tableName?: (name: string) => boolean;
        readonly databaseName?: (name: string) => boolean;
      };
    },
  ): AsyncGenerator<
    & SQLa.TableDefinition<TableName, Context>
    & SQLa.SqlDomainsSupplier<
      Context
    >
  > {
    const { filter } = options ?? {};
    const rd = await this.reflectDomains(ctx);
    for (const dbRow of this.alaSqlLibRawInstance.exec("SHOW DATABASES")) {
      const databaseID = dbRow.databaseid;
      if (filter?.databaseName && !filter.databaseName(databaseID)) continue;
      for (
        const reflectedTableInfo of this.alaSqlLibRawInstance.exec(
          `SHOW TABLES from ${databaseID}`,
        )
      ) {
        const tableName = reflectedTableInfo.tableid;
        if (filter?.tableName && !filter.tableName(tableName)) continue;

        const columns: Record<string, SQLa.AxiomSqlDomain<Any, Context>> = {};
        for (
          const colDefn of this.alaSqlLibRawInstance.exec(
            `SHOW COLUMNS from ${tableName} from ${databaseID}`,
          )
        ) {
          const domain = rd.get(colDefn.dbtypeid)?.() ?? SQLa.textNullable();
          // if (colDefn.pk) domain = SQLa.primaryKey(domain);
          columns[colDefn.columnid] = domain;
          (columns[colDefn.columnid] as Any).reflectedColumnInfo = colDefn;
        }

        const td = SQLa.tableDefinition(tableName as TableName, columns);
        (td as Any).reflectedTableInfo = reflectedTableInfo;
        yield td;
      }
    }
  }

  async createJsObjectSingleRowTable<
    TableName extends string,
    TableRow extends Record<string, unknown>,
  >(
    ctx: Context,
    tableName: TableName,
    tableRow: TableRow,
    database = this.alaSqlPrimeDB,
  ) {
    const tableDefn = SQLa.tableDefinition(
      tableName,
      SQLa.domainAxiomsFromObject(tableRow),
    );
    await this.rowsDDL(ctx, tableDefn);
    database.tables[tableName].data = [tableRow];
    return tableDefn;
  }

  async createJsObjectsTable<
    TableName extends string,
    TableRow extends Record<string, unknown>,
  >(
    ctx: Context,
    tableName: TableName,
    tableRows?: ArrayLike<TableRow>,
    database = this.alaSqlPrimeDB,
    options?: {
      structureSupplier?: (rows?: ArrayLike<TableRow>) => TableRow | undefined;
    },
  ) {
    // every row is the same structure, so inspect just the first to detect structure
    const inspectFirstRow = (rows?: ArrayLike<TableRow>) => {
      return rows ? (rows.length > 0 ? rows[0] : undefined) : undefined;
    };

    const { structureSupplier = inspectFirstRow } = options ?? {};
    const inspectable = structureSupplier(tableRows);
    if (inspectable) {
      const tableDefn = SQLa.tableDefinition(
        tableName,
        SQLa.domainAxiomsFromObject(inspectable),
      );
      await this.rowsDDL(ctx, tableDefn);
      if (tableRows) database.tables[tableName].data = tableRows;
    }
  }

  async createJsFlexibleTableFromUntypedObjectArray<TableName extends string>(
    ctx: Context,
    tableName: TableName,
    tableRows?: Iterable<Record<string, unknown>>,
    database = this.alaSqlPrimeDB,
  ) {
    if (tableRows) {
      // each row might have different columns so find the set of all columns
      // across all rows and create a "flexible table" (all columns untyped)
      const columnDefns = new Map<string, { foundInRows: number }>();
      for (const row of tableRows) {
        for (const entry of Object.entries(row)) {
          const [name] = entry;
          const found = columnDefns.get(name);
          if (found) found.foundInRows++;
          else columnDefns.set(name, { foundInRows: 1 });
        }
      }
      const tableDefn = SQLa.tableDefinition(
        tableName,
        SQLa.untypeDomainsAxiomsFromKeys(...columnDefns.keys()),
      );
      await this.rowsDDL(ctx, tableDefn);
      if (tableRows) database.tables[tableName].data = tableRows;
    }
  }

  async createJsFlexibleTableFromUntypedArray(
    ctx: Context,
    tableName: string,
    rawData: unknown[][],
    columnNames: string[],
    database = this.alaSqlPrimeDB,
  ) {
    if (rawData && rawData.length > 0) {
      const tableDefn = SQLa.tableDefinition(
        tableName,
        SQLa.untypeDomainsAxiomsFromKeys(...columnNames),
      );
      const tableRows: Record<string, unknown>[] = [];
      for (const raw of rawData) {
        const row: Record<string, unknown> = {};
        for (let c = 0; c < raw.length; c++) {
          row[columnNames[c]] = raw[c];
        }
        tableRows.push(row);
      }
      await this.rowsDDL(ctx, tableDefn);
      database.tables[tableName].data = tableRows;
    }
  }

  /**
   * "Statically" import an entire SQLite database (or any other engine) into
   * AlaSQL. It's static because once imported, it's "disconnected" from the
   * original ("proxied") engine. Assuming `asp` is an AlaSqlProxy instance,
   * use it like this:
   *
   * asp.importSqliteDB(sqliteDbInstance, () => {
   *   asp.alaSqlEngine("DROP DATABASE IF EXISTS pubctl");
   *   return new asp.alaSqlEngine.Database("pubctl");
   * });
   *
   * @param canonicalSupplier the original content supplier
   * @param alaSqlDbSupplier Which AlaSQL database to add the SQLite content
   */
  async importContent(
    ctx: Context,
    canonicalSupplier: () =>
      & eng.SqlReadRecordsConn<Any, Any, Context>
      & eng.SqlReflectConn<Any, Any, Context>,
    alaSqlDbSupplier: (
      conn: eng.SqlReadRecordsConn<Any, Any, Context>,
    ) => AlaSqlLibRawInstance = () => this.alaSqlPrimeDB,
    canonicalReflectOptions?: {
      readonly filter?: { readonly tableName?: (name: string) => boolean };
    },
  ) {
    const canonical = canonicalSupplier();
    const alaSqlDB = alaSqlDbSupplier(canonical);
    for await (
      const tableDefn of canonical.reflectTables(ctx, canonicalReflectOptions)
    ) {
      const tableName = tableDefn.tableName;
      const rows = await canonical.recordsDQL(ctx, {
        SQL: () => `SELECT * FROM ${tableName}`,
      });
      if (rows) {
        this.createJsObjectsTable(ctx, tableName, rows.records, alaSqlDB);
      } else {
        this.rowsDDL(ctx, tableDefn);
      }
    }
  }
}
