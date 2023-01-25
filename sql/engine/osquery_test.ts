import { path, testingAsserts as ta } from "./deps-test.ts";
import * as ax from "../../axiom/mod.ts";
import * as whs from "../../text/whitespace.ts";
import * as SQLa from "../render/mod.ts";
import * as mod from "./osquery.ts";

const isCICD = Deno.env.get("CI") ? true : false;
const _thisModulePath = path.dirname(path.fromFileUrl(import.meta.url));

Deno.test("osQuery SQL shell command", async (tc) => {
  // GitHub actions won't have osQuery
  if (isCICD) return;

  const ctx = SQLa.typicalSqlEmitContext();
  type Context = typeof ctx;
  const osq = new mod.OsQueryCmdExecutive<Context>();

  await tc.step("untyped system_info query", async () => {
    const sysInfoQuery = {
      SQL: () =>
        whs.unindentWhitespace(`
          SELECT computer_name,
                 hostname,
                 cpu_brand,
                 cpu_physical_cores,
                 cpu_logical_cores,
                 printf("%.2f", (physical_memory / 1024.0 / 1024.0 / 1024.0)) as memory_gb
            FROM system_info`),
    };
    const osQER = await osq.recordsDQL(ctx, sysInfoQuery);
    ta.assert(osQER);
    ta.assert(osQER.records);
  });

  await tc.step("typed system_info query", async () => {
    const sysInfoSerDe = ax.axiomSerDeObject({
      computer_name: SQLa.text(),
      hostname: SQLa.text(),
      cpu_brand: SQLa.text(),
      cpu_physical_cores: SQLa.integer(),
      cpu_logical_cores: SQLa.integer(),
      memory_gb: SQLa.integer(), // TODO: convert to float?
    });

    const sysInfoQuery = {
      SQL: () =>
        whs.unindentWhitespace(`
          SELECT computer_name,
                 hostname,
                 cpu_brand,
                 cpu_physical_cores,
                 cpu_logical_cores,
                 printf("%.2f", (physical_memory / 1024.0 / 1024.0 / 1024.0)) as memory_gb
            FROM system_info`),
    };
    const osQER = await osq.firstRecordDQL(ctx, sysInfoQuery);
    ta.assert(osQER);
    ta.assert(osQER.record);
    const typedRecord = sysInfoSerDe.fromTextRecord(osQER.record);
    ta.assert(typedRecord.computer_name);
    ta.assertEquals("number", typeof typedRecord.cpu_physical_cores);
  });
});

Deno.test("osQuery reflection", async (tc) => {
  // GitHub actions won't have osQuery
  if (isCICD) return;

  const ctx = SQLa.typicalSqlEmitContext();
  type Context = typeof ctx;
  const db = new mod.OsQueryCmdExecutive<Context>();

  await tc.step("reflect all, validate system_info table", async () => {
    const tables = new Map<
      string,
      & SQLa.TableDefinition<string, Context>
      & SQLa.SqlDomainsSupplier<Context>
    >();
    for await (const td of db.reflectTables(ctx)) {
      tables.set(td.tableName, td);
      ta.assert(td.SQL(ctx));
    }
    ta.assert(tables.size);

    const si = tables.get("system_info");
    ta.assert(si);
    ta.assertEquals(19, si.domains.length);
    ta.assertEquals(si.SQL(ctx), systemInfoTableGolden);
  });
});

const systemInfoTableGolden = `CREATE TABLE "system_info" (
    "hostname" TEXT,
    "uuid" TEXT,
    "cpu_type" TEXT,
    "cpu_subtype" TEXT,
    "cpu_brand" TEXT,
    "cpu_physical_cores" INTEGER,
    "cpu_logical_cores" INTEGER,
    "cpu_microcode" TEXT,
    "physical_memory" BIGINT,
    "hardware_vendor" TEXT,
    "hardware_model" TEXT,
    "hardware_version" TEXT,
    "hardware_serial" TEXT,
    "board_vendor" TEXT,
    "board_model" TEXT,
    "board_version" TEXT,
    "board_serial" TEXT,
    "computer_name" TEXT,
    "local_hostname" TEXT
)`;
