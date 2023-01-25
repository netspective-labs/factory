import { events } from "./deps.ts";
import * as tmpl from "../text/interpolated-template.ts";

// nomenclature and conventions should follow PgDCP whenever possible

export type QueryResultNature =
  | "scalar" // first column from single row result
  | "object" // Object (single row result)
  | "row" // array of scalars (single row result)
  | "records" // array of objects (multiple rows result)
  | "matrix" // array of array of scalars (multiple rows result)
  | "alaSQL-recordset" // https://github.com/AlaSQL/alasql/wiki/Recordset
  | "error-exception"; // an exception was trapped and being reported

export type QueryResultValueNature =
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "symbol"
  | "undefined"
  | "object"
  | "function";

export interface QueryResultValueModel {
  readonly exemplarValue: unknown;
  readonly suppliedName?: string;
  readonly humanFriendlyName: string;
  readonly valueType: string;
}

export interface QueryResultModel {
  readonly nature: QueryResultNature;
  readonly data: unknown;
  readonly valueModels: QueryResultValueModel[];
}

export interface QueryResultsModel {
  readonly nature: "multi-statements-result-models";
  readonly resultModels: QueryResultModel[];
  readonly statementsAST: unknown;
}

/**
 * The default type for returned rows.
 */
export type SqlRow = Array<unknown>;

/**
 * The default type for row returned
 * as objects.
 */
export type SqlRecord = Record<string, unknown>;

/**
 * Possible parameter values to be bound to a query.
 *
 * When values are bound to a query, they are
 * converted between JavaScript and SQLite types
 * in the following way:
 *
 * | JS type in | SQL type        | JS type out      |
 * |------------|-----------------|------------------|
 * | number     | INTEGER or REAL | number or bigint |
 * | bigint     | INTEGER         | number or bigint |
 * | boolean    | INTEGER         | number           |
 * | string     | TEXT            | string           |
 * | Date       | TEXT            | string           |
 * | Uint8Array | BLOB            | Uint8Array       |
 * | null       | NULL            | null             |
 * | undefined  | NULL            | null             |
 *
 * If no value is provided for a given parameter,
 * SQLite will default to NULL.
 *
 * If a `bigint` is bound, it is converted to a
 * signed 64 bit integer, which may overflow.
 *
 * If an integer value is read from the database, which
 * is too big to safely be contained in a `number`, it
 * is automatically returned as a `bigint`.
 *
 * If a `Date` is bound, it will be converted to
 * an ISO 8601 string: `YYYY-MM-DDTHH:MM:SS.SSSZ`.
 * This format is understood by built-in SQLite
 * date-time functions. Also see https://sqlite.org/lang_datefunc.html.
 */
export type SqlQueryParameter =
  | boolean
  | number
  | bigint
  | string
  | null
  | undefined
  | Date
  | Uint8Array;

/**
 * A set of query parameters.
 *
 * When a query is constructed, it can contain
 * either positional or named parameters. For
 * more information see https://www.sqlite.org/lang_expr.html#parameters.
 *
 * A set of parameters can be passed to
 * a query method either as an array of
 * parameters (in positional order), or
 * as an object which maps parameter names
 * to their values:
 *
 * | SQL Parameter | QueryParameterSet       |
 * |---------------|-------------------------|
 * | `?NNN` or `?` | NNN-th value in array   |
 * | `:AAAA`       | value `AAAA` or `:AAAA` |
 * | `@AAAA`       | value `@AAAA`           |
 * | `$AAAA`       | value `$AAAA`           |
 *
 * See `QueryParameter` for documentation on
 * how values are converted between SQL
 * and JavaScript types.
 */
export type SqlQueryParameterSet =
  | Record<string, SqlQueryParameter>
  | Array<SqlQueryParameter>;

export interface SqlQueryParameterSetSupplier {
  readonly sqlQueryParams?: SqlQueryParameterSet;
}

export interface QueryExecutionRowsSupplier<
  R extends SqlRow = SqlRow,
> {
  readonly rows: Array<R>;
  readonly SQL: string;
  readonly params?: SqlQueryParameterSet;
}

export interface QueryExecutionRecordsSupplier<
  O extends SqlRecord = SqlRecord,
> {
  readonly records: Array<O>;
  readonly SQL: string;
  readonly params?: SqlQueryParameterSet;
}

export interface QueryExecutionRecordSupplier<
  O extends SqlRecord = SqlRecord,
> extends QueryExecutionRecordsSupplier<O> {
  readonly record: O;
}

export interface QueryRowsExecutor {
  <R extends SqlRow = SqlRow>(
    SQL: string,
    params?: SqlQueryParameterSet,
  ): Promise<QueryExecutionRowsSupplier<R>>;
}

export interface QueryRecordsExecutor {
  <O extends SqlRecord = SqlRecord>(
    SQL: string,
    params?: SqlQueryParameterSet,
  ): Promise<QueryExecutionRecordsSupplier<O>>;
}

export interface SqlEventEmitterContext {
  readonly dbee: SqlEventEmitter;
}

// deno-lint-ignore no-empty-interface
export interface SqlInstanceContext extends SqlEventEmitterContext {}

export interface SqlReadConnContext extends SqlEventEmitterContext {
  readonly rowsDQL: QueryRowsExecutor;
  readonly recordsDQL: QueryRecordsExecutor;
  readonly firstRecordDQL: <Object extends SqlRecord>(
    SQL: string,
    params?: SqlQueryParameterSet | undefined,
    options?: {
      readonly enhance?: (record: Record<string, unknown>) => Object;
      readonly onNotFound?: () => Object | undefined;
      readonly autoLimitSQL?: (SQL: string) => string;
    },
  ) => Promise<Object | undefined>;
}

export interface SqlWriteConnContext extends SqlEventEmitterContext {
  readonly rowsDML: QueryRowsExecutor;
}

export interface SqlDefineConnContext extends SqlEventEmitterContext {
  readonly rowsDDL: QueryRowsExecutor;
}

export type DbmsEngineIdentity = string;
export type DbmsEngineDatabaseIdentity = string;
export type DbmsEngineDbSchemaIdentity = string;
export type DbmsEngineDbTableIdentity = string;
export type DbmsEngineDbTableColumnIdentity = string;
export type DbmsEngineDbTableColumnNatureIdentity = string;

export interface DbmsTableColumnNature {
  readonly identity: DbmsEngineDbTableColumnNatureIdentity;
}

export interface DbmsTableUntypedColumn {
  readonly identity: DbmsEngineDbTableColumnIdentity;
}

export interface DbmsTableTypedColumn extends DbmsTableUntypedColumn {
  readonly nature: DbmsTableColumnNature;
}

export type DbmsTableColumn = DbmsTableUntypedColumn | DbmsTableTypedColumn;

export interface DbmsTable {
  readonly identity: DbmsEngineDbTableIdentity;
  readonly columns: Iterable<DbmsTableColumn>;
  readonly filteredColumns: (
    filter?: (c: DbmsTableColumn) => boolean,
  ) => Iterable<DbmsTableColumn>;
}

export interface DbmsTablesSupplier {
  readonly tables: Iterable<DbmsTable>;
  readonly filteredTables: (
    filter?: (t: DbmsTable) => boolean,
  ) => Iterable<DbmsTable>;
}

export interface DbmsEngineSchemalessDatabase extends DbmsTablesSupplier {
  readonly isSchemaDatabase: false;
  readonly identity: DbmsEngineDatabaseIdentity;
}

export interface DbmsEngineSchemaDatabase {
  readonly isSchemaDatabase: true;
  readonly identity: DbmsEngineDatabaseIdentity;
  readonly schemas: Iterable<DbmsEngineDatabaseSchema>;
  readonly filteredSchemas: (
    filter?: (s: DbmsEngineDatabaseSchema) => boolean,
  ) => Iterable<DbmsEngineDatabaseSchema>;
}

export interface DbmsEngineDatabaseSchema extends DbmsTablesSupplier {
  readonly identity: DbmsEngineDbSchemaIdentity;
}

export type DbmsEngineDatabase =
  | DbmsEngineSchemalessDatabase
  | DbmsEngineSchemaDatabase;

export interface DbmsEngine {
  readonly identity: DbmsEngineIdentity;
  readonly databases: Iterable<DbmsEngineDatabase>;
}

export type SqlStatementIdentity = string;

export interface SqlStatement {
  readonly identity: SqlStatementIdentity;
  readonly SQL: tmpl.InterpolationResult;
  // subclasses should provide params which bind to runtime
  //readonly params: SqlQueryParameterSet;
}

export interface DbmsInventoryContext extends SqlEventEmitterContext {
  readonly engines: (
    filter?: (e: DbmsEngine) => boolean,
  ) => Iterable<DbmsEngine>;
  readonly statements?: (
    filter?: (e: SqlStatement) => boolean,
  ) => Iterable<SqlStatement>;
}

export class SqlEventEmitter extends events.EventEmitter<{
  openingDatabase(cc: SqlInstanceContext): void;
  openedDatabase(cc: SqlInstanceContext): void;
  closingDatabase(cc: SqlInstanceContext): void;
  closedDatabase(cc: SqlInstanceContext): void;

  constructStorage(cc: SqlDefineConnContext): void;
  constructIdempotent(cc: SqlDefineConnContext): void;
  populateSeedData(cc: SqlWriteConnContext): void;

  executedDDL(result: QueryExecutionRowsSupplier): void;
  executedDML(result: QueryExecutionRowsSupplier): void;
  executedDQL(
    result:
      | QueryExecutionRowsSupplier
      | QueryExecutionRecordSupplier
      | QueryExecutionRecordsSupplier,
  ): void;
}> {
}
