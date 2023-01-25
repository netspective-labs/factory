import * as dzx from "https://deno.land/x/dzx@0.4.0/mod.ts";

export interface SqliteDbDeployShellOptions {
  readonly sqliteSrc: {
    readonly sqlFilePath: string;
    readonly SQL?: string[];
    readonly removeAfter?: boolean;
  };
  readonly sqliteDest: {
    readonly dbFilePath: string;
    readonly removeExistingDb?: boolean;
  };
  readonly verbose?: boolean;
  readonly memoryFirst?: boolean;
}

export async function sqliteDbDeployShell(args: SqliteDbDeployShellOptions) {
  // recursive is set to true to prevent exception if not found
  const {
    sqliteSrc: {
      sqlFilePath: sqlSrcFilePath,
      SQL: srcSQL,
      removeAfter: removeSqlSrcFilePath,
    },
    sqliteDest: { dbFilePath, removeExistingDb },
    memoryFirst = true,
    verbose = false,
  } = args;
  if (srcSQL) await Deno.writeTextFile(sqlSrcFilePath, srcSQL.join("\n"));
  if (removeExistingDb) {
    try {
      await Deno.remove(dbFilePath);
    } catch { /* ignore if does not exist */ }
  }
  const verboseState = dzx.$.verbose;
  dzx.$.verbose = verbose;
  if (memoryFirst) {
    await dzx
      .$`echo "\n.dump\n" | cat ${sqlSrcFilePath} - | sqlite3 ":memory:" | sqlite3 ${dbFilePath}`;
  } else {
    await dzx.$`cat ${sqlSrcFilePath} | sqlite3 ${dbFilePath}`;
  }
  if (removeSqlSrcFilePath) await Deno.remove(sqlSrcFilePath);
  dzx.$.verbose = verboseState;
}
