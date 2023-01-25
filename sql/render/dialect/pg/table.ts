import * as tmpl from "../../template/mod.ts";
import * as d from "../../domain.ts";
import {
  TableColumnInsertDmlExclusionSupplier,
  TablePrimaryKeyColumnDefn,
} from "../../ddl/table.ts";

export function postgreSqlSerialPrimaryKey<
  ColumnTsType,
  Context extends tmpl.SqlEmitContext,
>(
  axiom: d.AxiomSqlDomain<ColumnTsType, Context>,
):
  & TablePrimaryKeyColumnDefn<ColumnTsType, Context>
  & TableColumnInsertDmlExclusionSupplier<ColumnTsType, Context> {
  return {
    ...axiom,

    isPrimaryKey: true,

    isExcludedFromInsertDML: true,

    isAutoIncrement: true,

    sqlPartial: (dest) => {
      if (dest === "create table, column defn decorators") {
        const ctcdd = axiom?.sqlPartial?.(
          "create table, column defn decorators",
        );

        const decorators: tmpl.SqlTextSupplier<Context> = {
          SQL: () => `SERIAL PRIMARY KEY`,
        };

        return ctcdd ? [decorators, ...ctcdd] : [decorators];
      }

      return axiom.sqlPartial?.(dest);
    },
  };
}
