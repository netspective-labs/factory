export const fileSysSqlDatabaseID = "fssql";
export const gitSqlDatabaseID = "gitsql";
export const osQueryDatabaseID = "osquery";

export type CommonDatabaseID =
  | typeof gitSqlDatabaseID
  | typeof fileSysSqlDatabaseID
  | typeof osQueryDatabaseID;
