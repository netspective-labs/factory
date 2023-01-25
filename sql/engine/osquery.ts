import * as SQLa from "../render/mod.ts";
import * as eng from "./engine.ts";
import * as sh from "./shell.ts";
import * as dzx from "https://deno.land/x/dzx@0.3.1/mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export class OsQueryCmdExecutive<Context extends SQLa.SqlEmitContext>
  extends sh.SqlShellCmdExecutive<Context>
  implements
    eng.SqlReflectConn<
      sh.SqlShellCmdsEngine,
      OsQueryCmdExecutive<Context>,
      Context
    > {
  readonly osQueryCmdPath: string;
  constructor(
    ssCI?:
      & Partial<Omit<sh.SqlShellCmdInit<Context>, "prepareExecuteSqlCmd">>
      & {
        readonly osQueryCmdPath?: string;
      },
  ) {
    const identity = ssCI?.identity ?? `osQueryi`;
    const osQueryCmdPath = ssCI?.osQueryCmdPath ??
      Deno.env.get("RF_SQL_SHELL_OSQUERYI_LOCATION") ??
      "/usr/local/bin/osqueryi";
    super({
      identity,
      prepareExecuteSqlCmd: (SQL) => {
        // https://osquery.io/
        return {
          cmd: [osQueryCmdPath, "--json", SQL],
          stdout: "piped",
          stderr: "piped",
        };
      },
    });
    this.osQueryCmdPath = osQueryCmdPath;
  }

  async reflectDomains<DomainID extends string>(
    ctx: Context,
  ): Promise<
    Map<DomainID, (nullable?: boolean) => SQLa.AxiomSqlDomain<Any, Context>>
  > {
    const colTypesQER = await this.recordsDQL<{ type: string }>(ctx, {
      SQL: () => `
        SELECT DISTINCT table_info.type
          FROM sqlite_master
          JOIN pragma_table_info(sqlite_master.name) as table_info
         WHERE table_info.type <> ''`,
    });
    return SQLa.typicalDomainFromTextFactory<DomainID, Context>(
      ...colTypesQER.records.map((r) => r.type as DomainID),
    );
  }

  async *reflectTables<TableName extends string>(
    ctx: Context,
    options?: {
      readonly filter?: { readonly tableName?: (name: string) => boolean };
    },
  ): AsyncGenerator<
    & SQLa.TableDefinition<TableName, Context>
    & SQLa.SqlDomainsSupplier<
      Context
    >
  > {
    const { filter } = options ?? {};
    const rd = await this.reflectDomains(ctx);

    const tableColDefnRows: {
      table_name: string; // created in the mergedColumnDefns loop
      name: string; // found in `PRAGMA table_info(${tableName});`
      type: string; // found in `PRAGMA table_info(${tableName});`
      notnull: string; // found in `PRAGMA table_info(${tableName});`
      pk: string; // found in `PRAGMA table_info(${tableName});`
      dflt_value: string; // found in `PRAGMA table_info(${tableName});`
    }[] = [];

    const osqTableNamesProcess = await dzx.$`${this.osQueryCmdPath} .tables`;
    const osqTableNames = osqTableNamesProcess.stdout.split("\n").map((line) =>
      line.replace("  => ", "")
    ).filter((t) => t.trim().length > 0);
    const describe = osqTableNames.map((tableName) =>
      `PRAGMA table_info(${tableName});`
    ).join("");
    const mergedColumnDefns = JSON.parse(
      (await dzx.$`${this.osQueryCmdPath} --json ${describe}`).stdout,
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

    for (const tableName of osqTableNames) {
      if (filter?.tableName && !filter.tableName(tableName)) continue;

      const columns: Record<string, SQLa.AxiomSqlDomain<Any, Context>> = {};
      for (
        const colDefn of tableColDefnRows.filter((tc) =>
          tc.table_name == tableName
        )
      ) {
        let domain =
          rd.get(colDefn.type)?.(parseInt(colDefn.notnull) ? false : true) ??
            SQLa.textNullable();
        if (parseInt(colDefn.pk)) domain = SQLa.primaryKey(domain);
        columns[colDefn.name] = domain;
        (columns[colDefn.name] as Any).reflectedColumnInfo = colDefn;
      }

      yield SQLa.tableDefinition(tableName as TableName, columns);
    }
  }
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
