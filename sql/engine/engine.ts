import * as safety from "../../safety/mod.ts";
import * as SQLa from "../render/mod.ts";
import * as ex from "../execute/mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export type SqlEngineIdentity = string;

export interface SqlEngine {
  readonly identity: SqlEngineIdentity;
}

export type SqlEngineInstanceIdentity = string;

export interface SqlEngineInstance<Engine extends SqlEngine> {
  readonly identity: SqlEngineInstanceIdentity;
}

export type SqlEngineInstanceConnIdentity = string;

export interface SqlEngineConnection<
  Engine extends SqlEngine,
  Instance extends SqlEngineInstance<Engine>,
> {
  readonly identity: SqlEngineInstanceConnIdentity;
}

export interface SqlDefineConn<
  Engine extends SqlEngine,
  Instance extends SqlEngineInstance<Engine>,
  Context extends SQLa.SqlEmitContext,
> extends SqlEngineConnection<Engine, Instance> {
  readonly rowsDDL: ex.QueryRowsExecutor<Context>;
}

export interface SqlReadRowsConn<
  Engine extends SqlEngine,
  Instance extends SqlEngineInstance<Engine>,
  Context extends SQLa.SqlEmitContext,
> extends SqlEngineConnection<Engine, Instance> {
  readonly rowsDQL: ex.QueryRowsExecutor<Context>;
}

export interface SqlReadRecordsConn<
  Engine extends SqlEngine,
  Instance extends SqlEngineInstance<Engine>,
  Context extends SQLa.SqlEmitContext,
> extends SqlEngineConnection<Engine, Instance> {
  readonly recordsDQL: ex.QueryRecordsExecutor<Context>;
  readonly firstRecordDQL: <Object extends ex.SqlRecord>(
    ctx: Context,
    query: ex.SqlBindParamsTextSupplier<Context>,
    options?: ex.QueryRecordsExecutorOptions<Object, Context> & {
      readonly reportRecordsDQL?: (
        selected: ex.QueryExecutionRecordsSupplier<Object, Context>,
      ) => Promise<void>;
      readonly onNotFound?: () => Promise<
        | ex.QueryExecutionRecordSupplier<Object, Context>
        | undefined
      >;
      readonly autoLimitSQL?: (
        SQL: SQLa.SqlTextSupplier<Context>,
      ) => SQLa.SqlTextSupplier<Context>;
    },
  ) => Promise<ex.QueryExecutionRecordSupplier<Object, Context> | undefined>;
}

export interface SqlReflectConn<
  Engine extends SqlEngine,
  Instance extends SqlEngineInstance<Engine>,
  Context extends SQLa.SqlEmitContext,
> extends SqlEngineConnection<Engine, Instance> {
  readonly reflectDomains: <DomainID extends string>(
    ctx: Context,
  ) => Promise<
    Map<DomainID, (nullable?: boolean) => SQLa.AxiomSqlDomain<Any, Context>>
  >;
  readonly reflectTables: <TableName extends string>(
    ctx: Context,
    options?: {
      readonly filter?: { readonly tableName?: (name: string) => boolean };
    },
  ) => AsyncGenerator<
    & SQLa.TableDefinition<TableName, Context>
    & SQLa.SqlDomainsSupplier<
      Context
    >
  >;
}

export interface SqlReflectDatabasesConn<
  Engine extends SqlEngine,
  Instance extends SqlEngineInstance<Engine>,
  Context extends SQLa.SqlEmitContext,
> extends SqlEngineConnection<Engine, Instance> {
  readonly reflectDatabases: <DatabaseID extends string>(
    ctx: Context,
  ) => AsyncGenerator<{ databaseID: DatabaseID }>;
}

export interface SqlWriteConn<
  Engine extends SqlEngine,
  Instance extends SqlEngineInstance<Engine>,
  Context extends SQLa.SqlEmitContext,
> extends SqlEngineConnection<Engine, Instance> {
  readonly rowsDML: ex.QueryRowsExecutor<Context>;
  readonly recordsDML: ex.QueryRecordsExecutor<Context>;
}

export function isSqlDefineConn<
  Engine extends SqlEngine,
  Instance extends SqlEngineInstance<Engine>,
  Context extends SQLa.SqlEmitContext,
>(o: unknown): o is SqlDefineConn<
  Engine,
  Instance,
  Context
> {
  const isSDC = safety.typeGuard<
    SqlDefineConn<
      Engine,
      Instance,
      Context
    >
  >("rowsDDL");
  return isSDC(o);
}

export function isSqlReadRowsConn<
  Engine extends SqlEngine,
  Instance extends SqlEngineInstance<Engine>,
  Context extends SQLa.SqlEmitContext,
>(o: unknown): o is SqlReadRowsConn<
  Engine,
  Instance,
  Context
> {
  const isSRC = safety.typeGuard<
    SqlReadRowsConn<
      Engine,
      Instance,
      Context
    >
  >("rowsDQL");
  return isSRC(o);
}

export function isSqlReadRecordsConn<
  Engine extends SqlEngine,
  Instance extends SqlEngineInstance<Engine>,
  Context extends SQLa.SqlEmitContext,
>(o: unknown): o is SqlReadRecordsConn<
  Engine,
  Instance,
  Context
> {
  const isSRC = safety.typeGuard<
    SqlReadRecordsConn<
      Engine,
      Instance,
      Context
    >
  >("recordsDQL", "firstRecordDQL");
  return isSRC(o);
}
