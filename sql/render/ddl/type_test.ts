import { testingAsserts as ta } from "../deps-test.ts";
import { unindentWhitespace as uws } from "../../../text/whitespace.ts";
import * as mod from "./type.ts";
import * as tmpl from "../template/mod.ts";
import * as d from "../domain.ts";
import * as sch from "./schema.ts";

Deno.test("SQL Aide (SQLa) types", async (tc) => {
  const ctx = tmpl.typicalSqlEmitContext();

  await tc.step("create SQL type", () => {
    const type = mod.sqlTypeDefinition("synthetic_type", {
      text: d.text(),
      int: d.integer(),
    });
    ta.assertEquals(
      type.SQL(ctx),
      uws(`
         CREATE TYPE "synthetic_type" AS (
             "text" TEXT,
             "int" INTEGER
         )`),
    );
  });

  await tc.step("create namspaced SQL type", () => {
    const type = mod.sqlTypeDefinition("synthetic_type", {
      text: d.text(),
      int: d.integer(),
    }, {
      embeddedStsOptions: tmpl.typicalSqlTextSupplierOptions(),
      sqlNS: sch.sqlSchemaDefn("synthetic_schema"),
    });
    ta.assertEquals(
      type.SQL(ctx),
      uws(`
         CREATE TYPE "synthetic_schema"."synthetic_type" AS (
             "text" TEXT,
             "int" INTEGER
         )`),
    );
  });

  await tc.step("drop first then create then drop", () => {
    const type = mod.sqlTypeDefinition("synthetic_type", {
      text: d.text(),
      int: d.integer(),
    }, {
      embeddedStsOptions: tmpl.typicalSqlTextSupplierOptions(),
      before: (typeName) => mod.dropType(typeName),
    });
    ta.assertEquals(
      type.SQL(ctx),
      uws(`
         DROP TYPE IF EXISTS "synthetic_type";
         CREATE TYPE "synthetic_type" AS (
             "text" TEXT,
             "int" INTEGER
         )`),
    );

    ta.assertEquals(
      type.drop().SQL(ctx),
      `DROP TYPE IF EXISTS "synthetic_type"`,
    );
    ta.assertEquals(
      type.drop({ ifExists: false }).SQL(ctx),
      `DROP TYPE "synthetic_type"`,
    );
  });
});
