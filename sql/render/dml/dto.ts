export interface TableDataTransferSuppliers<
  TableName,
  TableRecord,
  TsObject,
  InsertableRecord,
  InsertableObject,
> {
  readonly tableName: TableName;
  readonly fromTable: (t: TableRecord) => TsObject;
  readonly toTable: (o: TsObject) => TableRecord;
  readonly insertable: (o: InsertableObject) => InsertableRecord;
}
