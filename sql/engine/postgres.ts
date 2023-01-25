import { events } from "../deps.ts";
import * as ax from "../../axiom/mod.ts";
import * as axEnv from "../../axiom/axiom-serde-env.ts";
import * as pg from "https://deno.land/x/postgres@v0.16.1/mod.ts";
import * as SQLa from "../render/mod.ts";
import * as ex from "../execute/mod.ts";
import * as eng from "./engine.ts";
import * as fsP from "./fs-proxy.ts";
import * as cu from "./conn-uri.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export function pgDbConnEnvConfig(
  options?: { readonly ens?: axEnv.EnvVarNamingStrategy },
) {
  const eb = axEnv.envBuilder(options);
  const dbConnConfig = ax.axiomSerDeObject({
    configured: eb.bool("CONN_CONFIGURED", "PGCONN_CONFIGURED"),
    qeProxyFsHome: eb.textOptional("QUERYEXEC_CACHE_HOME"),
    identity: eb.text("IDENTITY", "PGAPPNAME"),
    database: eb.text("PGDATABASE"),
    hostname: eb.text("PGHOST", "PGHOSTADDR"),
    port: eb.integer("PGPORT"),
    user: eb.text("PGUSER"),
    password: eb.text("PGPASSWORD"),
    dbConnPoolCount: eb.integer("PGCONNPOOL_COUNT"),
  });
  type DbConnConfig = ax.AxiomType<typeof dbConnConfig>;
  return {
    envBuilder: eb,
    dbConnConfig,
    configure: (init?: DbConnConfig) => {
      return dbConnConfig.prepareRecordSync(init);
    },
    pgClientOptions: (configured: DbConnConfig) => {
      const textValue = (text: string) =>
        text == eb.textEnvPlaceholder ? undefined : text;
      const intValue = (int: number) =>
        int == eb.intEnvPlaceholder ? undefined : int;
      const pgco: pg.ClientOptions = {
        applicationName: textValue(configured.identity),
        database: textValue(configured.database),
        hostname: textValue(configured.hostname),
        port: intValue(configured.port),
        user: textValue(configured.user),
        password: textValue(configured.password),
        tls: { enabled: false },
      };
      return pgco;
    },
    missingValues: (
      dbc: DbConnConfig,
      ...validate: (keyof DbConnConfig)[]
    ) => {
      return dbConnConfig.missingValues(dbc, ...validate);
    },
  };
}

export function pgDbConnUriConfig() {
  type ConnProps = cu.EngineInstanceConnProps & {
    readonly applicationName?: string;
    readonly tls?: { enabled: boolean };
    readonly dbConnPoolCount?: number;
  };

  return {
    configure: (
      dbURI: string | (() => string),
      options?: cu.EngineConnPropsOptions<ConnProps>,
    ) => {
      return cu.engineConnProps<ConnProps>(dbURI, {
        transformQueryParam: (key, value) => {
          if (key == "appname") return { key: "applicationName", value };
          if (key == "tls") {
            return {
              key,
              value: { enabled: value == "true" || value == "yes" },
            };
          }
          return { key: key as keyof ConnProps, value };
        },
        ...options,
      });
    },
    isValid: (connProps: ConnProps) =>
      connProps && connProps.driver == "postgres" && connProps.database &&
      connProps.host,
    pgClientOptions: (connProps: ConnProps) => {
      const pgco: pg.ClientOptions = {
        applicationName: connProps.applicationName,
        database: connProps.database,
        hostname: connProps.host,
        port: connProps.port,
        user: connProps.username,
        password: connProps.password,
        tls: connProps.tls,
      };
      return pgco;
    },
  };
}

export function pgDbConnEnvInstanceInit<Context extends SQLa.SqlEmitContext>(
  options?: {
    readonly ens?: axEnv.EnvVarNamingStrategy;
    readonly inherit?: Partial<
      Omit<PostgreSqlInstanceInit<Context>, "clientOptions">
    >;
    readonly onNotConfigured?: () =>
      | PostgreSqlInstanceInit<Context>
      | undefined;
  },
) {
  const pgCEC = pgDbConnEnvConfig(options); // prepare the typed conn defn
  const config = pgCEC.configure(); // "read" all the properties from env
  if (config.configured) {
    const result: PostgreSqlInstanceInit<Context> = {
      clientOptions: () => pgCEC.pgClientOptions(pgCEC.configure()),
      qeProxy: config.qeProxyFsHome
        ? (() =>
          fsP.fileSysSqlProxyEngine<Context>().fsProxy({
            resultsStoreHome: () => config.qeProxyFsHome!,
          }))
        : undefined,
      ...options?.inherit,
    };
    return result;
  } else {
    return options?.onNotConfigured?.();
  }
}

export class PostgreSqlEventEmitter<
  Context extends SQLa.SqlEmitContext,
  Engine extends eng.SqlEngine = eng.SqlEngine,
  Instance extends PostgreSqlInstance<Context> = PostgreSqlInstance<Context>,
  Connection extends pg.Client = pg.Client,
> extends events.EventEmitter<{
  openingDatabase(i: Instance): void;
  openedDatabase(i: Instance): void;
  closingDatabase(i: Instance): void;
  closedDatabase(i: Instance): void;

  testingConnection(SQL: string): void;
  testedConnValid(c: Connection, SQL: string): void;
  testedConnInvalid(error: Error, SQL: string): void;

  connected(c: Connection): void;
  releasing(c: Connection): void;

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

export interface PostgreSqlInstanceInit<Context extends SQLa.SqlEmitContext> {
  readonly instanceID?: string;
  readonly clientOptions: () => pg.ClientOptions;
  readonly poolCount?: number;
  readonly prepareEE?: (
    suggested: PostgreSqlEventEmitter<Context>,
  ) => PostgreSqlEventEmitter<Context>;
  readonly autoCloseOnUnload?: boolean;
  readonly qeProxy?: () => ex.QueryExecutionProxy<Context>;
}

export type PostgreSqlEngine = eng.SqlEngine;

export function postgreSqlEngine<Context extends SQLa.SqlEmitContext>() {
  const instances = new Map<string, PostgreSqlInstance<Context>>();
  const result: PostgreSqlEngine = {
    identity: "PostgreSQL `deno-postgres` Engine",
  };
  const engine = {
    ...result,
    envConfig: (envVarNamePrefix: string) => {
      return pgDbConnEnvConfig({ ens: (given) => envVarNamePrefix + given });
    },
    envInstanceInit: (envVarNamePrefix: string, options?: {
      readonly inherit?: Partial<
        Omit<PostgreSqlInstanceInit<Context>, "clientOptions">
      >;
      readonly onNotConfigured?: () =>
        | PostgreSqlInstanceInit<Context>
        | undefined;
    }) => {
      return pgDbConnEnvInstanceInit<Context>({
        ens: (given) => envVarNamePrefix + given,
        ...options,
      });
    },
    instance: (ii: PostgreSqlInstanceInit<Context>) => {
      const sfn = ii.instanceID;
      let instance = sfn ? instances.get(sfn) : undefined;
      if (!instance) {
        instance = new PostgreSqlInstance(ii);
        if (sfn) instances.set(sfn, instance);
      }
      return instance;
    },
    envInstance: (envVarNamePrefix: string, options?: {
      readonly inherit?: Partial<
        Omit<PostgreSqlInstanceInit<Context>, "clientOptions">
      >;
      readonly onNotConfigured?: () =>
        | PostgreSqlInstance<Context>
        | undefined;
    }) => {
      const pgII = engine.envInstanceInit(envVarNamePrefix);
      if (pgII) return engine.instance(pgII);
      return options?.onNotConfigured?.();
    },
  };
  return engine;
}

export function postgreSqlRowsExecutor<Context extends SQLa.SqlEmitContext>(
  acquireConn: (ctx: Context) => Promise<pg.PoolClient>,
  releaseConn: <Row extends ex.SqlRow>(
    c: pg.PoolClient,
    result: ex.QueryExecutionRowsSupplier<Row, Context>,
    ctx: Context,
    // deno-lint-ignore require-await
  ) => Promise<void> = async (c) => c.release(),
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

    const conn = await acquireConn(ctx);
    const qaResult = await conn.queryArray<Row>(
      query.SQL(ctx),
      query.sqlQueryParams,
    );
    const result: ex.QueryExecutionRowsSupplier<Row, Context> = {
      rows: qaResult.rows,
      query,
    };

    // "enriching" can be a transformation function, cache store, etc.
    const { enrich } = options ?? {};
    const enriched = enrich ? await enrich(result) : result;
    await releaseConn(conn, enriched, ctx);
    return enriched;
  };
  return executor;
}

export function postgreSqlRecordsExecutor<Context extends SQLa.SqlEmitContext>(
  acquireConn: (ctx: Context) => Promise<pg.PoolClient>,
  releaseConn: <Object extends ex.SqlRecord>(
    c: pg.PoolClient,
    result: ex.QueryExecutionRecordsSupplier<Object, Context>,
    ctx: Context,
    // deno-lint-ignore require-await
  ) => Promise<void> = async (c) => c.release(),
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

    const conn = await acquireConn(ctx);
    const qoResult = await conn.queryObject<Object>(
      query.SQL(ctx),
      query.sqlQueryParams,
    );
    const result: ex.QueryExecutionRecordsSupplier<Object, Context> = {
      records: qoResult.rows,
      query,
    };

    // "enriching" can be a transformation function, cache store, etc.
    const { enrich } = options ?? {};
    const enriched = enrich ? await enrich(result) : result;
    await releaseConn(conn, enriched, ctx);
    return enriched;
  };
  return executor;
}

export class PostgreSqlInstance<Context extends SQLa.SqlEmitContext>
  implements
    eng.SqlEngineInstance<PostgreSqlEngine>,
    eng.SqlDefineConn<PostgreSqlEngine, PostgreSqlInstance<Context>, Context>,
    eng.SqlReadRowsConn<PostgreSqlEngine, PostgreSqlInstance<Context>, Context>,
    eng.SqlReadRecordsConn<
      PostgreSqlEngine,
      PostgreSqlInstance<Context>,
      Context
    >,
    eng.SqlWriteConn<PostgreSqlEngine, PostgreSqlInstance<Context>, Context> {
  readonly identity: string;
  readonly dbClientOptions: pg.ClientOptions;
  readonly dbPool: pg.Pool;
  readonly pgEE: PostgreSqlEventEmitter<Context>;
  readonly rowsExec: ex.QueryRowsExecutor<Context>;
  readonly recordsExec: ex.QueryRecordsExecutor<Context>;
  readonly qeProxy?: ex.QueryExecutionProxy<Context>;

  constructor(pgii: PostgreSqlInstanceInit<Context>) {
    const pgco = pgii.clientOptions();
    this.dbPool = new pg.Pool(pgco, pgii.poolCount ?? 1, true);
    this.identity =
      `PostgreSQL::${pgco.hostname}:${pgco.port} ${pgco.database}:${pgco.user}`;
    this.dbClientOptions = pgco;
    this.qeProxy = pgii.qeProxy?.();

    const pgEE = new PostgreSqlEventEmitter<Context>();
    this.pgEE = pgii.prepareEE?.(pgEE) ?? pgEE;

    this.rowsExec = postgreSqlRowsExecutor(
      async () => {
        const conn = await this.dbPool.connect();
        await pgEE.emit("connected", conn);
        return conn;
      },
      async (conn, result, ctx) => {
        if (this.qeProxy) this.qeProxy.persistExecutedRows(ctx, result);
        await pgEE.emit("releasing", conn);
        conn.release();
      },
    );
    this.recordsExec = postgreSqlRecordsExecutor(
      async () => {
        const conn = await this.dbPool.connect();
        await pgEE.emit("connected", conn);
        return conn;
      },
      async (conn, result, ctx) => {
        if (this.qeProxy) {
          this.qeProxy.persistExecutedRecords(ctx, result);
        }
        await pgEE.emit("releasing", conn);
        conn.release();
      },
    );

    if (pgii.autoCloseOnUnload) {
      globalThis.addEventListener("unload", async () => await this.close());
    }
  }

  async isConnectable() {
    const testSQL = `SELECT 1`;
    this.pgEE.emitSync("testingConnection", testSQL);
    try {
      const conn = await this.dbPool.connect();
      await conn.queryArray(testSQL);
      this.pgEE.emit("testedConnValid", conn, testSQL);
      conn.release();
      return true;
    } catch (err) {
      this.pgEE.emit("testedConnInvalid", err, testSQL);
      return false;
    }
  }

  async close() {
    await this.pgEE.emit("closingDatabase", this);
    await this.dbPool.end();
    await this.pgEE.emit("closedDatabase", this);
  }

  async init() {
    await this.pgEE.emit("openingDatabase", this);

    this.pgEE.on("openedDatabase", async () => {
      await this.pgEE.emit("constructStorage", this);
      await this.pgEE.emit("constructIdempotent", this);
      await this.pgEE.emit("populateSeedData", this);
    });

    await this.pgEE.emit("openedDatabase", this);
  }

  async rowsDDL<Row extends ex.SqlRow>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRowsExecutorOptions<Row, Context>,
  ): Promise<ex.QueryExecutionRowsSupplier<Row, Context>> {
    const result = await this.rowsExec<Row>(ctx, query, options);
    this.pgEE.emit("executedDDL", result);
    return result;
  }

  async rowsDML<Row extends ex.SqlRow>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRowsExecutorOptions<Row, Context>,
  ): Promise<ex.QueryExecutionRowsSupplier<Row, Context>> {
    const result = await this.rowsExec<Row>(ctx, query, options);
    this.pgEE.emit("executedDML", result);
    return result;
  }

  async recordsDML<Object extends ex.SqlRecord>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRecordsExecutorOptions<Object, Context>,
  ): Promise<ex.QueryExecutionRecordsSupplier<Object, Context>> {
    const result = await this.recordsExec<Object>(ctx, query, options);
    this.pgEE.emit("executedDML", result);
    return result;
  }

  async rowsDQL<Row extends ex.SqlRow>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRowsExecutorOptions<Row, Context>,
  ): Promise<ex.QueryExecutionRowsSupplier<Row, Context>> {
    const result = await this.rowsExec<Row>(ctx, query, options);
    this.pgEE.emit("executedDQL", result);
    return result;
  }

  async recordsDQL<Object extends ex.SqlRecord>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRecordsExecutorOptions<Object, Context>,
  ): Promise<ex.QueryExecutionRecordsSupplier<Object, Context>> {
    const result = await this.recordsExec<Object>(ctx, query, options);
    this.pgEE.emit("executedDQL", result);
    return result;
  }

  async firstRecordDQL<Object extends ex.SqlRecord>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?:
      & ex.QueryRecordsExecutorOptions<Object, Context>
      & {
        readonly onNotFound?: () => Promise<
          | ex.QueryExecutionRecordSupplier<Object, Context>
          | undefined
        >;
        readonly autoLimitSQL?: (
          SQL: SQLa.SqlTextSupplier<Context>,
        ) => SQLa.SqlTextSupplier<Context>;
      },
  ): Promise<ex.QueryExecutionRecordSupplier<Object, Context> | undefined> {
    const result = await ex.firstRecordDQL(
      ctx,
      query,
      this.recordsExec,
      {
        reportRecordsDQL: async (result) => {
          await this.pgEE.emit("executedDQL", result);
        },
        ...options,
      },
    );
    return result;
  }
}
