import { sqlite } from "./deps.ts";
import * as rsts from "../sql/rdbms-schema-ts.ts";

// TODO: generate https://github.com/koskimas/kysely for TS-based queries?

export function sqliteDialect(): rsts.RdbmsDialect {
  const tsTypes: Record<string, rsts.RdbmsDataTypeMapEntry> = {
    "DATETIME": { tsType: "Date" },
    "INTEGER": { tsType: "number" },
    "TEXT": { tsType: "string" },
    "JSON": {
      tsType: "UnknownJSON",
      declare: `export type UnknownJSON = string`,
    },
  };
  return {
    identity: "sqlite",
    sqlDataTypeToTsType: (sqlDataType: string) => {
      // SQLite supports "untyped" (variant with affinity)
      const typeName = (sqlDataType && sqlDataType.length > 0)
        ? sqlDataType.toUpperCase()
        : "VARIANT";
      if (!(typeName in tsTypes)) {
        const custom = {
          tsType: `Unknown${rsts.snakeToPascalCase(typeName)}`,
          declare: `export type Unknown${
            rsts.snakeToPascalCase(typeName)
          } = unknown`,
        };
        tsTypes[typeName] = custom;
      }
      return tsTypes[typeName];
    },
    typescriptHeader: () => {
      const decls = Object.values(tsTypes).filter((dt) =>
        dt.declare ? true : false
      ).map((dt) => dt.declare!);
      return [...rsts.typicalTypescriptHeader, ...decls, ""];
    },
    tableNameStrategy: rsts.snakeToPascalCase,
    colNameStrategy: rsts.snakeToCamelCase,
    tsTypes: () => Object.values(tsTypes),
  };
}

export async function sqliteSchemaTypescript(
  src: string | sqlite.DB,
  onInit?: (db: sqlite.DB) => Promise<void>,
  onFinalize?: (db: sqlite.DB, tsSourceCode: string) => Promise<void>,
  dialect = sqliteDialect(),
): Promise<string> {
  const database = typeof src === "string"
    ? new sqlite.DB(src, { mode: "create" })
    : src;
  if (onInit) await onInit(database);
  const tsSourceCode = rsts.rdbmsSchemaToTypescript(function* () {
    for (
      const row of database.queryEntries<{
        table_name: string;
        name: string;
        type: string;
        notnull: boolean;
        pk: boolean;
        dflt_value: unknown;
      }>(`SELECT sqlite_master.name as table_name, table_info.*
            FROM sqlite_master
            JOIN pragma_table_info(sqlite_master.name) as table_info`)
    ) {
      yield {
        tableName: row.table_name,
        columnName: row.name,
        columnDataType: row.type,
        isRequired: row.notnull,
        isPrimaryKey: row.pk,
        defaultValue: row.dflt_value,
      };
    }
  }, dialect);
  if (onFinalize) await onFinalize(database, tsSourceCode);
  return tsSourceCode;
}
