import { path, testingAsserts as ta } from "./deps-test.ts";
import * as whs from "../../text/whitespace.ts";
import * as SQLa from "../render/mod.ts";
import * as mod from "./shell.ts";

Deno.test("fselect SQL shell command", async (tc) => {
  const thisTestFilePath = path.dirname(path.fromFileUrl(import.meta.url));
  const fselect = new mod.FileSysQueryCmdExecutive({
    reflectPathsAsTables: [thisTestFilePath],
  });
  const ctx = SQLa.typicalSqlEmitContext();
  type Context = typeof ctx;

  await tc.step(`*.ts files in ${thisTestFilePath}`, async () => {
    const sysInfoQuery = {
      SQL: () =>
        whs.unindentWhitespace(`
          SELECT size, path
            FROM ${thisTestFilePath}
           WHERE name = '*.ts'
           LIMIT 50`),
    };
    const fsQER = await fselect.recordsDQL(ctx, sysInfoQuery);
    ta.assert(fsQER);
    // if fselect worked it should return totals files in the current path
    ta.assertEquals(17, fsQER.records.length);
  });

  await tc.step(`reflect file path as table`, async () => {
    const tables = new Map<
      string,
      & SQLa.TableDefinition<string, Context>
      & SQLa.SqlDomainsSupplier<Context>
    >();
    for await (const td of fselect.reflectTables(ctx)) {
      tables.set(td.tableName, td);
      ta.assert(td.SQL(ctx));
    }
    ta.assert(tables.size);

    const si = tables.get(thisTestFilePath);
    ta.assert(si);
    ta.assertEquals(22, si.domains.length);
  });
});

Deno.test("mergestat Git SQL shell command", async (tc) => {
  const thisTestFilePath = path.dirname(path.fromFileUrl(import.meta.url));
  const gitProjectHome = path.resolve(thisTestFilePath, "../../..");
  const mergestat = new mod.GitQueryCmdExecutive();
  const ctx = SQLa.typicalSqlEmitContext();
  type Context = typeof ctx;

  await tc.step(
    `total commits counts grouped by author in ${gitProjectHome}`,
    async () => {
      const sysInfoQuery = {
        SQL: () =>
          whs.unindentWhitespace(`
          SELECT count(*), author_email, author_name
            FROM commits('${gitProjectHome}')
           WHERE parents < 2 -- ignore merge commits
           GROUP BY author_name, author_email ORDER BY count(*) DESC`),
      };
      const fsQER = await mergestat.recordsDQL(ctx, sysInfoQuery);
      ta.assert(fsQER);
      ta.assert(fsQER.records.length);
    },
  );

  await tc.step(
    `total commits counts grouped by email domain of author in ${gitProjectHome}`,
    async () => {
      const sysInfoQuery = {
        SQL: () =>
          whs.unindentWhitespace(`
            SELECT count(*), substr(author_email, instr(author_email, '@')+1) AS email_domain -- https://sqlite.org/lang_corefunc.html
              FROM commits('${gitProjectHome}')
             WHERE parents < 2 -- ignore merge commits
             GROUP BY email_domain
             ORDER BY count(*) DESC`),
      };
      const gitQER = await mergestat.recordsDQL(ctx, sysInfoQuery);
      ta.assert(gitQER);
      ta.assert(gitQER.records.length);
    },
  );

  await tc.step(`reflect tables`, async () => {
    const tables = mergestat.tables();
    let tablesCount = 0;
    for await (const td of mergestat.reflectTables(ctx)) {
      ta.assertEquals(tables[td.tableName].tableName, td.tableName);
      tablesCount++;
    }
    ta.assertEquals(4, tablesCount);
  });
});
