import * as safety from "../../../safety/mod.ts";
import * as ax from "../../../axiom/mod.ts";
import * as d from "../domain.ts";
import * as tmpl from "../template/mod.ts";
import * as tbl from "./table.ts";
import * as ss from "../dql/select.ts";
import * as cr from "../dql/criteria.ts";

// deno-lint-ignore no-explicit-any
type Any = any; // make it easier on Deno linting

export interface EnumTableDefn {
  readonly enumTableNature: "text" | "numeric";
}

export const isEnumTableDefn = safety.typeGuard<EnumTableDefn>(
  "enumTableNature",
);

/**
 * Some of our tables will just have fixed ("seeded") values and act as
 * enumerations (lookup) with foreign key relationships.
 * See https://github.com/microsoft/TypeScript/issues/30611 for how to create
 * and use type-safe enums
 * @param tableName the name of the enumeration table
 * @param seedEnum is enum whose list of values become the seed values of the lookup table
 * @returns a SQLa table with seed rows as insertDML and original typed enum for reference
 */
export function enumTable<
  TEnumCode extends string,
  TEnumValue extends number,
  TableName extends string,
  Context extends tmpl.SqlEmitContext,
  TPropAxioms extends Record<string, ax.Axiom<Any>> = {
    readonly code: d.AxiomSqlDomain<TEnumValue, Context>;
    readonly value: d.AxiomSqlDomain<TEnumCode, Context>;
    readonly created_at: d.AxiomSqlDomain<Date | undefined, Context>;
  },
>(
  tableName: TableName,
  seedEnum: { [key in TEnumCode]: TEnumValue },
  tdOptions?: tbl.TableDefnOptions<TPropAxioms, Context>,
) {
  const seedRows: {
    readonly code: number;
    readonly value: string;
  }[] = [];
  type EnumRecord = typeof seedRows;
  type FilterableColumnName = keyof (EnumRecord);
  for (const e of Object.entries(seedEnum)) {
    const [key, value] = e;
    if (typeof value === "number") {
      // enums have numeric ids and reverse-mapped values as their keys
      // and we care only about the text keys ids, they point to codes
      const value = e[1] as TEnumValue;
      seedRows.push({ code: value, value: key });
    }
  }

  const props = {
    code: tbl.primaryKey(d.integer()),
    value: d.text(),
    created_at: d.createdAt(),
  } as unknown as TPropAxioms;
  const tdrf = tbl.tableDomainsRowFactory(tableName, props, {
    // "created_at" is considered "housekeeping" with a default so don't
    // emit it as part of the insert DML statement
    defaultIspOptions: {
      isColumnEmittable: (name) => name == "created_at" ? false : true,
    },
  });
  const etn: EnumTableDefn = { enumTableNature: "numeric" };
  const td = tbl.tableDefinition(tableName, props, tdOptions);
  return {
    ...etn,
    ...td,
    ...tdrf,
    // seed will be used in SQL interpolation template literal, which accepts
    // either a string, SqlTextSupplier, or array of SqlTextSuppliers; in our
    // case, if seed data is provided we'll prepare the insert DMLs as an
    // array of SqlTextSuppliers
    seedDML: seedRows && seedRows.length > 0
      ? seedRows.map((s) => tdrf.insertDML(s as Any))
      : `-- no ${tableName} seed rows`,
    seedEnum,
    select: ss.entitySelectStmtPreparer<
      TableName,
      EnumRecord,
      EnumRecord,
      Context
    >(
      tableName,
      cr.filterCriteriaPreparer((group) => {
        if (group === "primary-keys") {
          return td.domains.filter((d) =>
            tbl.isTablePrimaryKeyColumnDefn(d) ? true : false
          ).map((d) => d.identity) as FilterableColumnName[];
        }
        return td.domains.filter((d) =>
          tbl.isTableColumnFilterCriteriaDqlExclusionSupplier(d) &&
            d.isExcludedFromFilterCriteriaDql
            ? false
            : true
        ).map((d) => d.identity) as FilterableColumnName[];
      }),
    ),
  };
}

/**
 * Some of our tables will just have fixed ("seeded") values and act as
 * enumerations (lookup) with foreign key relationships.
 * See https://github.com/microsoft/TypeScript/issues/30611 for how to create
 * and use type-safe enums
 * @param tableName the name of the enumeration table
 * @param seedEnum is enum whose list of values become the seed values of the lookup table
 * @returns a SQLa table with seed rows as insertDML and original typed enum for reference
 */
export function enumTextTable<
  TEnumCode extends string,
  TEnumValue extends string,
  TableName extends string,
  Context extends tmpl.SqlEmitContext,
  TPropAxioms extends Record<string, ax.Axiom<Any>> = {
    readonly code: d.AxiomSqlDomain<TEnumCode, Context>;
    readonly value: d.AxiomSqlDomain<TEnumValue, Context>;
    readonly created_at: d.AxiomSqlDomain<Date | undefined, Context>;
  },
>(
  tableName: TableName,
  seedEnum: { [key in TEnumCode]: TEnumValue },
  tdOptions?: tbl.TableDefnOptions<TPropAxioms, Context>,
) {
  const seedRows: {
    readonly code: string;
    readonly value: string;
  }[] = [];
  type EnumRecord = typeof seedRows;
  type FilterableColumnName = keyof (EnumRecord);
  for (const e of Object.entries(seedEnum)) {
    const code = e[0] as TEnumCode;
    const value = e[1] as TEnumValue;
    seedRows.push({ code, value });
  }
  const codeEnum = <
    TType extends readonly [TEnumCode, ...(readonly TEnumCode[])],
  >(
    ...values: TType
  ) =>
    ax.create((value): value is TType[number] =>
      values.includes(value as never)
    );
  const valueEnum = <
    TType extends readonly [TEnumValue, ...(readonly TEnumValue[])],
  >(
    ...values: TType
  ) =>
    ax.create((value): value is TType[number] =>
      values.includes(value as never)
    );

  const enumCodes = Object.keys(seedEnum) as unknown as TEnumCode[];
  const enumValues = Object.values(seedEnum) as unknown as TEnumValue[];

  const codeDomain: d.AxiomSqlDomain<string, Context> = {
    ...codeEnum(enumCodes[0], ...enumCodes),
    sqlDataType: () => ({ SQL: () => `TEXT` }),
    isOptional: false,
    referenceASD: () => codeDomain,
    referenceNullableASD: () => codeDomain,
    fromText: (text) => text,
  };

  const valueDomain: d.AxiomSqlDomain<string, Context> = {
    ...valueEnum(enumValues[0], ...enumValues),
    sqlDataType: () => ({ SQL: () => `TEXT` }),
    isOptional: false,
    referenceASD: () => valueDomain,
    referenceNullableASD: () => valueDomain,
    fromText: (text) => text,
  };

  const props = {
    code: tbl.primaryKey(codeDomain),
    value: valueDomain,
    created_at: d.createdAt(),
  } as unknown as TPropAxioms;
  const tdrf = tbl.tableDomainsRowFactory(tableName, props, {
    // "created_at" is considered "housekeeping" with a default so don't
    // emit it as part of the insert DML statement
    defaultIspOptions: {
      isColumnEmittable: (name) => name == "created_at" ? false : true,
    },
  });
  const etn: EnumTableDefn = { enumTableNature: "text" };
  const td = tbl.tableDefinition(tableName, props, tdOptions);
  return {
    ...etn,
    ...td,
    ...tdrf,
    // seed will be used in SQL interpolation template literal, which accepts
    // either a string, SqlTextSupplier, or array of SqlTextSuppliers; in our
    // case, if seed data is provided we'll prepare the insert DMLs as an
    // array of SqlTextSuppliers
    seedDML: seedRows && seedRows.length > 0
      ? seedRows.map((s) => tdrf.insertDML(s as Any))
      : `-- no ${tableName} seed rows`,
    seedEnum,
    select: ss.entitySelectStmtPreparer<
      TableName,
      EnumRecord,
      EnumRecord,
      Context
    >(
      tableName,
      cr.filterCriteriaPreparer((group) => {
        if (group === "primary-keys") {
          return td.domains.filter((d) =>
            tbl.isTablePrimaryKeyColumnDefn(d) ? true : false
          ).map((d) => d.identity) as FilterableColumnName[];
        }
        return td.domains.filter((d) =>
          tbl.isTableColumnFilterCriteriaDqlExclusionSupplier(d) &&
            d.isExcludedFromFilterCriteriaDql
            ? false
            : true
        ).map((d) => d.identity) as FilterableColumnName[];
      }),
    ),
  };
}
