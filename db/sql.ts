import { colors, pg, pgQuery as pgq } from "./deps.ts";
import * as safety from "../safety/mod.ts";
import * as c from "../cache/mod.ts";
import * as conf from "./conf.ts";

declare global {
  interface Window {
    globalSqlResultsCache: ResultsCache;
    globalSqlResultsCacheHealth: c.CacheHealth;
    globalSqlDbConns: Map<string, DatabaseConnection>;
    postgresSqlDbConnSpecValidity: (
      name: string,
      envVarNamesPrefix?: string,
    ) => conf.DatabaseConnectionArguments;
    acquirePostgresSqlDbConn: (
      name: string,
      envVarNamesPrefix?: string,
    ) => DatabaseConnection;
  }
}

export async function configureSqlGlobals() {
  if (!window.globalSqlResultsCache) {
    const [dbResultsCache, dbResultsCacheHealth] = await c.redisCache<
      SqlResultSupplier<unknown>
    >({
      onSuccess: (_init, report) => {
        console.info(
          colors.yellow(
            // deno-fmt-ignore
            `Redis server ${colors.green(report.hostname)}${colors.gray(":" + String(report.port))} integrated`,
          ),
        );
      },
    });
    if (!window.globalSqlDbConns) {
      window.globalSqlDbConns = new Map<string, DatabaseConnection>();
    }

    window.globalSqlResultsCache = dbResultsCache;
    window.globalSqlResultsCacheHealth = dbResultsCacheHealth;
  }
}

export async function preparePostgreSqlGlobals(
  options?: {
    readonly applicationName?: string;
    readonly decorateDbConnValidityArgs?: (
      suggested: conf.DatabaseConnectionArguments,
      origin: string,
      envVarNamesPrefix?: string,
    ) => conf.DatabaseConnectionArguments;
    readonly decorateDbConnAcquireArgs?: (
      suggested: conf.DatabaseConnectionArguments,
      origin: string,
      envVarNamesPrefix?: string,
    ) => conf.DatabaseConnectionArguments;
    readonly decorateDbConn?: (
      conn: DatabaseConnection,
      dcArgs: conf.DatabaseConnectionArguments,
      origin: string,
      envVarNamesPrefix?: string,
    ) => DatabaseConnection;
  },
) {
  await configureSqlGlobals();

  window.postgresSqlDbConnSpecValidity = (identity, envVarNamesPrefix) => {
    return conf.envConfiguredDatabaseConnection(
      identity,
      envVarNamesPrefix,
      options?.decorateDbConnValidityArgs,
    );
  };

  window.acquirePostgresSqlDbConn = (identity, envVarNamesPrefix) => {
    let conn = window.globalSqlDbConns.get(identity);
    if (!conn) {
      const dbc = conf.envConfiguredDatabaseConnection(
        identity,
        envVarNamesPrefix,
        options?.decorateDbConnAcquireArgs,
      );
      conn = new TypicalDatabaseConnection({
        applicationName: options?.applicationName,
        ...dbc,
        resultsCache: window.globalSqlResultsCache,
      });
      if (options?.decorateDbConn) {
        conn = options?.decorateDbConn(conn, dbc, identity, envVarNamesPrefix);
      }
      window.globalSqlDbConns.set(identity, conn);
    }
    return conn;
  };
}

// deno-lint-ignore require-await
export async function destroyPostgreSqlGlobals() {
  for (const dbConn of window.globalSqlDbConns.values()) {
    dbConn.close();
  }
}

export type ResultCacheKey = string;

export type SQL = string;

export interface SqlSupplier {
  readonly SQL: SQL;
}

export interface SqlResultSupplier<T> extends SqlSupplier {
  readonly result: pgq.QueryObjectResult<T>;
}

export interface CacheableResult {
  readonly cacheKey: ResultCacheKey;
}

export interface ResultTransformer<T> {
  (srs: SqlResultSupplier<T>): SqlResultSupplier<T>;
}

export interface TransformableResult<T> {
  readonly transform: ResultTransformer<T>;
}

export const isSqlSupplier = safety.typeGuard<SqlSupplier>("SQL");

export const isCacheableResult = safety.typeGuard<CacheableResult>(
  "cacheKey",
);

export function isTransformableResult<T>(
  o: unknown,
): o is TransformableResult<T> {
  const isTR = safety.typeGuard<TransformableResult<T>>("transform");
  return isTR(o);
}

export type ResultsCache = c.TextKeyProxy<SqlResultSupplier<unknown>>;

export type DatabaseQuery<T> =
  | string
  | SqlSupplier
  | (SqlSupplier & CacheableResult)
  | (SqlSupplier & CacheableResult & TransformableResult<T>);

export interface DatabaseConnection {
  readonly identity: string;
  readonly dbConnPool: pg.Pool;
  readonly queryResult: <T>(
    ss: DatabaseQuery<T>,
  ) => Promise<SqlResultSupplier<T>>;
  readonly queryResultSingleRecord: <T>(
    ss: DatabaseQuery<T>,
    options?: {
      onRecordNotFound?: (ss: DatabaseQuery<T>) => T | undefined;
      onTooManyRecords?: (srs: SqlResultSupplier<T>) => T | undefined;
    },
  ) => Promise<T | undefined>;
  readonly close: () => void;
}

export class TypicalDatabaseConnection implements DatabaseConnection {
  readonly identity: string;
  readonly dbConnPool: pg.Pool;
  readonly resultsCache: ResultsCache;
  readonly dbName?: string;
  readonly dbUserName?: string;

  constructor(
    options: conf.DatabaseConnectionArguments & {
      resultsCache: ResultsCache;
    },
  ) {
    this.identity = options?.identity;
    this.dbConnPool = new pg.Pool(
      options,
      options.dbConnPoolCount,
      true, /* use lazy, not eager, connections */
    );
    this.resultsCache = options.resultsCache;
    this.dbName = options.database;
    this.dbUserName = options.user;
  }

  async close() {
    await this.dbConnPool.end();
  }

  async queryResult<T>(
    ssArg: DatabaseQuery<T>,
  ): Promise<SqlResultSupplier<T>> {
    const ss = (typeof ssArg === "string") ? { SQL: ssArg } : ssArg;
    const cacheKey = isCacheableResult(ss) ? ss.cacheKey : undefined;
    if (cacheKey) {
      // we await this in case resultsCache is redis or remote
      const result = this.resultsCache[cacheKey];
      if (result) {
        return result as SqlResultSupplier<T>;
      }
    }

    const client = await this.dbConnPool.connect();
    const queryResult = await client.queryObject<T>(ss.SQL);
    client.release();
    let fnResult: SqlResultSupplier<T> = {
      ...ss,
      result: queryResult,
    };
    if (isTransformableResult<T>(ss)) {
      fnResult = ss.transform(fnResult);
    }
    if (cacheKey) {
      this.resultsCache[cacheKey] = fnResult;
    }
    return fnResult;
  }

  async queryResultSingleRecord<T>(
    ss: DatabaseQuery<T>,
    options?: {
      onRecordNotFound?: (ss: DatabaseQuery<T>) => T | undefined;
      onTooManyRecords?: (srs: SqlResultSupplier<T>) => T | undefined;
    },
  ): Promise<T | undefined> {
    const qr = await this.queryResult(ss);
    if (qr.result.rowCount) {
      if (qr.result.rowCount == 1) return qr.result.rows[0];
      if (options?.onTooManyRecords) {
        return options?.onTooManyRecords(qr);
      }
    }
    if (options?.onRecordNotFound) {
      return options?.onRecordNotFound(qr);
    }
    return undefined;
  }
}
