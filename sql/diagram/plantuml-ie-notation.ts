import * as SQLa from "../render/mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export interface PlantUmlIeOptions<Context extends SQLa.SqlEmitContext> {
  readonly diagramName: string;
  readonly includeEntityAttr: (
    d: SQLa.IdentifiableSqlDomain<Any, Context>,
    td: SQLa.TableDefinition<Any, Context>,
  ) => boolean;
  readonly elaborateEntityAttr?: (
    d: SQLa.IdentifiableSqlDomain<Any, Context>,
    td: SQLa.TableDefinition<Any, Context>,
    entity: (name: string) => SQLa.TableDefinition<Any, Context> | undefined,
    ns: SQLa.SqlObjectNames,
  ) => string;
  readonly includeEntity: (
    td:
      & SQLa.TableDefinition<Any, Context>
      & SQLa.SqlDomainsSupplier<Any, Context>,
  ) => boolean;
  readonly includeRelationship: (edge: SQLa.GraphEdge<Context>) => boolean;
  readonly relationshipIndicator: (
    edge: SQLa.GraphEdge<Context>,
  ) => string | false;
  readonly includeChildren: (
    ir: SQLa.InboundRelationship<Any, Any, Context>,
  ) => boolean;
}

export function typicalPlantUmlIeOptions<Context extends SQLa.SqlEmitContext>(
  inherit?: Partial<PlantUmlIeOptions<Context>>,
): PlantUmlIeOptions<Context> {
  // we let type inference occur so generics can follow through
  return {
    diagramName: "IE",
    includeEntity: () => true,
    includeEntityAttr: () => true,
    includeRelationship: () => true,
    includeChildren: () => true,
    elaborateEntityAttr: (d, td, entity, ns) => {
      let result = "";
      if (SQLa.isTableForeignKeyColumnDefn(d)) {
        const ftd = entity(d.foreignTableName);
        if (ftd) {
          result = SQLa.isEnumTableDefn(ftd)
            ? ` <<ENUM(${ns.tableName(ftd.tableName)})>>`
            : ` <<FK(${ns.tableName(ftd.tableName)})>>`;
        } else {
          result = ` <<FK(${ns.tableName(d.foreignTableName)})>>`;
        }
        if (d.foreignTableName == td.tableName) result = " <<SELF>>";
      }
      return result;
    },
    relationshipIndicator: (edge) => {
      const refIsEnum = SQLa.isEnumTableDefn(edge.ref.entity);
      // Relationship types see: https://plantuml.com/es/ie-diagram
      // Zero or One	|o--
      // Exactly One	||--
      // Zero or Many	}o--
      // One or Many	}|--
      return refIsEnum ? "|o..o|" : "|o..o{";
    },
    ...inherit,
  };
}

export function plantUmlIE<Context extends SQLa.SqlEmitContext>(
  ctx: Context,
  tableDefns: (
    ctx: Context,
  ) => Generator<
    SQLa.TableDefinition<Any, Context> & SQLa.SqlDomainsSupplier<Any, Context>
  >,
  puieOptions: PlantUmlIeOptions<Context>,
) {
  const graph = SQLa.graph(ctx, tableDefns);
  const ns = ctx.sqlNamingStrategy(ctx);

  // protected column(tc: gimRDS.TableColumn): string {
  //   const required = tc.column.nullable ? "" : "*";
  //   const name = tc.column.primaryKey
  //     ? `**${tc.column.name(this.reCtx)}**`
  //     : tc.column.name(this.reCtx);
  //   let descr = tc.column.references
  //     ? (gim.isEnumeration(tc.column.references.table.entity)
  //       ? ` <<ENUM(${tc.column.references.table.name(this.reCtx)})>> `
  //       : ` <<FK(${tc.column.references.table.name(this.reCtx)})>>`)
  //     : "";
  //   if ("isSelfReference" in tc.column.forAttr) descr = " <<SELF>>";
  //   const sqlType = tc.column.references
  //     ? tc.column.references.column.sqlTypes(this.reCtx).fKRefDDL
  //     : tc.column.sqlTypes(this.reCtx).nonRefDDL;
  //   return `    ${required} ${name}: ${sqlType}${descr}`;
  // }

  const columnPuml = (
    d: SQLa.IdentifiableSqlDomain<Any, Context>,
    td: SQLa.TableDefinition<Any, Context>,
  ) => {
    const tcName = ns.tableColumnName({
      tableName: td.tableName,
      columnName: d.identity,
    });
    const required = d.isOptional ? " " : "*";
    const name = SQLa.isTablePrimaryKeyColumnDefn(d) ? `**${tcName}**` : tcName;
    const descr = puieOptions.elaborateEntityAttr?.(
      d,
      td,
      (name) => graph.entitiesByName.get(name),
      ns,
    );
    const sqlType = d.sqlDataType("diagram").SQL(ctx);
    return `    ${required} ${name}: ${sqlType}${descr ?? ""}`;
  };

  const tablePuml = (
    td:
      & SQLa.TableDefinition<Any, Context>
      & SQLa.SqlDomainsSupplier<Any, Context>,
  ) => {
    const columns: string[] = [];
    // we want to put all the primary keys at the top of the entity
    for (const column of td.domains) {
      if (!puieOptions.includeEntityAttr(column, td)) continue;
      if (SQLa.isTablePrimaryKeyColumnDefn(column)) {
        columns.push(columnPuml(column, td));
        columns.push("    --");
      }
    }

    for (const column of td.domains) {
      if (!SQLa.isTablePrimaryKeyColumnDefn(column)) {
        if (!puieOptions.includeEntityAttr(column, td)) continue;
        columns.push(columnPuml(column, td));
      }
    }

    const rels = graph.entityRels.get(td.tableName);
    const children: string[] = [];
    if (rels && rels.inboundRels.length > 0) {
      for (const ir of rels.inboundRels) {
        const frn = ir.fromAttr.foreignRelNature;
        if (SQLa.isTableBelongsToForeignKeyRelNature(frn)) {
          if (!puieOptions.includeChildren(ir)) continue;
          const collectionName = frn.collectionName ??
            SQLa.jsSnakeCaseToken(ir.from.tableName);
          children.push(
            `    ${collectionName(ctx, "plural", "js-class-member-decl")}: ${
              collectionName(ctx, "singular", "ts-type-decl")
            }[]`,
          );
        }
      }
    }
    if (children.length > 0) {
      children.unshift("    --");
    }

    return [
      "",
      `  entity "${ns.tableName(td.tableName)}" as ${
        ns.tableName(td.tableName)
      } {`,
      ...columns,
      ...children,
      `  }`,
    ];
  };

  const tablesPuml = () => {
    let result: string[] = [];
    for (const table of tableDefns(ctx)) {
      if (!puieOptions.includeEntity(table)) {
        continue;
      }

      result = result.concat(tablePuml(table));
    }
    return result;
  };

  const relationshipsPuml = () => {
    const result: string[] = [];
    for (const rel of graph.edges) {
      if (!puieOptions.includeRelationship(rel)) {
        continue;
      }
      const src = rel.source;
      const ref = rel.ref;
      // Relationship types see: https://plantuml.com/es/ie-diagram
      // Zero or One	|o--
      // Exactly One	||--
      // Zero or Many	}o--
      // One or Many	}|--
      const relIndicator = puieOptions.relationshipIndicator(rel);
      if (relIndicator) {
        result.push(
          `  ${ns.tableName(ref.entity.tableName)} ${relIndicator} ${
            ns.tableName(src.entity.tableName)
          }`,
        );
      }
    }
    if (result.length > 0) result.unshift("");
    return result;
  };

  const content = [
    `@startuml ${puieOptions.diagramName}`,
    "  hide circle",
    "  skinparam linetype ortho",
    "  skinparam roundcorner 20",
    "  skinparam class {",
    "    BackgroundColor White",
    "    ArrowColor Silver",
    "    BorderColor Silver",
    "    FontColor Black",
    "    FontSize 12",
    "  }",
    ...tablesPuml(),
    ...relationshipsPuml(),
    "@enduml",
  ].join("\n");

  return content;
}
