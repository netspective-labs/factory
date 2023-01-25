import * as govn from "./governance.ts";
import { snakeToCamelCase } from "./case.ts";
import * as s from "./structure.ts";

export interface TabularRecordProxyOptions {
  readonly identity?: (columnName: string) => govn.TabularRecordID | undefined;
  readonly onKeyNotFound?: (
    original: string | symbol,
    textKey: string,
    camelCased: string,
  ) => unknown;
}

// deno-lint-ignore no-explicit-any
type Untyped = any;

export function untypedTabularRecordProxy(
  record: govn.UntypedTabularRecordObject,
  options?: TabularRecordProxyOptions,
): govn.UntypedTabularRecordObject {
  const { identity: identitySupplier, onKeyNotFound } = options ?? {};
  return new Proxy(record, {
    // Set objects store the cache keys in insertion order.
    get: function (obj, key, receiver) {
      // use use key.toString() since key can be a symbol
      const columnName = key.toString();

      // in case "ID", "xyz_id", "id", etc. is requested
      const identity = identitySupplier?.(columnName);
      if (typeof identity !== "undefined") return identity;

      // is a direct property requested?
      if (columnName in record) {
        return (obj as Untyped)[columnName];
      }

      // are we looking for snake_case property?
      const camelCasedCN = snakeToCamelCase(columnName);
      if (camelCasedCN in record) {
        return (obj as Untyped)[camelCasedCN];
      }

      return onKeyNotFound
        ? onKeyNotFound(key, columnName, camelCasedCN)
        : Reflect.get(obj, key, receiver);
    },
  });
}

export function tabularRecordProxy<
  TableRecord extends govn.UntypedTabularRecordObject,
  TableObject extends govn.TabularRecordToObject<TableRecord> =
    govn.TabularRecordToObject<
      TableRecord
    >,
>(record: TableObject, options?: TabularRecordProxyOptions): TableRecord {
  return untypedTabularRecordProxy(record, options) as unknown as TableRecord;
}

export interface TableRecordsRowIdSupplier {
  (
    columnName: string,
    recordsKey: string | symbol,
    records: govn.UntypedTabularRecordObject[],
    tableishName?: govn.TabularRecordsIdentity,
  ): govn.TabularRecordID | undefined;
}

export interface TableRecordsDenormalizer<T = Untyped> {
  (
    row: T,
    columns?: Record<string, unknown>,
    tableishName?: govn.TabularRecordsIdentity,
  ): T;
}

export interface TabularRecordsProxyOptions {
  readonly rowIdentity?: TableRecordsRowIdSupplier;
  readonly denormalize?: TableRecordsDenormalizer;
}

export function untypedTabularRecordsProxy(
  records: govn.UntypedTabularRecordObject[],
  tableishName?: govn.TabularRecordsIdentity,
  options?: TabularRecordsProxyOptions,
): govn.UntypedTabularRecordObject {
  const { rowIdentity } = options ?? {};
  const _denormalize: TableRecordsDenormalizer = options?.denormalize ?? (
    (row, columns) => {
      // we want to support optional denormalizing so we'll just add the extra
      // columns to our table; if we didn't want to support denormalization then
      // we could reject certain columns based on the table
      return {
        ...row,
        ...columns,
      };
    }
  );

  return new Proxy(records, {
    // Set objects store the cache keys in insertion order.
    get: function (obj, recordsKey, receiver) {
      const rowIndex = parseInt(String(recordsKey));
      if (isNaN(rowIndex)) {
        return Reflect.get(obj, recordsKey, receiver);
      }

      if (recordsKey in obj) {
        return untypedTabularRecordProxy((obj as Untyped)[recordsKey], {
          identity: rowIdentity
            ? ((columnName) => {
              return rowIdentity(
                columnName,
                recordsKey,
                records,
                tableishName,
              );
            })
            : undefined,
          ...options,
        });
      }
      return undefined;
    },
  });
}

export function untypedTabularAutoRowIdRecordsProxy(
  records: govn.UntypedTabularRecordObject[],
  tableishName?: govn.TabularRecordsIdentity,
  options?: TabularRecordsProxyOptions,
): govn.UntypedTabularRecordObject {
  const autoRowID: TableRecordsRowIdSupplier = options?.rowIdentity ??
    ((columnName, recordsKey) => {
      // if a RDBMS or SQL-style record.ID or record.table_name_id is requested,
      // assume it's the index of the record in its array;
      if (columnName == "id") {
        return parseInt(recordsKey.toString());
      }
    });

  return untypedTabularRecordsProxy(records, tableishName, {
    ...options,
    rowIdentity: autoRowID,
  });
}

export function tabularRecordsProxy<
  TableRecord extends govn.UntypedTabularRecordObject,
  TableObject extends govn.TabularRecordToObject<TableRecord> =
    govn.TabularRecordToObject<
      TableRecord
    >,
>(
  records: TableObject[],
  tableishName?: govn.TabularRecordsIdentity,
  options?: TabularRecordsProxyOptions,
): TableRecord[] {
  return untypedTabularRecordsProxy(
    records,
    tableishName,
    options,
  ) as unknown as TableRecord[];
}

export function tabularAutoRowIdRecordsProxy<
  TableRecord extends govn.UntypedTabularRecordObject & {
    id: govn.TabularRecordID;
  },
  TableObject extends govn.TabularRecordToObject<TableRecord> =
    govn.TabularRecordToObject<
      TableRecord
    >,
>(
  records: TableObject[],
  tableishName?: govn.TabularRecordsIdentity,
  options?: TabularRecordsProxyOptions,
): TableRecord[] {
  return untypedTabularAutoRowIdRecordsProxy(
    records,
    tableishName,
    options,
  ) as unknown as TableRecord[];
}

export function definedTabularRecordsProxy<
  TableRecord extends govn.UntypedTabularRecordObject,
  TableObject extends govn.TabularRecordToObject<TableRecord> =
    govn.TabularRecordToObject<
      TableRecord
    >,
  ColumnName extends keyof TableRecord = keyof TableRecord,
>(
  defn:
    & Omit<govn.TabularRecordDefn<TableRecord>, "columns">
    & Partial<Pick<govn.TabularRecordDefn<TableRecord>, "columns">>,
  records: TableObject[],
  ...columns:
    // supply the list of columns either as name or name+value transformation pair
    (ColumnName | [name: ColumnName, value: (v: unknown) => unknown])[]
): govn.DefinedTabularRecords<TableRecord> {
  if (defn.columns) {
    // we don't want to "detect" the columns, they're provided
    return {
      tabularRecordDefn: defn as govn.TabularRecordDefn<TableRecord>,
      // deno-lint-ignore require-await
      dataRows: async () => tabularRecordsProxy(records),
    };
  }

  return {
    // we want to inspect and "detect" the columns defn.columns is not provided
    tabularRecordDefn: columns && columns.length > 0
      ? ({
        ...defn,
        ...s.columnDefnsFromExemplar<TableRecord>(
          records,
          undefined,
          ...columns,
        ),
      })
      : ({
        ...defn,
        ...s.allColumnDefnsFromExemplar<TableRecord>(records),
      }),
    // deno-lint-ignore require-await
    dataRows: async () => tabularRecordsProxy(records),
  };
}

export function definedTabularAutoRowIdRecordsProxy<
  TableRecord extends
    & govn.UntypedTabularRecordObject
    & govn.MutatableTabularRecordIdSupplier,
  TableObject extends govn.TabularRecordToObject<TableRecord> =
    govn.TabularRecordToObject<
      TableRecord
    >,
  ColumnName extends keyof TableRecord = keyof TableRecord,
>(
  defn:
    & Omit<govn.TabularRecordDefn<TableRecord>, "columns">
    & Partial<Pick<govn.TabularRecordDefn<TableRecord>, "columns">>,
  records: TableObject[],
  ...columns:
    // supply the list of columns either as name or name+value transformation pair
    (ColumnName | [name: ColumnName, value: (v: unknown) => unknown])[]
): govn.DefinedTabularRecords<TableRecord> {
  if (defn.columns) {
    // we don't want to "detect" the columns, they're provided
    return {
      tabularRecordDefn: defn as govn.TabularRecordDefn<TableRecord>,
      // deno-lint-ignore require-await
      dataRows: async () => tabularRecordsProxy(records),
    };
  }

  return {
    // we want to inspect and "detect" the columns defn.columns is not provided
    tabularRecordDefn: columns && columns.length > 0
      ? ({
        ...defn,
        ...s.columnDefnsFromExemplar<TableRecord>(
          records,
          undefined,
          ...columns,
        ),
      })
      : ({
        ...defn,
        ...s.allColumnDefnsFromExemplar<TableRecord>(records),
      }),
    // deno-lint-ignore require-await
    dataRows: async () => tabularAutoRowIdRecordsProxy(records),
  };
}
