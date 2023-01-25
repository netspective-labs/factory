import * as safety from "../../../../safety/mod.ts";
import * as tmpl from "../../template/mod.ts";
import * as sch from "../../ddl/schema.ts";
import * as nsp from "../../namespace.ts";

export type PostgresExtension = string;

export interface ExtensionDefinition<
  SchemaName extends nsp.SqlNamespace,
  ExtensionName extends PostgresExtension,
  Context extends tmpl.SqlEmitContext,
> extends tmpl.SqlTextSupplier<Context> {
  readonly isValid: boolean;
  readonly extension: ExtensionName;
  readonly isIdempotent: boolean;
  readonly schema: sch.SchemaDefinition<SchemaName, Context>;
}

export function isExtensionDefinition<
  SchemaName extends nsp.SqlNamespace,
  ExtensionName extends PostgresExtension,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is ExtensionDefinition<SchemaName, ExtensionName, Context> {
  const isSD = safety.typeGuard<
    ExtensionDefinition<SchemaName, ExtensionName, Context>
  >(
    "extension",
    "SQL",
  );
  return isSD(o);
}

export interface ExtensionDefnOptions<
  SchemaName extends nsp.SqlNamespace,
  ExtensionName extends PostgresExtension,
  Context extends tmpl.SqlEmitContext,
> {
  readonly isIdempotent?: boolean;
}

export function pgExtensionDefn<
  SchemaName extends nsp.SqlNamespace,
  ExtensionName extends PostgresExtension,
  Context extends tmpl.SqlEmitContext,
>(
  schema: sch.SchemaDefinition<SchemaName, Context>,
  extension: ExtensionName,
  edOptions?: ExtensionDefnOptions<
    SchemaName,
    ExtensionName,
    Context
  >,
) {
  const { isIdempotent = true } = edOptions ?? {};
  const result:
    & ExtensionDefinition<SchemaName, ExtensionName, Context>
    & tmpl.SqlTextLintIssuesPopulator<Context> = {
      isValid: true,
      schema,
      extension,
      isIdempotent,
      populateSqlTextLintIssues: () => {},
      SQL: (ctx) => {
        return `CREATE EXTENSION ${
          isIdempotent ? "IF NOT EXISTS " : ""
        }${extension} SCHEMA ${
          ctx.sqlNamingStrategy(ctx, { quoteIdentifiers: true })
            .schemaName(schema.sqlNamespace)
        }`;
      },
    };
  return result;
}
