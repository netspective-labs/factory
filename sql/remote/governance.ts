export interface SqlDatabase<DatabaseID extends string = string> {
  readonly identity: DatabaseID;
}

/**
 * A foreign SQL statement identity supplier provides the qualified name of a
 * executable SQL statement. Instead of supplying the entire statement, the
 * identifier provides a key to lookup the SQL in our SQL inventory.
 */
export interface ForeignSqlStmtIdentitySupplier {
  readonly qualifiedName: string;
}

export interface ForeignSqlStmtSupplier {
  readonly SQL: string;
}

export interface RewrittenForeignSqlStmtSupplier
  extends ForeignSqlStmtSupplier {
  readonly isRewrittenSQL: boolean;
  readonly originalSQL: string;
}

export interface DetectedUseDBinSQL extends RewrittenForeignSqlStmtSupplier {
  readonly databaseID: string;
}

export interface ForeigSqlStmtBindParamsSupplier {
  readonly sqlBindParams: URLSearchParams;
}

export interface ServerRuntimeSqlStmt<DatabaseID extends string = string>
  extends ForeignSqlStmtIdentitySupplier, ForeignSqlStmtSupplier {
  readonly database: SqlDatabase<DatabaseID>;
  readonly name: string;
  readonly label: string;
}

export interface ServerRuntimeSqlStmtLibrary<DatabaseID extends string> {
  readonly qualifiedName: string;
  readonly name: string;
  readonly label: string;
  readonly sqlStmts: Iterable<ServerRuntimeSqlStmt<DatabaseID>>;
}

export interface ServerRuntimeSqlStmtInventory<
  DatabaseID extends string = string,
> {
  readonly libraries: Iterable<ServerRuntimeSqlStmtLibrary<DatabaseID>>;
  readonly sqlStmt: (
    identity: string,
  ) => ServerRuntimeSqlStmt<DatabaseID> | undefined;
  readonly sqlStmtIdentities: () => Iterable<string>;
}
