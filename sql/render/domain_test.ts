import { testingAsserts as ta } from "./deps-test.ts";
import * as safety from "../../safety/mod.ts";
import * as mod from "./domain.ts";
import * as ax from "../../axiom/mod.ts";
import { $ } from "../../axiom/mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

type SyntheticLabel = "synthetic_label1";

export interface SyntheticGovernance {
  readonly labels: SyntheticLabel[];
}

export function label<TsValueType>(
  axiomSD: mod.AxiomSqlDomain<TsValueType, Any>,
  ...labels: SyntheticLabel[]
) {
  return mod.mutateGovernedASD<TsValueType, SyntheticGovernance, Any>(
    axiomSD,
    (existing) => ({ ...existing, labels }),
  );
}

export function isLabeled<TsValueType>(
  o: mod.AxiomSqlDomain<TsValueType, Any>,
  label: SyntheticLabel,
): o is mod.AxiomSqlDomain<TsValueType, Any> & {
  readonly governance: Pick<SyntheticGovernance, "labels">;
} {
  if (
    mod.isGovernedSqlDomain(
      o,
      safety.typeGuard<Pick<SyntheticGovernance, "labels">>("labels"),
    )
  ) {
    return o.governance.labels.find((l) => l == label) ? true : false;
  }
  return false;
}

Deno.test("type-safe data domains", async (tc) => {
  // use these for type-testing in IDE
  const syntheticDecl = {
    text: mod.text(),
    text_nullable: mod.textNullable(),
    text_custom: mod.text(ax.text($.string)),
    text_labeled_optional: label(mod.textNullable(), "synthetic_label1"),
    text_linted_optional: mod.lintedSqlDomain(
      mod.textNullable(),
      mod.domainLintIssue("synthetic lint issue"),
    ),
    int: mod.integer(),
    int_nullable: mod.integerNullable(),
    int_custom: mod.integer(ax.integer($.number)),
    bigint: mod.bigint(),
    bigint_nullable: mod.bigintNullable(),
    bigint_custom: mod.bigint(ax.bigint($.bigint)),
    json: mod.jsonText(),
    json_custom: mod.jsonText(ax.jsonText($.string)),
    json_nullable: mod.jsonTextNullable(),
    date: mod.date(),
    date_custom: mod.date(ax.date($.date)),
    date_nullable: mod.dateNullable(),
    date_time: mod.dateTime(),
    date_time_custom: mod.dateTime(ax.dateTime($.date)),
    date_time_nullable: mod.dateTimeNullable(),
    float: mod.float(),
    float_nullable: mod.floatNullable(),
    float_custom: mod.float(ax.float($.number)),

    // passing in Axiom without domain wrapper will be a "lint" error for
    // mod.sqlDomains but OK for Axiom
    non_domain: $.string.optional(),
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
      text_custom: "synthetic_custom",
      int: 0,
      int_custom: 1,
      bigint: 0n,
      bigint_custom: 1n,
      json: `{"synthetic": "yes"}`,
      json_custom: `{ "synthetic": "yes", "custom": true }`,
      date: new Date(),
      date_custom: new Date(),
      date_time: new Date(),
      date_time_custom: new Date(),
      float: 1.5,
      float_custom: 2.5,
      // bad: "hello"
    };
  });

  await tc.step("domain-wrapped axiom", async (tc) => {
    let lintIssuesCount = 0;
    const syntheticDomains = mod.sqlDomains(syntheticDecl, {
      onPropertyNotAxiomSqlDomain: (name) => {
        lintIssuesCount++;
        ta.assertEquals("non_domain", name);
      },
    });

    await tc.step("lint issues count", () => {
      ta.assertEquals(1, lintIssuesCount);
    });

    await tc.step("IDE experiments", () => {
      // hover over 'names' to see quasi-typed names
      const _sdNames = syntheticDomains.domains.map((d) => d.identity);
      const _sdSqlTypes = syntheticDomains.domains.map((d) => d.sqlDataType);
    });

    await tc.step("references (for foreign keys, etc.)", () => {
      const intDomain = syntheticDomains.domains.find((d) =>
        d.identity == "int"
      );
      ta.assert(intDomain);
      ta.assertEquals("int", intDomain.identity);
      const intRefASD = intDomain.referenceASD();
      ta.assert(intRefASD);
      const intRef = intDomain.reference();
      ta.assertEquals("int", intRef.identity);
      const intRefOther = intDomain.reference({ foreignIdentity: "intRef" });
      ta.assertEquals("intRef", intRefOther.identity);
    });

    await tc.step("linted", () => {
      const syntheticDomains = mod.sqlDomains(syntheticDecl);
      const linted = Array.from(mod.lintedSqlDomains(syntheticDomains.domains));
      ta.assertEquals(linted.length, 1);
      ta.assertEquals("text_linted_optional", linted[0].identity);
      ta.assertEquals(
        "synthetic lint issue",
        linted[0].lintIssues[0].lintIssue,
      );
    });

    await tc.step("governed (labeled)", () => {
      const syntheticDomains = mod.sqlDomains(syntheticDecl);
      const labeled = Array.from(
        mod.governedSqlDomains(syntheticDomains.domains, (test) => {
          return isLabeled(test, "synthetic_label1");
        }),
      );
      ta.assertEquals(1, labeled.length);
      ta.assertEquals("text_labeled_optional", labeled[0].identity);
    });

    // hover over 'SyntheticDomains' to see fully typed object
    type SyntheticDomains = ax.AxiomType<typeof syntheticDomains>;
    // try typing in bad properties or invalid types
    const synthetic: SyntheticDomains = {
      text: "synthetic",
      text_custom: "synthetic_custom",
      int: 0,
      int_custom: 1,
      bigint: 0n,
      bigint_custom: 1n,
      json: `{"synthetic": "yes"}`,
      json_custom: `{ "synthetic": "yes", "custom": true }`,
      date: new Date(),
      date_custom: new Date(),
      date_time: new Date(),
      date_time_custom: new Date(),
      float: 1.5,
      float_custom: 2.5,
      // bad: "hello"
    };

    const expectType = <T>(_value: T) => {
      // Do nothing, the TypeScript compiler handles this for us
    };

    // should see compile errors if any of these fail
    expectType<string>(synthetic.text);
    expectType<string>(synthetic.text_custom);
    expectType<string | undefined>(synthetic.text_labeled_optional);
    expectType<string | undefined>(synthetic.text_linted_optional);
    expectType<number>(synthetic.int);
    expectType<number>(synthetic.int_custom);
    expectType<bigint>(synthetic.bigint);
    expectType<bigint>(synthetic.bigint_custom);
    expectType<string>(synthetic.json);
    expectType<string>(synthetic.json_custom);
    expectType<Date>(synthetic.date);
    expectType<Date>(synthetic.date_custom);
    expectType<Date>(synthetic.date_time);
    expectType<Date>(synthetic.date_time_custom);
    expectType<number>(synthetic.float);
    expectType<number>(synthetic.float_custom);
  });
});
