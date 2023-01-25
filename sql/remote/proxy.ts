import * as govn from "./governance.ts";
import * as dbs from "./dbselector.ts";
import * as sql from "../governance.ts";
import * as git from "../shell/git.ts";
import * as fs from "../shell/fs.ts";
import * as osQ from "../shell/osquery.ts";
import * as shG from "../shell/governance.ts";

export interface SqlProxyArgs {
  readonly executeSQL: string;
  readonly executeSqlBindParams?: URLSearchParams;
  readonly databaseIdSelector?: dbs.UseDatabaseIdDetector;
}

export interface SqlProxyExecAttempted {
  readonly detectedUseDB?: govn.DetectedUseDBinSQL;
  readonly attempted: boolean;
  readonly whyNot?: "no-database-id-match";
  readonly reason: string;
}

export interface SqlProxyResult<Data> {
  readonly execAttempted: SqlProxyExecAttempted;
  readonly executedSQL?: string;
  readonly data?: Data;
}

export interface SqlProxySupplier<
  Data,
  Result extends SqlProxyResult<Data> = SqlProxyResult<Data>,
> {
  (args: SqlProxyArgs): Promise<Result>;
}

export function attemptExec(
  SQL: string,
  allowAttemptWithoutUseDB = true,
  isDbID: ((dbID: string) => boolean) | undefined,
  databaseIdSelector: dbs.UseDatabaseIdDetector,
): SqlProxyExecAttempted {
  if (databaseIdSelector) {
    if (isDbID) {
      const detectedUseDB = databaseIdSelector.detectedUseDB(SQL);
      if (detectedUseDB) {
        if (isDbID(detectedUseDB.databaseID)) {
          return {
            detectedUseDB,
            attempted: true,
            reason: `detected databaseID '${detectedUseDB.databaseID}' matched`,
          };
        } else {
          return {
            detectedUseDB,
            attempted: false,
            whyNot: "no-database-id-match",
            reason:
              `detected databaseID '${detectedUseDB.databaseID}' did not match`,
          };
        }
      }
    }
  }

  if (!allowAttemptWithoutUseDB) {
    return {
      attempted: false,
      whyNot: "no-database-id-match",
      reason: `databaseID required but no database selected or selectable`,
    };
  }
  return {
    attempted: true,
    reason: `database is not selectable, forcing use ${
      Deno.inspect({ isDbID, databaseIdSelector, SQL })
    }`,
  };
}

export function proxySQL(
  handler: {
    readonly recordsDQL: <Object extends sql.SqlRecord>(
      SQL: string,
      params?: sql.SqlQueryParameterSet | undefined,
    ) => Promise<sql.QueryExecutionRecordsSupplier<Object>>;
  },
  allowAttemptWithoutUseDB = true,
  isDbID?: (dbID: string) => boolean,
  defaultDatabaseIdSelector = dbs.typicalUseDatabaseIdDetector,
): SqlProxySupplier<sql.QueryExecutionRecordsSupplier<sql.SqlRecord>> {
  return async (args) => {
    const execAttempted = attemptExec(
      args.executeSQL,
      allowAttemptWithoutUseDB,
      isDbID,
      defaultDatabaseIdSelector,
    );
    if (execAttempted.attempted) {
      const executedSQL = execAttempted.detectedUseDB
        ? execAttempted.detectedUseDB.SQL
        : args.executeSQL;
      return {
        execAttempted,
        executedSQL,
        data: await handler.recordsDQL(executedSQL),
      };
    }
    return {
      execAttempted,
    };
  };
}

export function gitSQL(
  allowAttemptWithoutUseDB = true,
  isGitDbID?: (dbID: string) => boolean,
  defaultDatabaseIdSelector = dbs.typicalUseDatabaseIdDetector,
): SqlProxySupplier<sql.QueryExecutionRecordsSupplier<sql.SqlRecord>> {
  return proxySQL(
    git.gitSqlCmdProxy,
    allowAttemptWithoutUseDB,
    isGitDbID,
    defaultDatabaseIdSelector,
  );
}

export function fsSQL(
  allowAttemptWithoutUseDB = true,
  isFsDbID?: (dbID: string) => boolean,
  defaultDatabaseIdSelector = dbs.typicalUseDatabaseIdDetector,
): SqlProxySupplier<sql.QueryExecutionRecordsSupplier<sql.SqlRecord>> {
  return proxySQL(
    fs.fileSysSqlCmdProxy,
    allowAttemptWithoutUseDB,
    isFsDbID,
    defaultDatabaseIdSelector,
  );
}

export function osQuerySQL(
  allowAttemptWithoutUseDB = true,
  isOsQueryDbID?: (dbID: string) => boolean,
  defaultDatabaseIdSelector = dbs.typicalUseDatabaseIdDetector,
): SqlProxySupplier<sql.QueryExecutionRecordsSupplier<sql.SqlRecord>> {
  return proxySQL(
    osQ.osQuerySqlCmdProxy,
    allowAttemptWithoutUseDB,
    isOsQueryDbID,
    defaultDatabaseIdSelector,
  );
}

export function multiSqlProxy(
  ...proxies: SqlProxySupplier<
    sql.QueryExecutionRecordsSupplier<sql.SqlRecord>
  >[]
): SqlProxySupplier<sql.QueryExecutionRecordsSupplier<sql.SqlRecord>> {
  return async (args) => {
    const tried = [];
    for (const proxy of proxies) {
      const proxyResult = await proxy(args);
      if (proxyResult.execAttempted && proxyResult.data) {
        return proxyResult;
      }
      tried.push({ proxy, proxyResult });
    }

    return {
      execAttempted: {
        attempted: false,
        whyNot: "no-database-id-match",
        reason:
          `multiSqlProxyResult did not find any databases to execute against (tried ${
            Deno.inspect(tried)
          })`,
      },
    };
  };
}

export function commonIdentifiableSqlProxies(
  { allowAttemptWithoutUseDB }: { allowAttemptWithoutUseDB: boolean } = {
    allowAttemptWithoutUseDB: true,
  },
): Map<shG.CommonDatabaseID, {
  identity: shG.CommonDatabaseID;
  proxy: SqlProxySupplier<sql.QueryExecutionRecordsSupplier<sql.SqlRecord>>;
  inventorySupplier: () => Promise<sql.DbmsEngineDatabase>;
}> {
  const result = new Map<shG.CommonDatabaseID, {
    identity: shG.CommonDatabaseID;
    proxy: SqlProxySupplier<sql.QueryExecutionRecordsSupplier<sql.SqlRecord>>;
    inventorySupplier: () => Promise<sql.DbmsEngineDatabase>;
  }>();
  result.set(shG.gitSqlDatabaseID, {
    identity: shG.gitSqlDatabaseID,
    proxy: gitSQL(
      allowAttemptWithoutUseDB,
      (dbID) => dbID == shG.gitSqlDatabaseID,
    ),
    // deno-lint-ignore require-await
    inventorySupplier: async () => git.gitSqlInventory(shG.gitSqlDatabaseID),
  });
  result.set(shG.fileSysSqlDatabaseID, {
    identity: shG.fileSysSqlDatabaseID,
    proxy: fsSQL(
      allowAttemptWithoutUseDB,
      (dbID) => dbID == shG.fileSysSqlDatabaseID,
    ),
    // deno-lint-ignore require-await
    inventorySupplier: async () =>
      fs.fileSysSqlInventory(shG.fileSysSqlDatabaseID),
  });
  result.set(shG.osQueryDatabaseID, {
    identity: shG.osQueryDatabaseID,
    proxy: osQuerySQL(
      allowAttemptWithoutUseDB,
      (dbID) => dbID == shG.osQueryDatabaseID,
    ),
    // deno-lint-ignore require-await
    inventorySupplier: async () =>
      osQ.osQuerySqlInventory(shG.osQueryDatabaseID),
  });
  return result;
}
