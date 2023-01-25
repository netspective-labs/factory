import * as safety from "../../safety/mod.ts";
import * as ax from "../../axiom/mod.ts";
import * as axsdu from "../../axiom/axiom-serde-ulid.ts";
import * as axsdc from "../../axiom/axiom-serde-crypto.ts";
import * as tmpl from "./template/mod.ts";
import * as l from "./lint.ts";

/**
 * A `domain` is an Axiom-typed "data definition" valuable for many use cases:
 * - defining a column of a table that may generate create table DDL
 * - defining a column in a select clause
 * - defining a column of a view that may generate create view DDL
 * - defining an argument of a stored function or procedure
 *
 * A domain should be a simple JS/TS object that has no other relationships or
 * dependencies (see 'domains' below for relationships). Domains are effective
 * when they remain type-safe through Axiom and should be composable through
 * simple functions and spread operators. This allows, e.g., a column defined
 * for a "create table" DDL defintion to be used as an argument definition for
 * a stored function and vice-versa. Favoring composability over inheritance
 * is the reason why a data definition domain remains a simple JS object
 * instead of a class.
 *
 * A `domains` object groups multiple Axiom-typed "data definition" domains
 * and treats them as a collection. Domains are abstract types valuable for
 * these use cases:
 * - defining a list of coumns in a table for DDL
 * - defining a list of select clause columns in SQL statement
 * - defining a list of arguments for a stored function
 */

// deno-lint-ignore no-explicit-any
export type Any = any; // make it easier on Deno linting

export type AxiomSqlDomain<
  TsValueType,
  Context extends tmpl.SqlEmitContext,
> = ax.AxiomSerDe<TsValueType> & {
  readonly sqlDataType: (
    purpose:
      | "create table column"
      | "stored routine arg"
      | "stored function returns scalar"
      | "stored function returns table column"
      | "type field"
      | "table foreign key ref"
      | "diagram"
      | "PostgreSQL domain",
  ) => tmpl.SqlTextSupplier<Context>;
  readonly sqlDefaultValue?: (
    purpose: "create table column" | "stored routine arg",
  ) => tmpl.SqlTextSupplier<Context>;
  readonly sqlDmlTransformInsertableValue?: (
    supplied: TsValueType | undefined,
  ) => TsValueType;
  readonly sqlPartial?: (
    destination:
      | "create table, full column defn"
      | "create table, column defn decorators"
      | "create table, after all column definitions",
  ) => tmpl.SqlTextSupplier<Context>[] | undefined;
  readonly referenceASD: () => AxiomSqlDomain<
    TsValueType,
    Context
  >;
  readonly referenceNullableASD: () => AxiomSqlDomain<
    TsValueType | undefined,
    Context
  >;
};

export function isAxiomSqlDomain<
  TsValueType,
  Context extends tmpl.SqlEmitContext,
>(o: unknown): o is AxiomSqlDomain<TsValueType, Context> {
  const isASD = safety.typeGuard<
    AxiomSqlDomain<TsValueType, Context>
  >("sqlDataType", "referenceASD", "referenceNullableASD");
  return isASD(o);
}

export type IdentifiableSqlDomain<
  TsValueType,
  Context extends tmpl.SqlEmitContext,
  DomainIdentity extends string = string,
> =
  & AxiomSqlDomain<TsValueType, Context>
  & {
    readonly identity: DomainIdentity;
    readonly reference: <ForeignIdentity>(
      options?: {
        readonly foreignIdentity?: ForeignIdentity;
      },
    ) => Omit<IdentifiableSqlDomain<Any, Context>, "reference">;
  }
  & tmpl.SqlSymbolSupplier<Context>;

export function isIdentifiableSqlDomain<
  TsValueType,
  Context extends tmpl.SqlEmitContext,
  DomainIdentity extends string = string,
>(
  o: unknown,
): o is IdentifiableSqlDomain<
  TsValueType,
  Context,
  DomainIdentity
> {
  const isISD = safety.typeGuard<
    IdentifiableSqlDomain<TsValueType, Context, DomainIdentity>
  >("identity", "sqlSymbol");
  return isAxiomSqlDomain(o) && isISD(o);
}

export type LintedSqlDomain<
  TsValueType,
  Context extends tmpl.SqlEmitContext,
> =
  & AxiomSqlDomain<TsValueType, Context>
  & l.SqlLintIssuesSupplier;

export function isLintedSqlDomain<
  TsValueType,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is LintedSqlDomain<TsValueType, Context> {
  return isAxiomSqlDomain(o) && l.isSqlLintIssuesSupplier(o);
}

// deno-lint-ignore no-empty-interface
export interface SqlDomainLintIssueSupplier<
  TsValueType,
  Context extends tmpl.SqlEmitContext,
> extends l.SqlLintIssueSupplier {
}

export function lintedSqlDomain<
  TsValueType,
  Context extends tmpl.SqlEmitContext,
>(
  domain: AxiomSqlDomain<TsValueType, Context>,
  ...lintIssues: SqlDomainLintIssueSupplier<TsValueType, Context>[]
): LintedSqlDomain<TsValueType, Context> {
  let result: LintedSqlDomain<TsValueType, Context>;
  if (isLintedSqlDomain(domain)) {
    result = domain;
  } else {
    const wDomain = domain as unknown as safety.Writeable<
      l.SqlLintIssuesSupplier
    >;
    wDomain.lintIssues = [];
    wDomain.registerLintIssue = (...slis) => wDomain.lintIssues.push(...slis);
    result = domain as LintedSqlDomain<TsValueType, Context>;
  }
  result.lintIssues.push(...lintIssues);
  return result;
}

export function domainLintIssue<
  TsValueType,
  Context extends tmpl.SqlEmitContext,
>(
  lintIssue: string,
  options?: Partial<Omit<l.SqlLintIssueSupplier, "lintIssue">>,
): SqlDomainLintIssueSupplier<TsValueType, Context> {
  const { location, consequence } = options ?? {};
  return {
    lintIssue,
    location: location
      ? (typeof location === "string"
        ? ((options) =>
          options?.maxLength ? location!.slice(0, options.maxLength) : location)
        : location)
      : undefined,
    consequence,
  };
}

export type GovernedSqlDomain<
  TsValueType,
  Governance,
  Context extends tmpl.SqlEmitContext,
> =
  & AxiomSqlDomain<TsValueType, Context>
  & ax.GovernableAxiomSerDe<TsValueType, Governance>;

export function isGovernedSqlDomain<
  TsValueType,
  Governance,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
  govnGuard?: (o: unknown) => o is Governance,
): o is GovernedSqlDomain<TsValueType, Governance, Context> {
  return isAxiomSqlDomain<TsValueType, Context>(o) &&
    ax.isGovernableAxiomSerDe<TsValueType, Governance>(o, govnGuard);
}

export function mutateGovernedASD<
  TsValueType,
  Governance,
  Context extends tmpl.SqlEmitContext,
>(
  domain: AxiomSqlDomain<TsValueType, Context>,
  governance: (existing?: Governance) => Governance,
) {
  const wDomain = domain as unknown as safety.Writeable<
    GovernedSqlDomain<TsValueType, Governance, Context>
  >;
  wDomain.governance = governance(wDomain.governance);
  return domain;
}

export function untyped<
  Context extends tmpl.SqlEmitContext,
>(
  axiom: ax.AxiomSerDe<unknown> = ax.untyped(),
  asdOptions?: Partial<AxiomSqlDomain<unknown, Context>>,
): AxiomSqlDomain<unknown, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `/* untyped */` }),
    isOptional: false,
    referenceASD: () => untyped(),
    referenceNullableASD: () => untypedNullable(),
    ...asdOptions,
  };
}

export function untypedNullable<
  Context extends tmpl.SqlEmitContext,
>(
  axiom: ax.AxiomSerDe<unknown | undefined> = ax.untypedOptional(),
  asdOptions?: Partial<AxiomSqlDomain<unknown, Context>>,
): AxiomSqlDomain<unknown | undefined, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `/* untyped */` }),
    isOptional: true,
    referenceASD: () => untyped(),
    referenceNullableASD: () => untypedNullable(),
    ...asdOptions,
  };
}

export function text<
  Context extends tmpl.SqlEmitContext,
>(
  axiom: ax.AxiomSerDe<string> = ax.text(),
  asdOptions?: Partial<AxiomSqlDomain<string, Context>>,
): AxiomSqlDomain<string, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `TEXT` }),
    isOptional: false,
    referenceASD: () => text(),
    referenceNullableASD: () => textNullable(),
    ...asdOptions,
  };
}

export function textNullable<
  Context extends tmpl.SqlEmitContext,
>(
  axiom: ax.AxiomSerDe<string | undefined> = ax.textOptional(),
  asdOptions?: Partial<AxiomSqlDomain<string, Context>>,
): AxiomSqlDomain<string | undefined, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `TEXT` }),
    isOptional: true,
    referenceASD: () => text(),
    referenceNullableASD: () => textNullable(),
    ...asdOptions,
  };
}

export function date<
  Context extends tmpl.SqlEmitContext,
>(
  axiom: ax.AxiomSerDe<Date> = ax.date(),
  asdOptions?: Partial<AxiomSqlDomain<Date, Context>>,
): AxiomSqlDomain<Date, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `DATE` }),
    isOptional: false,
    referenceASD: () => date(),
    referenceNullableASD: () => dateNullable(),
    ...asdOptions,
  };
}

export function dateNullable<
  Context extends tmpl.SqlEmitContext,
>(
  axiom: ax.AxiomSerDe<Date | undefined> = ax.dateOptional(),
  asdOptions?: Partial<AxiomSqlDomain<Date | undefined, Context>>,
): AxiomSqlDomain<Date | undefined, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `DATE` }),
    isOptional: true,
    referenceASD: () => date(),
    referenceNullableASD: () => dateNullable(),
    ...asdOptions,
  };
}

export function dateTime<
  Context extends tmpl.SqlEmitContext,
>(
  axiom: ax.AxiomSerDe<Date> = ax.dateTime(),
  asdOptions?: Partial<AxiomSqlDomain<Date, Context>>,
): AxiomSqlDomain<Date, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `DATETIME` }),
    isOptional: false,
    referenceASD: () => dateTime(),
    referenceNullableASD: () => dateTimeNullable(),
    ...asdOptions,
  };
}

export function dateTimeNullable<
  Context extends tmpl.SqlEmitContext,
>(
  axiom: ax.AxiomSerDe<Date | undefined> = ax.dateTimeOptional(),
  asdOptions?: Partial<AxiomSqlDomain<Date | undefined, Context>>,
): AxiomSqlDomain<Date | undefined, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `DATETIME` }),
    isOptional: true,
    referenceASD: () => dateTime(),
    referenceNullableASD: () => dateTimeNullable(),
    ...asdOptions,
  };
}

export function float<Context extends tmpl.SqlEmitContext>(
  axiom: ax.AxiomSerDe<number> = ax.float(),
  asdOptions?: Partial<AxiomSqlDomain<number, Context>>,
): AxiomSqlDomain<number, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `FLOAT` }),
    isOptional: false,
    referenceASD: () => float(),
    referenceNullableASD: () => floatNullable(),
    ...asdOptions,
  };
}

export function floatNullable<Context extends tmpl.SqlEmitContext>(
  axiom: ax.AxiomSerDe<number | undefined> = ax.floatOptional(),
  asdOptions?: Partial<AxiomSqlDomain<number, Context>>,
): AxiomSqlDomain<number | undefined, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `FLOAT` }),
    isOptional: true,
    referenceASD: () => float(),
    referenceNullableASD: () => floatNullable(),
    ...asdOptions,
  };
}

export function createdAt<
  Context extends tmpl.SqlEmitContext,
>(): AxiomSqlDomain<Date | undefined, Context> {
  return dateTimeNullable(undefined, {
    sqlDefaultValue: () => ({ SQL: () => `CURRENT_TIMESTAMP` }),
  });
}

export function integer<
  Context extends tmpl.SqlEmitContext,
>(
  axiom: ax.AxiomSerDe<number> = ax.integer(),
  asdOptions?: Partial<AxiomSqlDomain<number, Context>>,
): AxiomSqlDomain<number, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `INTEGER` }),
    isOptional: false,
    referenceASD: () => integer(),
    referenceNullableASD: () => integerNullable(),
    ...asdOptions,
  };
}

export function integerNullable<
  Context extends tmpl.SqlEmitContext,
>(
  axiom: ax.AxiomSerDe<number | undefined> = ax.integerOptional(),
  asdOptions?: Partial<AxiomSqlDomain<number, Context>>,
): AxiomSqlDomain<number | undefined, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `INTEGER` }),
    isOptional: true,
    referenceASD: () => integer(),
    referenceNullableASD: () => integerNullable(),
    ...asdOptions,
  };
}

export function bigint<
  Context extends tmpl.SqlEmitContext,
>(
  axiom: ax.AxiomSerDe<bigint> = ax.bigint(),
  asdOptions?: Partial<AxiomSqlDomain<bigint, Context>>,
): AxiomSqlDomain<bigint, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `BIGINT` }),
    isOptional: false,
    referenceASD: () => bigint(),
    referenceNullableASD: () => bigintNullable(),
    ...asdOptions,
  };
}

export function bigintNullable<
  Context extends tmpl.SqlEmitContext,
>(
  axiom: ax.AxiomSerDe<bigint | undefined> = ax.bigintOptional(),
  asdOptions?: Partial<AxiomSqlDomain<bigint, Context>>,
): AxiomSqlDomain<bigint | undefined, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `BIGINT` }),
    isOptional: true,
    referenceASD: () => bigint(),
    referenceNullableASD: () => bigintNullable(),
    ...asdOptions,
  };
}

export function jsonText<
  Context extends tmpl.SqlEmitContext,
>(
  axiom: ax.AxiomSerDe<string> = ax.jsonText(),
  asdOptions?: Partial<AxiomSqlDomain<string, Context>>,
): AxiomSqlDomain<string, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `JSON` }),
    isOptional: false,
    referenceASD: () => jsonText(),
    referenceNullableASD: () => jsonTextNullable(),
    ...asdOptions,
  };
}

export function jsonTextNullable<
  Context extends tmpl.SqlEmitContext,
>(
  axiom: ax.AxiomSerDe<string | undefined> = ax.jsonTextOptional(),
  asdOptions?: Partial<AxiomSqlDomain<string, Context>>,
): AxiomSqlDomain<string | undefined, Context> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `JSON` }),
    isOptional: true,
    referenceASD: () => jsonText(),
    referenceNullableASD: () => jsonTextNullable(),
    ...asdOptions,
  };
}

export function ulid<Context extends tmpl.SqlEmitContext>(
  axiom = axsdu.ulidAxiomSD(),
  asdOptions?: Partial<AxiomSqlDomain<string, Context>>,
): AxiomSqlDomain<string, Context> & ax.DefaultableAxiomSerDe<string> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `TEXT` }),
    isOptional: false,
    referenceASD: () => text(),
    referenceNullableASD: () => textNullable(),
    ...asdOptions,
  };
}

export function uuidv4<Context extends tmpl.SqlEmitContext>(
  axiom = axsdc.uuidAxiomSD(),
  asdOptions?: Partial<AxiomSqlDomain<string, Context>>,
): AxiomSqlDomain<string, Context> & ax.DefaultableAxiomSerDe<string> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `TEXT` }),
    isOptional: false,
    referenceASD: () => text(),
    referenceNullableASD: () => textNullable(),
    ...asdOptions,
  };
}

export function sha1Digest<Context extends tmpl.SqlEmitContext>(
  axiom = axsdc.sha1DigestAxiomSD(),
  asdOptions?: Partial<AxiomSqlDomain<string, Context>>,
): AxiomSqlDomain<string, Context> & ax.DefaultableAxiomSerDe<string> {
  return {
    ...axiom,
    sqlDataType: () => ({ SQL: () => `TEXT` }),
    isOptional: false,
    referenceASD: () => text(),
    referenceNullableASD: () => textNullable(),
    ...asdOptions,
  };
}

export interface SqlDomainsSupplier<
  Context extends tmpl.SqlEmitContext,
  TsValueType = Any,
> {
  domains: IdentifiableSqlDomain<
    TsValueType,
    Context
  >[];
}

export function isSqlDomainsSupplier<
  Context extends tmpl.SqlEmitContext,
  TsValueType,
>(o: unknown): o is SqlDomainsSupplier<Context, TsValueType> {
  const isSDS = safety.typeGuard<
    SqlDomainsSupplier<Context, TsValueType>
  >("domains");
  return isSDS(o);
}

export function sqlDomains<
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
>(
  props: TPropAxioms,
  sdOptions?: {
    readonly onPropertyNotAxiomSqlDomain?: (
      name: string,
      axiom: Any,
      domains: IdentifiableSqlDomain<Any, Context>[],
    ) => void;
  },
) { // we let Typescript infer function return to allow generics to be more effective
  const { onPropertyNotAxiomSqlDomain } = sdOptions ?? {};
  const domains: IdentifiableSqlDomain<
    Any,
    Context
  >[] = [];
  const axiom = ax.$.object(props);
  Object.entries(axiom.axiomObjectDecl).forEach((entry) => {
    const [name, axiom] = entry;
    if (isAxiomSqlDomain<Any, Context>(axiom)) {
      const mutatableISD = axiom as safety.Writeable<
        IdentifiableSqlDomain<Any, Context>
      >;
      mutatableISD.identity = name as Any;
      mutatableISD.sqlSymbol = (ctx) =>
        ctx.sqlNamingStrategy(ctx, { quoteIdentifiers: true }).domainName(name);
      mutatableISD.reference = (rOptions) => {
        const refIdentity = (rOptions?.foreignIdentity ?? name) as string;
        const result: Omit<
          IdentifiableSqlDomain<Any, Context>,
          "reference"
        > = {
          identity: refIdentity,
          sqlSymbol: (ctx) =>
            ctx.sqlNamingStrategy(ctx, { quoteIdentifiers: true }).domainName(
              name,
            ),
          ...axiom.referenceASD(),
        };
        return result;
      };
      domains.push(mutatableISD);
    } else {
      onPropertyNotAxiomSqlDomain?.(name, axiom, domains);
    }
  });

  // we let Typescript infer function return to allow generics to be more
  // easily passed to consumers (if we typed it to an interface we'd limit
  // the type-safety)
  // ESSENTIAL: be sure it adheres to SqlDomainsSupplier contract
  return {
    ...axiom,
    domains,
  };
}

export function* lintedSqlDomains<
  Context extends tmpl.SqlEmitContext,
  TsValueType = Any,
>(
  domains: Iterable<IdentifiableSqlDomain<TsValueType, Context>>,
  include?: (
    d:
      & IdentifiableSqlDomain<TsValueType, Context, string>
      & LintedSqlDomain<TsValueType, Context>,
  ) => boolean,
): Generator<
  & IdentifiableSqlDomain<TsValueType, Context, string>
  & LintedSqlDomain<TsValueType, Context>,
  void
> {
  for (const d of domains) {
    if (isLintedSqlDomain<TsValueType, Context>(d)) {
      if (!include || include(d)) yield d;
    }
  }
}

export function* governedSqlDomains<
  Governance,
  Context extends tmpl.SqlEmitContext,
  TsValueType = Any,
>(
  domains: Iterable<IdentifiableSqlDomain<TsValueType, Context>>,
  include?: (
    govnASD:
      & IdentifiableSqlDomain<TsValueType, Context, string>
      & GovernedSqlDomain<TsValueType, Governance, Context>,
  ) => boolean,
): Generator<
  & IdentifiableSqlDomain<TsValueType, Context, string>
  & GovernedSqlDomain<TsValueType, Governance, Context>,
  void
> {
  for (const d of domains) {
    if (isGovernedSqlDomain<TsValueType, Governance, Context>(d)) {
      if (!include || include(d)) yield d;
    }
  }
}

/**
 * Prepare map of common domain constructors from typical text values defining
 * domain 'types'. This function is useful for parsing DDL or other schema and
 * preparing runtime domain definitions from the schema ('reflection')
 *
 * For example, the following query could be used to determine all the types in
 * a SQLite database:
 *
 * SELECT DISTINCT table_info.type
 *   FROM sqlite_master
 *   JOIN pragma_table_info(sqlite_master.name) as table_info
 *  WHERE table_info.type <> ''`
 *
 * The results of that query could be passed into this function to prepare a map
 * that, given a type name, could give back a function which prepares/constructs
 * a domain for that type.
 *
 * @param domainIDs the list of domain IDs the prepare a domain factory map for
 * @returns a map which can be used to do construct domain factories
 */
export function typicalDomainFromTextFactory<
  DomainID extends string,
  Context extends tmpl.SqlEmitContext,
>(...domainIDs: DomainID[]) {
  const result = new Map<
    DomainID,
    (nullable?: boolean) => AxiomSqlDomain<Any, Context>
  >();
  for (const domainID of domainIDs) {
    switch (domainID) {
      case "":
      case "UNTYPED":
        result.set(
          domainID,
          (nullable) => nullable ? untypedNullable() : untyped(),
        );
        break;

      case "INTEGER":
        result.set(
          domainID,
          (nullable) => nullable ? integerNullable() : integer(),
        );
        break;

      case "BIGINT":
        result.set(
          domainID,
          (nullable) => nullable ? bigintNullable() : bigint(),
        );
        break;

      case "DATETIME":
        result.set(
          domainID,
          (nullable) => nullable ? dateTimeNullable() : dateTime(),
        );
        break;

      default:
        if (domainID.startsWith("NUMERIC")) {
          // TODO: add "real" or "float"
          result.set(
            domainID,
            (nullable) => nullable ? integerNullable() : integer(),
          );
        } else {
          // if "text" or "NVARCHAR" or any other type
          result.set(
            domainID,
            (nullable) => nullable ? textNullable() : text(),
          );
        }
    }
  }
  return result;
}

/**
 * domainFromValue creates a domain by inspecting a Javascript value.
 *
 * @param value the value to inspect
 * @returns a map which can be used to do construct domain factories
 */
export function domainFromValue<
  TsValueType,
  Context extends tmpl.SqlEmitContext,
>(
  value: TsValueType,
  isNullable = false,
) {
  switch (typeof value) {
    case "string":
      return isNullable ? textNullable<Context>() : text<Context>();

    // TODO: set this to "real" or "float"?

    case "number":
      return isNullable ? integerNullable<Context>() : integer<Context>();

    case "bigint":
      return isNullable ? bigintNullable<Context>() : bigint<Context>();

    // TODO: add other types

    default:
      return undefined;
  }
}

export function domainAxiomsFromObject<
  Object extends Record<string, unknown>,
  Context extends tmpl.SqlEmitContext,
  TPropAxioms extends Record<keyof Object, ax.Axiom<Any>> = Record<
    keyof Object,
    ax.Axiom<Any>
  >,
>(exemplar: Object) {
  const axioms: TPropAxioms = {} as Any;
  for (const entry of Object.entries(exemplar)) {
    const [key, value] = entry;
    (axioms[key] as Any) = domainFromValue<Any, Context>(value);
  }
  return axioms;
}

export function untypeDomainsAxiomsFromKeys<
  Identity extends string,
  Context extends tmpl.SqlEmitContext,
>(...keys: Identity[]) {
  const axioms: Record<Identity, ax.Axiom<Any>> = {} as Any;
  for (const key of keys) {
    (axioms[key] as Any) = untyped<Context>();
  }
  return axioms;
}
