import * as exec from "./mod.ts";
import * as sql from "../../sql/mod.ts";
import * as dzx from "https://deno.land/x/dzx@0.3.1/mod.ts";

export const DEFAULT_OSQI_PATH =
  Deno.env.get("RF_SQL_SHELL_OSQUERYI_LOCATION") ?? "/usr/local/bin/osqueryi";

export function osQuerySqlCmdProxyInit(
  osQueryClientPath = DEFAULT_OSQI_PATH,
) {
  return new exec.SqlCmdExecutive({
    prepareExecuteSqlCmd: (SQL) => {
      // https://osquery.io/
      return {
        // TODO: discover where osqueryi is installed or make it configurable
        cmd: [osQueryClientPath, "--json", SQL],
        stdout: "piped",
        stderr: "piped",
      };
    },
    events: () => {
      return new sql.SqlEventEmitter();
    },
  });
}

export const osQuerySqlCmdProxy = osQuerySqlCmdProxyInit(DEFAULT_OSQI_PATH);

export async function osQuerySqlInventory(
  databaseID: string,
  osQueryClientPath = DEFAULT_OSQI_PATH,
): Promise<sql.DbmsEngineSchemalessDatabase> {
  const tableColDefnRows: {
    table_name: string; // created in the mergedColumnDefns loop
    name: string; // found in `PRAGMA table_info(${tableName});`
    type: string; // found in `PRAGMA table_info(${tableName});`
    notnull: string; // found in `PRAGMA table_info(${tableName});`
    pk: string; // found in `PRAGMA table_info(${tableName});`
    dflt_value: string; // found in `PRAGMA table_info(${tableName});`
  }[] = [];

  const osqTableNamesProcess = await dzx.$`${osQueryClientPath} .tables`;
  const osqTableNames = osqTableNamesProcess.stdout.split("\n").map((line) =>
    line.replace("  => ", "")
  ).filter((t) => t.trim().length > 0);
  const describe = osqTableNames.map((tableName) =>
    `PRAGMA table_info(${tableName});`
  ).join("");
  const mergedColumnDefns = JSON.parse(
    (await dzx.$`${osQueryClientPath} --json ${describe}`).stdout,
  );
  let tableIndex = -1;
  let tableName = undefined;
  for (const columnDefn of mergedColumnDefns) {
    // every time the columnDefn.cid == 0, it means it's a new table
    if (columnDefn.cid == "0") {
      tableIndex++;
      tableName = osqTableNames[tableIndex];
    }
    tableColDefnRows.push({ table_name: tableName, ...columnDefn });
  }

  const filteredTables = (filter?: (t: sql.DbmsTable) => boolean) => {
    const tables: sql.DbmsTable[] = [];
    for (const tableID of osqTableNames) {
      const filteredColumns = (
        filter?: (t: sql.DbmsTableColumn) => boolean,
      ) => {
        const columns: sql.DbmsTableColumn[] = [];
        for (
          const cRow of tableColDefnRows.filter((tc) =>
            tc.table_name == tableID
          )
        ) {
          const columnID = cRow.name;
          const dataType = cRow.type;
          const column: sql.DbmsTableColumn = {
            identity: columnID,
            nature: dataType ? { identity: dataType } : undefined,
          };
          if (!filter || filter(column)) {
            columns.push(column);
          }
        }
        return columns;
      };
      const table: sql.DbmsTable = {
        identity: tableID,
        filteredColumns,
        columns: filteredColumns(),
      };
      if (!filter || filter(table)) {
        tables.push(table);
      }
    }
    return tables;
  };
  const db: sql.DbmsEngineSchemalessDatabase = {
    isSchemaDatabase: false,
    identity: databaseID,
    filteredTables,
    tables: filteredTables(),
  };
  return db;
}

export type osQueryATCRecord = {
  readonly query: string;
  readonly path: string;
  readonly columns: string[];
  readonly platform?: string;
};

export type osQueryATCConfig = {
  readonly auto_table_construction: Record<string, osQueryATCRecord>;
};

/**
 * Create an osQuery Automatic Table Construction (ATC) configuration file
 * content from a series of tables.
 * See: https://osquery.readthedocs.io/en/stable/deployment/configuration/#automatic-table-construction
 * and: https://www.kolide.com/blog/how-to-build-custom-osquery-tables-using-atc
 * @param tables the list of tables that should be included in the ATC configuration
 * @returns a function which, when called, will produce an ATC configuratin object
 */
export function osQueryATCConfigSupplier(tables: {
  readonly tableName: string;
  readonly columns: Array<{ readonly columnName: string }>;
  readonly query?: string;
}[]) {
  const osQueryATCPartials = tables.reduce(
    (result, table) => {
      const columns = table.columns.map((c) => c.columnName);
      const query = table.query ??
        `select ${columns.join(", ")} from ${table.tableName}`;
      result[table.tableName] = { query, columns };
      return result;
    },
    // we don't need the path right now since that's late binding
    {} as Record<string, Omit<osQueryATCRecord, "path">>,
  );

  return (
    atcRecConfig: (
      suggested: string,
      atcPartial: Omit<osQueryATCRecord, "path">,
    ) => {
      readonly osQueryTableName: string;
      readonly atcRec: osQueryATCRecord;
    },
  ): osQueryATCConfig => {
    const ATC: Record<string, osQueryATCRecord> = {};
    for (const atcPartialEntry of Object.entries(osQueryATCPartials)) {
      const [suggestedTableName, atcPartialRec] = atcPartialEntry;
      const { osQueryTableName, atcRec } = atcRecConfig(
        suggestedTableName,
        atcPartialRec,
      );
      ATC[osQueryTableName] = atcRec;
    }
    return {
      auto_table_construction: ATC,
    };
  };
}
