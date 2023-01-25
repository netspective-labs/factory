import * as hex from "https://deno.land/std@0.147.0/encoding/hex.ts";
import * as safety from "../../safety/mod.ts";
import * as SQLa from "../render/mod.ts";

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
 * SqlEngine will default to NULL.
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
 * This format is understood by built-in SqlEngine
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

export interface SqlBindParamsTextSupplier<
  Context extends SQLa.SqlEmitContext,
> extends SQLa.SqlTextSupplier<Context> {
  readonly sqlQueryParams?: SqlQueryParameterSet;
}

export function isSqlQueryParameterSetSupplier<
  Context extends SQLa.SqlEmitContext,
>(o: unknown): o is SqlBindParamsTextSupplier<Context> {
  const isSQPSS = safety.typeGuard<SqlBindParamsTextSupplier<Context>>(
    "sqlQueryParams",
  );
  return SQLa.isSqlTextSupplier<Context>(o) && isSQPSS(o);
}

export interface IdentifiableSqlBindParamsTextSupplier<
  Identity extends string,
  Context extends SQLa.SqlEmitContext,
> extends SqlBindParamsTextSupplier<Context> {
  readonly identity: (purpose: "exec-results-cache-key") => Identity;
}

export function isIdentifiableSqlBindParamsTextSupplier<
  Identity extends string,
  Context extends SQLa.SqlEmitContext,
>(
  o: unknown,
): o is IdentifiableSqlBindParamsTextSupplier<Identity, Context> {
  const isISQPSS = safety.typeGuard<
    IdentifiableSqlBindParamsTextSupplier<Identity, Context>
  >("identity");
  return isSqlQueryParameterSetSupplier<Context>(o) && isISQPSS(o);
}

/**
 * Create a unique identity for a given SQL query and context.
 * @param sts the SQL text supplier
 * @param ctx context in which we're evaluating the SQL text
 * @param purpose why we want the identity
 * @returns If the query implements IdentifiableSqlBindParamsTextSupplier, use
 * the given identity function otherwise create a digest of the actual SQL code
 * in the STS
 */
export async function sqlQueryIdentity<Context extends SQLa.SqlEmitContext>(
  sts: SqlBindParamsTextSupplier<Context>,
  ctx: Context,
  purpose: "exec-results-cache-key" = "exec-results-cache-key",
) {
  let identity: string;
  if (isIdentifiableSqlBindParamsTextSupplier(sts)) {
    identity = sts.identity(purpose);
  } else {
    const digest = await crypto.subtle.digest(
      "sha-1",
      new TextEncoder().encode(sts.SQL(ctx)),
    );
    identity = new TextDecoder().decode(hex.encode(new Uint8Array(digest)));
  }
  return identity;
}
