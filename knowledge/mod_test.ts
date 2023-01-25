import { testingAsserts as ta, yaml } from "./deps-test.ts";
import * as mod from "./mod.ts";

const fmSingle = `folksonomy: untyped-tag-1
taxonomy: typed-tag-1
`;

const fmArray = `folksonomy:
  - untyped-tag-1
  - [untyped-tag-2-value, Untyped Tag 2 Label (No Namespace)]
  - [untyped-tag-3-value, Untyped Tag 3 Label, namespace]
  - term: untyped-tag-4-value
    label: Untyped Tag 4 Label
    namespace: namespace
taxonomy:
  - typed-tag-1
  - [typed-tag-2-value, "Typed Tag 2 Label"]
  - [typed-tag-3-value, "Typed Tag 3 Label", typed-tag-3-namespace]
  - term: untyped-tag-4-value
    label: Untyped Tag 4 Label
    namespace: namespace
`;

const tm = new mod.TypicalTermsManager();

Deno.test(`YAML Knowledge Representation (single)`, () => {
  const testSingle = yaml.parse(fmSingle) as Record<string, unknown>;
  ta.assert(tm.isFolksonomy(testSingle.folksonomy));
  ta.assert(tm.isTerm(testSingle.folksonomy));
  ta.assert(typeof testSingle.folksonomy === "string");
  ta.assertEquals(testSingle.folksonomy, "untyped-tag-1");

  ta.assert(tm.isTaxonomy(testSingle.taxonomy));
  ta.assert(tm.isTerm(testSingle.taxonomy));
  ta.assert(typeof testSingle.taxonomy === "string");
  ta.assertEquals(testSingle.taxonomy, "typed-tag-1");
});

Deno.test(`YAML Knowledge Representation (array)`, () => {
  const testArray = yaml.parse(fmArray) as Record<string, unknown>;
  ta.assert(tm.isFolksonomy(testArray.folksonomy));
  ta.assert(Array.isArray(testArray.folksonomy));
  ta.assertEquals(testArray.folksonomy.length, 4);
  ta.assertEquals(testArray.folksonomy[0], "untyped-tag-1");

  ta.assert(tm.isTaxonomy(testArray.taxonomy));
  ta.assert(Array.isArray(testArray.taxonomy));
  ta.assertEquals(testArray.taxonomy.length, 4);
  ta.assertEquals(testArray.taxonomy[0], "typed-tag-1");
});
