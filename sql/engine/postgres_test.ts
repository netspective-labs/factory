import { testingAsserts as ta } from "./deps-test.ts";
import * as SQLa from "../render/mod.ts";
import * as mod from "./postgres.ts";
import * as fsP from "./fs-proxy.ts";
import * as ex from "../execute/mod.ts";

const isCICD = Deno.env.get("CI") ? true : false;

Deno.test("PostgreSQL engine connection properties configuration", async (tc) => {
  const pgdbcc = mod.pgDbConnEnvConfig();

  await tc.step("from code, individual properties", () => {
    const config = pgdbcc.configure({
      identity: "appName",
      database: "database",
      hostname: "hostname",
      port: 5433,
      user: "user",
      password: "password",
      dbConnPoolCount: 9,
    });
    ta.assertEquals(config.identity, "appName");
    ta.assertEquals(config.database, "database");
    ta.assertEquals(config.hostname, "hostname");
    ta.assertEquals(config.port, 5433);
    ta.assertEquals(config.user, "user");
    ta.assertEquals(config.password, "password");
    ta.assertEquals(config.dbConnPoolCount, 9);
    ta.assertEquals(pgdbcc.missingValues(config).length, 0);
  });

  await tc.step("from environment", () => {
    const syntheticEnv = {
      PGAPPNAME: "appName",
      PGDATABASE: "database",
      PGHOST: "hostname",
      PGPORT: 5433,
      PGUSER: "user",
      PGPASSWORD: "password",
      PGCONNPOOL_COUNT: 9,
    };
    Object.entries(syntheticEnv).forEach((se) => {
      const [envVarName, envVarValue] = se;
      Deno.env.set(envVarName, String(envVarValue));
    });

    const config = pgdbcc.configure();
    ta.assertEquals(config.identity, "appName");
    ta.assertEquals(config.database, "database");
    ta.assertEquals(config.hostname, "hostname");
    ta.assertEquals(config.port, 5433);
    ta.assertEquals(config.user, "user");
    ta.assertEquals(config.password, "password");
    ta.assertEquals(config.dbConnPoolCount, 9);
    ta.assertEquals(pgdbcc.missingValues(config).length, 0);

    Object.keys(syntheticEnv).forEach((envVarName) => {
      Deno.env.delete(envVarName);
    });
  });

  await tc.step("mixed code, env, and env alias", () => {
    const syntheticEnv = {
      PGUSER: "user-from-env", // primary env var name
      PGPASSWORD: "password-from-env", // aliased env var name, primary is SYNTHETIC_PASSWORD
    };
    Object.entries(syntheticEnv).forEach((se) => {
      const [envVarName, envVarValue] = se;
      Deno.env.set(envVarName, String(envVarValue));
    });

    const config = pgdbcc.configure({
      identity: pgdbcc.envBuilder.textEnvPlaceholder,
      database: "database-in-code",
      hostname: "hostname-in-code",
      port: 5433,
      user: pgdbcc.envBuilder.textEnvPlaceholder,
      password: pgdbcc.envBuilder.textEnvPlaceholder,
      dbConnPoolCount: 9,
    });
    // SYNTHETIC_IDENTITY and PGAPPNAME missing in env, and no value supplied
    ta.assertEquals(config.identity, pgdbcc.envBuilder.textEnvPlaceholder);

    ta.assertEquals(config.database, "database-in-code");
    ta.assertEquals(config.hostname, "hostname-in-code");
    ta.assertEquals(config.port, 5433); // from code
    ta.assertEquals(config.user, "user-from-env");
    ta.assertEquals(config.password, "password-from-env");
    ta.assertEquals(config.dbConnPoolCount, 9); // from code

    ta.assertEquals(pgdbcc.missingValues(config).length, 0);
    ta.assertEquals(
      ["identity"],
      pgdbcc.missingValues(
        config,
        "identity",
        "database",
        "hostname",
        "port",
        "user",
        "password",
      ).map((asd) => asd.identity),
    );

    const pgco = pgdbcc.pgClientOptions(config);
    ta.assertEquals(pgco.applicationName, undefined);
    ta.assertEquals(pgco.database, config.database);
    ta.assertEquals(pgco.hostname, config.hostname);
    ta.assertEquals(pgco.port, config.port);
    ta.assertEquals(pgco.user, config.user);
    ta.assertEquals(pgco.password, config.password);

    Object.keys(syntheticEnv).forEach((envVarName) => {
      Deno.env.delete(envVarName);
    });
  });
});

Deno.test("PostgreSQL engine connection URI configuration", async (tc) => {
  const pgdbcuc = mod.pgDbConnUriConfig();
  await tc.step("from code", () => {
    const config = pgdbcuc.configure(
      `postgres://user:password@hostname:5433/database?appname=appName`,
    );
    ta.assert(config);
    ta.assert(pgdbcuc.isValid(config));
    const pgClient = pgdbcuc.pgClientOptions(config);
    ta.assert(pgClient);
    ta.assertEquals(pgClient.applicationName, "appName");
    ta.assertEquals(pgClient.database, "database");
    ta.assertEquals(pgClient.hostname, "hostname");
    ta.assertEquals(pgClient.port, 5433);
    ta.assertEquals(pgClient.user, "user");
    ta.assertEquals(pgClient.password, "password");
  });

  await tc.step("from env var", () => {
    Deno.env.set(
      "SYNTHETIC_ENV",
      `postgres://user:password@hostname:5433/database?appname=appName`,
    );
    const config = pgdbcuc.configure(() => Deno.env.get("SYNTHETIC_ENV")!);
    Deno.env.delete("SYNTHETIC_ENV");
    ta.assert(config);
    ta.assert(pgdbcuc.isValid(config));
    const pgClient = pgdbcuc.pgClientOptions(config);
    ta.assert(pgClient);
    ta.assertEquals(pgClient.applicationName, "appName");
    ta.assertEquals(pgClient.database, "database");
    ta.assertEquals(pgClient.hostname, "hostname");
    ta.assertEquals(pgClient.port, 5433);
    ta.assertEquals(pgClient.user, "user");
    ta.assertEquals(pgClient.password, "password");
  });
});

Deno.test("PostgreSQL invalid connection", async () => {
  const pgdbcc = mod.pgDbConnEnvConfig();
  const config = pgdbcc.configure({
    identity: `netspective-labs/factory/sql/engine/postgres_test.ts`,
    database: "database",
    hostname: "hostname",
    port: 5433,
    user: "user",
    password: "user",
    dbConnPoolCount: 1,
  });
  ta.assertEquals(pgdbcc.missingValues(config).length, 0);

  const pgEngine = mod.postgreSqlEngine();
  const pgDBi = pgEngine.instance({
    clientOptions: () => pgdbcc.pgClientOptions(config),
    autoCloseOnUnload: true,
    poolCount: config.dbConnPoolCount,
  });
  ta.assert(!(await pgDBi.isConnectable()));
  pgDBi.close();
});

Deno.test("PostgreSQL valid connection from TESTVALID_PKC_* env with FS proxy", async () => {
  // if we're running in GitHub Actions or other Continuous Integration (CI)
  // or Continuous Delivery (CD) environment then PostgreSQL won't be available
  // so don't fail the test case, just don't run it
  if (isCICD) return;

  // this is the "query engine proxy file system" home, a temporary dir that is
  // deleted after all tests are run
  const qeProxyFsHome = await Deno.makeTempDir();

  // pgdbcc retrieves database connnection config values from the environment
  const pgdbcc = mod.pgDbConnEnvConfig({
    ens: (given) => `TESTVALID_PKC_${given}`,
  });

  const config = pgdbcc.configure({
    configured: true,
    qeProxyFsHome,
    identity: `netspective-labs/factory/sql/engine/postgres_test.ts`,
    database: "gitlabhq_production",
    hostname: "192.168.2.24",
    port: 5033,
    user: pgdbcc.envBuilder.textEnvPlaceholder, // must come from env
    password: pgdbcc.envBuilder.textEnvPlaceholder, // must come from env
    dbConnPoolCount: 1,
  });
  const pgco = pgdbcc.pgClientOptions(config);
  if (!pgco.user || !pgco.password) {
    console.error(
      `Unable to test valid PostgreSQL connection, TESTVALID_PKC_PGUSER or TESTVALID_PKC_PGPASSWORD env vars missing`,
    );
    return;
  }
  ta.assertEquals(pgdbcc.missingValues(config).length, 0);

  const pgEvents = new Map<string, { count: number }>();
  const pgEvent = (id: string) => {
    let result = pgEvents.get(id);
    if (!result) {
      result = { count: 0 };
      pgEvents.set(id, result);
    }
    return result;
  };

  const qeProxyEvents = new Map<string, { count: number }>();
  const qeProxyEvent = (id: string) => {
    let result = qeProxyEvents.get(id);
    if (!result) {
      result = { count: 0 };
      qeProxyEvents.set(id, result);
    }
    return result;
  };

  // The file system proxy engine allows us to store and retrieve ("cache")
  // query execution results; we call this a proxy rather than a cache in case
  // we want to retrieve results from another location.
  const fsProxyEngine = fsP.fileSysSqlProxyEngine();
  const fsProxy = fsProxyEngine.fsProxy({
    resultsStoreHome: () => qeProxyFsHome,
    onResultsStoreHomeStatError: (home) =>
      Deno.mkdirSync(home, { recursive: true }),
    prepareEE: (ee) => {
      // deno-lint-ignore require-await
      ee.on("executedDQL", async () => qeProxyEvent("executedDQL").count++);
      ee.on(
        "persistedExecutedRows",
        // deno-lint-ignore require-await
        async () => qeProxyEvent("persistedExecutedRows").count++,
      );
      ee.on(
        "persistedExecutedRecords",
        // deno-lint-ignore require-await
        async () => qeProxyEvent("persistedExecutedRecords").count++,
      );
      return ee;
    },
  });

  const pgEngine = mod.postgreSqlEngine();
  const pgDBi = pgEngine.instance({
    clientOptions: () => pgdbcc.pgClientOptions(config),
    qeProxy: () => fsProxy,
    autoCloseOnUnload: true,
    poolCount: config.dbConnPoolCount,
    prepareEE: (ee) => {
      ee.on(
        "openingDatabase",
        // deno-lint-ignore require-await
        async () => pgEvent("openingDatabase").count++,
      );
      // deno-lint-ignore require-await
      ee.on("openedDatabase", async () => pgEvent("openedDatabase").count++);
      ee.on(
        "testingConnection",
        // deno-lint-ignore require-await
        async () => pgEvent("testingConnection").count++,
      );
      ee.on(
        "testedConnValid",
        // deno-lint-ignore require-await
        async () => pgEvent("testedConnValid").count++,
      );
      ee.on(
        "testedConnInvalid",
        // deno-lint-ignore require-await
        async () => pgEvent("testedConnInvalid").count++,
      );
      // deno-lint-ignore require-await
      ee.on("connected", async () => pgEvent("connected").count++);
      // deno-lint-ignore require-await
      ee.on("releasing", async () => pgEvent("releasing").count++);
      // deno-lint-ignore require-await
      ee.on("executedDDL", async () => pgEvent("executedDDL").count++);
      // deno-lint-ignore require-await
      ee.on("executedDQL", async () => pgEvent("executedDQL").count++);
      // deno-lint-ignore require-await
      ee.on("executedDML", async () => pgEvent("executedDML").count++);
      ee.on(
        "closingDatabase",
        // deno-lint-ignore require-await
        async () => pgEvent("closingDatabase").count++,
      );
      // deno-lint-ignore require-await
      ee.on("closedDatabase", async () => pgEvent("closedDatabase").count++);
      return ee;
    },
  });
  const ctx = SQLa.typicalSqlEmitContext();
  const pgCatalogQuery = {
    SQL: () => `SELECT datname FROM pg_database WHERE datistemplate = false;`,
  };

  ta.assert(await pgDBi.isConnectable());
  await pgDBi.init();

  const pgCatalogQER = await pgDBi.recordsDQL(ctx, pgCatalogQuery);
  ta.assert(pgCatalogQER);

  await pgDBi.close();

  const expectedCanonicalEventResults = {
    "testingConnection": { count: 1 },
    "testedConnValid": { count: 1 },
    "openingDatabase": { count: 1 },
    "openedDatabase": { count: 1 },
    "connected": { count: 1 },
    "releasing": { count: 1 },
    "executedDDL": undefined,
    "executedDML": undefined,
    "executedDQL": { count: 1 },
    "closingDatabase": { count: 1 },
    "closedDatabase": { count: 1 },
    "testedConnInvalid": undefined,
  };
  for (const prop of Object.entries(expectedCanonicalEventResults)) {
    const [name, expectedValue] = prop;
    const evResult = pgEvents.get(name);
    ta.assertEquals(
      evResult,
      expectedValue,
      `'${name}' PostgreSQL event should be ${
        JSON.stringify(expectedValue)
      } not ${JSON.stringify(evResult)}`,
    );
  }

  /**
   * The previous step ran queries using canonical PostgreSQL engine. Because
   * the pg engine had qeProxy: () => fsProxy passed in, each query exec result
   * was persisted to the file system and stored in qeProxyFsHome. Now we want
   * to test to see if we can query the FS proxy with an unknown canonical store.
   * This might happen in case the canonical server is usually available but is
   * down now. Or, this might happen if queries were run on a server with access
   * to the canonical engine, stored in Git repo, and run on a server without
   * access to the canonical engine.
   */
  ta.assert(
    !(await fsProxy.isPersistedQueryExecResultExpired(
      ctx,
      pgCatalogQuery,
      "records",
      ex.expiresOneSecondMS * 30, // 30 seconds in milliseconds
    )),
  );

  const canonicalFSP = fsProxyEngine.canonicalFsProxy(
    fsProxy,
    () => undefined, // pretend that the database disappeared
  );
  const fspResult = await canonicalFSP.recordsDQL(ctx, pgCatalogQuery);
  ta.assertEquals(fspResult.query, pgCatalogQER.query);
  ta.assertEquals(fspResult.records, pgCatalogQER.records);
  ta.assert(ex.isRevivedQueryExecution(fspResult));
  ta.assertEquals(
    "never" as ex.RevivableQueryExecExpirationMS,
    fspResult.expiresInMS,
  );
  ta.assert(fspResult.serializedAt);
  ta.assert(fspResult.revivedAt);
  ta.assert(!fsProxy.isRevivedQueryExecResultExpired(fspResult));

  // if you want to see what was stored/revived:
  // console.log(
  //   Deno.readTextFileSync(fspResult.revivedFromFsPath),
  // );

  const expectedFsProxyEventResults = {
    "executedDQL": { count: 1 },
    "persistedExecutedRecords": { count: 1 },
    "persistedExecutedRows": undefined,
  };
  for (const prop of Object.entries(expectedFsProxyEventResults)) {
    const [name, expectedValue] = prop;
    const evResult = qeProxyEvents.get(name);
    ta.assertEquals(
      evResult,
      expectedValue,
      `'${name}' FS proxy event should be ${
        JSON.stringify(expectedValue)
      } not ${JSON.stringify(evResult)}`,
    );
  }

  await Deno.remove(qeProxyFsHome, { recursive: true });
});
