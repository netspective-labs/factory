import * as r from "../reflect/reflect.ts";

// deno-lint-ignore ban-types
export type UntypedObject = object;
export type UntypedTabularRecordObject = UntypedObject;

export type SnakeToCamelCase<S extends string> = S extends
  `${infer P1}_${infer P2}${infer P3}`
  ? `${Lowercase<P1>}${Uppercase<P2>}${SnakeToCamelCase<P3>}`
  : Lowercase<S>;

export type CamelToSnakeCase<S extends string> = S extends
  `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? "_" : ""}${Lowercase<T>}${CamelToSnakeCase<U>}`
  : S;

// deep, 1:1 mapping of a SQL table-like object to its camelCase JS counterpart
export type TabularRecordToObject<T> = {
  [K in keyof T as SnakeToCamelCase<string & K>]: T[K] extends Date ? T[K]
    : // deno-lint-ignore ban-types
    (T[K] extends object ? TabularRecordToObject<T[K]> : T[K]);
};

// deep, 1:1 mapping of a camelCase JS object to its snake_case SQL-like counterpart
export type ObjectToTabularRecord<T> = {
  [K in keyof T as CamelToSnakeCase<string & K>]: T[K] extends Date ? T[K]
    : // deno-lint-ignore ban-types
    (T[K] extends object ? ObjectToTabularRecord<T[K]> : T[K]);
};

export type ValueTransformer<Value, Result> = (value: Value) => Result;

export type ObjectTransformer<T extends UntypedObject> = {
  // deno-lint-ignore no-explicit-any
  [K in keyof T]: ValueTransformer<T[K], T[K] | any>;
};

// "CC" is camelCase, "SC" is snakeCase
export type CamelToSnakeCaseObjectTransformer<
  SrcCC extends UntypedObject,
  DestSC extends ObjectToTabularRecord<SrcCC> = ObjectToTabularRecord<SrcCC>,
> = {
  [DestKeySC in keyof DestSC]: ValueTransformer<
    DestKeySC extends keyof DestSC ? DestSC[DestKeySC] : never,
    DestSC[DestKeySC]
  >;
};

// "CC" is camelCase, "SC" is snakeCase
export type SnakeToCamelCaseObjectTransformer<
  SrcSC extends UntypedTabularRecordObject,
  DestCC extends TabularRecordToObject<SrcSC> = TabularRecordToObject<SrcSC>,
> = {
  [DestKeyCC in keyof DestCC]: ValueTransformer<
    DestKeyCC extends keyof SrcSC ? SrcSC[DestKeyCC] : never,
    DestCC[DestKeyCC]
  >;
};

/**
 * TabularRecordID identifies a single row of data within a list of records.
 */
export type TabularRecordID = number | string;

/**
 * TabularRecordIdRef is a reference to another "table"'s TabularRecordID. It
 * is equivalent to a foreign key reference.
 */
export type TabularRecordIdRef = TabularRecordID;

/**
 * TabularRecordsIdentity is a table or view name; it's abstract so that it can
 * serve multiple purposes.
 */
export type TabularRecordsIdentity = string;

export interface TabularRecordColumnDefn<
  TabularRecord extends UntypedTabularRecordObject,
  ColumnName extends keyof TabularRecord = keyof TabularRecord,
> {
  readonly identity: ColumnName;
  readonly dataType?: r.TypeInfo;
  readonly help?: string;
}

export interface TabularProxyColumnsSupplier<
  TabularRecord extends UntypedTabularRecordObject,
> {
  readonly columns: TabularRecordColumnDefn<TabularRecord>[];
}

export interface TabularRecordDefn<
  TabularRecord extends UntypedTabularRecordObject,
  Identity extends TabularRecordsIdentity = TabularRecordsIdentity,
> extends TabularProxyColumnsSupplier<TabularRecord> {
  readonly identity: Identity;
  readonly namespace?: string;
  readonly help?: string;
}

export interface TabularRecordsDefnSupplier<
  TableRecord extends UntypedTabularRecordObject,
> {
  readonly tabularRecordDefn: TabularRecordDefn<TableRecord>;
}

export interface DefinedTabularRecords<
  TableRecord extends UntypedTabularRecordObject,
> extends TabularRecordsDefnSupplier<TableRecord> {
  readonly dataRows: () => Promise<TableRecord[]>;
}

export interface MutatableTabularRecordIdSupplier {
  id: TabularRecordID;
}

export type TabularRecordIdSupplier = Readonly<
  MutatableTabularRecordIdSupplier
>;

export interface DefinedTabularRecordsSupplier {
  readonly definedTabularRecords: <
    TableRecord extends UntypedTabularRecordObject = UntypedTabularRecordObject,
  >() => AsyncGenerator<DefinedTabularRecords<TableRecord>>;
}
