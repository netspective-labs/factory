import * as govn from "./governance.ts";
import * as c from "./case.ts";
import * as s from "./structure.ts";

export interface TransformTabularRecordsRowState<
  TableRecord extends govn.UntypedTabularRecordObject,
> {
  rowIndex: number;
  rowID: (rowIndex: number) => govn.TabularRecordID;
  readonly records: TableRecord[];
}

export interface TransformTabularRecordsRowStateSupplier<
  TableRecord extends govn.UntypedTabularRecordObject,
> {
  readonly rowState: TransformTabularRecordsRowState<TableRecord>;
}

export type FilterOrTransform<
  TableRecord extends govn.UntypedTabularRecordObject,
  Safe,
  Unsafe,
> = (
  value: Safe,
  rowState?: TransformTabularRecordsRowState<TableRecord>,
) => Unsafe | false;

export type FilterOrTransformText<
  TableRecord extends govn.UntypedTabularRecordObject,
> = FilterOrTransform<TableRecord, string, string>;

export interface TransformTabularRecordOptions<
  TableRecord extends govn.UntypedTabularRecordObject,
  TableObject extends govn.TabularRecordToObject<TableRecord> =
    govn.TabularRecordToObject<
      TableRecord
    >,
  PropertyName extends keyof TableObject = keyof TableObject,
  ColumnName extends keyof TableRecord = keyof TableRecord,
> {
  readonly defaultValues?: (
    o: TableObject,
    rowState?: TransformTabularRecordsRowState<TableRecord>,
  ) => TableRecord;
  readonly filterPropUnsafe?: FilterOrTransform<
    TableRecord,
    PropertyName | string,
    string
  >;
  readonly filterProp?: FilterOrTransform<TableRecord, PropertyName, string>;
  readonly filterColumn?: FilterOrTransform<TableRecord, ColumnName, string>;
  readonly transformColumn?: Partial<govn.ObjectTransformer<TableRecord>>;
  readonly transformRecord?: (constructed: TableRecord) => TableRecord;
}

/**
 * transformTabularRecord transforms an object to its "tabular" representation,
 * basically converting each camelCase name to snake_case and copying the
 * data over for requested snake_cased column names with flexible per-property
 * transformation options.
 * @param o the object to convert to a table-like structure
 * @param options in case defaults should be provided or denormalization is required
 * @returns a clone of o with property names converted to snake case
 */
export function transformTabularRecord<
  TableRecord extends govn.UntypedTabularRecordObject,
  TableObject extends govn.TabularRecordToObject<TableRecord> =
    govn.TabularRecordToObject<
      TableRecord
    >,
>(
  o: TableObject,
  rowState?: TransformTabularRecordsRowState<TableRecord>,
  options?: TransformTabularRecordOptions<TableRecord>,
): TableRecord {
  const {
    filterColumn,
    filterProp,
    filterPropUnsafe,
    transformColumn,
  } = options ?? {};
  const filterPropertyName =
    (filterProp || filterPropUnsafe) as FilterOrTransformText<TableRecord>;
  const columnTV = transformColumn
    ? (transformColumn as {
      [key: string]: (value: unknown) => unknown;
    })
    : undefined;
  const result = Object.entries(o).reduce(
    (row, kv) => {
      const propName = filterPropertyName
        ? (filterPropertyName(kv[0], rowState))
        : kv[0];
      if (propName) {
        const snakeCasePropName = c.camelToSnakeCase(propName);
        const colName = filterColumn
          ? ((filterColumn as FilterOrTransformText<TableRecord>)(
            snakeCasePropName,
          ))
          : snakeCasePropName;
        if (colName) {
          const value = kv[1];
          if (columnTV && colName in columnTV) {
            row[colName] = columnTV[colName](value);
          } else {
            row[colName] = value;
          }
        }
      }
      return row;
    },
    (options?.defaultValues?.(o, rowState) ?? {}) as Record<
      string,
      unknown
    >,
  ) as TableRecord;
  return options?.transformRecord ? options?.transformRecord(result) : result;
}

/**
 * transformTabularRecords transforms a list of object to its "tabular" representation,
 * converting each camelCase name to snake_case and copying the data over for
 * requested camelCase property names.
 * @param records the object instances to convert to a table-like structure
 * @param options in case defaults should be provided or denormalization is required
 * @returns a clone of objects with property names converted to snake case
 */
export function transformTabularRecords<
  // deno-lint-ignore ban-types
  TableRecord extends object,
  TableObject extends govn.TabularRecordToObject<TableRecord> =
    govn.TabularRecordToObject<
      TableRecord
    >,
>(
  records: Iterable<TableObject>,
  options?: TransformTabularRecordOptions<TableRecord>,
): TableRecord[] {
  const result: TableRecord[] = [];
  const rowState: TransformTabularRecordsRowState<TableRecord> = {
    rowID: (rowIndex) => rowIndex,
    rowIndex: 0,
    records: result,
  };
  for (const r of records) {
    result.push(transformTabularRecord(r, rowState, options));
    rowState.rowIndex++;
  }
  return result;
}

export function definedTabularRecords<
  TableRecord extends govn.UntypedTabularRecordObject,
  TableObject extends govn.TabularRecordToObject<TableRecord> =
    govn.TabularRecordToObject<
      TableRecord
    >,
  ColumnName extends keyof TableRecord = keyof TableRecord,
>(
  defn: Omit<govn.TabularRecordDefn<TableRecord>, "columns">,
  records: Iterable<TableObject>,
  options: TransformTabularRecordOptions<TableRecord> & {
    inspectForDefn: TableRecord;
  },
  ...columns:
    // supply the list of columns either as name or name+value transformation pair
    (ColumnName | [name: ColumnName, value: (v: unknown) => unknown])[]
): govn.DefinedTabularRecords<TableRecord> {
  return {
    tabularRecordDefn: {
      ...defn,
      ...s.propertyDefnsFromExemplar<TableRecord>(
        options.inspectForDefn,
        undefined,
        ...columns,
      ),
    },
    // deno-lint-ignore require-await
    dataRows: async () => transformTabularRecords(records),
  };
}
