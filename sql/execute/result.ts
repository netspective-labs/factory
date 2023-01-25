import * as safety from "../../safety/mod.ts";
import * as SQLa from "../render/mod.ts";
import * as p from "./parameter.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

/**
 * The default type for returned rows.
 */
export type SqlRow = Array<unknown>;

/**
 * The default type for row returned
 * as objects.
 */
export type SqlRecord = Record<string, unknown>;

export interface QueryExecutionRowsSupplier<
  R extends SqlRow,
  Context extends SQLa.SqlEmitContext,
> {
  readonly rows: Array<R>;
  readonly query: p.SqlBindParamsTextSupplier<Context>;
  readonly error?: Error;
}

export interface QueryExecutionRecordsSupplier<
  O extends SqlRecord,
  Context extends SQLa.SqlEmitContext,
> {
  readonly records: Array<O>;
  readonly query: p.SqlBindParamsTextSupplier<Context>;
  readonly error?: Error;
}

export interface QueryExecutionRecordSupplier<
  O extends SqlRecord,
  Context extends SQLa.SqlEmitContext,
> extends QueryExecutionRecordsSupplier<O, Context> {
  readonly record: O;
}

export type QueryRowsExecutorOptions<
  R extends SqlRow,
  Context extends SQLa.SqlEmitContext,
> = {
  readonly proxy?: () => Promise<
    QueryExecutionRowsSupplier<R, Context> | undefined
  >;
  readonly enrich?: (
    result: QueryExecutionRowsSupplier<R, Context>,
  ) => Promise<QueryExecutionRowsSupplier<R, Context>>;
};

export type QueryRowsExecutor<
  Context extends SQLa.SqlEmitContext,
> = <R extends SqlRow>(
  ctx: Context,
  query: p.SqlBindParamsTextSupplier<Context>,
  options?: QueryRowsExecutorOptions<R, Context>,
) => Promise<QueryExecutionRowsSupplier<R, Context>>;

export type QueryRecordsExecutorOptions<
  O extends SqlRecord,
  Context extends SQLa.SqlEmitContext,
> = {
  readonly proxy?: () => Promise<QueryExecutionRecordsSupplier<O, Context>>;
  readonly enrich?: (
    result: QueryExecutionRecordsSupplier<O, Context>,
  ) => Promise<QueryExecutionRecordsSupplier<O, Context>>;
};

export type QueryRecordsExecutor<
  Context extends SQLa.SqlEmitContext,
> = <O extends SqlRecord>(
  ctx: Context,
  query: p.SqlBindParamsTextSupplier<Context>,
  options?: QueryRecordsExecutorOptions<O, Context>,
) => Promise<QueryExecutionRecordsSupplier<O, Context>>;

export const expiresOneSecondMS = 1000;
export const expiresOneMinuteMS = expiresOneSecondMS * 60;
export const expiresOneHourMS = expiresOneMinuteMS * 60;
export const expiresOneDayMS = expiresOneHourMS * 24;

export type RevivableQueryExecExpirationMS = "never" | number;

export interface RevivableQueryExecution {
  readonly expiresInMS: RevivableQueryExecExpirationMS;
  readonly serializedAt: Date;
}

export interface RevivedQueryExecution extends RevivableQueryExecution {
  readonly revivedAt: Date;
  readonly serializedAt: Date;
  readonly revivedFromFsPath: string;
}

export const isRevivedQueryExecution = safety.typeGuard<
  RevivedQueryExecution
>("expiresInMS", "serializedAt", "revivedAt");

export interface UnrevivableQueryExecution extends RevivableQueryExecution {
  readonly isUnrevivableQueryExecution: true;
  readonly reason: "expired" | "exception";
  readonly fsJsonPath: string;
}

export const isUnrevivableQueryExecution = safety.typeGuard<
  UnrevivableQueryExecution
>("expiresInMS", "isUnrevivableQueryExecution", "reason");

export function isQueryExecutionRowsSupplier<
  R extends SqlRow,
  Context extends SQLa.SqlEmitContext,
>(o: unknown): o is QueryExecutionRowsSupplier<R, Context> {
  const isQERS = safety.typeGuard<QueryExecutionRowsSupplier<R, Context>>(
    "rows",
    "query",
  );
  return isQERS(o);
}

export function isQueryExecutionRecordsSupplier<
  O extends SqlRecord,
  Context extends SQLa.SqlEmitContext,
>(o: unknown): o is QueryExecutionRecordsSupplier<O, Context> {
  const isQERS = safety.typeGuard<QueryExecutionRecordsSupplier<O, Context>>(
    "records",
    "query",
  );
  return isQERS(o);
}

export async function firstRecordDQL<
  Object extends SqlRecord,
  Context extends SQLa.SqlEmitContext,
>(
  ctx: Context,
  query: p.SqlBindParamsTextSupplier<Context>,
  qre: QueryRecordsExecutor<Context>,
  options?: QueryRecordsExecutorOptions<Object, Context> & {
    readonly reportRecordsDQL?: (
      selected: QueryExecutionRecordsSupplier<Object, Context>,
    ) => Promise<void>;
    readonly onNotFound?: () => Promise<
      | QueryExecutionRecordSupplier<Object, Context>
      | undefined
    >;
    readonly autoLimitSQL?: (
      SQL: SQLa.SqlTextSupplier<Context>,
    ) => SQLa.SqlTextSupplier<Context>;
  },
): Promise<QueryExecutionRecordSupplier<Object, Context> | undefined> {
  const {
    autoLimitSQL = (() => ({
      ...query,
      SQL: (ctx: Context) => `${query.SQL(ctx)} LIMIT 1`,
    })),
  } = options ?? {};
  const selected = await qre<Object>(ctx, autoLimitSQL(query), options);
  await options?.reportRecordsDQL?.(selected);
  if (selected.records.length > 0) {
    const record = selected.records[0];
    return { ...selected, record };
  }
  return options?.onNotFound ? await options.onNotFound() : undefined;
}

/**
 * Function to pass into QueryRowsExecutorOptions.enrich to mutate BigInt(s) to
 * Number(s). This is useful for many JS/TS functions that don't like BigInts.
 * @param result the database query execution result
 * @returns the original execution result with BigInt -> Number(BigInt)
 */
// deno-lint-ignore require-await
export async function mutateRowsBigInts<
  R extends SqlRow,
  Context extends SQLa.SqlEmitContext,
>(
  result: QueryExecutionRowsSupplier<R, Context>,
): Promise<QueryExecutionRowsSupplier<R, Context>> {
  const rows = result.rows;
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      if (typeof row[i] === "bigint") row[i] = Number(rows[i]);
    }
  }
  return result;
}

/**
 * Function to pass into QueryRecordsExecutorOptions.enrich to mutate BigInt(s)
 * toNumber(s). This is useful for many JS/TS functions that don't like BigInts.
 * @param result the database query execution result
 * @returns the original execution result with BigInt -> Number(BigInt)
 */
// deno-lint-ignore require-await
export async function mutateRecordsBigInts<
  O extends SqlRecord,
  Context extends SQLa.SqlEmitContext,
>(
  result: QueryExecutionRecordsSupplier<O, Context>,
): Promise<QueryExecutionRecordsSupplier<O, Context>> {
  const records = result.records;
  for (const record of records) {
    for (const entry of Object.entries(record)) {
      const [key, value] = entry;
      if (typeof value === "bigint") (record[key] as Any) = Number(record[key]);
    }
  }
  return result;
}
