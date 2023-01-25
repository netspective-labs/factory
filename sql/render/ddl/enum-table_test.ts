import { testingAsserts as ta } from "../deps-test.ts";
import * as mod from "./enum-table.ts";
import * as tbl from "./table.ts";
import * as tmpl from "../template/mod.ts";
import * as ax from "../../../axiom/mod.ts";
import { unindentWhitespace as uws } from "../../../text/whitespace.ts";

Deno.test("SQL Aide (SQLa) numeric enum table", async (tc) => {
  // code is text, value is a number
  enum syntheticEnum1 {
    code1,
    code2,
  }

  const numericEnumModel = mod.enumTable(
    "synthetic_enum_numeric",
    syntheticEnum1,
  );

  const ctx = tmpl.typicalSqlEmitContext();

  await tc.step("table definition", () => {
    ta.assert(tbl.isTableDefinition(numericEnumModel));
    ta.assert(mod.isEnumTableDefn(numericEnumModel));
    ta.assert(numericEnumModel);
    ta.assertEquals("synthetic_enum_numeric", numericEnumModel.tableName);
    ta.assert(numericEnumModel.domains.length == 3);
    ta.assertEquals(
      ["code", "value", "created_at"],
      numericEnumModel.domains.map((cd) => cd.identity),
    );
  });

  await tc.step("table creation SQL", () => {
    ta.assertEquals(
      numericEnumModel.SQL(ctx),
      uws(`
        CREATE TABLE "synthetic_enum_numeric" (
            "code" INTEGER PRIMARY KEY,
            "value" TEXT NOT NULL,
            "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
        )`),
    );
  });

  await tc.step("DML type-safety", () => {
    const expectType = <T>(_value: T) => {
      // Do nothing, the TypeScript compiler handles this for us
    };
    const row = numericEnumModel.prepareInsertable({
      code: syntheticEnum1.code1,
      value: "code1",
    });
    expectType<number | tmpl.SqlTextSupplier<tmpl.SqlEmitContext>>(row.code); // should see compile error if this doesn't work
    expectType<string | tmpl.SqlTextSupplier<tmpl.SqlEmitContext>>(row.value); // should see compile error if this doesn't work
  });

  await tc.step("typed Typescript objects", () => {
    type Synthetic = ax.AxiomType<typeof numericEnumModel>;
    const synthetic: Synthetic = {
      code: 1,
      value: "code1",
      created_at: new Date(),
    };
    ta.assert(numericEnumModel.test(synthetic, {
      onInvalid: (reason) => {
        console.log(reason);
      },
    }));
  });

  // deno-fmt-ignore
  await tc.step("seed DML row values", () => {
    const { seedDML } = numericEnumModel;
    ta.assert(Array.isArray(seedDML));
    ta.assertEquals(2, seedDML.length);
    ta.assertEquals(`INSERT INTO "synthetic_enum_numeric" ("code", "value") VALUES (0, 'code1')`, seedDML[0].SQL(ctx));
    ta.assertEquals(`INSERT INTO "synthetic_enum_numeric" ("code", "value") VALUES (1, 'code2')`, seedDML[1].SQL(ctx));
  });
});

Deno.test("SQL Aide (SQLa) text enum table", async (tc) => {
  // code is text, value is text
  enum syntheticEnum2 {
    code1 = "value1",
    code2 = "value2",
    code3 = "value3",
  }

  const textEnumModel = mod.enumTextTable(
    "synthetic_enum_text",
    syntheticEnum2,
  );

  const ctx = tmpl.typicalSqlEmitContext();

  await tc.step("table definition", () => {
    ta.assert(tbl.isTableDefinition(textEnumModel));
    ta.assert(mod.isEnumTableDefn(textEnumModel));
    ta.assert(textEnumModel);
    ta.assertEquals("synthetic_enum_text", textEnumModel.tableName);
    ta.assert(textEnumModel.domains.length == 3);
    ta.assertEquals(
      ["code", "value", "created_at"],
      textEnumModel.domains.map((cd) => cd.identity),
    );
  });

  await tc.step("table creation SQL", () => {
    ta.assertEquals(
      textEnumModel.SQL(ctx),
      uws(`
        CREATE TABLE "synthetic_enum_text" (
            "code" TEXT PRIMARY KEY,
            "value" TEXT NOT NULL,
            "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
        )`),
    );
  });

  await tc.step("DML type-safety", () => {
    const expectType = <T>(_value: T) => {
      // Do nothing, the TypeScript compiler handles this for us
    };
    const row = textEnumModel.prepareInsertable({
      code: "code1",
      value: syntheticEnum2.code1,
    });
    expectType<string | tmpl.SqlTextSupplier<tmpl.SqlEmitContext>>(row.code); // should see compile error if this doesn't work
    expectType<string | tmpl.SqlTextSupplier<tmpl.SqlEmitContext>>(row.value); // should see compile error if this doesn't work
  });

  await tc.step("typed Typescript objects", () => {
    type Synthetic = ax.AxiomType<typeof textEnumModel>;
    const synthetic: Synthetic = {
      code: "code1",
      value: syntheticEnum2.code1,
      created_at: new Date(),
    };
    ta.assert(textEnumModel.test(synthetic, {
      onInvalid: (reason) => {
        console.log(reason);
      },
    }));
  });

  // deno-fmt-ignore
  await tc.step("seed DML row values", () => {
    const { seedDML } = textEnumModel;
    ta.assert(Array.isArray(seedDML));
    ta.assertEquals(3, seedDML.length);
    ta.assertEquals(`INSERT INTO "synthetic_enum_text" ("code", "value") VALUES ('code1', 'value1')`, seedDML[0].SQL(ctx));
    ta.assertEquals(`INSERT INTO "synthetic_enum_text" ("code", "value") VALUES ('code2', 'value2')`, seedDML[1].SQL(ctx));
    ta.assertEquals(`INSERT INTO "synthetic_enum_text" ("code", "value") VALUES ('code3', 'value3')`, seedDML[2].SQL(ctx));
  });
});

Deno.test("SQL Aide (SQLa) text enum table", async (tc) => {
  // deno-lint-ignore no-empty-enum
  enum EmptyEnum {
  }

  const emptyEnumModel = mod.enumTextTable(
    "empty_enum",
    EmptyEnum,
  );

  const ctx = tmpl.typicalSqlEmitContext();

  await tc.step("table definition", () => {
    ta.assert(tbl.isTableDefinition(emptyEnumModel));
    ta.assert(mod.isEnumTableDefn(emptyEnumModel));
    ta.assert(emptyEnumModel);
    ta.assertEquals("empty_enum", emptyEnumModel.tableName);
    ta.assert(emptyEnumModel.domains.length == 3);
    ta.assertEquals(
      ["code", "value", "created_at"],
      emptyEnumModel.domains.map((cd) => cd.identity),
    );
  });

  await tc.step("table creation SQL", () => {
    ta.assertEquals(
      emptyEnumModel.SQL(ctx),
      uws(`
        CREATE TABLE "empty_enum" (
            "code" TEXT PRIMARY KEY,
            "value" TEXT NOT NULL,
            "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
        )`),
    );
  });

  // deno-fmt-ignore
  await tc.step("seed DML text", () => {
    const { seedDML } = emptyEnumModel;
    ta.assert(typeof seedDML === "string");
    ta.assertEquals(seedDML, `-- no empty_enum seed rows`);
  });
});
