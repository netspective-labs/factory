import * as safety from "../../safety/mod.ts";
import * as tmpl from "./template/mod.ts";

export type SqlNamespace = string;

export interface SqlNamespaceSupplier
  extends tmpl.QualifiedNamingStrategySupplier {
  readonly sqlNamespace: SqlNamespace;
}

export interface TemplateStringSqlSpace extends SqlNamespaceSupplier {
  readonly templateLiterals: TemplateStringsArray;
  readonly templateExprs: unknown[];
}

export function templateStringSqlSpace(
  sqlNamespace: string,
  templateLiterals: TemplateStringsArray,
  templateExprs: unknown[],
): TemplateStringSqlSpace {
  return {
    sqlNamespace,
    templateLiterals,
    templateExprs,
    qualifiedNames: (ctx, baseNS) => {
      const ns = baseNS ?? ctx.sqlNamingStrategy(ctx);
      const nsQualifier = tmpl.qualifyName(ns.schemaName(sqlNamespace));
      return tmpl.qualifiedNamingStrategy(ns, nsQualifier);
    },
  };
}

export const isSqlNamespaceSupplier = safety.typeGuard<SqlNamespaceSupplier>(
  "sqlNamespace",
);

export const isTemplateStringSqlNamespace = safety.typeGuard<
  TemplateStringSqlSpace
>("sqlNamespace", "templateLiterals", "templateExprs");
