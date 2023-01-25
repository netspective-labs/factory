import { testingAsserts as ta } from "../../deps-test.ts";
import * as mod from "../../ddl/table.ts";
import * as t from "./table.ts";
import * as tmpl from "../../template/mod.ts";
import * as d from "../../domain.ts";
import * as pgd from "./domain.ts";
import { unindentWhitespace as uws } from "../../../../text/whitespace.ts";

Deno.test("SQL Aide (SQLa) table keys", async (tc) => {
  const keysAxioms = {
    auto_inc_pk_id: t.postgreSqlSerialPrimaryKey(pgd.serial()),
    digest_manual_pk: d.sha1Digest(),
    digest_auto_pk: mod.uaDefaultablePrimaryKey(d.sha1Digest()),
    uuidv4_pk: d.uuidv4(),
    ulid_pk: d.ulid(),
    digest_first_then_ulid_pk: mod.uaDefaultablesTextPK(
      d.sha1Digest(),
      d.ulid(),
    ),
    digest_first_then_uuidv4_pk: mod.uaDefaultablesTextPK(
      d.sha1Digest(),
      d.uuidv4(),
    ),
  };
  const tableKeysOwner = mod.tableDefinition(
    "synthetic_table_keys",
    keysAxioms,
  );
  const ctx = tmpl.typicalSqlEmitContext();
  const ddlOptions = tmpl.typicalSqlTextSupplierOptions();
  const lintState = tmpl.typicalSqlLintSummaries(ddlOptions.sqlTextLintState);

  await tc.step("keys' table definition", () => {
    ta.assertEquals(
      tmpl.SQL(ddlOptions)`
        ${lintState.sqlTextLintSummary}

        ${tableKeysOwner}`.SQL(ctx),
      uws(`
        -- no SQL lint issues (typicalSqlTextLintManager)

        CREATE TABLE "synthetic_table_keys" (
            "auto_inc_pk_id" SERIAL PRIMARY KEY,
            "digest_manual_pk" TEXT NOT NULL,
            "digest_auto_pk" TEXT PRIMARY KEY,
            "uuidv4_pk" TEXT NOT NULL,
            "ulid_pk" TEXT NOT NULL,
            "digest_first_then_ulid_pk" TEXT PRIMARY KEY,
            "digest_first_then_uuidv4_pk" TEXT PRIMARY KEY
        );`),
    );
  });
});
