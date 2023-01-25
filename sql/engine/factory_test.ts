import { testingAsserts as ta } from "./deps-test.ts";
import * as whs from "../../text/whitespace.ts";
import * as eng from "./engine.ts";
import * as SQLa from "../render/mod.ts";
import * as mod from "./factory.ts";

// const isCICD = Deno.env.get("CI") ? true : false;

Deno.test("detect engine instance from query using custom instance preparer", async (tc) => {
  const ctx = SQLa.typicalSqlEmitContext();
  type Context = typeof ctx;
  const stsEngineCustom = mod.sqlTextSuppliedEngineCustom<"osquery", Context>(
    (detected) => {
      switch (detected.engineInstanceID) {
        case "osquery":
          return {
            engineInstance: {
              identity: "osquery",
              // deno-lint-ignore no-explicit-any
            } as any,
            detected,
          };
        default:
          return undefined;
      }
    },
    {
      defaultInstance: (detected) => {
        return {
          engineInstance: {
            identity: "default",
            // deno-lint-ignore no-explicit-any
          } as any,
          detected,
        };
      },
    },
  );

  await tc.step("valid engine instance", () => {
    const osqValidTest: SQLa.SqlTextSupplier<typeof ctx> = {
      SQL: () =>
        whs.unindentWhitespace(`
          USE DATABASE osquery; -- https://osquery.io/\n
          SELECT computer_name, hostname, cpu_brand, cpu_physical_cores, cpu_logical_cores, printf("%.2f", (physical_memory / 1024.0 / 1024.0 / 1024.0)) as memory_gb
            FROM system_info`),
    };
    const result = stsEngineCustom.instance(ctx, osqValidTest);
    ta.assert(result);
    // make sure that the SQL is rewritten - removed `USE DATABASE osquery; -- https://osquery.io/\n` and left everything else
    ta.assert(SQLa.isMutatedSqlTextSupplier(result.detected.sqlTextSupplier));
    ta.assert(
      result.detected.sqlTextSupplier.SQL(ctx),
      whs.unindentWhitespace(`
        SELECT computer_name, hostname, cpu_brand, cpu_physical_cores, cpu_logical_cores, printf("%.2f", (physical_memory / 1024.0 / 1024.0 / 1024.0)) as memory_gb
          FROM system_info`),
    );
    ta.assert(result.engineInstance?.identity, "osquery");
  });

  await tc.step("bad spec test, misspelled USE DATABASE", () => {
    const badSpecTest: SQLa.SqlTextSupplier<typeof ctx> = {
      SQL: () =>
        whs.unindentWhitespace(`
          USE DATAASE bad_db_name_format
          SELECT this
            FROM that`),
    };
    const result = stsEngineCustom.instance(ctx, badSpecTest);
    ta.assertEquals(result, undefined);
  });

  await tc.step("unknown engine instance ID, use default", () => {
    const badInstanceTest: SQLa.SqlTextSupplier<typeof ctx> = {
      SQL: () =>
        whs.unindentWhitespace(`
          USE DATABASE bad_db_name; -- format is OK but name is not known
          SELECT this
            FROM that`),
    };
    const result = stsEngineCustom.instance(ctx, badInstanceTest);
    ta.assert(result);
    // make sure that the SQL is rewritten - removed `USE DATABASE bad_db_name; -- format is OK but name is not known` and left everything else
    ta.assert(SQLa.isMutatedSqlTextSupplier(result.detected.sqlTextSupplier));
    ta.assert(
      result.detected.sqlTextSupplier.SQL(ctx),
      whs.unindentWhitespace(`
        SELECT this
          FROM that`),
    );
    ta.assert(result.engineInstance?.identity, "default");
  });
});

Deno.test("detect engine instance from query using named instance preparers", async (tc) => {
  const ctx = SQLa.typicalSqlEmitContext();
  await tc.step("osQuery system_info execution", async () => {
    const sscEngine = mod.sqlShellCmdsEngine();
    const stsEngine = mod.sqlTextSuppliedEngine({
      "osquery": (detected) => ({
        engineInstance: sscEngine.osqueryi(),
        detected,
      }),
    });

    const sysInfoQuery: SQLa.SqlTextSupplier<typeof ctx> = {
      SQL: () =>
        whs.unindentWhitespace(`
          USE DATABASE osquery; -- https://osquery.io/\n
          SELECT computer_name, hostname, cpu_brand, cpu_physical_cores, cpu_logical_cores, printf("%.2f", (physical_memory / 1024.0 / 1024.0 / 1024.0)) as memory_gb
            FROM system_info`),
    };
    const result = stsEngine.instance(ctx, sysInfoQuery);
    ta.assert(result);
    // make sure that the SQL is rewritten - removed `USE DATABASE osquery; -- https://osquery.io/\n` and left everything else
    ta.assert(SQLa.isMutatedSqlTextSupplier(result.detected.sqlTextSupplier));
    ta.assert(
      result.detected.sqlTextSupplier.SQL(ctx),
      whs.unindentWhitespace(`
        SELECT computer_name, hostname, cpu_brand, cpu_physical_cores, cpu_logical_cores, printf("%.2f", (physical_memory / 1024.0 / 1024.0 / 1024.0)) as memory_gb
          FROM system_info`),
    );
    ta.assert(result.engineInstance);
    ta.assert(result.engineInstance.identity, "osqueryi");
    ta.assert(eng.isSqlReadRecordsConn(result.engineInstance));
    const osQER = await result.engineInstance.recordsDQL(ctx, sysInfoQuery);
    ta.assert(osQER);
    ta.assert(osQER.records);
  });
});
