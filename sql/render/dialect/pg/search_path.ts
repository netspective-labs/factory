import * as safety from "../../../../safety/mod.ts";
import * as tmpl from "../../template/mod.ts";
import * as sch from "../../ddl/schema.ts";
import * as nsp from "../../namespace.ts";

export interface PostgresSchemaSearchPathDefinition<
  SchemaName extends nsp.SqlNamespace,
  Context extends tmpl.SqlEmitContext,
> extends tmpl.SqlTextSupplier<Context> {
  readonly searchPath: SchemaName[];
}

export function isPostgresSchemaSearchPathDefinition<
  SchemaName extends nsp.SqlNamespace,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is PostgresSchemaSearchPathDefinition<SchemaName, Context> {
  const isSD = safety.typeGuard<
    PostgresSchemaSearchPathDefinition<SchemaName, Context>
  >(
    "searchPath",
    "SQL",
  );
  return isSD(o);
}

export function pgSearchPath<
  SchemaName extends nsp.SqlNamespace,
  Context extends tmpl.SqlEmitContext,
>(...searchPath: sch.SchemaDefinition<SchemaName, Context>[]) {
  const result:
    & PostgresSchemaSearchPathDefinition<SchemaName, Context>
    & tmpl.SqlTextLintIssuesPopulator<Context> = {
      searchPath: searchPath.map((s) => s.sqlNamespace),
      populateSqlTextLintIssues: () => {},
      SQL: (ctx) => {
        return `SET search_path TO ${
          searchPath.map((schema) =>
            ctx.sqlNamingStrategy(ctx, { quoteIdentifiers: true })
              .schemaName(schema.sqlNamespace)
          ).join(", ")
        }`;
      },
    };
  return result;
}
