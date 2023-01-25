import * as rGovn from "./governance.ts";
import * as guard from "./guard.ts";
import * as dbs from "./dbselector.ts";
import * as p from "./proxy.ts";

export type ForeignSqlStmtPayload =
  & (
    | rGovn.ForeignSqlStmtIdentitySupplier
    | rGovn.ForeignSqlStmtSupplier
  )
  & Partial<rGovn.ForeigSqlStmtBindParamsSupplier>;

export function isForeignSqlStmtPayload(
  o: unknown,
): o is ForeignSqlStmtPayload {
  if (
    guard.isForeignSqlStmtIdentitySupplier(o) ||
    guard.isForeignSqlStmtSupplier(o)
  ) {
    return true;
  }
  return false;
}

export interface ExecuteForeignSqlStmtResultArgsSupplier<
  Data,
  Payload extends ForeignSqlStmtPayload = ForeignSqlStmtPayload,
> {
  readonly payload: Payload;
  readonly executeSQL: p.SqlProxySupplier<Data>;
  readonly identifiedSqlStmt: (
    ssID: string,
  ) => Promise<rGovn.ServerRuntimeSqlStmt | undefined>;
  readonly isEncounteredUseDbInSqlValid?: (
    databaseID: string,
  ) => string | undefined;
  readonly databaseIdSelector?: dbs.UseDatabaseIdDetector;
}

export interface ExecuteSqlProxyResult<
  Data = unknown,
> {
  identifiedSqlStmt?: rGovn.ServerRuntimeSqlStmt;
  ssSupplier?: rGovn.ForeignSqlStmtSupplier;
  error?: unknown;
  errorCtx?: Record<string, unknown>;
  proxyResult?: p.SqlProxyResult<Data>;
}

export async function executeSqlProxy<
  Payload extends ForeignSqlStmtPayload,
  Data = unknown,
>(
  params: ExecuteForeignSqlStmtResultArgsSupplier<Data, Payload>,
): Promise<ExecuteSqlProxyResult<Data>> {
  const { payload, databaseIdSelector } = params;
  const result: ExecuteSqlProxyResult<Data> = {};

  const errorResult = (
    error: unknown,
    errorCtx?: Record<string, unknown>,
  ) => {
    result.error = error;
    result.errorCtx = errorCtx;
    return result as ExecuteSqlProxyResult<Data>;
  };

  if (guard.isForeignSqlStmtIdentitySupplier(payload)) {
    result.identifiedSqlStmt = await params.identifiedSqlStmt(
      payload.qualifiedName,
    );
    if (result.identifiedSqlStmt) {
      result.ssSupplier = result.identifiedSqlStmt;
    } else {
      return errorResult("identified SQL statement not found", {
        searchedForID: payload.qualifiedName,
      });
    }
  } else {
    if (guard.isForeignSqlStmtSupplier(payload)) {
      result.ssSupplier = payload;
    } else {
      return errorResult(
        "payload is neither an identified SQL statement or SQL code",
      );
    }
  }

  if (!result.ssSupplier) {
    return errorResult("unable to determine SQL payload");
  }

  // if the foreign code supplier has exec args, they are the defaults
  let executeSqlBindParams: URLSearchParams | undefined;
  if (guard.isForeigSqlStmtBindParamsSupplier(result.ssSupplier)) {
    executeSqlBindParams = result.ssSupplier.sqlBindParams;
  }
  if (guard.isForeigSqlStmtBindParamsSupplier(payload)) {
    if (executeSqlBindParams) {
      executeSqlBindParams = new URLSearchParams({
        ...Object.fromEntries(executeSqlBindParams),
        ...Object.fromEntries(payload.sqlBindParams),
      });
    } else {
      executeSqlBindParams = payload.sqlBindParams;
    }
  }

  const executeSQL = result.ssSupplier.SQL;
  result.proxyResult = await params.executeSQL({
    executeSQL,
    executeSqlBindParams,
    databaseIdSelector,
  });
  return result;
}
