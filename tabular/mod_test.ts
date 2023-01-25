import * as ta from "https://deno.land/std@0.147.0/testing/asserts.ts";
import * as mod from "./mod.ts";

// deno-lint-ignore no-explicit-any
type Untyped = any;

interface TabularRecordSyntheticIdSupplier {
  readonly synthetic_record_id: mod.TabularRecordID;
}

Deno.test(`untypedTabularRecordProxy without ID`, () => {
  const o = {
    propertyOne: "one",
    propertyTwo: 100,
    dateInObj: new Date(),
    propertyThree3: 250,
  };
  const record = mod.untypedTabularRecordProxy(o);
  ta.assertEquals((record as Untyped).property_one, o.propertyOne);
  ta.assertEquals((record as Untyped).property_two, o.propertyTwo);
  ta.assertEquals((record as Untyped).property_three3, o.propertyThree3);
  ta.assert((record as Untyped).date_in_obj);
});

Deno.test(`tabularRecordProxy (type-safe)`, () => {
  const o = {
    syntheticRecordId: "fake", // this is a fake ID, it will be supplied by proxy
    propertyOne: "one",
    propertyTwo: 100,
    dateInObj: new Date(),
    propertyThree3: 250,
  };
  const record = mod.tabularRecordProxy<
    TabularRecordSyntheticIdSupplier & {
      property_one: string;
      property_two: number;
      property_three3?: number;
    }
  >(o, {
    identity: (columnName) =>
      columnName == "synthetic_record_id" ? "SYNTHETIC_ID" : undefined,
  });
  ta.assertEquals("SYNTHETIC_ID", record.synthetic_record_id);
  ta.assertEquals(record.property_one, o.propertyOne);
  ta.assertEquals(record.property_two, o.propertyTwo);
  ta.assertEquals(record.property_three3, o.propertyThree3);

  // date will be copied even though it's not in the table row definition
  // deno-lint-ignore no-explicit-any
  ta.assert((record as any).date_in_obj);
});

Deno.test(`tabularRecordsProxy (type-safe)`, () => {
  const genCount = 5;
  const synthetic = [];
  for (let i = 0; i < genCount; i++) {
    synthetic.push({
      propertyOne: `p1_${i}`,
      propertyTwo: i,
      dateInObj: new Date(),
      propertyThree3: i * 100,
    });
  }

  const records = mod.tabularRecordsProxy<{
    property_one: string;
    property_two: number;
    property_three3?: number;
  }>(synthetic);
  ta.assertEquals(genCount, synthetic.length);

  const firstRecord = records[0];
  const firstSynthetic = synthetic[0];
  ta.assertEquals(firstRecord.property_one, firstSynthetic.propertyOne);
  ta.assertEquals(firstRecord.property_two, firstSynthetic.propertyTwo);
  ta.assertEquals(firstRecord.property_three3, firstSynthetic.propertyThree3);
});

Deno.test(`tabularIdentifiableRecordsProxy (type-safe)`, () => {
  const genCount = 5;
  const synthetic = [];
  for (let i = 0; i < genCount; i++) {
    synthetic.push({
      id: "fake",
      propertyOne: `p1_${i}`,
      propertyTwo: i,
      dateInObj: new Date(),
      propertyThree3: i * 100,
    });
  }

  const records = mod.tabularAutoRowIdRecordsProxy<{
    id: mod.TabularRecordID;
    property_one: string;
    property_two: number;
    property_three3?: number;
  }>(synthetic);
  ta.assertEquals(genCount, synthetic.length);

  const firstRecord = records[0];
  const firstSynthetic = synthetic[0];
  ta.assertEquals(0, firstRecord.id);
  ta.assertEquals(firstRecord.property_one, firstSynthetic.propertyOne);
  ta.assertEquals(firstRecord.property_two, firstSynthetic.propertyTwo);
  ta.assertEquals(firstRecord.property_three3, firstSynthetic.propertyThree3);
});

Deno.test(`tabular record column definitions inspector`, () => {
  const o = {
    propertyOne: "one",
    propertyTwo: 100,
    dateInObj: new Date(),
    propertyThree3: 250,
  };
  const tdAll = mod.allColumnDefnsFromExemplar<{
    property_one: string;
    property_two: number;
    property_three3?: number;
  }>(o);
  const tdSome = mod.columnDefnsFromExemplar<{
    property_one: string;
    property_two: number;
    property_three3?: number;
  }>(o, undefined, "property_one", "property_two", "property_three3");
  ta.assertEquals(4, tdAll.columns.length);
  ta.assertEquals(3, tdSome.columns.length);
});

Deno.test(`defined tabular auto row ID records proxy`, async () => {
  const o = {
    id: "fake",
    propertyOne: "one",
    propertyTwo: 100,
    dateInObj: new Date(),
    propertyThree3: 250,
  };
  const rows = [o];
  const defined = mod.definedTabularAutoRowIdRecordsProxy<{
    id: mod.TabularRecordID;
    property_one: string;
    property_two: number;
    property_three3?: number;
  }>(
    { identity: "table_name" },
    rows,
    "property_one",
    "property_two",
    "property_three3",
  );
  ta.assert(defined.tabularRecordDefn);
  ta.assertEquals(3, defined.tabularRecordDefn.columns.length);
  ta.assertEquals(
    "property_one, property_two, property_three3",
    defined.tabularRecordDefn.columns.map((c) => c.identity).join(", "),
  );
  ta.assertEquals(
    "string, string, string",
    defined.tabularRecordDefn.columns.map((c) => c.dataType?.type).join(", "),
  );

  const records = await defined.dataRows();
  const firstRecord = records[0];
  ta.assertEquals(0, firstRecord.id);
  ta.assertEquals(firstRecord.property_one, o.propertyOne);
  ta.assertEquals(firstRecord.property_two, o.propertyTwo);
  ta.assertEquals(firstRecord.property_three3, o.propertyThree3);
});

Deno.test(`env vars defined proxy`, async () => {
  const envProxy = mod.definedTabularRecordsProxy<{
    readonly var_name: string;
    readonly var_value: string;
  }>(
    {
      identity: "environment",
      namespace: "server_os",
      help: "Results of Deno.env.toObject()",
    },
    Array.from(Object.entries(Deno.env.toObject())).map((envEntry) => ({
      varName: envEntry[0],
      varValue: envEntry[1],
    })),
  );

  const env = await envProxy.dataRows();
  ta.assert(env);
});

Deno.test(`transform object to tabular record with no filters`, () => {
  const o = {
    propertyOne: "one",
    propertyTwo: 100,
    dateInObj: new Date(),
    propertyThree3: 250,
  };
  const row = mod.transformTabularRecord<{
    property_one: string;
    property_two: number;
    property_three3?: number;
  }>(o);
  ta.assertEquals(row.property_one, o.propertyOne);
  ta.assertEquals(row.property_two, o.propertyTwo);
  ta.assertEquals(row.property_three3, o.propertyThree3);

  // date will be copied even though it's not in the table row definition
  // because we did not filter the property or column
  // deno-lint-ignore no-explicit-any
  ta.assert((row as any).date_in_obj);
  ta.assertEquals(4, Object.keys(row).length);
});

Deno.test(`transform object to tabular record with filter`, () => {
  const o = {
    propertyOne: "one",
    propertyTwo: 100,
    dateInObj: new Date(),
    propertyThree3: 250,
  };
  const row = mod.transformTabularRecord<{
    property_one: string;
    property_two: number;
    property_three3?: number;
  }>(o, undefined, {
    filterPropUnsafe: (propName) => propName !== "dateInObj" ? propName : false,
  });
  ta.assertEquals(3, Object.keys(row).length);
  ta.assertEquals(row.property_one, o.propertyOne);
  ta.assertEquals(row.property_two, o.propertyTwo);
  ta.assertEquals(row.property_three3, o.propertyThree3);

  // date will not be copied
  // deno-lint-ignore no-explicit-any
  ta.assert((row as any).date_in_obj === undefined);

  const oArray = [o];
  const rows = mod.transformTabularRecords<{
    property_one: string;
    property_two: number;
    property_three3?: number;
  }>(oArray, {
    filterProp: (propName) =>
      (propName == "propertyOne" || propName == "propertyTwo" ||
          propName == "propertyThree3")
        ? propName
        : false,
  });
  ta.assert(rows.length = 1);
  ta.assertEquals(3, Object.keys(rows[0]).length);
  ta.assertEquals(rows[0].property_one, o.propertyOne);
  ta.assertEquals(rows[0].property_two, o.propertyTwo);
  ta.assertEquals(rows[0].property_three3, o.propertyThree3);
});

Deno.test(`transform object to tabular record with transformed Date using column name`, () => {
  const o = {
    propertyOne: "one",
    propertyTwo: 100,
    dateInObj: new Date(),
    propertyThree3: 250,
  };
  const row = mod.transformTabularRecord<{
    property_one: string;
    property_two: number;
    property_three3?: number;
    date_in_obj: string | Date; // TODO: figure out to type so only "string" is possible
  }>(o, undefined, {
    transformColumn: {
      date_in_obj: (date) => `${date}_transformColumn`,
    },
    // transformColumn: {

    //   // columns are transformed after property transform
    //   date_in_obj: (date) => `${date}_transformColumn`,
    // },
  });
  ta.assertEquals(row.property_one, o.propertyOne);
  ta.assertEquals(row.property_two, o.propertyTwo);
  ta.assertEquals(row.property_three3, o.propertyThree3);
  ta.assert(row.date_in_obj);
  ta.assert(o.dateInObj instanceof Date);
  ta.assert(typeof row.date_in_obj === "string");
  ta.assert(row.date_in_obj.endsWith("_transformColumn"));
});
