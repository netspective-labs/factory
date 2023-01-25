import * as safety from "../../../safety/mod.ts";
import * as ax from "../../../axiom/mod.ts";
import * as d from "../domain.ts";
import * as l from "../lint.ts";
import * as tmpl from "../template/mod.ts";
import * as tr from "../../../tabular/mod.ts";
import * as dml from "../dml/mod.ts";
import * as vw from "./view.ts";
import * as ss from "../dql/select.ts";
import * as ns from "../namespace.ts";
import * as js from "../js.ts";
import * as cr from "../dql/criteria.ts";

// deno-lint-ignore no-explicit-any
type Any = any; // make it easier on Deno linting

export type TablePrimaryKeyColumnDefn<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
> = d.AxiomSqlDomain<ColumnTsType, Context> & {
  readonly isPrimaryKey: true;
  readonly isAutoIncrement: boolean;
};

export function isTablePrimaryKeyColumnDefn<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is TablePrimaryKeyColumnDefn<ColumnTsType, Context> {
  const isTPKCD = safety.typeGuard<
    TablePrimaryKeyColumnDefn<ColumnTsType, Context>
  >("isPrimaryKey", "isAutoIncrement");
  return isTPKCD(o);
}

export type TableColumnInsertDmlExclusionSupplier<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
> = d.AxiomSqlDomain<ColumnTsType, Context> & {
  readonly isExcludedFromInsertDML: true;
};

export function isTableColumnInsertDmlExclusionSupplier<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is TableColumnInsertDmlExclusionSupplier<ColumnTsType, Context> {
  const isIDES = safety.typeGuard<
    TableColumnInsertDmlExclusionSupplier<ColumnTsType, Context>
  >("isExcludedFromInsertDML");
  return isIDES(o);
}

export type TableColumnInsertableOptionalSupplier<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
> = d.AxiomSqlDomain<ColumnTsType, Context> & {
  readonly isOptionalInInsertableRecord: true;
};

export function isTableColumnInsertableOptionalSupplier<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is TableColumnInsertableOptionalSupplier<ColumnTsType, Context> {
  const isIDES = safety.typeGuard<
    TableColumnInsertableOptionalSupplier<ColumnTsType, Context>
  >("isOptionalInInsertableRecord");
  return isIDES(o);
}

export type TableColumnFilterCriteriaDqlExclusionSupplier<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
> = d.AxiomSqlDomain<ColumnTsType, Context> & {
  readonly isExcludedFromFilterCriteriaDql: true;
};

export function isTableColumnFilterCriteriaDqlExclusionSupplier<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is TableColumnFilterCriteriaDqlExclusionSupplier<ColumnTsType, Context> {
  const isFCDES = safety.typeGuard<
    TableColumnFilterCriteriaDqlExclusionSupplier<ColumnTsType, Context>
  >("isExcludedFromFilterCriteriaDql");
  return isFCDES(o);
}

export function primaryKey<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
>(
  axiom: d.AxiomSqlDomain<ColumnTsType, Context>,
): TablePrimaryKeyColumnDefn<ColumnTsType, Context> {
  return {
    ...axiom,
    isPrimaryKey: true,
    isAutoIncrement: false,
    sqlPartial: (dest) => {
      if (dest === "create table, column defn decorators") {
        const ctcdd = axiom?.sqlPartial?.(
          "create table, column defn decorators",
        );
        const decorators: tmpl.SqlTextSupplier<Context> = {
          SQL: () => `PRIMARY KEY`,
        };
        return ctcdd ? [decorators, ...ctcdd] : [decorators];
      }
      return axiom.sqlPartial?.(dest);
    },
  };
}

export function autoIncPrimaryKey<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
>(
  axiom: d.AxiomSqlDomain<ColumnTsType, Context>,
):
  & TablePrimaryKeyColumnDefn<ColumnTsType, Context>
  & TableColumnInsertDmlExclusionSupplier<ColumnTsType, Context> {
  return {
    ...axiom,
    isPrimaryKey: true,
    isExcludedFromInsertDML: true,
    isAutoIncrement: true,
    sqlPartial: (dest) => {
      if (dest === "create table, column defn decorators") {
        const ctcdd = axiom?.sqlPartial?.(
          "create table, column defn decorators",
        );
        const decorators: tmpl.SqlTextSupplier<Context> = {
          SQL: () => `PRIMARY KEY AUTOINCREMENT`,
        };
        return ctcdd ? [decorators, ...ctcdd] : [decorators];
      }
      return axiom.sqlPartial?.(dest);
    },
  };
}

/**
 * Declare a "user agent defaultable" (`uaDefaultable`) primary key domain.
 * uaDefaultable means that the primary key is required on the way into the
 * database but can be defaulted on the user agent ("UA") side. This type of
 * AxiomSqlDomain is useful when the primary key is assigned a value from the
 * client app/service before going into the database.
 * @param axiom
 * @returns
 */
export function uaDefaultablePrimaryKey<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
>(
  axiom:
    & d.AxiomSqlDomain<ColumnTsType, Context>
    & ax.DefaultableAxiomSerDe<ColumnTsType>,
) {
  const result:
    & d.AxiomSqlDomain<ColumnTsType, Context>
    & ax.DefaultableAxiomSerDe<ColumnTsType>
    & TablePrimaryKeyColumnDefn<ColumnTsType, Context>
    & TableColumnInsertableOptionalSupplier<ColumnTsType, Context> = {
      ...axiom,
      isPrimaryKey: true,
      isAutoIncrement: false,
      isOptionalInInsertableRecord: true,
      sqlPartial: (dest) => {
        if (dest === "create table, column defn decorators") {
          const ctcdd = axiom?.sqlPartial?.(
            "create table, column defn decorators",
          );
          const decorators: tmpl.SqlTextSupplier<Context> = {
            SQL: () => `PRIMARY KEY`,
          };
          return ctcdd ? [decorators, ...ctcdd] : [decorators];
        }
        return axiom.sqlPartial?.(dest);
      },
    };
  return result;
}

export const uaDefaultablesTextPkUndefined =
  "uaDefaultablesTextPkUndefined" as const;

/**
 * Declare an async or sync "user agent defaultables" (`uaDefaultables`)
 * primary key domain. uaDefaultables means that the primary key is required
 * on the way into the database but can be defaulted on the user agent ("UA")
 * side using one or more "default value generator" rules. This type of
 * AxiomSqlDomain is useful when the primary key is assigned a value from the
 * client app/service before going into the database but the actual value can
 * be a hash, UUID, ULID, or other source.
 * @param defaultables the default value computers
 * @returns an AxiomSqlDomain which loops through defaults when necessary
 */
export function uaDefaultablesTextPK<Context extends tmpl.SqlEmitContext>(
  ...defaultables: ax.DefaultableAxiomSerDe<string>[]
) {
  const axiom = d.text();
  const result:
    & d.AxiomSqlDomain<string, Context>
    & ax.DefaultableAxiomSerDe<string>
    & TablePrimaryKeyColumnDefn<string, Context>
    & TableColumnInsertableOptionalSupplier<string, Context> = {
      ...axiom,
      isPrimaryKey: true,
      isAutoIncrement: false,
      isOptionalInInsertableRecord: true,
      sqlPartial: (dest) => {
        if (dest === "create table, column defn decorators") {
          const ctcdd = axiom?.sqlPartial?.(
            "create table, column defn decorators",
          );
          const decorators: tmpl.SqlTextSupplier<Context> = {
            SQL: () => `PRIMARY KEY`,
          };
          return ctcdd ? [decorators, ...ctcdd] : [decorators];
        }
        return axiom.sqlPartial?.(dest);
      },
      isDefaultable: (value?: string | undefined) => {
        return value === undefined ? true : false;
      },
      defaultValue: async (currentValue?) => {
        if (currentValue) return currentValue;

        for (const rule of defaultables) {
          const dv = await rule.defaultValue(currentValue);
          // !rule.isDefaultable(dv) means that dv was set to a proper value;
          // usually 'undefined' means improper but sometimes, like for a digest
          // value it might mean a 'placeholder' so we let the rule decide
          // whether the value was properly set
          if (!rule.isDefaultable(dv)) return dv;
        }
        return uaDefaultablesTextPkUndefined;
      },
    };
  return result;
}

/**
 * Declare a synchronous "user agent defaultables" (`uaDefaultables`) primary
 * key domain. Same as uaDefaultablesTextPK except only supports default value
 * rules that are not async.
 * @param defaultables the sync-only default value computers
 * @returns an AxiomSqlDomain which loops through defaults when necessary
 */
export function uaDefaultablesTextPkSync<Context extends tmpl.SqlEmitContext>(
  ...defaultables: ax.DefaultableAxiomSerDeSync<string>[]
) {
  const axiom = d.text();
  const result:
    & d.AxiomSqlDomain<string, Context>
    & ax.DefaultableAxiomSerDeSync<string>
    & TablePrimaryKeyColumnDefn<string, Context>
    & TableColumnInsertableOptionalSupplier<string, Context> = {
      ...axiom,
      isPrimaryKey: true,
      isAutoIncrement: false,
      isOptionalInInsertableRecord: true,
      sqlPartial: (dest) => {
        if (dest === "create table, column defn decorators") {
          const ctcdd = axiom?.sqlPartial?.(
            "create table, column defn decorators",
          );
          const decorators: tmpl.SqlTextSupplier<Context> = {
            SQL: () => `PRIMARY KEY`,
          };
          return ctcdd ? [decorators, ...ctcdd] : [decorators];
        }
        return axiom.sqlPartial?.(dest);
      },
      isDefaultable: (value?: string | undefined) => {
        return value === undefined ? true : false;
      },
      defaultValue: (currentValue?) => {
        if (currentValue) return currentValue;

        for (const rule of defaultables) {
          const dv = rule.defaultValue(currentValue);
          // !rule.isDefaultable(dv) means that dv was set to a proper value;
          // usually 'undefined' means improper but sometimes, like for a digest
          // value it might mean a 'placeholder' so we let the rule decide
          // whether the value was properly set
          if (!rule.isDefaultable(dv)) return dv;
        }
        return uaDefaultablesTextPkUndefined;
      },
    };
  return result;
}

export type TableBelongsToForeignKeyRelNature<
  Context extends tmpl.SqlEmitContext,
> = {
  readonly isBelongsToRel: true;
  readonly collectionName?: js.JsTokenSupplier<Context>;
};

export type TableSelfRefForeignKeyRelNature = {
  readonly isSelfRef: true;
};

export type TableForeignKeyRelNature<Context extends tmpl.SqlEmitContext> =
  | TableBelongsToForeignKeyRelNature<Context>
  | TableSelfRefForeignKeyRelNature
  | { readonly isExtendsRel: true }
  | { readonly isInheritsRel: true };

export function belongsTo<
  Context extends tmpl.SqlEmitContext,
>(
  singularSnakeCaseCollName?: string,
  pluralSnakeCaseCollName = singularSnakeCaseCollName
    ? `${singularSnakeCaseCollName}s`
    : undefined,
): TableBelongsToForeignKeyRelNature<Context> {
  return {
    isBelongsToRel: true,
    collectionName: singularSnakeCaseCollName
      ? js.jsSnakeCaseToken(
        singularSnakeCaseCollName,
        pluralSnakeCaseCollName,
      )
      : undefined,
  };
}

export function isTableBelongsToForeignKeyRelNature<
  Context extends tmpl.SqlEmitContext,
>(o: unknown): o is TableBelongsToForeignKeyRelNature<Context> {
  const isTBFKRN = safety.typeGuard<TableBelongsToForeignKeyRelNature<Context>>(
    "isBelongsToRel",
    "collectionName",
  );
  return isTBFKRN(o);
}

export const isTableSelfRefForeignKeyRelNature = safety.typeGuard<
  TableSelfRefForeignKeyRelNature
>("isSelfRef");

export type TableForeignKeyColumnDefn<
  ColumnTsType,
  ForeignTableName extends string,
  Context extends tmpl.SqlEmitContext,
> = d.AxiomSqlDomain<ColumnTsType, Context> & {
  readonly foreignTableName: ForeignTableName;
  readonly foreignDomain: d.AxiomSqlDomain<
    ColumnTsType,
    Context
  >;
  readonly foreignRelNature?: TableForeignKeyRelNature<Context>;
};

export function isTableForeignKeyColumnDefn<
  ColumnTsType,
  ForeignTableName extends string,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is TableForeignKeyColumnDefn<
  ColumnTsType,
  ForeignTableName,
  Context
> {
  const isTFKCD = safety.typeGuard<
    TableForeignKeyColumnDefn<
      ColumnTsType,
      ForeignTableName,
      Context
    >
  >("foreignTableName", "foreignDomain");
  return isTFKCD(o);
}

const selfRefTableNamePlaceholder = "SELFREF_TABLE_NAME_PLACEHOLDER" as const;

export function foreignKeyCustom<
  ColumnTsType,
  ForeignTableName extends string,
  Context extends tmpl.SqlEmitContext,
>(
  foreignTableName: ForeignTableName,
  foreignDomain: d.AxiomSqlDomain<
    ColumnTsType,
    Context
  >,
  domain: d.AxiomSqlDomain<ColumnTsType, Context>,
  foreignRelNature?: TableForeignKeyRelNature<Context>,
  domainOptions?: Partial<d.AxiomSqlDomain<ColumnTsType, Context>>,
): TableForeignKeyColumnDefn<
  ColumnTsType,
  ForeignTableName,
  Context
> {
  const result: TableForeignKeyColumnDefn<
    ColumnTsType,
    ForeignTableName,
    Context
  > = {
    foreignTableName,
    foreignDomain,
    foreignRelNature,
    ...domain,
    ...domainOptions,
    sqlPartial: (dest) => {
      if (dest === "create table, after all column definitions") {
        const aacd = domain?.sqlPartial?.(
          "create table, after all column definitions",
        );
        const fkClause: tmpl.SqlTextSupplier<Context> = {
          SQL: d.isIdentifiableSqlDomain(result)
            ? ((ctx) => {
              const ns = ctx.sqlNamingStrategy(ctx, {
                quoteIdentifiers: true,
              });
              const tn = ns.tableName;
              const cn = ns.tableColumnName;
              // don't use the foreignTableName passed in because it could be
              // mutated for self-refs in table definition phase
              const ftName = result.foreignTableName;
              return `FOREIGN KEY(${
                cn({
                  tableName: "TODO",
                  columnName: result.identity,
                })
              }) REFERENCES ${tn(ftName)}(${
                cn({
                  tableName: ftName,
                  columnName: d.isIdentifiableSqlDomain(foreignDomain)
                    ? foreignDomain.identity
                    : "/* FOREIGN KEY REFERENCE is not IdentifiableSqlDomain */",
                })
              })`;
            })
            : (() => {
              console.dir(result);
              return `/* FOREIGN KEY sqlPartial in "create table, after all column definitions" is not IdentifiableSqlDomain */`;
            }),
        };
        return aacd ? [...aacd, fkClause] : [fkClause];
      }
      return domain.sqlPartial?.(dest);
    },
  };
  return result;
}

export function foreignKey<
  ColumnTsType,
  ForeignTableName extends string,
  Context extends tmpl.SqlEmitContext,
>(
  foreignTableName: ForeignTableName,
  foreignDomain: d.AxiomSqlDomain<
    ColumnTsType,
    Context
  >,
  foreignRelNature?: TableForeignKeyRelNature<Context>,
  domainOptions?: Partial<d.AxiomSqlDomain<ColumnTsType, Context>>,
): TableForeignKeyColumnDefn<
  ColumnTsType,
  ForeignTableName,
  Context
> {
  return foreignKeyCustom(
    foreignTableName,
    foreignDomain,
    foreignDomain.referenceASD(),
    foreignRelNature,
    domainOptions,
  );
}

export function foreignKeyNullable<
  ColumnTsType,
  ForeignTableName extends string,
  Context extends tmpl.SqlEmitContext,
>(
  foreignTableName: ForeignTableName,
  foreignDomain: d.AxiomSqlDomain<
    ColumnTsType,
    Context
  >,
  foreignRelNature?: TableForeignKeyRelNature<Context>,
  domainOptions?: Partial<d.AxiomSqlDomain<ColumnTsType, Context>>,
) {
  return foreignKeyCustom<ColumnTsType | undefined, ForeignTableName, Context>(
    foreignTableName,
    foreignDomain,
    foreignDomain.referenceNullableASD(),
    foreignRelNature,
    { isOptional: true, ...domainOptions },
  );
}

export function selfRefForeignKey<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
>(
  domain: d.AxiomSqlDomain<ColumnTsType, Context>,
  domainOptions?: Partial<d.AxiomSqlDomain<ColumnTsType, Context>>,
) {
  return foreignKey(
    selfRefTableNamePlaceholder,
    domain,
    { isSelfRef: true },
    domainOptions,
  );
}

export function selfRefForeignKeyNullable<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
>(
  domain: d.AxiomSqlDomain<ColumnTsType, Context>,
  domainOptions?: Partial<d.AxiomSqlDomain<ColumnTsType, Context>>,
) {
  return foreignKeyNullable(
    selfRefTableNamePlaceholder,
    domain,
    { isSelfRef: true },
    { isOptional: true, ...domainOptions },
  );
}

export function typicalTableColumnDefnSQL<
  TableName extends string,
  ColumnName extends string,
  Context extends tmpl.SqlEmitContext,
>(
  tableName: TableName,
  isd: d.IdentifiableSqlDomain<Any, Context, ColumnName>,
): tmpl.RenderedSqlText<Context> {
  return (ctx) => {
    const { sqlTextEmitOptions: steOptions } = ctx;
    const ns = ctx.sqlNamingStrategy(ctx, { quoteIdentifiers: true });
    const columnName = ns.tableColumnName({
      tableName,
      columnName: isd.identity,
    });
    let sqlDataType = isd.sqlDataType("create table column").SQL(ctx);
    if (sqlDataType) sqlDataType = " " + sqlDataType;
    const decorations = isd.sqlPartial?.(
      "create table, column defn decorators",
    );
    const decoratorsSQL = decorations
      ? ` ${decorations.map((d) => d.SQL(ctx)).join(" ")}`
      : "";
    const notNull = decoratorsSQL.length == 0
      ? isd.isOptional ? "" : " NOT NULL"
      : "";
    const defaultValue = isd.sqlDefaultValue
      ? ` DEFAULT ${isd.sqlDefaultValue("create table column").SQL(ctx)}`
      : "";
    // deno-fmt-ignore
    return `${steOptions.indentation("define table column")}${columnName}${sqlDataType}${decoratorsSQL}${notNull}${defaultValue}`;
  };
}

export type TableIdentityColumnName<TableName extends string> =
  `${TableName}_id`;

export type TableIdentityColumnsSupplier<
  TableName extends string,
  Context extends tmpl.SqlEmitContext,
  TableIdColumnName extends TableIdentityColumnName<TableName> =
    TableIdentityColumnName<TableName>,
> = {
  [K in keyof TableName as TableIdColumnName]: d.AxiomSqlDomain<
    number,
    Context
  >;
};

export type TableDefinition<
  TableName extends string,
  Context extends tmpl.SqlEmitContext,
> = tmpl.SqlTextSupplier<Context> & {
  readonly tableName: TableName;
};

export function isTableDefinition<
  TableName extends string,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is TableDefinition<TableName, Context> {
  const isTD = safety.typeGuard<
    TableDefinition<TableName, Context>
  >("tableName", "SQL");
  return isTD(o);
}

export type TableConstraint<Context extends tmpl.SqlEmitContext> =
  tmpl.SqlTextSupplier<Context>;

export type IdentifiableTableConstraint<
  ConstraintIdentity extends string,
  Context extends tmpl.SqlEmitContext,
> = TableConstraint<Context> & {
  readonly constraintIdentity: ConstraintIdentity;
};

export type TableColumnsConstraint<
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
  ColumnName extends keyof TPropAxioms = keyof TPropAxioms,
> =
  & TableConstraint<Context>
  & {
    readonly constrainedColumnNames: ColumnName[];
  };

export function uniqueContraint<
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
  ColumnName extends keyof TPropAxioms = keyof TPropAxioms,
>(...constrainedColumnNames: ColumnName[]) {
  const constraint: TableColumnsConstraint<TPropAxioms, Context> = {
    constrainedColumnNames,
    SQL: (ctx) => {
      const ns = ctx.sqlNamingStrategy(ctx, { quoteIdentifiers: true });
      const ucQuoted = constrainedColumnNames.map((c) =>
        ns.domainName(String(c))
      );
      return `UNIQUE(${ucQuoted.join(", ")})`;
    },
  };
  return constraint;
}

export function tableConstraints<
  TableName extends string,
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
  ColumnName extends keyof TPropAxioms = keyof TPropAxioms,
>(tableName: TableName, columnsAxioms: TPropAxioms) {
  let uniqConstrIndex = 0;
  const constraints: (
    & IdentifiableTableConstraint<string, Context>
    & TableColumnsConstraint<TPropAxioms, Context>
  )[] = [];
  const builder = {
    uniqueNamed: (
      constraintIdentity = `unique${uniqConstrIndex}`,
      ...constrainedColumnNames: ColumnName[]
    ) => {
      uniqConstrIndex++;
      const constraint:
        & IdentifiableTableConstraint<string, Context>
        & TableColumnsConstraint<TPropAxioms, Context> = {
          constraintIdentity,
          ...uniqueContraint(...constrainedColumnNames),
        };
      constraints.push(constraint);
      return constraint;
    },
    unique: (...constrainedColumnNames: ColumnName[]) =>
      builder.uniqueNamed(undefined, ...constrainedColumnNames),
  };
  return {
    tableName,
    columnsAxioms,
    constraints,
    ...builder,
  };
}

export type UniqueColumnDefns<
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
> = {
  [
    Property in keyof TPropAxioms as Extract<
      Property,
      TPropAxioms[Property] extends { isUnique: true } ? Property
        : never
    >
  ]: d.IdentifiableSqlDomain<
    TPropAxioms[Property] extends ax.Axiom<infer T> ? T : never,
    Context
  >;
};

export interface TableDefnOptions<
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
> {
  readonly isIdempotent?: boolean;
  readonly isTemp?: boolean;
  readonly sqlPartial?: (
    destination: "after all column definitions",
  ) => tmpl.SqlTextSupplier<Context>[] | undefined;
  readonly onPropertyNotAxiomSqlDomain?: (
    name: string,
    axiom: ax.Axiom<Any>,
    domains: d.IdentifiableSqlDomain<Any, Context>[],
  ) => void;
  readonly sqlNS?: ns.SqlNamespaceSupplier;
  readonly constraints?: <
    TableName extends string,
  >(
    columnsAxioms: TPropAxioms,
    tableName: TableName,
  ) => TableColumnsConstraint<TPropAxioms, Context>[];
}

export type UniqueTableColumn = { readonly isUnique: boolean };

export const isUniqueTableColumn = safety.typeGuard<UniqueTableColumn>(
  "isUnique",
);

export function tableDefinition<
  TableName extends string,
  TPropAxioms extends Record<
    string,
    (ax.Axiom<Any> & Partial<UniqueTableColumn>)
  >,
  Context extends tmpl.SqlEmitContext,
>(
  tableName: TableName,
  props: TPropAxioms,
  tdOptions?: TableDefnOptions<TPropAxioms, Context>,
) {
  const columnDefnsSS: tmpl.SqlTextSupplier<Context>[] = [];
  const afterColumnDefnsSS: tmpl.SqlTextSupplier<Context>[] = [];
  const constraints: TableColumnsConstraint<TPropAxioms, Context>[] = [];
  const sd = d.sqlDomains(props, tdOptions);
  for (const columnDefn of sd.domains) {
    if (
      isTableForeignKeyColumnDefn(columnDefn) &&
      isTableSelfRefForeignKeyRelNature(columnDefn.foreignRelNature)
    ) {
      // manually "fix" the table name since self-refs are special
      (columnDefn as { foreignTableName: string }).foreignTableName = tableName;
    }
  }

  type ColumnDefns = {
    [Property in keyof TPropAxioms]: d.IdentifiableSqlDomain<
      TPropAxioms[Property] extends ax.Axiom<infer T> ? T : never,
      Context
    >;
  };
  const columns: ColumnDefns = {} as Any;
  for (const columnDefn of sd.domains) {
    const typicalSQL = typicalTableColumnDefnSQL(tableName, columnDefn);
    if (columnDefn.sqlPartial) {
      const acdPartial = columnDefn.sqlPartial(
        "create table, after all column definitions",
      );
      if (acdPartial) afterColumnDefnsSS.push(...acdPartial);

      const ctcPartial = columnDefn.sqlPartial(
        "create table, full column defn",
      );
      if (ctcPartial) {
        columnDefnsSS.push(...ctcPartial);
      } else {
        columnDefnsSS.push({ SQL: typicalSQL });
      }
    } else {
      columnDefnsSS.push({ SQL: typicalSQL });
    }
    columns[columnDefn.identity as (keyof TPropAxioms)] = columnDefn;
  }

  type PrimaryKeys = {
    [
      Property in keyof TPropAxioms as Extract<
        Property,
        TPropAxioms[Property] extends { isPrimaryKey: true } ? Property
          : never
      >
    ]: TablePrimaryKeyColumnDefn<
      TPropAxioms[Property] extends ax.Axiom<infer T> ? T : never,
      Context
    >;
  };

  const primaryKey: PrimaryKeys = {} as Any;
  const unique: UniqueColumnDefns<TPropAxioms, Context> = {} as Any;
  for (const column of sd.domains) {
    if (isTablePrimaryKeyColumnDefn(column)) {
      primaryKey[column.identity as (keyof PrimaryKeys)] = column as Any;
    }
    if (isUniqueTableColumn(column)) {
      unique[
        column.identity as (keyof UniqueColumnDefns<TPropAxioms, Context>)
      ] = column as Any;
      constraints.push(uniqueContraint(column.identity));
    }
  }

  type ForeignKeyRefs = {
    [Property in keyof TPropAxioms]: (
      foreignRelNature?: TableForeignKeyRelNature<Context>,
      domainOptions?: Partial<
        d.AxiomSqlDomain<
          TPropAxioms[Property] extends ax.Axiom<infer T> ? T : never,
          Context
        >
      >,
    ) => TableForeignKeyColumnDefn<
      TPropAxioms[Property] extends ax.Axiom<infer T> ? T : never,
      TableName,
      Context
    >;
  };
  type ForeignKeyNullableRefs = {
    [Property in keyof TPropAxioms]: (
      foreignRelNature?: TableForeignKeyRelNature<Context>,
      domainOptions?: Partial<
        d.AxiomSqlDomain<
          TPropAxioms[Property] extends ax.Axiom<infer T> ? (T | undefined)
            : never,
          Context
        >
      >,
    ) => TableForeignKeyColumnDefn<
      TPropAxioms[Property] extends ax.Axiom<infer T> ? (T | undefined) : never,
      TableName,
      Context
    >;
  };
  const fkRef: ForeignKeyRefs = {} as Any;
  const fkNullableRef: ForeignKeyNullableRefs = {} as Any;
  for (const column of sd.domains) {
    fkRef[column.identity as (keyof TPropAxioms)] = (
      foreignRelNature,
      domainOptions,
    ) => {
      return foreignKey(tableName, column, foreignRelNature, domainOptions);
    };
    fkNullableRef[column.identity as (keyof TPropAxioms)] = (
      foreignRelNature,
      domainOptions,
    ) => {
      return foreignKeyNullable(
        tableName,
        column,
        foreignRelNature,
        domainOptions,
      );
    };
  }

  afterColumnDefnsSS.push(...constraints);
  if (tdOptions?.constraints) {
    const custom = tdOptions?.constraints(props, tableName);
    afterColumnDefnsSS.push(...custom);
  }

  const tableDefnResult:
    & TableDefinition<TableName, Context>
    & {
      readonly columns: ColumnDefns;
      readonly primaryKey: PrimaryKeys;
      readonly unique: UniqueColumnDefns<TPropAxioms, Context>;
      readonly foreignKeyRef: ForeignKeyRefs;
      readonly fkNullableRef: ForeignKeyNullableRefs;
      readonly sqlNS?: ns.SqlNamespaceSupplier;
    }
    & tmpl.SqlSymbolSupplier<Context>
    & l.SqlLintIssuesSupplier
    & tmpl.SqlTextLintIssuesPopulator<Context> = {
      tableName,
      sqlSymbol: (ctx) =>
        ctx.sqlNamingStrategy(ctx, {
          quoteIdentifiers: true,
          qnss: tdOptions?.sqlNS,
        }).tableName(tableName),
      populateSqlTextLintIssues: (lis) => {
        for (const sdd of sd.domains) {
          if (d.isLintedSqlDomain(sdd)) {
            lis.registerLintIssue(...sdd.lintIssues);
          }
        }
        lis.registerLintIssue(...tableDefnResult.lintIssues);
      },
      lintIssues: [],
      registerLintIssue: (...li) => {
        tableDefnResult.lintIssues.push(...li);
      },
      SQL: (ctx) => {
        const { sqlTextEmitOptions: steOptions } = ctx;
        const ns = ctx.sqlNamingStrategy(ctx, {
          quoteIdentifiers: true,
          qnss: tdOptions?.sqlNS,
        });
        const indent = steOptions.indentation("define table column");
        const afterCDs =
          tdOptions?.sqlPartial?.("after all column definitions") ?? [];
        const decoratorsSQL = [...afterColumnDefnsSS, ...afterCDs].map((sts) =>
          sts.SQL(ctx)
        ).join(`,\n${indent}`);

        const { isTemp, isIdempotent } = tdOptions ?? {};
        // deno-fmt-ignore
        const result = `${steOptions.indentation("create table")}CREATE ${isTemp ? 'TEMP ' : ''}TABLE ${isIdempotent ? "IF NOT EXISTS " : ""}${ns.tableName(tableName)} (\n` +
        columnDefnsSS.map(cdss => cdss.SQL(ctx)).join(",\n") +
        (decoratorsSQL.length > 0 ? `,\n${indent}${decoratorsSQL}` : "") +
        "\n)";
        return result;
      },
      columns,
      primaryKey,
      unique,
      foreignKeyRef: fkRef,
      fkNullableRef: fkNullableRef,
      sqlNS: tdOptions?.sqlNS,
    };

  // we let Typescript infer function return to allow generics in sqlDomains to
  // be more effective but we want other parts of the `result` to be as strongly
  // typed as possible
  return {
    ...sd,
    ...tableDefnResult,
  };
}

export function typicalKeysTableDefinition<
  TableName extends string,
  TPropAxioms extends
    & Record<string, ax.Axiom<Any>>
    & Record<`${TableName}_id`, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
>(
  tableName: TableName,
  props: TPropAxioms,
  tdOptions?: TableDefnOptions<TPropAxioms, Context>,
) {
  return tableDefinition(tableName, props, tdOptions);
}

export type TableColumnsScalarValuesOrSqlExprs<
  T,
  Context extends tmpl.SqlEmitContext,
> = {
  [K in keyof T]: T[K] | tmpl.SqlTextSupplier<Context>;
};

export function tableDomainsRowFactory<
  TableName extends string,
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
>(
  tableName: TableName,
  props: TPropAxioms,
  tdrfOptions?: TableDefnOptions<TPropAxioms, Context> & {
    defaultIspOptions?: dml.InsertStmtPreparerOptions<
      TableName,
      Any,
      Any,
      Context
    >;
  },
) {
  const sd = d.sqlDomains(props, tdrfOptions);

  type EntireRecord = TableColumnsScalarValuesOrSqlExprs<
    ax.AxiomType<typeof sd>,
    Context
  >;
  type ExcludeFromInsertDML = {
    [
      Property in keyof TPropAxioms as Extract<
        Property,
        TPropAxioms[Property] extends { isExcludedFromInsertDML: true }
          ? Property
          : never
      >
    ]: true;
  };
  type ExcludeKeysFromFromInsertDML = Extract<
    keyof EntireRecord,
    keyof ExcludeFromInsertDML
  >;

  type OptionalInInsertableRecord = {
    [
      Property in keyof TPropAxioms as Extract<
        Property,
        TPropAxioms[Property] extends { isOptionalInInsertableRecord: true }
          ? Property
          : never
      >
    ]: true;
  };
  type OptionalKeysInInsertableRecord = Extract<
    keyof EntireRecord,
    keyof OptionalInInsertableRecord
  >;

  type AllButExcludedAndOptional = Omit<
    Omit<EntireRecord, ExcludeKeysFromFromInsertDML>,
    OptionalKeysInInsertableRecord
  >;
  type InsertableRecord =
    & AllButExcludedAndOptional
    & Partial<Pick<EntireRecord, OptionalKeysInInsertableRecord>>;
  type InsertableColumnName = keyof InsertableRecord & string;
  type InsertableObject = tr.TabularRecordToObject<InsertableRecord>;

  const defaultables = ax.axiomSerDeObjectDefaultables<TPropAxioms>(
    ...sd.domains,
  );

  // we let Typescript infer function return to allow generics in sqlDomains to
  // be more effective but we want other parts of the `result` to be as strongly
  // typed as possible
  const result = {
    prepareInsertable: (
      o: InsertableObject,
      rowState?: tr.TransformTabularRecordsRowState<InsertableRecord>,
      options?: tr.TransformTabularRecordOptions<InsertableRecord>,
    ) => tr.transformTabularRecord(o, rowState, options),
    insertDML: dml.typicalInsertStmtPreparerSync<
      TableName,
      InsertableRecord,
      EntireRecord,
      Context
    >(
      tableName,
      (group) => {
        if (group === "primary-keys") {
          return sd.domains.filter((d) =>
            isTablePrimaryKeyColumnDefn(d) ? true : false
          );
        }
        return sd.domains.filter((d) =>
          isTableColumnInsertDmlExclusionSupplier(d) &&
            d.isExcludedFromInsertDML
            ? false
            : true
        );
      },
      undefined,
      tdrfOptions?.defaultIspOptions,
    ),
    insertCustomDML: (
      mutateValues: (
        ir: safety.Writeable<InsertableRecord>,
        defaultable: typeof defaultables,
      ) => Promise<void>,
    ) =>
      dml.typicalInsertStmtPreparer<
        TableName,
        InsertableRecord,
        EntireRecord,
        Context
      >(
        tableName,
        (group) => {
          if (group === "primary-keys") {
            return sd.domains.filter((d) =>
              isTablePrimaryKeyColumnDefn(d) ? true : false
            );
          }
          return sd.domains.filter((d) =>
            isTableColumnInsertDmlExclusionSupplier(d) &&
              d.isExcludedFromInsertDML
              ? false
              : true
          );
        },
        (ir) => mutateValues(ir, defaultables),
        tdrfOptions?.defaultIspOptions,
      ),
  };
  return result;
}

export function tableSelectFactory<
  TableName extends string,
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
>(
  tableName: TableName,
  props: TPropAxioms,
  tdrfOptions?: TableDefnOptions<TPropAxioms, Context> & {
    defaultFcpOptions?: cr.FilterCriteriaPreparerOptions<Any, Context>;
    defaultSspOptions?: ss.SelectStmtPreparerOptions<
      TableName,
      Any,
      Any,
      Context
    >;
  },
) {
  const sd = d.sqlDomains(props, tdrfOptions);

  type OptionalInInsertableRecord = {
    [
      Property in keyof TPropAxioms as Extract<
        Property,
        TPropAxioms[Property] extends { isOptionalInInsertableRecord: true }
          ? Property
          : never
      >
    ]: true;
  };
  type OptionalKeysInInsertableRecord = Extract<
    keyof EntireRecord,
    keyof OptionalInInsertableRecord
  >;

  type EntireRecord =
    & tr.UntypedTabularRecordObject
    & cr.FilterableRecordValues<ax.AxiomType<typeof sd>, Context>;

  type FilterableRecord =
    & Omit<EntireRecord, OptionalKeysInInsertableRecord>
    & Partial<Pick<EntireRecord, OptionalKeysInInsertableRecord>>;
  type FilterableColumnName = keyof FilterableRecord & string;
  type FilterableObject = tr.TabularRecordToObject<FilterableRecord>;

  // we let Typescript infer function return to allow generics in sqlDomains to
  // be more effective but we want other parts of the `result` to be as strongly
  // typed as possible
  return {
    prepareFilterable: (
      o: FilterableObject,
      rowState?: tr.TransformTabularRecordsRowState<FilterableRecord>,
      options?: tr.TransformTabularRecordOptions<FilterableRecord>,
    ) => tr.transformTabularRecord(o, rowState, options),
    select: ss.entitySelectStmtPreparer<
      TableName,
      FilterableRecord,
      EntireRecord,
      Context
    >(
      tableName,
      cr.filterCriteriaPreparer((group) => {
        if (group === "primary-keys") {
          return sd.domains.filter((d) =>
            isTablePrimaryKeyColumnDefn(d) ? true : false
          ).map((d) => d.identity) as FilterableColumnName[];
        }
        return sd.domains.filter((d) =>
          isTableColumnFilterCriteriaDqlExclusionSupplier(d) &&
            d.isExcludedFromFilterCriteriaDql
            ? false
            : true
        ).map((d) => d.identity) as FilterableColumnName[];
      }, tdrfOptions?.defaultFcpOptions),
      tdrfOptions?.defaultSspOptions,
    ),
  };
}

export function tableDomainsViewWrapper<
  ViewName extends string,
  TableName extends string,
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
>(
  viewName: ViewName,
  tableName: TableName,
  props: TPropAxioms,
  tdvwOptions?:
    & vw.ViewDefnOptions<
      ViewName,
      keyof TPropAxioms & string,
      Context
    >
    & {
      readonly onPropertyNotAxiomSqlDomain?: (
        name: string,
        axiom: ax.Axiom<Any>,
        domains: d.IdentifiableSqlDomain<Any, Context>[],
      ) => void;
    },
) {
  const sd = d.sqlDomains(props, tdvwOptions);
  const selectColumnNames = sd.domains.map((d) => d.identity);
  const select: tmpl.SqlTextSupplier<Context> = {
    SQL: (ctx) => {
      const ns = ctx.sqlNamingStrategy(ctx, {
        quoteIdentifiers: true,
      });
      return `SELECT ${
        selectColumnNames.map((cn) =>
          ns.tableColumnName({
            tableName,
            columnName: cn,
          })
        ).join(", ")
      }\n  FROM ${ns.tableName(tableName)}`;
    },
  };
  const selectStmt: ss.Select<ViewName, Context> = {
    isValid: true,
    selectStmt: select,
    ...select,
    ...sd,
  };
  // views use render/dql/select.ts Select statements and they must
  // start with the literal word SELECT; TODO: fix this?
  return vw.safeViewDefinitionCustom(viewName, props, selectStmt, tdvwOptions);
}

export type TableNamePrimaryKeyLintOptions = {
  readonly ignoreTableLacksPrimaryKey?:
    | boolean
    | ((tableName: string) => boolean);
};

/**
 * Lint rule which checks that a given table name has a primary key
 * @param tableDefn the table definition to check
 * @returns a lint rule which, when executed and is not being ignored, will add
 *          a lintIssue to a given LintIssuesSupplier
 */
export const tableLacksPrimaryKeyLintRule = <
  Context extends tmpl.SqlEmitContext,
>(
  tableDefn: TableDefinition<Any, Context> & d.SqlDomainsSupplier<Context>,
) => {
  const rule: l.SqlLintRule<TableNamePrimaryKeyLintOptions> = {
    lint: (lis, lOptions) => {
      const { ignoreTableLacksPrimaryKey: iptn } = lOptions ?? {};
      const ignoreRule = iptn
        ? (typeof iptn === "boolean" ? iptn : iptn(tableDefn.tableName))
        : false;
      if (!ignoreRule) {
        const pkColumn = tableDefn.domains.find((ap) =>
          isTablePrimaryKeyColumnDefn<Any, Context>(ap)
        ) as unknown as (
          | (
            & d.IdentifiableSqlDomain<string, Context>
            & TablePrimaryKeyColumnDefn<Any, Context>
          )
          | undefined
        );
        if (!pkColumn) {
          lis.registerLintIssue({
            lintIssue:
              `table '${tableDefn.tableName}' has no primary key column(s)`,
            consequence: l.SqlLintIssueConsequence.WARNING_DDL,
          });
        }
      }
    },
  };
  return rule;
};

export type TableNameConsistencyLintOptions = {
  readonly ignorePluralTableName?: boolean | ((tableName: string) => boolean);
};

/**
 * Lint rule which checks that a given table name is not pluralized (does not
 * end with an 's').
 * @param tableName the table name to check
 * @returns a lint rule which, when executed and is not being ignored, will add
 *          a lintIssue to a given LintIssuesSupplier
 */
export const tableNameConsistencyLintRule = (tableName: string) => {
  const rule: l.SqlLintRule<TableNameConsistencyLintOptions> = {
    lint: (lis, lOptions) => {
      const { ignorePluralTableName: iptn } = lOptions ?? {};
      const ignoreRule = iptn
        ? (typeof iptn === "boolean" ? iptn : iptn(tableName))
        : false;
      if (!ignoreRule && tableName.endsWith("s")) {
        lis.registerLintIssue({
          lintIssue:
            `table name '${tableName}' ends with an 's' (should be singular, not plural)`,
          consequence: l.SqlLintIssueConsequence.CONVENTION_DDL,
        });
      }
    },
  };
  return rule;
};

/**
 * A lint rule which looks at each domain (column) and, if it has any lint
 * issues, will add them to the supplied LintIssuesSupplier
 * @param tableDefn the table whose columns (domains) should be checked
 * @returns a lint rule which, when executed and is not being ignored, will
 *          add each column defnintion lintIssue to a given LintIssuesSupplier
 */
export function tableColumnsLintIssuesRule<Context extends tmpl.SqlEmitContext>(
  tableDefn: TableDefinition<Any, Context> & d.SqlDomainsSupplier<Context>,
) {
  const rule: l.SqlLintRule = {
    lint: (lis) => {
      for (const col of tableDefn.domains) {
        if (l.isSqlLintIssuesSupplier(col)) {
          lis.registerLintIssue(
            ...col.lintIssues.map((li) => ({
              ...li,
              location: () => `table ${tableDefn.tableName} definition`,
            })),
          );
        }
      }
    },
  };
  return rule;
}

export type FKeyColNameConsistencyLintOptions<
  Context extends tmpl.SqlEmitContext,
> = {
  readonly ignoreFKeyColNameMissing_id?:
    | boolean
    | ((
      col: TableForeignKeyColumnDefn<Any, Any, Context>,
      tableDefn: TableDefinition<Any, Context> & d.SqlDomainsSupplier<Context>,
    ) => boolean);
  readonly ignoreColName_idNotFKey?:
    | boolean
    | ((
      col: d.IdentifiableSqlDomain<Any, Context>,
      tableDefn: TableDefinition<Any, Context> & d.SqlDomainsSupplier<Context>,
    ) => boolean);
};

/**
 * A lint rule which looks at each domain (column) and, if it has any lint
 * issues, will add them to the supplied LintIssuesSupplier
 * @param tableDefn the table whose columns (domains) should be checked
 * @returns a lint rule which, when executed and is not being ignored, will
 *          add each column defnintion lintIssue to a given LintIssuesSupplier
 */
export function tableFKeyColNameConsistencyLintRule<
  Context extends tmpl.SqlEmitContext,
>(
  tableDefn: TableDefinition<Any, Context> & d.SqlDomainsSupplier<Context>,
) {
  const rule: l.SqlLintRule<FKeyColNameConsistencyLintOptions<Context>> = {
    lint: (lis, lOptions) => {
      for (const col of tableDefn.domains) {
        if (isTableForeignKeyColumnDefn(col)) {
          const { ignoreFKeyColNameMissing_id: ifkcnm } = lOptions ?? {};
          const ignoreRule = ifkcnm
            ? (typeof ifkcnm === "boolean" ? ifkcnm : ifkcnm(col, tableDefn))
            : false;
          if (!ignoreRule) {
            let suggestion = `end with '_id'`;
            if (d.isIdentifiableSqlDomain(col.foreignDomain)) {
              // if the foreign key column name is the same as our column we're usually OK
              if (col.foreignDomain.identity == col.identity) {
                continue;
              }
              suggestion =
                `should be named "${col.foreignDomain.identity}" or end with '_id'`;
            }
            if (!col.identity.endsWith("_id")) {
              lis.registerLintIssue(
                d.domainLintIssue(
                  `Foreign key column "${col.identity}" in "${tableDefn.tableName}" ${suggestion}`,
                  { consequence: l.SqlLintIssueConsequence.CONVENTION_DDL },
                ),
              );
            }
          }
        } else {
          const { ignoreColName_idNotFKey: icnnfk } = lOptions ?? {};
          const ignoreRule = icnnfk
            ? (typeof icnnfk === "boolean" ? icnnfk : icnnfk(col, tableDefn))
            : false;
          if (
            !ignoreRule && (!isTablePrimaryKeyColumnDefn(col) &&
              col.identity.endsWith("_id"))
          ) {
            lis.registerLintIssue(
              d.domainLintIssue(
                `Column "${col.identity}" in "${tableDefn.tableName}" ends with '_id' but is neither a primary key nor a foreign key.`,
                { consequence: l.SqlLintIssueConsequence.CONVENTION_DDL },
              ),
            );
          }
        }
      }
    },
  };
  return rule;
}

export function tableLintRules<Context extends tmpl.SqlEmitContext>() {
  const rules = {
    tableNameConsistency: tableNameConsistencyLintRule,
    columnLintIssues: tableColumnsLintIssuesRule,
    fKeyColNameConsistency: tableFKeyColNameConsistencyLintRule,
    noPrimaryKeyDefined: tableLacksPrimaryKeyLintRule,
    typical: (
      tableDefn: TableDefinition<Any, Context> & d.SqlDomainsSupplier<Context>,
      ...additionalRules: l.SqlLintRule<Any>[]
    ) => {
      return l.aggregatedSqlLintRules<
        & TableNameConsistencyLintOptions
        & FKeyColNameConsistencyLintOptions<Context>
        & TableNamePrimaryKeyLintOptions
      >(
        rules.tableNameConsistency(tableDefn.tableName),
        rules.noPrimaryKeyDefined(tableDefn),
        rules.columnLintIssues(tableDefn),
        rules.fKeyColNameConsistency(tableDefn),
        ...additionalRules,
      );
    },
  };
  return rules;
}
