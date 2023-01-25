import * as safety from "../../../safety/mod.ts";
import * as tmpl from "../template/mod.ts";
import * as nsp from "../namespace.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export interface SchemaDefinition<
  SchemaName extends nsp.SqlNamespace,
  Context extends tmpl.SqlEmitContext,
> extends tmpl.SqlTextSupplier<Context>, nsp.SqlNamespaceSupplier {
  readonly isValid: boolean;
  readonly sqlNamespace: SchemaName; // further specifies SqlNamespaceSupplier.sqlNamespace
  readonly isIdempotent: boolean;
}

export interface SchemaDefnSupplier<
  SchemaName extends nsp.SqlNamespace,
  Context extends tmpl.SqlEmitContext,
> extends tmpl.QualifiedNamingStrategySupplier {
  readonly schema: SchemaDefinition<SchemaName, Context>;
}

export function isSchemaDefinition<
  SchemaName extends nsp.SqlNamespace,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is SchemaDefinition<SchemaName, Context> {
  const isSD = safety.typeGuard<
    SchemaDefinition<SchemaName, Context>
  >("sqlNamespace", "SQL");
  return isSD(o);
}

export function isSchemaDefnSupplier<
  SchemaName extends nsp.SqlNamespace,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is SchemaDefnSupplier<SchemaName, Context> {
  const isSDS = safety.typeGuard<
    SchemaDefnSupplier<SchemaName, Context>
  >("schema");
  return isSDS(o);
}

export interface SchemaDefnOptions<
  SchemaName extends nsp.SqlNamespace,
  Context extends tmpl.SqlEmitContext,
> {
  readonly isIdempotent?: boolean;
}

export function sqlSchemaDefn<
  SchemaName extends nsp.SqlNamespace,
  Context extends tmpl.SqlEmitContext,
>(
  schemaName: SchemaName,
  schemaDefnOptions?: SchemaDefnOptions<SchemaName, Context>,
) {
  const { isIdempotent = false } = schemaDefnOptions ?? {};
  const result:
    & SchemaDefinition<SchemaName, Context>
    & tmpl.SqlTextLintIssuesPopulator<Context> = {
      isValid: true,
      sqlNamespace: schemaName,
      isIdempotent,
      populateSqlTextLintIssues: () => {},
      SQL: (ctx) => {
        return `CREATE SCHEMA ${isIdempotent ? "IF NOT EXISTS " : ""}${
          ctx
            .sqlNamingStrategy(ctx, { quoteIdentifiers: true })
            .schemaName(schemaName)
        }`;
      },
      qualifiedNames: (ctx, baseNS) => {
        const ns = baseNS ?? ctx.sqlNamingStrategy(ctx);
        const nsQualifier = tmpl.qualifyName(ns.schemaName(schemaName));
        return tmpl.qualifiedNamingStrategy(ns, nsQualifier);
      },
    };
  return result;
}
