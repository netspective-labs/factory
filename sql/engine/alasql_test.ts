import { path, testingAsserts as ta } from "./deps-test.ts";
import * as SQLa from "../render/mod.ts";
import * as mod from "./alasql.ts";
import * as sqlite from "./sqlite.ts";

const thisModulePath = path.dirname(path.fromFileUrl(import.meta.url));

Deno.test("AlaSQL reflection", async (tc) => {
  const ctx = SQLa.typicalSqlEmitContext({
    sqlNamingStrategy: SQLa.bracketSqlNamingStrategy(),
  });
  type Context = typeof ctx;
  const db = new mod.AlaSqlProxyInstance<Context>({ instanceID: "synthetic" });

  const syntheticTable1Defn = SQLa.typicalKeysTableDefinition(
    "synthetic_table1",
    {
      synthetic_table1_id: SQLa.autoIncPrimaryKey(SQLa.integer()),
      column_one_text: SQLa.text(),
      column_two_text_nullable: SQLa.textNullable(),
      column_unique: { ...SQLa.text(), isUnique: true },
      column_linted: SQLa.lintedSqlDomain(
        SQLa.text(),
        SQLa.domainLintIssue("synthetic lint issue #1"),
      ),
    },
  );
  const syntheticTable1DefnRF = SQLa.tableDomainsRowFactory(
    syntheticTable1Defn.tableName,
    syntheticTable1Defn.axiomObjectDecl,
  );
  const syntheticTable1DefnVW = SQLa.tableDomainsViewWrapper(
    `${syntheticTable1Defn.tableName}_vw`,
    syntheticTable1Defn.tableName,
    syntheticTable1Defn.axiomObjectDecl,
  );

  await tc.step("populate synthetic", async () => {
    await db.rowsDDL(ctx, syntheticTable1Defn);
    await db.rowsDDL(ctx, syntheticTable1DefnVW);
    await db.rowsDQL(
      ctx,
      syntheticTable1DefnRF.insertDML({
        column_one_text: "one",
        column_unique: "unique",
        column_linted: "linted",
      }),
    );
  });

  await tc.step("reflect all, validate system_info table", async () => {
    const tables = new Map<
      string,
      & SQLa.TableDefinition<string, Context>
      & SQLa.SqlDomainsSupplier<Context>
    >();
    for await (const td of db.reflectTables(ctx)) {
      tables.set(td.tableName, td);
      ta.assert(td.SQL(ctx));
      // console.log(td.SQL(ctx));
    }
    ta.assert(tables.size);

    const si = tables.get("synthetic_table1");
    ta.assert(si);
    ta.assertEquals(5, si.domains.length);

    // the following comparison should be tested but fails for now because
    // AlaSQL reflection doesn't identify NOT NULL or PRIMARY KEY attrs.
    // ta.assertEquals(si.SQL(ctx), syntheticTable1Defn.SQL(ctx));
  });
});

Deno.test("AlaSQL import from another engine", async (tc) => {
  const ctx = SQLa.typicalSqlEmitContext({
    sqlNamingStrategy: SQLa.bracketSqlNamingStrategy(),
  });
  type Context = typeof ctx;
  const aspe = mod.alaSqlProxyEngine<Context>();
  const destDB = aspe.instance({ instanceID: "imported" });

  await tc.step("from sqlite_test.db", async () => {
    const se = sqlite.sqliteEngine<Context>();
    const srcDB = se.instance({
      storageFileName: () => path.join(thisModulePath, "sqlite_test.db"),
    });

    const srcTables = new Map<
      string,
      {
        readonly tableDefn:
          & SQLa.TableDefinition<string, Context>
          & SQLa.SqlDomainsSupplier<Context>;
        readonly rowCount: number;
      }
    >();

    for await (const td of srcDB.reflectTables(ctx)) {
      const countQER = await srcDB.rowsDQL<[count: number]>(ctx, {
        SQL: () => `select count(*) from ${td.tableName}`,
      });
      srcTables.set(td.tableName, {
        tableDefn: td,
        rowCount: countQER.rows[0][0],
      });
    }

    await destDB.importContent(ctx, () => srcDB, undefined, {
      filter: {
        tableName: (name) => name.startsWith("sqlite_") ? false : true,
      },
    });

    srcDB.close();

    for await (
      const td of destDB.reflectTables(ctx, {
        filter: { databaseName: (name) => name == "imported" ? true : false },
      })
    ) {
      const srcTable = srcTables.get(td.tableName);
      ta.assert(srcTable);

      // note use of "select matrix" because we're using rowsDQL()
      const countQER = await destDB.rowsDQL<[count: number]>(ctx, {
        SQL: () => `select matrix count(*) from ${td.tableName}`,
      });

      ta.assertEquals(
        countQER.rows[0][0],
        srcTable.rowCount,
        `Row count in source ${srcTable.tableDefn.tableName} does not match destination`,
      );
    }
  });
});
