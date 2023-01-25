import * as safety from "../../../../safety/mod.ts";
import * as tmpl from "../../template/mod.ts";
import * as r from "../../pl/mod.ts";
import * as ax from "../../../../axiom/mod.ts";
import * as d from "../../domain.ts";
import * as ns from "../../namespace.ts";

export function routineSqlTextSupplierOptions<
  Context extends tmpl.SqlEmitContext,
>(
  inherit?: Partial<tmpl.SqlTextSupplierOptions<Context>>,
): tmpl.SqlTextSupplierOptions<Context> {
  return tmpl.typicalSqlTextSupplierOptions(inherit);
}

// deno-lint-ignore no-explicit-any
type Any = any;

export type PgRoutineArgModifier<
  ArgTsType,
  Context extends tmpl.SqlEmitContext,
> = d.AxiomSqlDomain<ArgTsType, Context> & {
  readonly pgRouteineArgModifier: "IN" | "OUT" | "IN OUT";
};

export function isPgRoutineArgModifer<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is PgRoutineArgModifier<ColumnTsType, Context> {
  const isPRAM = safety.typeGuard<
    PgRoutineArgModifier<ColumnTsType, Context>
  >("pgRouteineArgModifier");
  return isPRAM(o);
}

export function IN<
  ArgTsType,
  Context extends tmpl.SqlEmitContext,
>(
  axiom: d.AxiomSqlDomain<ArgTsType, Context>,
): PgRoutineArgModifier<ArgTsType, Context> {
  return {
    ...axiom,
    pgRouteineArgModifier: "IN",
  };
}

export function OUT<
  ArgTsType,
  Context extends tmpl.SqlEmitContext,
>(
  axiom: d.AxiomSqlDomain<ArgTsType, Context>,
): PgRoutineArgModifier<ArgTsType, Context> {
  return {
    ...axiom,
    pgRouteineArgModifier: "OUT",
  };
}

export function IN_OUT<
  ArgTsType,
  Context extends tmpl.SqlEmitContext,
>(
  axiom: d.AxiomSqlDomain<ArgTsType, Context>,
): PgRoutineArgModifier<ArgTsType, Context> {
  return {
    ...axiom,
    pgRouteineArgModifier: "IN OUT",
  };
}

export interface PgProceduralLang<
  Language extends string,
  Context extends tmpl.SqlEmitContext,
> {
  readonly identity: Language;
  readonly sqlPartial: (
    destination:
      | "after procedure args declaration, before body"
      | "after function args declaration, before body"
      | "after body definition",
  ) => tmpl.SqlTextSupplier<Context>;
}

export interface PgProceduralLangSupplier<
  Language extends string,
  Context extends tmpl.SqlEmitContext,
> {
  readonly pgPL: PgProceduralLang<Language, Context>;
}

export const plPgSqlIdentity = "PL/pgSQL" as const;
export function plPgSqlLanguage<
  Context extends tmpl.SqlEmitContext,
>(): PgProceduralLang<typeof plPgSqlIdentity, Context> {
  return {
    identity: plPgSqlIdentity,
    sqlPartial: () => ({
      SQL: () => `LANGUAGE PLPGSQL`,
    }),
  };
}

export const plSqlIdentity = "PL/SQL" as const;
export function plSqlLanguage<
  Context extends tmpl.SqlEmitContext,
>(): PgProceduralLang<typeof plSqlIdentity, Context> {
  return {
    identity: plSqlIdentity,
    sqlPartial: () => ({
      SQL: () => `LANGUAGE SQL`,
    }),
  };
}

export interface PgProceduralLangBody<
  BodyIdentity extends string,
  Language extends string,
  Context extends tmpl.SqlEmitContext,
> extends
  r.RoutineBody<BodyIdentity, Context>,
  PgProceduralLangSupplier<Language, Context> {
}

export function untypedPlSqlBody<
  BodyIdentity extends string,
  Context extends tmpl.SqlEmitContext,
>(identity: BodyIdentity, ess: tmpl.EmbeddedSqlSupplier) {
  return (
    literals: TemplateStringsArray,
    ...expressions: tmpl.SqlPartialExpression<Context>[]
  ) => {
    const contentPartial = ess.embeddedSQL<Context>(
      routineSqlTextSupplierOptions(),
    );
    const content = contentPartial(literals, ...expressions);
    const result:
      & PgProceduralLangBody<
        BodyIdentity,
        typeof plSqlIdentity,
        Context
      >
      & tmpl.SqlTextLintIssuesPopulator<Context> = {
        isValid: true,
        identity,
        content,
        SQL: (ctx) => {
          return ctx.sqlTextEmitOptions.indentation(
            "create routine body",
            content.SQL(ctx),
          );
        },
        populateSqlTextLintIssues: () => {},
        pgPL: plSqlLanguage(),
      };
    return result;
  };
}

export function untypedPlPgSqlBody<
  BodyIdentity extends string,
  Context extends tmpl.SqlEmitContext,
>(
  identity: BodyIdentity,
  ess: tmpl.EmbeddedSqlSupplier,
  bOptions?: { readonly autoBeginEnd?: boolean },
) {
  return (
    literals: TemplateStringsArray,
    ...expressions: tmpl.SqlPartialExpression<Context>[]
  ) => {
    const contentPartial = ess.embeddedSQL<Context>(
      routineSqlTextSupplierOptions(),
    );
    const content = contentPartial(literals, ...expressions);
    const { autoBeginEnd = true } = bOptions ?? {};
    const result:
      & PgProceduralLangBody<
        BodyIdentity,
        typeof plPgSqlIdentity,
        Context
      >
      & tmpl.SqlTextLintIssuesPopulator<Context> = {
        isValid: true,
        identity,
        content,
        SQL: (ctx) => {
          return autoBeginEnd
            ? `BEGIN\n${
              ctx.sqlTextEmitOptions.indentation(
                "create routine body",
                content.SQL(ctx),
              )
            }\nEND;`
            : content.SQL(ctx);
        },
        populateSqlTextLintIssues: () => {},
        pgPL: plPgSqlLanguage(),
      };
    return result;
  };
}

export function typedPlSqlBody<
  BodyIdentity extends string,
  ArgAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
>(
  identity: BodyIdentity,
  argDefns: ArgAxioms,
  ess: tmpl.EmbeddedSqlSupplier,
) {
  return (
    literals: TemplateStringsArray,
    ...expressions: tmpl.SqlPartialExpression<Context>[]
  ) => {
    const untypedBody = untypedPlSqlBody<BodyIdentity, Context>(
      identity,
      ess,
    );
    return {
      ...argDefns,
      ...untypedBody(literals, ...expressions),
    };
  };
}

export function typedPlPgSqlBody<
  BodyIdentity extends string,
  ArgAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
>(
  identity: BodyIdentity,
  argDefns: ArgAxioms,
  ess: tmpl.EmbeddedSqlSupplier,
  bOptions?: { readonly autoBeginEnd?: boolean },
) {
  return (
    literals: TemplateStringsArray,
    ...expressions: tmpl.SqlPartialExpression<Context>[]
  ) => {
    const untypedBody = untypedPlPgSqlBody<BodyIdentity, Context>(
      identity,
      ess,
      bOptions,
    );
    return {
      ...argDefns,
      ...untypedBody(literals, ...expressions),
    };
  };
}

export function typicalPgProcLangBodySqlTextSupplier<
  BodyIdentity extends string,
  Language extends string,
  Context extends tmpl.SqlEmitContext,
>(
  body:
    & PgProceduralLangBody<BodyIdentity, Language, Context>
    & tmpl.SqlTextLintIssuesPopulator<Context>,
) {
  const result:
    & tmpl.SqlTextSupplier<Context>
    & tmpl.SqlTextLintIssuesPopulator<Context> = {
      populateSqlTextLintIssues: (lintIssues, steOptions) =>
        body.populateSqlTextLintIssues(lintIssues, steOptions),
      SQL: (ctx) => {
        const { sqlTextEmitOptions: eo } = ctx;
        const rawBodySqlText = body.SQL(ctx);
        const bodySqlText = eo.indentation(
          "create routine body",
          rawBodySqlText,
        );
        return eo.indentation(
          "create routine",
          `DO $$\n${bodySqlText}\n$$`,
        );
      },
    };
  return result;
}

export function anonymousPlSqlRoutine<
  Context extends tmpl.SqlEmitContext,
>(ess: tmpl.EmbeddedSqlSupplier): (
  literals: TemplateStringsArray,
  ...expressions: tmpl.SqlPartialExpression<Context>[]
) =>
  & r.AnonymousRoutineDefn<Context>
  & tmpl.SqlTextLintIssuesPopulator<Context> {
  return (literals, ...expressions) => {
    const body = untypedPlSqlBody<r.ANONYMOUS, Context>(
      "ANONYMOUS",
      ess,
    )(literals, ...expressions);
    return {
      isValid: body.isValid,
      isAnonymousRoutine: true,
      body,
      ...typicalPgProcLangBodySqlTextSupplier(body),
    };
  };
}

export function anonymousPlPgSqlRoutine<
  Context extends tmpl.SqlEmitContext,
>(
  ess: tmpl.EmbeddedSqlSupplier,
  rdOptions?: { readonly autoBeginEnd: boolean },
): (
  literals: TemplateStringsArray,
  ...expressions: tmpl.SqlPartialExpression<Context>[]
) =>
  & r.AnonymousRoutineDefn<Context>
  & tmpl.SqlTextLintIssuesPopulator<Context> {
  return (literals, ...expressions) => {
    const body = untypedPlPgSqlBody<r.ANONYMOUS, Context>(
      "ANONYMOUS",
      ess,
      rdOptions,
    )(literals, ...expressions);
    return {
      isValid: body.isValid,
      isAnonymousRoutine: true,
      body,
      ...typicalPgProcLangBodySqlTextSupplier(body),
    };
  };
}

export function doIgnoreDuplicate<
  Context extends tmpl.SqlEmitContext,
>(ess: tmpl.EmbeddedSqlSupplier): (
  literals: TemplateStringsArray,
  ...expressions: tmpl.SqlPartialExpression<Context>[]
) =>
  & r.AnonymousRoutineDefn<Context>
  & tmpl.SqlTextLintIssuesPopulator<Context> {
  return (literals, ...expressions) => {
    const contentPartial = ess.embeddedSQL<Context>(
      routineSqlTextSupplierOptions(),
    );
    const content = contentPartial(literals, ...expressions);
    const body:
      & PgProceduralLangBody<
        r.ANONYMOUS,
        typeof plPgSqlIdentity,
        Context
      >
      & tmpl.SqlTextLintIssuesPopulator<Context> = {
        isValid: true,
        identity: "ANONYMOUS",
        content,
        SQL: (ctx) => {
          const { sqlTextEmitOptions: eo } = ctx;
          const indent = eo.indentation("create routine body");
          return `BEGIN\n${
            eo.indentation(
              "create routine body",
              content.SQL(ctx),
            )
          }\nEXCEPTION\n${indent}WHEN duplicate_object THEN NULL\nEND;`;
        },
        populateSqlTextLintIssues: () => {},
        pgPL: plPgSqlLanguage(),
      };
    return {
      isAnonymousRoutine: true,
      body,
      isValid: true,
      populateSqlTextLintIssues: body.populateSqlTextLintIssues,
      SQL: (ctx) => {
        return ctx.sqlTextEmitOptions.indentation(
          "create routine",
          `DO $$ ${body.SQL(ctx)} $$`,
        );
      },
    };
  };
}

export interface StoredRoutineDefnOptions<
  RoutineName extends string,
  Context extends tmpl.SqlEmitContext,
> extends tmpl.SqlTextSupplierOptions<Context> {
  readonly embeddedStsOptions: tmpl.SqlTextSupplierOptions<Context>;
  readonly autoBeginEnd?: boolean;
  readonly isIdempotent?: boolean;
  readonly headerBodySeparator?: string;
  readonly before?: (
    routineName: RoutineName,
    srdOptions: StoredRoutineDefnOptions<RoutineName, Context>,
  ) => tmpl.SqlTextSupplier<Context>;
  readonly sqlNS?: ns.SqlNamespaceSupplier;
}

// deno-lint-ignore no-empty-interface
export interface StoredProcedureDefnOptions<
  RoutineName extends string,
  Context extends tmpl.SqlEmitContext,
> extends StoredRoutineDefnOptions<RoutineName, Context> {
}

export function routineArgsSQL<
  Context extends tmpl.SqlEmitContext,
>(domains: d.IdentifiableSqlDomain<Any, Context, Any>[], ctx: Context) {
  const ns = ctx.sqlNamingStrategy(ctx, {
    quoteIdentifiers: true,
  });
  return domains.map((arg) =>
    `${isPgRoutineArgModifer(arg) ? `${arg.pgRouteineArgModifier} ` : ""}${
      ns.storedRoutineArgName(arg.identity)
    } ${arg.sqlDataType("stored routine arg").SQL(ctx)}${
      arg.sqlDefaultValue
        ? ` = ${arg.sqlDefaultValue("stored routine arg").SQL(ctx)}`
        : ""
    }`
  ).join(", ");
}

export function storedProcedure<
  RoutineName extends string,
  ArgAxioms extends Record<string, ax.Axiom<Any>>,
  BodyTemplateSupplier extends (
    routineName: RoutineName,
    argsDefn: ArgAxioms,
    spOptions?: StoredProcedureDefnOptions<RoutineName, Context>,
  ) => tmpl.SafeTemplateString<
    tmpl.SqlPartialExpression<Context>,
    Any
  >,
  Context extends tmpl.SqlEmitContext,
  BodyTemplateReturnType extends tmpl.SafeTemplateStringReturnType<
    BodyTemplateSupplier
  > = tmpl.SafeTemplateStringReturnType<BodyTemplateSupplier>,
>(
  routineName: RoutineName,
  argsDefn: ArgAxioms,
  bodyTemplate: BodyTemplateSupplier,
  spOptions?: StoredProcedureDefnOptions<RoutineName, Context> & {
    readonly onPropertyNotAxiomSqlDomain?: (
      name: string,
      axiom: Any,
      domains: d.IdentifiableSqlDomain<Any, Context>[],
    ) => void;
  },
) {
  return (
    literals: TemplateStringsArray,
    ...expressions: tmpl.SqlPartialExpression<Context>[]
  ) => {
    const body = bodyTemplate(routineName, argsDefn)(
      literals,
      ...expressions,
    );
    const { isIdempotent = true, headerBodySeparator: hbSep = "$$" } =
      spOptions ?? {};
    const argsSD = d.sqlDomains(argsDefn, spOptions);
    const result:
      & r.NamedRoutineDefn<RoutineName, ArgAxioms, Context>
      & tmpl.SqlTextLintIssuesPopulator<Context>
      & {
        readonly sqlNS?: ns.SqlNamespaceSupplier;
      } = {
        routineName,
        argsDefn,
        isValid: body.isValid,
        isIdempotent,
        body,
        populateSqlTextLintIssues: (lintIssues, steOptions) =>
          body.populateSqlTextLintIssues(lintIssues, steOptions),
        SQL: (ctx) => {
          const { sqlTextEmitOptions: steOptions } = ctx;
          const ns = ctx.sqlNamingStrategy(ctx, {
            quoteIdentifiers: true,
            qnss: spOptions?.sqlNS,
          });
          const bodySqlText = body.SQL(ctx);
          const argsSQL = routineArgsSQL(argsSD.domains, ctx);
          const langSQL = body.pgPL.sqlPartial("after body definition").SQL(
            ctx,
            steOptions,
          );
          const sqlText = steOptions.indentation(
            "create routine",
            // deno-fmt-ignore
            `CREATE${isIdempotent ? ` OR REPLACE` : ""} PROCEDURE ${ns.storedRoutineName(routineName)}(${argsSQL}) AS ${hbSep}\n${bodySqlText}\n${hbSep} ${langSQL};`,
          );
          return spOptions?.before
            ? ctx.embeddedSQL<Context>(spOptions?.embeddedStsOptions)`${[
              spOptions.before(routineName, spOptions),
              sqlText,
            ]}`.SQL(ctx)
            : sqlText;
        },
        sqlNS: spOptions?.sqlNS,
      };
    return {
      ...result,
      drop: (options?: { ifExists?: boolean }) =>
        dropStoredProcedure(routineName, options),
    };
  };
}

export function dropStoredProcedure<
  RoutineName extends string,
  Context extends tmpl.SqlEmitContext,
>(
  spName: RoutineName,
  dspOptions?: {
    readonly ifExists?: boolean;
    readonly sqlNS?: ns.SqlNamespaceSupplier;
  },
): tmpl.SqlTextSupplier<Context> {
  const { ifExists = true } = dspOptions ?? {};
  return {
    SQL: (ctx) => {
      const ns = ctx.sqlNamingStrategy(ctx, {
        quoteIdentifiers: true,
        qnss: dspOptions?.sqlNS,
      });
      return `DROP PROCEDURE ${ifExists ? "IF EXISTS " : ""}${
        ns.storedRoutineName(spName)
      }`;
    },
  };
}

// deno-lint-ignore no-empty-interface
export interface StoredFunctionDefnOptions<
  RoutineName extends string,
  Context extends tmpl.SqlEmitContext,
> extends StoredRoutineDefnOptions<RoutineName, Context> {
}

export function storedFunction<
  RoutineName extends string,
  ArgAxioms extends Record<string, ax.Axiom<Any>>,
  Returns extends
    | d.AxiomSqlDomain<Any, Context> // arbitrary domain
    | Record<string, ax.Axiom<Any>> // TABLE
    | "RECORD"
    | string, // arbitrary SQL
  BodyTemplateSupplier extends (
    routineName: RoutineName,
    argsDefn: ArgAxioms,
    returns: Returns,
    spOptions?: StoredFunctionDefnOptions<RoutineName, Context>,
  ) => tmpl.SafeTemplateString<
    tmpl.SqlPartialExpression<Context>,
    Any
  >,
  Context extends tmpl.SqlEmitContext,
  BodyTemplateReturnType extends tmpl.SafeTemplateStringReturnType<
    BodyTemplateSupplier
  > = tmpl.SafeTemplateStringReturnType<BodyTemplateSupplier>,
>(
  routineName: RoutineName,
  argsDefn: ArgAxioms,
  returns: Returns,
  bodyTemplate: BodyTemplateSupplier,
  sfOptions?: StoredFunctionDefnOptions<RoutineName, Context> & {
    readonly onPropertyNotAxiomSqlDomain?: (
      name: string,
      axiom: Any,
      domains: d.IdentifiableSqlDomain<Any, Context>[],
    ) => void;
  },
) {
  return (
    literals: TemplateStringsArray,
    ...expressions: tmpl.SqlPartialExpression<Context>[]
  ) => {
    const body = bodyTemplate(routineName, argsDefn, returns, sfOptions)(
      literals,
      ...expressions,
    );
    const { isIdempotent = true, headerBodySeparator: hbSep = "$$" } =
      sfOptions ?? {};
    const argsSD = d.sqlDomains(argsDefn, sfOptions);
    const result:
      & r.NamedRoutineDefn<RoutineName, ArgAxioms, Context>
      & tmpl.SqlTextLintIssuesPopulator<Context>
      & {
        readonly sqlNS?: ns.SqlNamespaceSupplier;
      } = {
        routineName,
        argsDefn,
        isValid: body.isValid,
        isIdempotent,
        body,
        populateSqlTextLintIssues: (lintIssues, steOptions) =>
          body.populateSqlTextLintIssues(lintIssues, steOptions),
        SQL: (ctx) => {
          const { sqlTextEmitOptions: steOptions } = ctx;
          const ns = ctx.sqlNamingStrategy(ctx, {
            quoteIdentifiers: true,
            qnss: sfOptions?.sqlNS,
          });
          const bodySqlText = body.SQL(ctx);
          const argsSQL = routineArgsSQL(argsSD.domains, ctx);
          let returnsSQL: string;
          if (typeof returns === "string") {
            returnsSQL = returns;
          } else {
            if (ax.isAxiom(returns)) {
              returnsSQL = returns.sqlDataType("stored function returns scalar")
                .SQL(ctx);
            } else {
              const returnsSD = d.sqlDomains(returns, sfOptions);
              returnsSQL = `TABLE(${
                returnsSD.domains.map((
                  r,
                ) => (`${ns.storedRoutineReturns(r.identity)} ${
                  r.sqlDataType("stored function returns table column").SQL(ctx)
                }`)).join(", ")
              })`;
            }
          }
          const langSQL = body.pgPL.sqlPartial("after body definition").SQL(
            ctx,
            steOptions,
          );
          const sqlText = steOptions.indentation(
            "create routine",
            // deno-fmt-ignore
            `CREATE${isIdempotent ? ` OR REPLACE` : ""} FUNCTION ${ns.storedRoutineName(routineName)}(${argsSQL}) RETURNS ${returnsSQL} AS ${hbSep}\n${bodySqlText}\n${hbSep} ${langSQL};`,
          );
          return sfOptions?.before
            ? ctx.embeddedSQL<Context>(sfOptions?.embeddedStsOptions)`${[
              sfOptions.before(routineName, sfOptions),
              sqlText,
            ]}`.SQL(ctx)
            : sqlText;
        },
        sqlNS: sfOptions?.sqlNS,
      };
    return {
      ...result,
      drop: (options?: { ifExists?: boolean }) =>
        dropStoredFunction(routineName, options),
    };
  };
}

export function dropStoredFunction<
  RoutineName extends string,
  Context extends tmpl.SqlEmitContext,
>(
  sfName: RoutineName,
  dsfOptions?: {
    readonly ifExists?: boolean;
    readonly sqlNS?: ns.SqlNamespaceSupplier;
  },
): tmpl.SqlTextSupplier<Context> {
  const { ifExists = true } = dsfOptions ?? {};
  return {
    SQL: (ctx) => {
      const ns = ctx.sqlNamingStrategy(ctx, {
        quoteIdentifiers: true,
        qnss: dsfOptions?.sqlNS,
      });
      return `DROP FUNCTION ${ifExists ? "IF EXISTS " : ""}${
        ns.storedRoutineName(sfName)
      }`;
    },
  };
}
