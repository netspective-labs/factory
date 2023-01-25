import { path, testingAsserts as ta } from "./deps-test.ts";
import * as SQLa from "../render/mod.ts";
import * as mod from "./sqlite.ts";

const thisModulePath = path.dirname(path.fromFileUrl(import.meta.url));

Deno.test("TODO: SQLite reflection", async (tc) => {
  const ctx = SQLa.typicalSqlEmitContext();
  type Context = typeof ctx;
  const se = mod.sqliteEngine<Context>();

  await tc.step("from code", async () => {
    const db = se.instance({
      storageFileName: () => path.join(thisModulePath, "sqlite_test.db"),
    });
    for await (const td of db.reflectTables(ctx)) {
      ta.assert(td.SQL(ctx));
    }
    db.close();
  });
});
