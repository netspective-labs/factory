import { testingAsserts as ta } from "../../deps-test.ts";
import * as mod from "./search_path.ts";
import * as sch from "../../ddl/schema.ts";
import * as tmpl from "../../template/mod.ts";

type SchemaName = "synthetic_schema1" | "synthetic_schema2";

Deno.test("SQL Aide (SQLa) schema", async (tc) => {
  const ctx = tmpl.typicalSqlEmitContext();

  await tc.step("PostgreSQL schema search path declaration", () => {
    const schema1 = sch.sqlSchemaDefn<SchemaName, tmpl.SqlEmitContext>(
      "synthetic_schema1",
    );
    const schema2 = sch.sqlSchemaDefn<SchemaName, tmpl.SqlEmitContext>(
      "synthetic_schema2",
    );

    const searchPath = mod.pgSearchPath<SchemaName, tmpl.SqlEmitContext>(
      schema1,
      schema2,
    );
    ta.assertEquals(
      searchPath.SQL(ctx),
      `SET search_path TO "synthetic_schema1", "synthetic_schema2"`,
    );
  });
});
