import * as govn from "../governance.ts";
import * as safety from "../../safety/mod.ts";

// nomenclature and conventions should follow PgDCP whenever possible

export interface SqlRunCmdOptionsSupplier {
  (
    SQL: string,
    resultNature: "rows" | "records",
    sps: SqlCmdExecutive,
  ): Deno.RunOptions;
}

export interface SqlCmdExecutiveInit<DBEE extends govn.SqlEventEmitter> {
  readonly prepareExecuteSqlCmd: SqlRunCmdOptionsSupplier;
  readonly events: (db: SqlCmdExecutive<DBEE>) => DBEE;
}

export interface SqlCmdExecutiveContext
  extends
    govn.SqlInstanceContext,
    govn.SqlDefineConnContext,
    govn.SqlReadConnContext,
    govn.SqlWriteConnContext {
  readonly processSupplier: SqlCmdExecutive;
}

export interface SqlCmdExecResult {
  readonly status: Deno.ProcessStatus;
}

export interface SqlCmdSuccessResult extends SqlCmdExecResult {
  readonly stdOut: string;
  readonly json: <TypedResult = unknown>() => TypedResult;
}

export const isSqlCmdSuccessful = safety.typeGuard<SqlCmdSuccessResult>(
  "stdOut",
);

export interface SqlCmdFailureResult extends SqlCmdExecResult {
  readonly stdErr: string;
}

export const isSqlCmdFailure = safety.typeGuard<SqlCmdFailureResult>(
  "stdErr",
);

export class SqlCmdExecutive<
  DBEE extends govn.SqlEventEmitter = govn.SqlEventEmitter,
> implements SqlCmdExecutiveContext {
  readonly isConnectionContext = true;
  readonly dbee: DBEE;
  readonly prepareExecuteSqlCmd: SqlRunCmdOptionsSupplier;

  get processSupplier() {
    return this;
  }

  constructor(init: SqlCmdExecutiveInit<DBEE>) {
    this.prepareExecuteSqlCmd = init.prepareExecuteSqlCmd;
    this.dbee = init.events(this);
  }

  async execute<TypedResult = unknown>(
    SQL: string,
    resultNature: "rows" | "records",
    _params?: govn.SqlQueryParameterSet, // TODO
  ): Promise<SqlCmdSuccessResult | SqlCmdFailureResult> {
    let result: SqlCmdSuccessResult | SqlCmdFailureResult;
    const cmd = Deno.run(this.prepareExecuteSqlCmd(SQL, resultNature, this));

    // see https://github.com/denoland/deno/issues/4568 why this is necessary
    const [stdErrRaw, stdOutRaw, status] = await Promise.all([
      cmd.stderrOutput(),
      cmd.output(),
      cmd.status(),
    ]);
    if (status.success) {
      const stdOut = new TextDecoder().decode(stdOutRaw);
      result = {
        status,
        stdOut,
        json: <
          JsonResult = TypedResult,
        >() => (JSON.parse(stdOut) as JsonResult),
      };
    } else {
      const stdErr = new TextDecoder().decode(stdErrRaw);
      result = { status, stdErr };
      // TODO: use a callback for this
      console.error("SqlCmdExecutive.execute", {
        status,
        stdErr,
        SQL,
        resultNature,
      });
    }
    cmd.close();
    return result;
  }

  async query<R extends govn.SqlRow = govn.SqlRow>(
    SQL: string,
    params?: govn.SqlQueryParameterSet,
  ): Promise<Array<R> | SqlCmdFailureResult> {
    const result = await this.execute(SQL, "rows", params);
    if (isSqlCmdSuccessful(result)) {
      return result.json<Array<R>>();
    }
    return result;
  }

  async queryEntries<O extends govn.SqlRecord = govn.SqlRecord>(
    SQL: string,
    params?: govn.SqlQueryParameterSet,
  ): Promise<Array<O> | SqlCmdFailureResult> {
    const result = await this.execute(SQL, "records", params);
    if (isSqlCmdSuccessful(result)) {
      return result.json<Array<O>>();
    }
    return result;
  }

  close() {
    this.dbee.emitSync("closingDatabase", this);
    this.dbee.emitSync("closedDatabase", this);
  }

  init() {
    this.dbee.emitSync("openingDatabase", this);

    this.dbee.on("openedDatabase", async () => {
      await this.dbee.emit("constructStorage", this);
      await this.dbee.emit("constructIdempotent", this);
      await this.dbee.emit("populateSeedData", this);
    });

    this.dbee.emitSync("openedDatabase", this);
  }

  async rowsDDL<Row extends govn.SqlRow>(
    SQL: string,
    params?: govn.SqlQueryParameterSet | undefined,
  ): Promise<govn.QueryExecutionRowsSupplier<Row>> {
    const rows = await this.query<Row>(SQL, params);
    const result: govn.QueryExecutionRowsSupplier<Row> = {
      rows: Array.isArray(rows) ? rows : [],
      SQL,
      params,
    };
    this.dbee.emit("executedDDL", result);
    return result;
  }

  async rowsDML<Row extends govn.SqlRow>(
    SQL: string,
    params?: govn.SqlQueryParameterSet | undefined,
  ): Promise<govn.QueryExecutionRowsSupplier<Row>> {
    const rows = await this.query<Row>(SQL, params);
    const result: govn.QueryExecutionRowsSupplier<Row> = {
      rows: Array.isArray(rows) ? rows : [],
      SQL,
      params,
    };
    this.dbee.emit("executedDML", result);
    return result;
  }

  async rowsDQL<Row extends govn.SqlRow>(
    SQL: string,
    params?: govn.SqlQueryParameterSet | undefined,
  ): Promise<govn.QueryExecutionRowsSupplier<Row>> {
    const rows = await this.query<Row>(SQL, params);
    const result: govn.QueryExecutionRowsSupplier<Row> = {
      rows: Array.isArray(rows) ? rows : [],
      SQL,
      params,
    };
    this.dbee.emit("executedDQL", result);
    return result;
  }

  async recordsDQL<Object extends govn.SqlRecord>(
    SQL: string,
    params?: govn.SqlQueryParameterSet | undefined,
  ): Promise<govn.QueryExecutionRecordsSupplier<Object>> {
    const records = await this.queryEntries<Object>(SQL, params);
    const result: govn.QueryExecutionRecordsSupplier<Object> = {
      records: Array.isArray(records) ? records : [],
      SQL,
      params,
    };
    this.dbee.emit("executedDQL", result);
    return result;
  }

  async firstRecordDQL<Object extends govn.SqlRecord>(
    SQL: string,
    params?: govn.SqlQueryParameterSet | undefined,
    options?: {
      readonly enhance?: (record: Record<string, unknown>) => Object;
      readonly onNotFound?: () => Object | undefined;
      readonly autoLimitSQL?: (SQL: string) => string;
    },
  ): Promise<Object | undefined> {
    const { autoLimitSQL = (() => `${SQL} LIMIT 1`) } = options ?? {};
    const selected = await this.recordsDQL<Object>(autoLimitSQL(SQL), params);
    if (selected.records.length > 0) {
      const record = selected.records[0];
      if (options?.enhance) return options.enhance(record);
      return record;
    }
    return options?.onNotFound ? options.onNotFound() : undefined;
  }
}
