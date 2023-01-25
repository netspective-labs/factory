export type QueryResultNature =
  | "scalar" // first column from single row result
  | "object" // Object (single row result)
  | "row" // array of scalars (single row result)
  | "records" // array of objects (multiple rows result)
  | "matrix" // array of array of scalars (multiple rows result)
  | "alaSQL-recordset" // https://github.com/AlaSQL/alasql/wiki/Recordset
  | "error-exception"; // an exception was trapped and being reported

export type QueryResultValueNature =
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "symbol"
  | "undefined"
  | "object"
  | "function";

export function detectQueryResultNature(
  o: unknown,
): QueryResultNature | undefined {
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
