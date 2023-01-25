import { sqlite } from "./deps.ts";
import * as ssts from "./schema-ts.ts";
import * as govn from "../sql/governance.ts";

// nomenclature and conventions should follow PgDCP whenever possible

export interface SqliteInstanceInit<DBEE extends govn.SqlEventEmitter> {
  readonly storageFileName: () => string;
  readonly events: (db: SqliteDatabase<DBEE>) => DBEE;
  readonly autoCloseOnUnload?: boolean;
}

export interface SqliteInstanceContext
  extends
    govn.SqlInstanceContext,
    govn.SqlDefineConnContext,
    govn.SqlReadConnContext,
    govn.SqlWriteConnContext {
  readonly dbStore: sqlite.DB;
  readonly dbStoreFsPath: string;
}

export class SqliteDatabase<
  DBEE extends govn.SqlEventEmitter = govn.SqlEventEmitter,
> implements SqliteInstanceContext {
  readonly isConnectionContext = true;
  readonly dbStoreFsPath: string;
  readonly dbStore: sqlite.DB;
  readonly dbee: DBEE;

  constructor(init: SqliteInstanceInit<DBEE>) {
    this.dbStoreFsPath = init.storageFileName();
    this.dbStore = new sqlite.DB(this.dbStoreFsPath, { mode: "create" });
    this.dbee = init.events(this);

    if (init.autoCloseOnUnload) {
      globalThis.addEventListener("unload", () => this.close());
    }
  }

  close() {
    this.dbee.emitSync("closingDatabase", this);
    this.dbStore.close(true);
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

  // deno-lint-ignore require-await
  async rowsDDL<Row extends govn.SqlRow>(
    SQL: string,
    params?: govn.SqlQueryParameterSet | undefined,
  ): Promise<govn.QueryExecutionRowsSupplier<Row>> {
    const rows = this.dbStore.query<Row>(SQL, params);
    const result: govn.QueryExecutionRowsSupplier<Row> = { rows, SQL, params };
    this.dbee.emit("executedDDL", result);
    return result;
  }

  // deno-lint-ignore require-await
  async rowsDML<Row extends govn.SqlRow>(
    SQL: string,
    params?: govn.SqlQueryParameterSet | undefined,
  ): Promise<govn.QueryExecutionRowsSupplier<Row>> {
    const rows = this.dbStore.query<Row>(SQL, params);
    const result: govn.QueryExecutionRowsSupplier<Row> = { rows, SQL, params };
    this.dbee.emit("executedDML", result);
    return result;
  }

  async insertedRecord<
    Insert extends Record<string, govn.SqlQueryParameter>,
    Return extends govn.SqlRecord,
  >(
    insert: Insert,
    tableName: string,
    options?: {
      readonly insertSQL?: (
        suggestedSQL: (
          names: string[],
          insert: Insert,
        ) => string,
        insert: Insert,
        names: string[],
      ) => string;
      readonly afterInsertSQL?: (
        suggestedSQL: (
          names: string[],
          insert: Insert,
        ) => [string, govn.SqlQueryParameterSet?],
        insert: Insert,
        names: string[],
      ) => [string, govn.SqlQueryParameterSet?];
      readonly transformInserted?: (record: Record<string, unknown>) => Return;
      readonly onNotInserted?: (
        insert: Insert,
        names: string[],
        SQL: string,
        insertErr?: Error,
      ) => Return | undefined;
    },
  ): Promise<Return | undefined> {
    const names: string[] = Object.keys(insert);
    const insertDML: (
      names: string[],
      values: Insert,
    ) => string = (names) => {
      // `insert into (col1, col2, ...) values (:col1, :col2, ...)`
      return `INSERT INTO ${tableName} (${names.join(", ")}) VALUES (${
        names.map((colName) => `:${colName}`)
      })`;
    };
    const insertSQL = (options?.insertSQL)
      ? options.insertSQL(insertDML, insert, names)
      : insertDML(names, insert);

    try {
      // first perform the insert
      this.rowsDML(insertSQL, insert);
    } catch (err) {
      if (options?.onNotInserted) {
        return options.onNotInserted(insert, names, insertSQL, err);
      }
      return undefined;
    }

    // now read the inserted record so we can get the ID and other values

    const afterInsertDQL: (
      names: string[],
      values: govn.SqlQueryParameterSet,
    ) => [string, govn.SqlQueryParameterSet?] = () => {
      return [`SELECT * from ${tableName} where rowid = last_insert_rowid()`];
    };
    const afterInsertArgs = (options?.afterInsertSQL)
      ? options.afterInsertSQL(afterInsertDQL, insert, names)
      : afterInsertDQL(names, insert);

    const [afterInsertSQL, afterInsertQPS] = afterInsertArgs;
    return await this.firstRecordDQL<Return>(afterInsertSQL, afterInsertQPS, {
      enhance: options?.transformInserted,
      onNotFound: () => {
        if (options?.onNotInserted) {
          return options.onNotInserted(insert, names, afterInsertSQL);
        }
        return undefined;
      },
    });
  }

  // deno-lint-ignore require-await
  async rowsDQL<Row extends govn.SqlRow>(
    SQL: string,
    params?: govn.SqlQueryParameterSet | undefined,
  ): Promise<govn.QueryExecutionRowsSupplier<Row>> {
    const rows = this.dbStore.query<Row>(SQL, params);
    const result: govn.QueryExecutionRowsSupplier<Row> = { rows, SQL, params };
    this.dbee.emit("executedDQL", result);
    return result;
  }

  // deno-lint-ignore require-await
  async recordsDQL<Object extends govn.SqlRecord>(
    SQL: string,
    params?: govn.SqlQueryParameterSet | undefined,
  ): Promise<govn.QueryExecutionRecordsSupplier<Object>> {
    const records = this.dbStore.queryEntries<Object>(SQL, params);
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
    const { autoLimitSQL = (() => `${SQL} LIMIT 1`) } = options ?? {};
    const selected = await this.recordsDQL<Object>(autoLimitSQL(SQL), params);
    if (selected.records.length > 0) {
      const record = selected.records[0];
      if (options?.enhance) return options.enhance(record);
      return record;
    }
    return options?.onNotFound ? options.onNotFound() : undefined;
  }

  schemaTypescript() {
    return ssts.sqliteSchemaTypescript(this.dbStore);
  }
}
