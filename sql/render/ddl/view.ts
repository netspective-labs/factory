import * as safety from "../../../safety/mod.ts";
import * as ax from "../../../axiom/mod.ts";
import * as tmpl from "../template/mod.ts";
import * as ss from "../dql/select.ts";
import * as d from "../domain.ts";
import * as ns from "../namespace.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export interface ViewDefinition<
  ViewName extends string,
  Context extends tmpl.SqlEmitContext,
> extends tmpl.SqlTextSupplier<Context> {
  readonly isValid: boolean;
  readonly viewName: ViewName;
  readonly isTemp?: boolean;
  readonly isIdempotent?: boolean;
}

export function isViewDefinition<
  ViewName extends string,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is ViewDefinition<ViewName, Context> {
  const isViewDefn = safety.typeGuard<
    ViewDefinition<ViewName, Context>
  >(
    "viewName",
    "SQL",
  );
  return isViewDefn(o);
}

export interface ViewDefnOptions<
  ViewName extends string,
  ColumnName extends string,
  Context extends tmpl.SqlEmitContext,
> extends tmpl.SqlTextSupplierOptions<Context> {
  readonly isTemp?: boolean;
  readonly isIdempotent?: boolean;
  readonly before?: (
    viewName: ViewName,
    vdOptions: ViewDefnOptions<ViewName, ColumnName, Context>,
  ) => tmpl.SqlTextSupplier<Context>;
  readonly sqlNS?: ns.SqlNamespaceSupplier;
  readonly embeddedStsOptions: tmpl.SqlTextSupplierOptions<Context>;
}

export function viewDefinition<
  ViewName extends string,
  Context extends tmpl.SqlEmitContext,
>(
  viewName: ViewName,
  vdOptions?:
    & ViewDefnOptions<ViewName, Any, Context>
    & Partial<tmpl.EmbeddedSqlSupplier>
    & {
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
    const { isTemp, isIdempotent = true, embeddedSQL = tmpl.SQL } = vdOptions ??
      {};
    const ssPartial = ss.untypedSelect<Any, Context>({ embeddedSQL });
    const selectStmt = ssPartial(literals, ...expressions);
    const viewDefn:
      & ViewDefinition<ViewName, Context>
      & tmpl.SqlSymbolSupplier<Context>
      & tmpl.SqlTextLintIssuesPopulator<Context> = {
        isValid: selectStmt.isValid,
        viewName,
        isTemp,
        isIdempotent,
        populateSqlTextLintIssues: (lintIssues, steOptions) =>
          selectStmt.populateSqlTextLintIssues(lintIssues, steOptions),
        sqlSymbol: (ctx) =>
          ctx.sqlNamingStrategy(ctx, {
            quoteIdentifiers: true,
            qnss: vdOptions?.sqlNS,
          }).viewName(viewName),
        SQL: (ctx) => {
          const { sqlTextEmitOptions: steOptions } = ctx;
          const rawSelectStmtSqlText = selectStmt.SQL(ctx);
          const viewSelectStmtSqlText = steOptions.indentation(
            "create view select statement",
            rawSelectStmtSqlText,
          );
          // use this naming strategy when schema/namespace might be necessary
          const ns = ctx.sqlNamingStrategy(ctx, {
            quoteIdentifiers: true,
            qnss: vdOptions?.sqlNS,
          });
          const create = `CREATE ${isTemp ? "TEMP " : ""}VIEW ${
            isIdempotent ? "IF NOT EXISTS " : ""
          }${ns.viewName(viewName)} AS\n${viewSelectStmtSqlText}`;
          return vdOptions?.before
            ? ctx.embeddedSQL<Context>(vdOptions.embeddedStsOptions)`${[
              vdOptions.before(viewName, vdOptions),
              create,
            ]}`
              .SQL(ctx)
            : create;
        },
      };
    return {
      ...viewDefn,
      selectStmt,
      drop: (options?: { ifExists?: boolean }) => dropView(viewName, options),
    };
  };
}

export function safeViewDefinitionCustom<
  ViewName extends string,
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
  ColumnName extends keyof TPropAxioms & string = keyof TPropAxioms & string,
>(
  viewName: ViewName,
  props: TPropAxioms,
  selectStmt:
    & ss.Select<Any, Context>
    & Partial<tmpl.SqlTextLintIssuesPopulator<Context>>,
  vdOptions?:
    & ViewDefnOptions<ViewName, ColumnName, Context>
    & Partial<tmpl.EmbeddedSqlSupplier>
    & {
      readonly onPropertyNotAxiomSqlDomain?: (
        name: string,
        axiom: Any,
        domains: d.IdentifiableSqlDomain<Any, Context>[],
      ) => void;
    },
) {
  const { isTemp, isIdempotent = true } = vdOptions ?? {};
  const sd = props ? d.sqlDomains(props, vdOptions) : undefined;
  const viewColumns = sd
    ? sd.domains.map((d) => d.identity as ColumnName)
    : undefined;
  const viewDefn:
    & ViewDefinition<ViewName, Context>
    & tmpl.SqlSymbolSupplier<Context>
    & tmpl.SqlTextLintIssuesPopulator<Context> = {
      isValid: selectStmt.isValid,
      viewName,
      isTemp,
      isIdempotent,
      populateSqlTextLintIssues: (lis, steOptions) =>
        selectStmt.populateSqlTextLintIssues?.(lis, steOptions),
      sqlSymbol: (ctx) =>
        ctx.sqlNamingStrategy(ctx, {
          quoteIdentifiers: true,
          qnss: vdOptions?.sqlNS,
        }).viewName(viewName),
      SQL: (ctx) => {
        const { sqlTextEmitOptions: steOptions } = ctx;
        const rawSelectStmtSqlText = selectStmt.SQL(ctx);
        const viewSelectStmtSqlText = steOptions.indentation(
          "create view select statement",
          rawSelectStmtSqlText,
        );
        const ns = ctx.sqlNamingStrategy(ctx, {
          quoteIdentifiers: true,
        });
        const create = `CREATE ${isTemp ? "TEMP " : ""}VIEW ${
          isIdempotent ? "IF NOT EXISTS " : ""
        }${ns.viewName(viewName)}${
          viewColumns
            ? `(${
              viewColumns.map((cn) =>
                ns.viewColumnName({
                  viewName,
                  columnName: cn,
                })
              ).join(", ")
            })`
            : ""
        } AS\n${viewSelectStmtSqlText}`;
        return vdOptions?.before
          ? ctx.embeddedSQL<Context>(vdOptions.embeddedStsOptions)`${[
            vdOptions.before(viewName, vdOptions),
            create,
          ]}`.SQL(ctx)
          : create;
      },
    };
  return {
    ...sd,
    ...viewDefn,
    selectStmt,
    drop: (options?: { ifExists?: boolean }) => dropView(viewName, options),
  };
}

export function safeViewDefinition<
  ViewName extends string,
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
  ColumnName extends keyof TPropAxioms & string = keyof TPropAxioms & string,
>(
  viewName: ViewName,
  props: TPropAxioms,
  vdOptions?:
    & ViewDefnOptions<ViewName, ColumnName, Context>
    & Partial<tmpl.EmbeddedSqlSupplier>
    & {
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
    const { embeddedSQL = tmpl.SQL } = vdOptions ?? {};
    const selectStmt = ss.typedSelect<Any, TPropAxioms, Context>(props, {
      embeddedSQL,
    });
    return safeViewDefinitionCustom(
      viewName,
      props,
      selectStmt(literals, ...expressions),
      vdOptions,
    );
  };
}

export function dropView<
  ViewName extends string,
  Context extends tmpl.SqlEmitContext,
>(
  viewName: ViewName,
  dvOptions?: {
    readonly ifExists?: boolean;
    readonly sqlNS?: ns.SqlNamespaceSupplier;
  },
): tmpl.SqlTextSupplier<Context> {
  const { ifExists = true } = dvOptions ?? {};
  return {
    SQL: (ctx) => {
      const ns = ctx.sqlNamingStrategy(ctx, {
        quoteIdentifiers: true,
        qnss: dvOptions?.sqlNS,
      });
      return `DROP VIEW ${ifExists ? "IF EXISTS " : ""}${
        ns.viewName(viewName)
      }`;
    },
  };
}
