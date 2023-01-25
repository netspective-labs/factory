import * as govn from "./governance.ts";
import * as h from "../text/human.ts";
import * as safety from "../safety/mod.ts";

export const isQueryExecutionRowsSupplier = safety.typeGuard<
  // deno-lint-ignore no-explicit-any
  govn.QueryExecutionRowsSupplier<any>
>("rows", "SQL");
export const isQueryExecutionRecordsSupplier = safety.typeGuard<
  // deno-lint-ignore no-explicit-any
  govn.QueryExecutionRecordsSupplier<any>
>("records", "SQL");

export function detectQueryResultNature(
  o: unknown,
): govn.QueryResultNature | undefined {
  if (typeof o === "undefined") return undefined;
  if (o == null) return undefined;

  if (Array.isArray(o) && o.length > 0) {
    const firstRow = o[0];
    if (Array.isArray(firstRow)) {
      if (o.length > 1) return "matrix";
      return "row";
    }
    if (typeof firstRow === "object") return "records";
  }
  if (typeof o === "object") {
    if ("data" in o && "columns" in o) {
      return "alaSQL-recordset";
    }
    return "object";
  }
  return "scalar";
}

export function detectQueryResultModel(
  o: unknown,
  options?: {
    readonly enhance?: Record<string, unknown>;
    readonly dataSupplier?: (
      o: unknown,
      nature: govn.QueryResultNature,
    ) => unknown;
  },
): govn.QueryResultModel | undefined {
  const nature = detectQueryResultNature(o);
  if (typeof nature == "undefined") return undefined;

  const {
    dataSupplier = (o: unknown, nature: govn.QueryResultNature) => {
      // deno-lint-ignore no-explicit-any
      if (nature === "alaSQL-recordset") return (o as any).data;
      return o;
    },
  } = options ?? {};

  let vpIndex = 0;
  const valueModel = (
    exemplarValue: unknown,
    suppliedName?: string,
    label = (name?: string) => {
      return name ? h.humanFriendlyPhrase(name) : `Column ${vpIndex}`;
    },
  ) => {
    vpIndex++;
    const result: govn.QueryResultValueModel = {
      exemplarValue,
      suppliedName,
      humanFriendlyName: label(suppliedName),
      valueType: typeof exemplarValue,
    };
    return result;
  };

  const valueModels: govn.QueryResultValueModel[] = [];

  const addArrayEntriesModel = (entry: govn.SqlRow) =>
    entry.forEach((v) => valueModels.push(valueModel(v)));

  const addObjectEntriesModel = (entry: govn.SqlRecord) => {
    for (const kvPair of Object.entries(entry)) {
      const [key, value] = kvPair;
      valueModels.push(valueModel(value, key));
    }
  };

  // deno-lint-ignore no-explicit-any
  const data = dataSupplier(o, nature) as any;
  switch (nature) {
    case "scalar":
      valueModels.push(valueModel(data));
      break;

    case "matrix":
      // detect presentation model from first row
      addArrayEntriesModel(data[0]);
      break;

    case "row":
      addArrayEntriesModel(data);
      break;

    case "records":
    case "alaSQL-recordset":
      // detect presentation model from first row
      addObjectEntriesModel(data[0]);
      break;

    case "object":
      addObjectEntriesModel(data);
      break;
  }

  return {
    nature,
    data,
    valueModels,
    ...options?.enhance,
  };
}
