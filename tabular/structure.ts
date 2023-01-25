import * as govn from "./governance.ts";
import * as r from "../reflect/reflect.ts";
import { camelToSnakeCase } from "./case.ts";

/**
 * inferColumnDefnsFromExemplar detect's an object's "tabular" definition
 * without mutating the column names (taking them as-is).
 * @param inspect the object(s) used as an example to detect the tabular structure
 * @param defaultValues in case defaults should be provided for column type detection
 * @param includeColumns if non-zero length, only include the given columns otherwise all
 * @returns column definitions detected from an object instance
 */
export function propertyDefnsFromExemplar<
  Object extends govn.UntypedTabularRecordObject,
  ColumnName extends keyof Object = keyof Object,
>(
  inspect: Object | Object[],
  defaultValues?: Object,
  ...includeColumns:
    // supply the list of columns either as name or name+value transformation pair
    (ColumnName | [name: ColumnName, value: (v: unknown) => unknown])[]
): govn.TabularProxyColumnsSupplier<Object> {
  const exemplar = Array.isArray(inspect)
    ? (inspect.length > 0 ? inspect[0] : undefined)
    : inspect;
  const columns: govn.TabularRecordColumnDefn<Object>[] = [];
  if (exemplar) {
    for (const kv of Object.entries(exemplar)) {
      const [colName] = kv;
      const matched = (includeColumns.length == 0) ||
        includeColumns.find((c) =>
          Array.isArray(c) ? (c[0] == colName) : (c == colName)
        );
      let value = kv[1];
      if (matched) {
        value = typeof (Array.isArray(matched) ? matched[1](value) : value);
        let dataType = r.reflect(value);
        if (dataType.type === "undefined" && defaultValues) {
          dataType = r.reflect(
            (defaultValues as Record<string, unknown>)[colName],
          );
        }
        columns.push({ identity: colName as keyof Object, dataType });
      }
    }
  }
  return { columns };
}

/**
 * allColumnDefnsFromExemplar detect's an object's "tabular" definition.
 * It uses snake_case names from the first generic parameter and attempts
 * to match them against the camelCase property names in the first argument
 * to the function.
 * @param inspect the object(s) used as an example to detect the tabular structure
 * @param defaultValues in case defaults should be provided for column type detection
 * @returns column definitions detected from an object instance
 */
export function allColumnDefnsFromExemplar<
  // deno-lint-ignore ban-types
  TableRecord extends object,
  Object extends govn.TabularRecordToObject<TableRecord> =
    govn.TabularRecordToObject<
      TableRecord
    >,
  ColumnName extends keyof TableRecord = keyof TableRecord,
>(
  inspect: Object | Object[],
  defaultValues?: TableRecord,
): govn.TabularProxyColumnsSupplier<TableRecord> {
  const exemplar = Array.isArray(inspect)
    ? (inspect.length > 0 ? inspect[0] : undefined)
    : inspect;
  const columns: govn.TabularRecordColumnDefn<TableRecord>[] = [];
  if (exemplar) {
    for (const kv of Object.entries(exemplar)) {
      const [propName, value] = kv;
      const colName = camelToSnakeCase(propName) as ColumnName;
      let dataType = r.reflect(value);
      if (dataType.type === "undefined" && defaultValues) {
        dataType = r.reflect(
          (defaultValues as Record<string, unknown>)[propName],
        );
      }
      columns.push({ identity: colName, dataType });
    }
  }
  return { columns };
}

/**
 * columnDefnsFromExemplar detect's an object's "tabular" definition for a
 * constrained list of specific "columns" (object properties). It uses
 * snake_case names from the first generic parameter and attempts to
 * match them against the camelCase property names in the first argument
 * to the function.
 * @param inspect the object(s) used as an example to detect the tabular structure
 * @param defaultValues in case defaults should be provided for column type detection
 * @param columns the list of columns to include in the defn
 * @returns column definitions detected from an object instance
 */
export function columnDefnsFromExemplar<
  // deno-lint-ignore ban-types
  TableRecord extends object,
  Object extends govn.TabularRecordToObject<TableRecord> =
    govn.TabularRecordToObject<
      TableRecord
    >,
  ColumnName extends keyof TableRecord = keyof TableRecord,
>(
  inspect: Object | Object[],
  defaultValues?: TableRecord,
  ...columns:
    // supply the list of columns either as name or name+value transformation pair
    (ColumnName | [name: ColumnName, value: (v: unknown) => unknown])[]
): govn.TabularProxyColumnsSupplier<TableRecord> {
  const exemplar = Array.isArray(inspect)
    ? (inspect.length > 0 ? inspect[0] : undefined)
    : inspect;
  const result: govn.TabularProxyColumnsSupplier<TableRecord> = {
    columns: [],
  };
  if (exemplar) {
    for (const kv of Object.entries(exemplar)) {
      const propName = kv[0];
      const colName = camelToSnakeCase(propName) as ColumnName;
      const matched = columns.find((c) =>
        Array.isArray(c) ? (c[0] == colName) : (c == colName)
      );
      let value = kv[1];
      if (matched) {
        value = typeof (Array.isArray(matched) ? matched[1](value) : value);
        let dataType = r.reflect(value);
        if (dataType.type === "undefined" && defaultValues) {
          dataType = r.reflect(
            (defaultValues as Record<string, unknown>)[propName],
          );
        }
        result.columns.push({ identity: colName, dataType });
      }
    }
  }
  return result;
}
