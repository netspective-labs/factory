import { path } from "../render/deps.ts";
import * as ax from "../../axiom/mod.ts";
import * as SQLa from "../render/mod.ts";
import * as erd from "../diagram/mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

/**
 * pubCtlModelsGovn is a "models governer" helpers object that supplies functions
 * for "typical" RDBMS schemas that prepare tables in a "governed" fashion with a
 * primary key named `<tableName>_id` and with standard "housekeeping" columns such
 * as `created_at`.
 * @param ddlOptions optional DDL string template literal options
 * @returns a single object with helper functions as properties (for building models)
 */
export function pubCtlModelsGovn<Context extends SQLa.SqlEmitContext>(
  ddlOptions: SQLa.SqlTextSupplierOptions<Context> & {
    readonly sqlNS?: SQLa.SqlNamespaceSupplier;
  },
) {
  // TODO: convert this to a UUID to allow database row merging/syncing
  const primaryKey = () =>
    SQLa.autoIncPrimaryKey<number, Context>(SQLa.integer());

  type HousekeepingColumnsDefns<Context extends SQLa.SqlEmitContext> = {
    readonly created_at: SQLa.AxiomSqlDomain<Date | undefined, Context>;
  };

  function housekeeping<
    Context extends SQLa.SqlEmitContext,
  >(): HousekeepingColumnsDefns<Context> {
    return {
      created_at: SQLa.createdAt(),
    };
  }

  // "created_at" is considered "housekeeping" with a default so don't
  // emit it as part of the insert DML statement
  const defaultIspOptions: SQLa.InsertStmtPreparerOptions<
    Any,
    Any,
    Any,
    Context
  > = { isColumnEmittable: (name) => name == "created_at" ? false : true };

  /**
   * All of our "content" or "transaction" tables will follow a specific format,
   * namely that they will have a single primary key with the same name as the
   * table with _id appended and common "houskeeping" columns like created_at.
   * TODO: figure out how to automatically add ...housekeeping() to the end of
   * each table (it's easy to add at the start of each table, but we want them
   * at the end after all the "content" columns).
   * @param tableName
   * @param props
   * @returns
   */
  const table = <
    TableName extends string,
    TPropAxioms extends
      & Record<string, ax.Axiom<Any>>
      & Record<`${TableName}_id`, ax.Axiom<Any>>
      & HousekeepingColumnsDefns<Context>,
  >(
    tableName: TableName,
    props: TPropAxioms,
    options?: {
      readonly lint?:
        & SQLa.TableNameConsistencyLintOptions
        & SQLa.FKeyColNameConsistencyLintOptions<Context>;
    },
  ) => {
    const asdo = ax.axiomSerDeObject(props);
    const result = {
      ...asdo,
      ...SQLa.tableDefinition<TableName, TPropAxioms, Context>(
        tableName,
        props,
        {
          isIdempotent: true,
          sqlNS: ddlOptions?.sqlNS,
        },
      ),
      ...SQLa.tableDomainsRowFactory<TableName, TPropAxioms, Context>(
        tableName,
        props,
        { defaultIspOptions },
      ),
      ...SQLa.tableSelectFactory<TableName, TPropAxioms, Context>(
        tableName,
        props,
      ),
      view: SQLa.tableDomainsViewWrapper<
        `${TableName}_vw`,
        TableName,
        TPropAxioms,
        Context
      >(
        `${tableName}_vw`,
        tableName,
        props,
      ),
      defaultIspOptions, // in case others need to wrap the call
    };

    const rules = tableLintRules.typical(result);
    rules.lint(result, options?.lint);

    return result;
  };

  const erdConfig = erd.typicalPlantUmlIeOptions();
  const lintState = SQLa.typicalSqlLintSummaries(ddlOptions.sqlTextLintState);
  const tableLintRules = SQLa.tableLintRules<Context>();

  return {
    primaryKey,
    housekeeping,
    table,
    tableLintRules,
    defaultIspOptions,
    erdConfig,
    enumTable: SQLa.enumTable,
    enumTextTable: SQLa.enumTextTable,
    sqlTextLintSummary: lintState.sqlTextLintSummary,
    sqlTmplEngineLintSummary: lintState.sqlTmplEngineLintSummary,
  };
}

export function pubCtlDatabaseDefn<Context extends SQLa.SqlEmitContext>(
  ddlOptions: SQLa.SqlTextSupplierOptions<Context> & {
    readonly sqlNS?: SQLa.SqlNamespaceSupplier;
  } = SQLa.typicalSqlTextSupplierOptions(),
) {
  const mg = pubCtlModelsGovn(ddlOptions);

  enum syntheticEnum1 {
    code1, // code is text, value is a number
    code2,
  }
  enum syntheticEnum2 {
    code1 = "value1",
    code2 = "value2",
  }
  const numericEnumModel = SQLa.enumTable(
    "synthetic_enum_numeric",
    syntheticEnum1,
    { isIdempotent: true },
  );
  const textEnumModel = SQLa.enumTextTable(
    "synthetic_enum_text",
    syntheticEnum2,
    { isIdempotent: true },
  );

  const publHost = mg.table("publ_host", {
    publ_host_id: mg.primaryKey(),
    host: { ...SQLa.text(), isUnique: true },
    host_identity: SQLa.jsonTextNullable(),
    mutation_count: SQLa.integer(),
    numeric_enum: numericEnumModel.foreignKeyRef.code(),
    ...mg.housekeeping(),
  }, {
    lint: {
      ignoreFKeyColNameMissing_id: (
        fkeyColDefn,
      ) => ((fkeyColDefn as unknown as SQLa.IdentifiableSqlDomain<Any, Context>)
          .identity == "numeric_enum"
        ? true
        : false),
    },
  });

  const publBuildEventName = "publ_build_event" as const;
  const publBuildEvent = mg.table(publBuildEventName, {
    publ_build_event_id: mg.primaryKey(),
    publ_host_id: publHost.foreignKeyRef.publ_host_id(SQLa.belongsTo()),
    iteration_index: SQLa.integer(),
    build_initiated_at: SQLa.dateTime(),
    build_completed_at: SQLa.dateTime(),
    build_duration_ms: SQLa.integer(),
    resources_originated_count: SQLa.integer(),
    resources_persisted_count: SQLa.integer(),
    resources_memoized_count: SQLa.integer(),
    text_enum: textEnumModel.foreignKeyRef.code(),
    ...mg.housekeeping(),
  }, {
    lint: {
      ignoreFKeyColNameMissing_id: (
        fkeyColDefn,
      ) => ((fkeyColDefn as unknown as SQLa.IdentifiableSqlDomain<Any, Context>)
          .identity == "text_enum"
        ? true
        : false),
    },
  });

  const publServerService = mg.table("publ_server_service", {
    publ_server_service_id: mg.primaryKey(),
    service_started_at: SQLa.dateTime(),
    listen_host: SQLa.text(),
    listen_port: SQLa.integer(),
    publish_url: SQLa.text(),
    publ_build_event_id: publBuildEvent.foreignKeyRef.publ_build_event_id(
      SQLa.belongsTo("service"),
    ),
    ...mg.housekeeping(),
  });

  // -- TODO: add indexes to improve query performance
  const publServerStaticAccessLog = mg.table(
    "publ_server_static_access_log",
    {
      publ_server_static_access_log_id: mg.primaryKey(),
      status: SQLa.integer(),
      asset_nature: SQLa.text(),
      location_href: SQLa.text(),
      filesys_target_path: SQLa.text(),
      filesys_target_symlink: SQLa.textNullable(),
      publ_server_service_id: publServerService.foreignKeyRef
        .publ_server_service_id(),
      ...mg.housekeeping(),
    },
  );

  // -- TODO: add indexes to improve query performance
  const publServerErrorLog = mg.table("publ_server_error_log", {
    publ_server_error_log_id: mg.primaryKey(),
    location_href: SQLa.text(),
    error_summary: SQLa.text(),
    error_elaboration: SQLa.jsonTextNullable(),
    publ_server_service_id: publServerService.foreignKeyRef
      .publ_server_service_id(),
    ...mg.housekeeping(),
  });

  // this is added for testing purposes to make sure Axiom/Domain is creating
  // proper type-safe objects, otherwise will result in Typescript compile error;
  // expectType calls are not required for non-test or production use cases
  const expectType = <T>(_value: T) => {
    // Do nothing, the TypeScript compiler handles this for us
  };
  type tablePK = SQLa.TablePrimaryKeyColumnDefn<number, Context>;
  expectType<tablePK>(publHost.primaryKey.publ_host_id);
  expectType<
    SQLa.AxiomSqlDomain<Date | undefined, Context>
  >(publHost.axiomObjectDecl.created_at);
  expectType<tablePK>(publBuildEvent.primaryKey.publ_build_event_id);
  expectType<
    SQLa.TableForeignKeyColumnDefn<
      number,
      "publ_host",
      Context
    >
  >(publBuildEvent.axiomObjectDecl.publ_host_id);

  const lintState = SQLa.typicalSqlLintSummaries(ddlOptions.sqlTextLintState);
  // deno-fmt-ignore
  const DDL = SQLa.SQL<Context>(ddlOptions)`
      -- Generated by ${path.basename(import.meta.url)}. DO NOT EDIT.

      ${lintState.sqlTextLintSummary}

      ${publHost}

      ${publHost.view}

      ${publBuildEvent}

      ${publServerService}

      ${publServerStaticAccessLog}

      ${publServerErrorLog}

      ${lintState.sqlTmplEngineLintSummary}`;

  return {
    modelsGovn: mg,
    publHost,
    publBuildEvent,
    publServerService,
    publServerStaticAccessLog,
    publServerErrorLog,
    numericEnumModel,
    textEnumModel,
    DDL,
  };
}

if (import.meta.main) {
  // if we're being called as a CLI, just emit the DDL SQL:
  //    deno run -A lib/sql/render/mod_test-fixtures.ts > synthetic.sql
  //    deno run -A lib/sql/render/mod_test-fixtures.ts | sqlite3 synthetic.sqlite.db
  const dbDefn = pubCtlDatabaseDefn();
  const ctx = SQLa.typicalSqlEmitContext();
  console.log(dbDefn.DDL.SQL(ctx));
}
