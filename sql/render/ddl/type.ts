import * as safety from "../../../safety/mod.ts";
import * as ax from "../../../axiom/mod.ts";
import * as tmpl from "../template/mod.ts";
import * as d from "../domain.ts";
import * as ns from "../namespace.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export interface SqlTypeDefinition<
  TypeName extends string,
  Context extends tmpl.SqlEmitContext,
> extends tmpl.SqlTextSupplier<Context> {
  readonly typeName: TypeName;
}

export function isSqlTypeDefinition<
  TypeName extends string,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is SqlTypeDefinition<TypeName, Context> {
  const isViewDefn = safety.typeGuard<
    SqlTypeDefinition<TypeName, Context>
  >("typeName", "SQL");
  return isViewDefn(o);
}

export interface SqlTypeDefnOptions<
  TypeName extends string,
  FieldName extends string,
  Context extends tmpl.SqlEmitContext,
> extends tmpl.SqlTextSupplierOptions<Context> {
  readonly embeddedStsOptions: tmpl.SqlTextSupplierOptions<Context>;
  readonly before?: (
    viewName: TypeName,
    vdOptions: SqlTypeDefnOptions<TypeName, FieldName, Context>,
  ) => tmpl.SqlTextSupplier<Context>;
  readonly sqlNS?: ns.SqlNamespaceSupplier;
}

export function sqlTypeDefinition<
  TypeName extends string,
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
  ColumnName extends keyof TPropAxioms & string = keyof TPropAxioms & string,
>(
  typeName: TypeName,
  props: TPropAxioms,
  tdOptions?: SqlTypeDefnOptions<TypeName, ColumnName, Context> & {
    readonly onPropertyNotAxiomSqlDomain?: (
      name: string,
      axiom: Any,
      domains: d.IdentifiableSqlDomain<Any, Context>[],
    ) => void;
  },
) {
  const sd = d.sqlDomains(props, tdOptions);
  const typeDefn: SqlTypeDefinition<TypeName, Context> & {
    readonly sqlNS?: ns.SqlNamespaceSupplier;
  } = {
    typeName,
    SQL: (ctx) => {
      const { sqlTextEmitOptions: steOptions } = ctx;
      // use this naming strategy when schema/namespace not required
      const ns = ctx.sqlNamingStrategy(ctx, { quoteIdentifiers: true });
      // use this naming strategy when schema/namespace might be necessary
      const qualNS = ctx.sqlNamingStrategy(ctx, {
        quoteIdentifiers: true,
        qnss: tdOptions?.sqlNS,
      });
      const ctfi = steOptions.indentation("define type field");
      const create = steOptions.indentation(
        "create type",
        `CREATE TYPE ${qualNS.typeName(typeName)} AS (\n${ctfi}${
          sd.domains.map((
            r,
          ) => (`${ns.typeFieldName({ typeName, fieldName: r.identity })} ${
            r.sqlDataType("type field").SQL(ctx)
          }`)).join(`,\n${ctfi}`)
        }\n)`,
      );
      return tdOptions?.before
        ? ctx.embeddedSQL<Context>(tdOptions.embeddedStsOptions)`${[
          tdOptions.before(typeName, tdOptions),
          create,
        ]}`.SQL(ctx)
        : create;
    },
  };
  return {
    ...sd,
    ...typeDefn,
    drop: (options?: { ifExists?: boolean }) => dropType(typeName, options),
    sqlNS: tdOptions?.sqlNS,
  };
}

export function dropType<
  ViewName extends string,
  Context extends tmpl.SqlEmitContext,
>(
  viewName: ViewName,
  dtOptions?: {
    readonly ifExists?: boolean;
    readonly sqlNS?: ns.SqlNamespaceSupplier;
  },
): tmpl.SqlTextSupplier<Context> {
  const { ifExists = true } = dtOptions ?? {};
  return {
    SQL: (ctx) => {
      const ns = ctx.sqlNamingStrategy(ctx, {
        quoteIdentifiers: true,
        qnss: dtOptions?.sqlNS,
      });
      return `DROP TYPE ${ifExists ? "IF EXISTS " : ""}${
        ns.viewName(viewName)
      }`;
    },
  };
}
