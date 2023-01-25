import * as SQLa from "../render/mod.ts";
import * as ex from "../execute/mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export interface QueryExecutionProxyStore<Context extends SQLa.SqlEmitContext> {
  persistExecutedRows: <Row extends ex.SqlRow>(
    ctx: Context,
    qers: ex.QueryExecutionRowsSupplier<Row, Context>,
    options?: {
      readonly expiresInMS?: ex.RevivableQueryExecExpirationMS;
    },
  ) => Promise<ex.QueryExecutionRowsSupplier<Row, Context>>;
  persistExecutedRecords: <Object extends ex.SqlRecord>(
    ctx: Context,
    qers: ex.QueryExecutionRecordsSupplier<Object, Context>,
    options?: {
      readonly expiresInMS?: ex.RevivableQueryExecExpirationMS;
    },
  ) => Promise<ex.QueryExecutionRecordsSupplier<Object, Context>>;
  isPersistedQueryExecResultExpired: (
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    format: "records" | "rows",
    expiresInMS: ex.RevivableQueryExecExpirationMS,
    onNotExists: (fsPath: string, err: Error) => Promise<boolean>,
  ) => Promise<boolean>;
  isRevivedQueryExecResultExpired: (
    rqe:
      | ex.QueryExecutionRowsSupplier<Any, Context>
      | ex.QueryExecutionRecordsSupplier<Any, Context>,
  ) => boolean;
}

export type QueryExecutionProxy<Context extends SQLa.SqlEmitContext> =
  QueryExecutionProxyStore<Context>;
