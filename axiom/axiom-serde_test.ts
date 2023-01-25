import { testingAsserts as ta } from "./deps-test.ts";
import * as safety from "../safety/mod.ts";
import * as mod from "./axiom-serde.ts";
import * as ax from "./axiom.ts";
import * as axsde from "./axiom-serde-env.ts";
import { $ } from "./axiom.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

const expectType = <T>(_value: T) => {
  // Do nothing, the TypeScript compiler handles this for us
};

const intEnvDefaultable = -1;

type SyntheticGroup = "Group1" | "Group2" | "Group3";
type SyntheticLabel = "synthetic_label1" | "Label2";

type SyntheticGovernance = {
  readonly remarks: string;
  readonly groups: SyntheticGroup[];
  readonly labels: SyntheticLabel[];
};

const hasRemarks = <TsValueType>(
  o: mod.AxiomSerDe<TsValueType>,
): o is mod.AxiomSerDe<TsValueType> & {
  readonly governance: Pick<SyntheticGovernance, "remarks">;
} => {
  return mod.isGovernableAxiomSerDe(
    o,
    safety.typeGuard<Pick<SyntheticGovernance, "remarks">>("remarks"),
  );
};

export function isInGroup<TsValueType>(
  o: mod.AxiomSerDe<TsValueType>,
  group: SyntheticGroup,
): o is mod.AxiomSerDe<TsValueType> & {
  readonly governance: Pick<SyntheticGovernance, "groups">;
} {
  if (
    mod.isGovernableAxiomSerDe(
      o,
      safety.typeGuard<Pick<SyntheticGovernance, "groups">>(
        "groups",
      ),
    )
  ) {
    return o.governance.groups.find((g) => g == group) ? true : false;
  }
  return false;
}

export function typedGovn<TsValueType>(
  axiom: mod.AxiomSerDe<TsValueType>,
  governance: Partial<SyntheticGovernance>,
) {
  return mod.governed(axiom, governance);
}

export function typedLabel<TsValueType>(
  axiom: mod.AxiomSerDe<TsValueType>,
  label: SyntheticLabel,
) {
  const governance: Pick<SyntheticGovernance, "labels"> = { labels: [label] };
  return mod.governed(axiom, governance);
}

export function isLabeled<TsValueType>(
  o: mod.AxiomSerDe<TsValueType>,
  label: SyntheticLabel,
): o is mod.AxiomSerDe<TsValueType> & {
  readonly governance: Pick<SyntheticGovernance, "labels">;
} {
  if (
    mod.isGovernableAxiomSerDe(
      o,
      safety.typeGuard<Pick<SyntheticGovernance, "labels">>("labels"),
    )
  ) {
    return o.governance.labels.find((l) => l == label) ? true : false;
  }
  return false;
}

Deno.test("serializable/deserializable axioms", async (tc) => {
  // extensions can be "typed" using `typeGovn` and `typedLabel` examples
  // or "quasi-typed" like `isSpecialNumber` example.

  // use these for type-testing in IDE
  const syntheticDecl = {
    text: mod.text(),
    textOptional: mod.textOptional(),
    textCustom: typedGovn(mod.text($.string), {
      groups: ["Group1"],
      remarks: "cool feature",
    }),
    textLabeledOptional: typedLabel(mod.textOptional(), "synthetic_label1"),
    int: { ...mod.integer(), isSpecialNumber: true },
    intEnv: axsde.envVarAxiomSD(
      mod.integer(),
      "SYNTHETIC_INT",
      0,
      (value) => value && value == intEnvDefaultable ? true : false,
    ),
    intOptional: mod.integerOptional(),
    intCustom: mod.integer($.number),
    float: mod.float(),
    floatOptional: mod.floatOptional(),
    bigint: mod.bigint(),
    bigintOptional: { ...mod.bigintOptional(), isSpecialNumber: true },
    bigintCustom: mod.bigint($.bigint),
    json: mod.jsonText(),
    jsonCustom: mod.jsonText($.string),
    jsonOptional: mod.jsonTextOptional(),
    date: mod.date(),
    dateCustom: mod.date($.date),
    dateNullable: mod.dateOptional(),
    dateTime: mod.dateTime(),
    dateTimeCustom: mod.dateTime($.date),
    dateTimeNullable: mod.dateTimeOptional(),

    // passing in Axiom without SerDe wrapper will be a "lint" error for
    // mod.serDeAxioms but OK for Axiom
    notSerDe: $.string.optional(),
  };

  const syntheticDefn = $.object(syntheticDecl);

  // deno-lint-ignore require-await
  await tc.step("axiom IDE experiments", async () => {
    // hover over 'names' to see quasi-typed names
    const _names = syntheticDefn.axiomObjectDeclPropNames;
    // uncomment the following to see the IDE picking up type mismatch error for `p`
    //const _badNameFound = syntheticDefn.properties.map((p) => p.axiomPropertyName).find(p => p === "bad");

    // hover over 'Synthetic' to see fully typed object
    type Synthetic = ax.AxiomType<typeof syntheticDefn>;
    // try typing in bad properties or invalid types
    const _synthetic: Synthetic = {
      text: "synthetic",
      textCustom: "synthetic_custom",
      int: 0,
      intEnv: intEnvDefaultable,
      intCustom: 1,
      float: 123.0,
      bigint: 0n,
      bigintCustom: 1n,
      json: `{"synthetic": "yes"}`,
      jsonCustom: `{ "synthetic": "yes", "custom": true }`,
      date: new Date(),
      dateCustom: new Date(),
      dateTime: new Date(),
      dateTimeCustom: new Date(),
      // bad: "hello"
    };
  });

  await tc.step("SerDe-wrapped axiom", async (tc) => {
    let lintIssuesCount = 0;
    const syntheticASDO = mod.axiomSerDeObject(syntheticDecl, {
      onPropertyNotSerDeAxiom: (name) => {
        lintIssuesCount++;
        ta.assertEquals("notSerDe", name);
      },
    });

    await tc.step("lint issues count", () => {
      ta.assertEquals(1, lintIssuesCount);
    });

    await tc.step("IDE experiments", () => {
      // hover over 'names' to see quasi-typed names
      const _sdNames = syntheticASDO.axiomProps.map((sda) => sda.identity);
      const _sdDefault = syntheticASDO.axiomProps.map((sda) =>
        mod.isDefaultableAxiomSerDe(sda) ? sda.defaultValue : undefined
      );
    });

    await tc.step("quasi-typed extension", () => {
      const isSpecialNum = safety.typeGuard<{ isSpecialNumber: boolean }>(
        "isSpecialNumber",
      );

      const asdExtension = <TPropAxioms extends Record<string, ax.Axiom<Any>>>(
        props: TPropAxioms,
      ) => {
        type SpecialNums = {
          [
            Property in keyof TPropAxioms as Extract<
              Property,
              TPropAxioms[Property] extends { isSpecialNumber: boolean }
                ? Property
                : never
            >
          ]: TPropAxioms[Property];
        };
        const propsASDO = mod.axiomSerDeObject(props);
        const specialNums: SpecialNums = {} as Any;
        for (const ap of propsASDO.axiomProps) {
          if (isSpecialNum(ap)) {
            specialNums[ap.identity as (keyof SpecialNums)] = ap as Any;
          }
        }

        return {
          ...propsASDO,
          specialNums,
        };
      };

      const ed = asdExtension(syntheticDecl);
      expectType(ed.specialNums.int);
      expectType(ed.specialNums.bigintOptional);
    });

    await tc.step("typed labels", () => {
      const syntheticASDO = mod.axiomSerDeObject(syntheticDecl);
      const labeled = Array.from(
        syntheticASDO.governed((test) => {
          return isLabeled(test, "synthetic_label1") ? true : false;
        }),
      );
      ta.assertEquals(1, labeled.length);
      ta.assertEquals("textLabeledOptional", labeled[0].identity);
    });

    await tc.step("typed governance", () => {
      const syntheticASDO = mod.axiomSerDeObject(syntheticDecl);
      const governed = Array.from(syntheticASDO.governed());
      ta.assertEquals(2, governed.length);

      const firstGovnd = governed[0];
      ta.assertEquals("textCustom", firstGovnd.identity);

      ta.assert(hasRemarks(firstGovnd));
      ta.assertEquals(firstGovnd.governance.remarks, "cool feature");

      ta.assert(isInGroup(firstGovnd, "Group1"));
      ta.assert(firstGovnd.governance.groups.find((g) => g == "Group1"));
    });

    // hover over 'SyntheticDomains' to see fully typed object
    type SyntheticDomains = ax.AxiomType<typeof syntheticASDO>;
    // try typing in bad properties or invalid types
    const synthetic: SyntheticDomains = {
      text: "synthetic",
      textCustom: "synthetic_custom",
      int: 0,
      intEnv: intEnvDefaultable,
      intCustom: 1,
      float: 123.0,
      bigint: 0n,
      bigintCustom: 1n,
      json: `{"synthetic": "yes"}`,
      jsonCustom: `{ "synthetic": "yes", "custom": true }`,
      date: new Date(),
      dateCustom: new Date(),
      dateTime: new Date(),
      dateTimeCustom: new Date(),
      // bad: "hello"
    };

    // should see compile errors if any of these fail
    expectType<string>(synthetic.text);
    expectType<string>(synthetic.textCustom);
    expectType<string | undefined>(synthetic.textLabeledOptional);
    expectType<number>(synthetic.int);
    expectType<number>(synthetic.intEnv);
    expectType<number>(synthetic.intCustom);
    expectType<bigint>(synthetic.bigint);
    expectType<bigint>(synthetic.bigintCustom);
    expectType<string>(synthetic.json);
    expectType<string>(synthetic.jsonCustom);
    expectType<Date>(synthetic.date);
    expectType<Date>(synthetic.dateCustom);
    expectType<Date>(synthetic.dateTime);
    expectType<Date>(synthetic.dateTimeCustom);
  });
});

Deno.test(`deserialize JSON text`, async (tc) => {
  await tc.step("invalid config, missing required properties", () => {
    const syntheticASDO = mod.axiomSerDeObject({
      text: mod.text(),
      number: mod.integer(),
      numberEnv: axsde.envVarAxiomSD(
        mod.integer(),
        "SYNTHETIC_INT",
        0,
        (value) =>
          value == undefined || value == intEnvDefaultable ? true : false,
      ),
      maxAgeInMS: mod.bigint(),
      bool: mod.boolean(),
      complexType: mod.object({
        innerText: mod.text(),
        innerNumber: mod.integer(),
      }),
    });

    const syntheticJsonText = JSON.stringify(
      { text: "test" },
      (_, value) => typeof value === "bigint" ? value.toString() : value, // return everything else unchanged
    );

    const djt = syntheticASDO.fromJsonText(syntheticJsonText);
    const { serDeAxiomRecord: sdaRec } = djt;
    ta.assertEquals(false, djt.test(sdaRec));
    ta.assertEquals(sdaRec.text, "test");
    ta.assertEquals(sdaRec.numberEnv, 0); // no "SYNTHETIC_INT" env var available
  });

  await tc.step("valid config, all required properties defined", () => {
    const syntheticASDO = mod.axiomSerDeObject({
      text: mod.text(),
      number: mod.integer(),
      numberEnv: axsde.envVarAxiomSD(
        mod.integer(),
        "SYNTHETIC_INT",
        0,
        (value) =>
          value == undefined || value == intEnvDefaultable ? true : false,
      ),
      // maxAgeInMS: mod.bigint(), TODO: bigint in omnibus doesn't work yet
      bool: mod.boolean(),
      complexType: mod.object({
        innerText: mod.text(),
        innerNumber: mod.integer(),
      }),
    });

    const syntheticJsonText = JSON.stringify({
      text: "test",
      number: 100,
      bool: true,
      complexType: { innerText: "testInner", innerNumber: 25 },
    }, (_, value) => typeof value === "bigint" ? value.toString() : value // return everything else unchanged
    );

    Deno.env.set("SYNTHETIC_INT", String(10267));

    const djt = syntheticASDO.fromJsonText(() => syntheticJsonText);
    const { serDeAxiomRecord: config } = djt;
    ta.assert(djt.test(config, {
      onInvalid: (reason) => {
        console.log(reason);
      },
    }));

    ta.assertEquals(config.text, "test");
    ta.assertEquals(config.number, 100);
    ta.assertEquals(config.numberEnv, 10267);
    ta.assertEquals(config.bool, true);
    ta.assertEquals(config.complexType, {
      innerText: "testInner",
      innerNumber: 25,
    });

    Deno.env.delete("SYNTHETIC_INT");
  });
});
