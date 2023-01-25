import { testingAsserts as ta } from "../../deps-test.ts";
import * as d from "../../domain.ts";
import * as mod from "./domain.ts";
import * as tmpl from "../../template/mod.ts";
import { unindentWhitespace as uws } from "../../../../text/whitespace.ts";

Deno.test("SQL Aide (SQLa) custom data type (domain)", async (tc) => {
  const ctx = tmpl.typicalSqlEmitContext();

  await tc.step("idempotent domain declaration", () => {
    const domain = mod.pgDomainDefn(d.text(), "custom_type_1", {
      isIdempotent: true,
    });
    ta.assertEquals(
      domain.SQL(ctx),
      `BEGIN CREATE DOMAIN custom_type_1 AS TEXT; EXCEPTION WHEN DUPLICATE_OBJECT THEN /* ignore error without warning */ END`,
    );
  });

  await tc.step("idempotent domain declaration with warning", () => {
    const domain = mod.pgDomainDefn(d.text(), "custom_type_1", {
      isIdempotent: true,
      warnOnDuplicate: (identifier) =>
        `domain "${identifier}" already exists, skipping`,
    });
    ta.assertEquals(
      domain.SQL(ctx),
      `BEGIN CREATE DOMAIN custom_type_1 AS TEXT; EXCEPTION WHEN DUPLICATE_OBJECT THEN RAISE NOTICE 'domain "custom_type_1" already exists, skipping'; END`,
    );
  });

  await tc.step(
    "idempotent domain declaration with warning, human friendly format",
    () => {
      const domain = mod.pgDomainDefn(d.text(), "custom_type_1", {
        isIdempotent: true,
        warnOnDuplicate: (identifier) =>
          `domain "${identifier}" already exists, skipping`,
        humanFriendlyFmtIndent: "  ",
      });
      ta.assertEquals(
        domain.SQL(ctx),
        uws(`
          BEGIN
            CREATE DOMAIN custom_type_1 AS TEXT;
          EXCEPTION
            WHEN DUPLICATE_OBJECT THEN
              RAISE NOTICE 'domain "custom_type_1" already exists, skipping';
          END`),
      );
    },
  );

  await tc.step("schema declaration (non-idempotent)", () => {
    const view = mod.pgDomainDefn(d.integer(), "custom_type_2");
    ta.assertEquals(
      view.SQL(ctx),
      `CREATE DOMAIN custom_type_2 AS INTEGER`,
    );
  });
});
