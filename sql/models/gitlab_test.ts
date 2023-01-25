import { testingAsserts as ta } from "./deps-test.ts";
import * as ws from "../../text/whitespace.ts";
import * as pge from "../engine/postgres.ts";
import * as fsP from "../engine/fs-proxy.ts";
import * as ex from "../execute/mod.ts";
import * as mod from "./gitlab.ts";

// deno-lint-ignore no-explicit-any
type Any = any;
const isCICD = Deno.env.get("CI") ? true : false;

Deno.test("GitLab content from GLTEST_* env (with and without FS proxy)", async (tc) => {
  // if we're running in GitHub Actions or other Continuous Integration (CI)
  // or Continuous Delivery (CD) environment then PostgreSQL won't be available
  // so don't fail the test case, just don't run it
  if (isCICD) return;

  // this is the "query engine proxy file system" home, a temporary dir that is
  // deleted after all tests are run
  const qeProxyFsHome = await Deno.makeTempDir();

  // The file system proxy engine allows us to store and retrieve ("cache")
  // query execution results; we call this a proxy rather than a cache in case
  // we want to retrieve results from another location.
  const fsProxyEngine = fsP.fileSysSqlProxyEngine<mod.GitLabSqlEmitContext>();
  const fsProxy = fsProxyEngine.fsProxy({
    resultsStoreHome: () => qeProxyFsHome,
    onResultsStoreHomeStatError: (home) =>
      Deno.mkdirSync(home, { recursive: true }),
  });
  let fsProxyPopulated = false;

  // pgdbcc retrieves database connnection config values from the environment
  const pgdbcc = pge.pgDbConnEnvConfig({
    ens: (given) => `GLTEST_${given}`,
  });

  // this will store data across test cases
  let groupsCanonicalStash: ex.QueryExecutionRecordsSupplier<
    Any,
    mod.GitLabSqlEmitContext
  >;

  /**
   * This test case verifies that we can execute PostgreSQL engine queries and
   * store those queries into a local file system ("proxy") for retrieval in
   * case the canonical engine is not available.
   */
  await tc.step(
    "canonical, persisting query execution results to filesystem",
    async () => {
      // set any "required" env value to textEnvPlaceholder
      const { textEnvPlaceholder, intEnvPlaceholder } = pgdbcc.envBuilder;
      const config = pgdbcc.configure({
        configured: true,
        qeProxyFsHome,
        // the identity names a reusable connection pool; the PG engine uses the ID
        // to reuse a pool when a cached config identity is found.
        identity: `netspective-labs/factory/sql/models/gitlab_test.ts`,
        database: "gitlabhq_production",
        hostname: textEnvPlaceholder, // optionally from env
        port: intEnvPlaceholder, // optionally from env
        user: textEnvPlaceholder, // must come from env
        password: textEnvPlaceholder, // must come from env
        dbConnPoolCount: 1,
      });
      const pgco = pgdbcc.pgClientOptions(config);
      if (!pgco.hostname) pgco.hostname = "192.168.2.24";
      if (!pgco.port) pgco.port = 5033;
      if (!pgco.user || !pgco.password) {
        console.error(ws.unindentWhitespace(`
          Unable to test valid PostgreSQL connection, GLTEST_PGUSER or GLTEST_PGPASSWORD env vars missing.

          $ export GLTEST_PGUSER=gitlab_username GLTEST_PGPASSWORD=gitlab_password if PGHOSTADDR=${pgco.hostname} and PGPORT=${pgco.port} are OK, or
          $ export GLTEST_PGUSER=gitlab_username GLTEST_PGPASSWORD=gitlab_password GLTEST_PGHOSTADDR=x.y.z.n and GLTEST_PGPORT=nnnn`));
        return;
      }
      ta.assertEquals(pgdbcc.missingValues(config).length, 0);

      const pgEngine = pge.postgreSqlEngine<mod.GitLabSqlEmitContext>();
      const pgDBi = pgEngine.instance({
        clientOptions: () => pgco,
        autoCloseOnUnload: true,
        poolCount: config.dbConnPoolCount,
        qeProxy: () => fsProxy,
      });
      ta.assert(
        await pgDBi.isConnectable(),
        `Unable to connect using ${JSON.stringify(pgco)}`,
      );
      await pgDBi.init();

      const canonicalFSP = fsProxyEngine.canonicalFsProxy(fsProxy, () => pgDBi);
      const glCtx = mod.gitLabSqlEmitContext<mod.GitLabSqlEmitContext>();
      const glContent = mod.gitLabContent(() => canonicalFSP, glCtx);

      // Because the pg engine has qeProxy: () => fsProxy passed in, each query exec
      // result will be persisted to the file system using the query's identity
      // (usually a digest of the SQL statement text). The first time we execute any
      // query it will be run from "canonical" (PostgreSQL in this case). The second
      // time we execute, the results should come from the local FS proxy home (tmp
      // directory).
      const groupsCanonical = await glContent.groups();
      ta.assert(groupsCanonical);
      ta.assert(!ex.isRevivedQueryExecution(groupsCanonical));
      ta.assert(groupsCanonical.records.length > 0);
      groupsCanonicalStash = groupsCanonical;

      const groupsProxiedWithCanonical = await glContent.groups();
      ta.assert(ex.isRevivedQueryExecution(groupsProxiedWithCanonical));
      ta.assert(groupsProxiedWithCanonical.revivedFromFsPath);
      ta.assert(
        !fsProxy.isRevivedQueryExecResultExpired(groupsProxiedWithCanonical),
      );
      ta.assertEquals(
        groupsProxiedWithCanonical.query.SQL(glCtx),
        groupsCanonical.query.SQL(glCtx),
      );
      ta.assertEquals(
        groupsProxiedWithCanonical.records,
        groupsCanonical.records,
      );

      // if you want to see what was stored/revived:
      // console.log(
      //   Deno.readTextFileSync(groupsProxiedWithCanonical.revivedFromFsPath),
      // );

      const pkcGroupName = "Precision Knowledge Content";
      const pkcGroupQER = await glContent.group(pkcGroupName);
      ta.assert(!ex.isRevivedQueryExecution(pkcGroupQER));
      ta.assert(pkcGroupQER?.record);
      const pkcGroup = pkcGroupQER.record;

      const issues = await glContent.issues(pkcGroup);
      ta.assert(issues.content?.records);

      const ua = await glContent.userAnalytics(pkcGroup);
      ta.assert(ua.content?.records);

      await pgDBi.close();
      fsProxyPopulated = true;
    },
  );

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
  await tc.step("filesystem proxy without canonical", async () => {
    if (!fsProxyPopulated) {
      console.warn(
        `fsProxyPopulated is false, not running filesystem proxy without canonical test case`,
      );
      return;
    }

    const glCtx = mod.gitLabSqlEmitContext<mod.GitLabSqlEmitContext>();
    const fsProxyWithoutCanonical = fsProxyEngine.canonicalFsProxy(
      fsProxy,
      () => undefined, // if canonical is not configured or unavailable
    );
    const glFsPWCC = mod.gitLabContent(() => fsProxyWithoutCanonical, glCtx);
    const groupsProxiedWithoutCanonical = await glFsPWCC.groups();
    ta.assert(ex.isRevivedQueryExecution(groupsProxiedWithoutCanonical));
    ta.assert(groupsProxiedWithoutCanonical.revivedFromFsPath);
    ta.assert(
      !fsProxy.isRevivedQueryExecResultExpired(groupsProxiedWithoutCanonical),
    );
    ta.assertEquals(
      groupsProxiedWithoutCanonical.query.SQL(glCtx),
      groupsCanonicalStash.query.SQL(glCtx),
    );
    ta.assertEquals(
      groupsProxiedWithoutCanonical.records,
      groupsCanonicalStash.records,
    );

    // if you want to see what was stored/revived:
    // console.log(
    //   Deno.readTextFileSync(groupsProxiedWithoutCanonical.revivedFromFsPath),
    // );
  });

  await Deno.remove(qeProxyFsHome, { recursive: true });
});
