import { path } from "./deps.ts";
import * as exec from "./mod.ts";
import * as sql from "../../sql/mod.ts";

export const DEFAULT_FSELECT_PATH =
  Deno.env.get("RF_SQL_SHELL_FSELECT_LOCATION") ??
    path.join(
      path.dirname(path.fromFileUrl(import.meta.url)),
      "bin",
      "fselect",
    );

const firstWordRegEx = /^\s*([a-zA-Z0-9]+)/;

export function fileSysSqlCmdProxyInit(fselectPath = DEFAULT_FSELECT_PATH) {
  return new exec.SqlCmdExecutive({
    prepareExecuteSqlCmd: (parsedSQL) => {
      // https://github.com/jhspetersson/fselect
      // fselect does not support comments
      let SQL = parsedSQL.replaceAll(/\-\-.*$/mg, " ");
      // fselect does not like line breaks between SQL tokens
      SQL = SQL.replaceAll(/(\r\n|\r|\n)/mg, " ");
      // fselect does not start with "select" SQL, it goes straight into columns
      const firstWordMatch = SQL.match(firstWordRegEx);
      if (firstWordMatch && firstWordMatch.length > 1) {
        if (firstWordMatch[1].toUpperCase() == "SELECT") {
          SQL = SQL.replace(firstWordRegEx, "");
        }
      }
      return {
        cmd: [fselectPath, SQL, "into", "json"],
        stdout: "piped",
        stderr: "piped",
      };
    },
    events: () => {
      return new sql.SqlEventEmitter();
    },
  });
}

export const fileSysSqlCmdProxy = fileSysSqlCmdProxyInit(DEFAULT_FSELECT_PATH);

export function fileSysSqlInventory(
  databaseID: string,
): sql.DbmsEngineSchemalessDatabase {
  // https://github.com/jhspetersson/fselect
  const fselectDialect = () => {
    const filteredTables = (filter?: (t: sql.DbmsTable) => boolean) => {
      const commitsColumns = (
        filter?: (t: sql.DbmsTableColumn) => boolean,
      ) => {
        // use `fselect --help` at the command line to see all the columns supported
        const columns: sql.DbmsTableUntypedColumn[] = [
          "name",
          "extension",
          "path",
          "abspath",
          "directory",
          "absdir",
          "size",
          "fsize",
          "accessed",
          "created",
          "modified",
          "user",
          "group",
          "mime",
          "is_binary",
          "is_text",
          "is_image",
          "line_count",
          "sha1",
          "sha2_256",
          "sha2_512",
          "sha3_512",
        ].map((name) => ({ identity: name }));
        return filter ? columns.filter((c) => filter(c)) : columns;
      };
      const tables: sql.DbmsTable[] = [
        // tables in fselect are just directories; we use content/public
        // because our assumption is that the current working directory
        // is where pubctl.ts is running in the project home.
        {
          identity: "content",
          filteredColumns: commitsColumns,
          columns: commitsColumns(),
        },
        {
          identity: "public",
          filteredColumns: commitsColumns,
          columns: commitsColumns(),
        },
      ];
      return filter ? tables.filter((t) => filter(t)) : tables;
    };
    const db: sql.DbmsEngineSchemalessDatabase = {
      isSchemaDatabase: false,
      identity: databaseID,
      filteredTables,
      tables: filteredTables(),
    };
    return db;
  };

  return fselectDialect();
}
