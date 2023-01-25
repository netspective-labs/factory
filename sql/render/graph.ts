import * as d from "./domain.ts";
import * as t from "./ddl/table.ts";
import * as tmpl from "./template/mod.ts";
import * as l from "./lint.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export interface EntityAttrReference<Context extends tmpl.SqlEmitContext> {
  readonly entity: t.TableDefinition<Any, Context>;
  readonly attr: d.IdentifiableSqlDomain<Any, Context>;
}

export interface GraphEdge<Context extends tmpl.SqlEmitContext> {
  source: EntityAttrReference<Context>;
  ref: EntityAttrReference<Context>;
}

export interface InboundRelationship<
  FromTableName extends string,
  ToTableName extends string,
  Context extends tmpl.SqlEmitContext,
> {
  from: t.TableDefinition<FromTableName, Context>;
  fromAttr: t.TableForeignKeyColumnDefn<Any, FromTableName, Context>;
  to: t.TableDefinition<ToTableName, Context>;
}

export interface InboundRelationshipBackRef<
  BackRefName extends string,
  FromTableName extends string,
  ToTableName extends string,
  Context extends tmpl.SqlEmitContext,
> {
  name: BackRefName;
  rel: InboundRelationship<FromTableName, ToTableName, Context>;
}

export function graph<
  Entity extends t.TableDefinition<Any, Context>,
  Context extends tmpl.SqlEmitContext,
>(
  ctx: Context,
  entityDefns: (ctx: Context) => Generator<Entity>,
) {
  const lintIssues: l.SqlLintIssueSupplier[] = [];
  const entities: Entity[] = [];
  const entitiesByName = new Map<string, Entity>();
  const entityRels = new Map<string, {
    readonly entity: Entity;
    readonly inboundRels: InboundRelationship<Any, Any, Context>[];
  }>();
  const edges: GraphEdge<Context>[] = [];

  for (const ed of entityDefns(ctx)) {
    entitiesByName.set(ed.tableName, ed);
    entityRels.set(ed.tableName, { entity: ed, inboundRels: [] });
    entities.push(ed);
  }

  for (const src of entities) {
    if (d.isSqlDomainsSupplier(src)) {
      for (const srcCol of src.domains) {
        if (t.isTableForeignKeyColumnDefn(srcCol)) {
          const dest = entityRels.get(srcCol.foreignTableName);
          if (dest) {
            dest.inboundRels.push({
              from: src,
              fromAttr: srcCol,
              to: dest.entity,
            });
            if (d.isIdentifiableSqlDomain(srcCol.foreignDomain)) {
              edges.push({
                source: { entity: src, attr: srcCol },
                ref: { entity: dest.entity, attr: srcCol.foreignDomain },
              });
            } else {
              lintIssues.push({
                lintIssue:
                  `fKeyRef ${src.tableName}.${srcCol.identity} points to ${dest.entity.tableName} but srcCol.foreignDomain is not an IdentifiableSqlDomain`,
              });
            }
          } else {
            lintIssues.push({
              lintIssue:
                `entity '${srcCol.foreignTableName}' not found in fKeyRef ${src.tableName}.${srcCol.identity}, available: [${
                  Array.from(entitiesByName.keys()).join(", ")
                }]`,
            });
          }
        }
      }
    }
  }

  return {
    lintIssues,
    entities,
    entitiesByName,
    entityRels,
    edges,
  };
}
