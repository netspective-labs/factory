import { testingAsserts as ta } from "../deps-test.ts";
import { unindentWhitespace as uws } from "../../../text/whitespace.ts";
import * as mod from "./view.ts";
import * as tmpl from "../template/mod.ts";
import * as d from "../domain.ts";
import * as sch from "./schema.ts";

Deno.test("SQL Aide (SQLa) views", async (tc) => {
  const ctx = tmpl.typicalSqlEmitContext();

  await tc.step("idempotent view with columns inferred from select", () => {
    const view = mod.viewDefinition("synthetic_view")`
      SELECT this, that, the_other
        FROM table
       WHERE something = 'true'`;
    ta.assertEquals(
      view.SQL(ctx),
      uws(`
         CREATE VIEW IF NOT EXISTS "synthetic_view" AS
             SELECT this, that, the_other
               FROM table
              WHERE something = 'true'`),
    );
  });

  await tc.step(
    "idempotent namespaced view with columns inferred from select",
    () => {
      const view = mod.viewDefinition("synthetic_view", {
        embeddedStsOptions: tmpl.typicalSqlTextSupplierOptions(),
        sqlNS: sch.sqlSchemaDefn("synthetic_schema"),
      })`
      SELECT this, that, the_other
        FROM table
       WHERE something = 'true'`;
      ta.assertEquals(
        view.SQL(ctx),
        uws(`
         CREATE VIEW IF NOT EXISTS "synthetic_schema"."synthetic_view" AS
             SELECT this, that, the_other
               FROM table
              WHERE something = 'true'`),
      );
    },
  );

  await tc.step("idempotent view with type-safe columns specified", () => {
    const view = mod.safeViewDefinition("synthetic_view", {
      this: d.text(),
      that: d.text(),
      the_other: d.integer(),
    })`
      SELECT this, that, the_other
        FROM table
       WHERE something = 'true'`;
    // view.axiomObjectDecl?.the_other

    ta.assertEquals(
      view.SQL(ctx),
      uws(`
         CREATE VIEW IF NOT EXISTS "synthetic_view"("this", "that", "the_other") AS
             SELECT this, that, the_other
               FROM table
              WHERE something = 'true'`),
    );
  });

  await tc.step("temp view (non-idempotent)", () => {
    const view = mod.viewDefinition("synthetic_view", {
      embeddedStsOptions: tmpl.typicalSqlTextSupplierOptions(),
      isIdempotent: false,
      isTemp: true,
    })`
      SELECT this, that, the_other
        FROM table
       WHERE something = 'true'`;
    ta.assertEquals(
      view.SQL(ctx),
      uws(`
         CREATE TEMP VIEW "synthetic_view" AS
             SELECT this, that, the_other
               FROM table
              WHERE something = 'true'`),
    );
  });

  await tc.step("drop first then create then drop", () => {
    const view = mod.viewDefinition("synthetic_view", {
      embeddedStsOptions: tmpl.typicalSqlTextSupplierOptions(),
      isIdempotent: false,
      before: (viewName) => mod.dropView(viewName),
    })`
      SELECT this, that, the_other
        FROM table
       WHERE something = 'true'`;
    ta.assertEquals(
      view.SQL(ctx),
      uws(`
         DROP VIEW IF EXISTS "synthetic_view";
         CREATE VIEW "synthetic_view" AS
             SELECT this, that, the_other
               FROM table
              WHERE something = 'true'`),
    );

    ta.assertEquals(
      view.drop().SQL(ctx),
      `DROP VIEW IF EXISTS "synthetic_view"`,
    );
    ta.assertEquals(
      view.drop({ ifExists: false }).SQL(ctx),
      `DROP VIEW "synthetic_view"`,
    );
  });
});
