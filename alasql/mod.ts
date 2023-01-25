import { alaSQL } from "./deps.ts";
import * as sqlite from "../sqlite/mod.ts";
import * as govn from "../sql/governance.ts";

// TODO: we haven't properly "typed" alaSQL yet
// deno-lint-ignore no-explicit-any
export type AlaSqlEngine = any;

// nomenclature and conventions should follow PgDCP whenever possible

export interface AlaSqlProxyInit<DBEE extends govn.SqlEventEmitter> {
  readonly events: (db: AlaSqlProxy<DBEE>) => DBEE;
  readonly statements?: (
    filter?: (e: govn.SqlStatement) => boolean,
  ) => Iterable<govn.SqlStatement>;
  readonly customDbInventory?: (
    databaseID: string,
  ) => Promise<
    | govn.DbmsEngineSchemalessDatabase
    | govn.DbmsEngineSchemaDatabase
    | undefined
  >;
}

export interface AlaSqlProxyContext
  extends
    govn.SqlInstanceContext,
    govn.SqlDefineConnContext,
    govn.SqlWriteConnContext,
    govn.SqlReadConnContext,
    govn.DbmsInventoryContext {
  readonly alaSqlPrimeDB: AlaSqlEngine;
}

export class AlaSqlProxy<
  DBEE extends govn.SqlEventEmitter = govn.SqlEventEmitter,
> implements AlaSqlProxyContext, govn.DbmsEngine {
  #initialized = false;
  readonly identity = "alaSqlEngine";
  // deno-lint-ignore no-explicit-any
  readonly alaSqlEngine: any; // the alaSQL.default instance
  readonly alaSqlPrimeDB: AlaSqlEngine; // the alaSQL primary database instance
  readonly dbee: DBEE;
  readonly defnTxLog: Record<string, unknown>[] = [];
  readonly statements?: (
    filter?: (e: govn.SqlStatement) => boolean,
  ) => Iterable<govn.SqlStatement>;
  readonly customDbInventory?: (
    databaseID: string,
  ) => Promise<
    | govn.DbmsEngineSchemalessDatabase
    | govn.DbmsEngineSchemaDatabase
    | undefined
  >;
  #databases?: govn.DbmsEngineDatabase[];
  #inventoryTable?: {
    db_name: string;
    table_name: string;
    column_name: string;
  }[];

  constructor(init: AlaSqlProxyInit<DBEE>) {
    this.alaSqlEngine = alaSQL.default;
    this.alaSqlPrimeDB = new alaSQL.default.Database("prime");
    this.dbee = init.events(this);
    this.statements = init.statements;
    this.customDbInventory = init.customDbInventory;
  }

  createInventoryTableRows(
    inject?: (
      rows: { db_name: string; table_name: string; column_name: string }[],
    ) => void,
  ) {
    const rows: { db_name: string; table_name: string; column_name: string }[] =
      [];
    for (const db of this.#databases!) {
      if (!db.isSchemaDatabase) {
        for (const table of db.tables) {
          for (const column of table.columns) {
            rows.push({
              db_name: db.identity,
              table_name: table.identity,
              column_name: column.identity,
            });
          }
        }
      }
    }
    inject?.(rows);
    return rows;
  }

  get databases() {
    return this.#databases!;
  }

  set databases(value) {
    this.#databases = value;
    this.#inventoryTable = this.createInventoryTableRows();
    // add a denormalized table in case users want to see it that way
    this.createJsFlexibleTableFromUntypedObjectArray(
      "dbms_reflection_inventory",
      this.#inventoryTable,
    );
    // add the object model in case user's want to see it that way
    this.createJsFlexibleTableFromUntypedObjectArray(
      "dbmsInventory",
      this.engines(),
    );
  }

  get inventoryTable() {
    return this.#inventoryTable;
  }

  async filteredDatabases(filter?: (e: govn.DbmsEngineDatabase) => boolean) {
    const databases: govn.DbmsEngineDatabase[] = [];
    for (const dbRow of this.alaSqlEngine.exec("SHOW DATABASES")) {
      const databaseID = dbRow.databaseid;
      let db = await this.customDbInventory?.(databaseID);
      if (!db) {
        const filteredTables = (filter?: (t: govn.DbmsTable) => boolean) => {
          const tables: govn.DbmsTable[] = [];
          for (
            const tRow of this.alaSqlEngine.exec(
              `SHOW TABLES from ${databaseID}`,
            )
          ) {
            const tableID = tRow.tableid;
            const filteredColumns = (
              filter?: (t: govn.DbmsTableColumn) => boolean,
            ) => {
              const columns: govn.DbmsTableColumn[] = [];
              for (
                const cRow of this.alaSqlEngine.exec(
                  `SHOW COLUMNS from ${tableID} from ${databaseID}`,
                )
              ) {
                const columnID = cRow.columnid;
                const dataType = cRow.dbtypeid;
                const column: govn.DbmsTableColumn = {
                  identity: columnID,
                  nature: dataType ? { identity: dataType } : undefined,
                };
                if (!filter || filter(column)) {
                  columns.push(column);
                }
              }
              return columns;
            };
            const table: govn.DbmsTable = {
              identity: tableID,
              filteredColumns,
              columns: filteredColumns(),
            };
            if (!filter || filter(tRow)) {
              tables.push(table);
            }
          }
          return tables;
        };
        db = {
          isSchemaDatabase: false,
          identity: databaseID,
          filteredTables,
          tables: filteredTables(),
        };
      }
      if (!filter || filter(db)) {
        databases.push(db);
      }
    }
    return databases;
  }

  engines() {
    return [{
      identity: this.identity,
      databases: this.databases,
    }];
  }

  get initialized() {
    return this.#initialized;
  }

  async init() {
    if (this.#initialized) return;

    await this.dbee.emit("openingDatabase", this);

    this.dbee.on("openedDatabase", async () => {
      await this.dbee.emit("constructStorage", this);
      await this.dbee.emit("constructIdempotent", this);
      await this.dbee.emit("populateSeedData", this);
    });

    await this.dbee.emit("openedDatabase", this);
    this.databases = await this.filteredDatabases();

    this.#initialized = true;
  }

  close() {
    this.dbee.emitSync("closingDatabase", this);
    this.dbee.emitSync("closedDatabase", this);
  }

  // deno-lint-ignore require-await
  async rowsDDL<Row extends govn.SqlRow>(
    SQL: string,
    params?: govn.SqlQueryParameterSet | undefined,
  ): Promise<govn.QueryExecutionRowsSupplier<Row>> {
    const rows = this.alaSqlPrimeDB.exec(SQL, params);
    const result: govn.QueryExecutionRowsSupplier<Row> = { rows, SQL, params };
    this.dbee.emit("executedDDL", result);
    return result;
  }

  // deno-lint-ignore require-await
  async rowsDML<Row extends govn.SqlRow>(
    SQL: string,
    params?: govn.SqlQueryParameterSet | undefined,
  ): Promise<govn.QueryExecutionRowsSupplier<Row>> {
    const rows = this.alaSqlPrimeDB.exec(SQL, params);
    const result: govn.QueryExecutionRowsSupplier<Row> = { rows, SQL, params };
    this.dbee.emit("executedDML", result);
    return result;
  }

  jsDDL(
    tableName: string,
    columnDefns: Iterable<string>,
  ): string {
    return `CREATE TABLE ${tableName} (\n ${
      // use [colName] so that reserved SQL keywords can be used as column name
      Array.from(columnDefns).map((colName) => `[${colName}]`).join(",\n ")})`;
  }

  // deno-lint-ignore ban-types
  jsObjectDDL<TableRow extends object = object>(
    tableName: string,
    inspectable: TableRow,
    options?: {
      valueSqlTypeMap?: (value: unknown) => string | undefined;
      prepareTxLogEntry?: (
        suggested: Record<string, unknown>,
        inspected: TableRow | Record<string, unknown>,
      ) => Record<string, unknown>;
    },
  ): { DDL?: string; txLogEntry: Record<string, unknown> } {
    const { valueSqlTypeMap, prepareTxLogEntry } = options ?? {};

    const columnDefns = [];
    for (const entry of Object.entries(inspectable)) {
      const [name, value] = entry;
      columnDefns.push(
        valueSqlTypeMap ? `${name} ${valueSqlTypeMap(value)}` : name,
      );
    }
    const DDL = this.jsDDL(tableName, columnDefns);
    // inspected may be large so we don't add it to the log by default
    const txLogEntry: Record<string, unknown> = { DDL, tableName, columnDefns };
    return {
      DDL,
      txLogEntry: prepareTxLogEntry
        ? prepareTxLogEntry(txLogEntry, inspectable)
        : txLogEntry,
    };
  }

  // deno-lint-ignore ban-types
  createJsObjectSingleRowTable<TableRow extends object = object>(
    tableName: string,
    tableRow: TableRow,
    database = this.alaSqlPrimeDB,
    options?: {
      valueSqlTypeMap?: (value: unknown) => string | undefined;
      prepareTxLogEntry?: (
        suggested: Record<string, unknown>,
        inspected: TableRow | Record<string, unknown>,
      ) => Record<string, unknown>;
    },
  ) {
    const defn = this.jsObjectDDL(tableName, tableRow, options);
    if (defn.DDL) {
      try {
        database.exec(defn.DDL);
        database.tables[tableName].data = [tableRow];
        this.defnTxLog.push(defn.txLogEntry);
      } catch (error) {
        this.defnTxLog.push({
          origin: "createJsObjectSingleRowTable",
          error: error.toString(),
          ...defn.txLogEntry,
        });
      }
      return defn;
    }
  }

  // deno-lint-ignore ban-types
  createJsObjectsTable<TableRow extends object = object>(
    tableName: string,
    tableRows?: Array<TableRow>,
    database = this.alaSqlPrimeDB,
    options?: {
      structureSupplier?: (rows?: Array<TableRow>) => TableRow | undefined;
      valueSqlTypeMap?: (value: unknown) => string | undefined;
      prepareTxLogEntry?: (
        suggested: Record<string, unknown>,
      ) => Record<string, unknown>;
    },
  ) {
    // every row is the same structure, so inspect just the first to detect structure
    // deno-lint-ignore ban-types
    const inspectFirstRow = (rows?: object[]) => {
      return rows ? (rows.length > 0 ? rows[0] : undefined) : undefined;
    };

    const { structureSupplier = inspectFirstRow, prepareTxLogEntry } =
      options ?? {};
    const inspectable = structureSupplier(tableRows);
    const tableRowsCount = tableRows ? tableRows.length : undefined;
    const origin = "createJsObjectsTable";
    if (inspectable) {
      const defn = this.jsObjectDDL(tableName, inspectable, {
        prepareTxLogEntry: (suggested) => {
          const result = { ...suggested, tableRowsCount, origin };
          return prepareTxLogEntry ? prepareTxLogEntry(result) : result;
        },
        valueSqlTypeMap: options?.valueSqlTypeMap,
      });
      if (defn.DDL) {
        try {
          database.exec(defn.DDL);
          if (tableRows) database.tables[tableName].data = tableRows;
          this.defnTxLog.push(defn.txLogEntry);
        } catch (error) {
          this.defnTxLog.push({
            origin,
            error: error.toString(),
            ...defn.txLogEntry,
          });
        }
        return defn;
      }
    } else {
      const txLogEntry = {
        origin,
        error: `no inspectable object supplied, ${tableName} not created`,
        tableName,
        tableRowsCount,
      };
      this.defnTxLog.push(
        prepareTxLogEntry ? prepareTxLogEntry(txLogEntry) : txLogEntry,
      );
    }
  }

  createJsFlexibleTableFromUntypedObjectArray(
    tableName: string,
    // deno-lint-ignore ban-types
    tableRows?: Array<object>,
    database = this.alaSqlPrimeDB,
  ) {
    const tableRowsCount = tableRows ? tableRows.length : undefined;
    const origin = "createJsFlexibleTableFromUntypedObjectArray";
    if (tableRows) {
      // each row might have different columns so find the set of all columns
      // across all rows and create a "flexible table"
      const columnDefns = new Map<string, { foundInRows: number }>();
      for (const row of tableRows) {
        for (const entry of Object.entries(row)) {
          const [name] = entry;
          const found = columnDefns.get(name);
          if (found) found.foundInRows++;
          else columnDefns.set(name, { foundInRows: 1 });
        }
      }
      const DDL = this.jsDDL(tableName, columnDefns.keys());
      const txLogEntry = {
        DDL,
        origin,
        tableName,
        tableRowsCount,
        columnDefns: Object.fromEntries(columnDefns),
      };
      try {
        database.exec(DDL);
        database.tables[tableName].data = tableRows;
        this.defnTxLog.push(txLogEntry);
      } catch (error) {
        this.defnTxLog.push({
          error: error.toString(),
          ...txLogEntry,
        });
      }
    } else {
      this.defnTxLog.push({
        origin,
        error: `no tableRows supplied, ${tableName} not created`,
        tableName,
        tableRowsCount,
      });
    }
  }

  createJsFlexibleTableFromUntypedArray(
    tableName: string,
    rawData: unknown[][],
    columnNames: string[],
    database = this.alaSqlPrimeDB,
  ) {
    const tableRowsCount = rawData ? rawData.length : undefined;
    const origin = "createJsFlexibleTableFromUntypedArray";
    if (rawData) {
      const DDL = this.jsDDL(tableName, columnNames);
      const txLogEntry = {
        DDL,
        tableName,
        tableRowsCount,
        columnNames,
        origin,
      };
      const tableRows: Record<string, unknown>[] = [];
      for (const raw of rawData) {
        const row: Record<string, unknown> = {};
        for (let c = 0; c < raw.length; c++) {
          row[columnNames[c]] = raw[c];
        }
        tableRows.push(row);
      }
      try {
        database.exec(DDL);
        // tableRows is a matrix and alaSQL expects .data as array of objects
        database.tables[tableName].data = tableRows;
        this.defnTxLog.push(txLogEntry);
      } catch (error) {
        this.defnTxLog.push({
          error: error.toString(),
          ...txLogEntry,
        });
      }
    } else {
      this.defnTxLog.push({
        origin,
        error: `no tableRows supplied, ${tableName} not created`,
        tableName,
        tableRowsCount,
        columnNames,
      });
    }
  }

  sqliteDbInventory(
    sqliteDb: sqlite.SqliteDatabase,
    databaseID: string,
  ): govn.DbmsEngineSchemalessDatabase {
    const filteredTables = (filter?: (t: govn.DbmsTable) => boolean) => {
      const tableColDefnRows = sqliteDb.dbStore.queryEntries<{
        table_name: string;
        name: string;
        type: string;
        notnull: boolean;
        pk: boolean;
        dflt_value: unknown;
      }>(
        `  SELECT sm.name as table_name, table_info.*
             FROM sqlite_master sm
             JOIN pragma_table_info(sm.name) as table_info
            WHERE sm.type = 'table' and sm.name != 'sqlite_sequence'
         ORDER BY sm.name`,
      );
      const sqliteTableNames = [
        ...new Set(tableColDefnRows.map((tc) => tc.table_name)),
      ];
      const tables: govn.DbmsTable[] = [];

      for (const tableID of sqliteTableNames) {
        const filteredColumns = (
          filter?: (t: govn.DbmsTableColumn) => boolean,
        ) => {
          const columns: govn.DbmsTableColumn[] = [];
          for (
            const cRow of tableColDefnRows.filter((tc) =>
              tc.table_name == tableID
            )
          ) {
            const columnID = cRow.name;
            const dataType = cRow.type;
            const column: govn.DbmsTableColumn = {
              identity: columnID,
              nature: dataType ? { identity: dataType } : undefined,
            };
            if (!filter || filter(column)) {
              columns.push(column);
            }
          }
          return columns;
        };
        const table: govn.DbmsTable = {
          identity: tableID,
          filteredColumns,
          columns: filteredColumns(),
        };
        if (!filter || filter(table)) {
          tables.push(table);
        }
      }
      return tables;
    };
    const db: govn.DbmsEngineSchemalessDatabase = {
      isSchemaDatabase: false,
      identity: databaseID,
      filteredTables,
      tables: filteredTables(),
    };
    return db;
  }

  /**
   * "Statically" import an entire SQLite database into AlaSQL. It's static
   * because once imported, it's "disconnected" from SQLite. Assuming `asp`
   * is an AlaSqlProxy instance, use it like this:
   *
   * asp.importSqliteDB(sqliteDbInstance, () => {
   *   asp.alaSqlEngine("DROP DATABASE IF EXISTS pubctl");
   *   return new asp.alaSqlEngine.Database("pubctl");
   * });
   *
   * @param sqliteDb an open SQLite database instance
   * @param alaSqlDbSupplier Which AlaSQL database to add the SQLite content
   */
  async importSqliteDB(
    sqliteDb: sqlite.SqliteDatabase,
    alaSqlDbSupplier: (sqliteDb: sqlite.SqliteDatabase) => AlaSqlEngine,
  ) {
    const alaSqlDB = alaSqlDbSupplier(sqliteDb);
    const tables = sqliteDb.dbStore.query<[tableName: string]>(
      "SELECT name from sqlite_master where type = 'table' and name != 'sqlite_sequence'",
    );
    for (const table of tables) {
      const [tableName] = table;
      const rows = await sqliteDb.recordsDQL(`SELECT * FROM ${tableName}`);
      if (rows) {
        this.createJsObjectsTable(tableName, rows.records, alaSqlDB, {
          prepareTxLogEntry: (suggested) => ({
            ...suggested,
            origin: "importSqliteDB",
            originSqlLiteDbStoreFsPath: sqliteDb.dbStoreFsPath,
          }),
        });
      }
    }
  }

  // deno-lint-ignore require-await
  async rowsDQL<Row extends govn.SqlRow>(
    SQL: string,
    params?: govn.SqlQueryParameterSet | undefined,
  ): Promise<govn.QueryExecutionRowsSupplier<Row>> {
    // TODO: add check to make sure "SELECT MATRIX is used"
    const rows = this.alaSqlPrimeDB.exec(SQL, params);
    const result: govn.QueryExecutionRowsSupplier<Row> = { rows, SQL, params };
    this.dbee.emit("executedDQL", result);
    return result;
  }

  // deno-lint-ignore require-await
  async recordsDQL<Object extends govn.SqlRecord>(
    SQL: string,
    params?: govn.SqlQueryParameterSet | undefined,
  ): Promise<govn.QueryExecutionRecordsSupplier<Object>> {
    const records = this.alaSqlPrimeDB.exec(SQL, params);
    const result: govn.QueryExecutionRecordsSupplier<Object> = {
      records,
      SQL,
      params,
    };
    this.dbee.emit("executedDQL", result);
    return result;
  }

  async firstRecordDQL<Object extends govn.SqlRecord>(
    SQL: string,
    params?: govn.SqlQueryParameterSet | undefined,
    options?: {
      readonly enhance?: (record: Record<string, unknown>) => Object;
      readonly onNotFound?: () => Object | undefined;
      readonly autoLimitSQL?: (SQL: string) => string;
    },
  ): Promise<Object | undefined> {
    // TODO: add check to make sure "SELECT ROW"
    const { autoLimitSQL = (() => `${SQL} LIMIT 1`) } = options ?? {};
    const selected = await this.recordsDQL<Object>(autoLimitSQL(SQL), params);
    if (selected.records.length > 0) {
      const record = selected.records[0];
      if (options?.enhance) return options.enhance(record);
      return record;
    }
    return options?.onNotFound ? options.onNotFound() : undefined;
  }
}
