import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./axiom.ts";
import { $ } from "./axiom.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

Deno.test("TODO: type-safe data structures IDE experiments", () => {
  // ESSENTIAL TODO:
  // ****************************************
  // for some reason, running this test makes the "type-safe data structures at build-time and runtime-testable" FAIL
  // ****************************************
  // use these for type-testing in IDE
  // const $publHost = $.object({
  //   host: $.string,
  //   mutation_count: $.number,
  //   host_identity: $.string.optional(),
  // });
  // // hover over 'names' to see quasi-typed names
  // const _names = $publHost.axiomObjectDeclPropNames;
  // // uncomment the following to see the IDE picking up type mismatch error for `p`
  // //const _badNameFound = $publHost.objectPropertyNames.find(p => p === "hostx");

  // // hover over 'PublHost' to see fully typed object
  // type PublHost = mod.AxiomType<typeof $publHost>;
  // // try typing in bad properties or invalid types
  // const _publHost: PublHost = {
  //   host: "test",
  //   mutation_count: 0,
  //   // bad: "hello"
  // };
});

Deno.test("type-safe data structures at build-time and runtime-testable", async (tc) => {
  const basicCases: Record<string, [mod.Axiom<Any>, Any[], Any[]]> = {
    any: [$.any, [1, "", {}, null, undefined], []],
    array: [$.array(), [[], [1], ["", 1], [{}]], []],
    arrayTyped: [$.array($.string), [[], [""], ["", "test"]], [
      [1],
      ["", 1],
      undefined,
    ]],
    bigint: [$.bigint, [1n, new Object(1n)], [1, "", undefined]],
    boolean: [$.boolean, [true, false, new Object(true), new Object(false)], [
      1,
      0,
      "",
      null,
      undefined,
      {},
    ]],
    custom: [$.custom((value): value is string => typeof value === "string"), [
      "",
    ], [1, undefined]],
    date: [$.date, [new Date()], []],
    enum: [$.enum("a", "b"), ["a", "b"], ["c", 1, undefined]],
    function: [$.function, [() => true, function () {}, class Foo {}], [
      1,
      {},
      undefined,
    ]],
    instance: [$.instance(RegExp), [/./], ["/./", new Object(), undefined]],
    intersection: [
      $.intersection($.object({ foo: $.string }), $.object({ bar: $.number })),
      [
        { bar: 1, foo: "" },
        { bar: 1, baz: true, foo: "" },
      ],
      [{ bar: 1 }, { foo: "" }, 1, {}, undefined],
    ],
    null: [$.null, [null], [undefined, 1, {}]],
    number: [$.number, [1, new Object(2)], ["", undefined]],
    object: [
      $.object({ bar: $.number, foo: $.string }),
      [
        { bar: 1, foo: "" },
        { bar: 1, baz: true, foo: "" },
      ],
      [{ bar: 1 }, { foo: "" }, 1, {}, undefined],
    ],
    record: [$.record(), [{}, { foo: "" }, { bar: true, foo: 1 }], [
      1,
      null,
      undefined,
    ]],
    recordTyped: [
      $.record($.string),
      [{}, { foo: "" }, { bar: "", foo: "" }],
      [{ foo: 1 }, { bar: 1, foo: "" }, 1, null, undefined],
    ],
    string: [$.string, ["", new Object("")], [1, undefined]],
    symbol: [$.symbol, [Symbol()], [1, {}, null, undefined]],
    tuple: [$.tuple($.string, $.number), [["", 1]], [
      ["", 1, true],
      [],
      [1, ""],
      [""],
      [undefined, 1],
    ]],
    undefined: [$.undefined, [undefined], [null, 1, {}]],
    union: [$.union($.string, $.number), ["", 1], [true, {}, null, undefined]],
    unknown: [$.unknown, [1, "", {}, null, undefined], []],
  };

  const preparedSteps: {
    title: string;
    test: (t: Deno.TestContext) => void | Promise<void>;
  }[] = [];
  Object.entries(basicCases).forEach(([title, [schema, pass, fail]]) => {
    preparedSteps.push({
      title,
      test: () => {
        pass.forEach((value) => ta.assert(schema.test(value)));
        pass.forEach((value) => ta.assertEquals(schema.parse(value), value));
        fail.forEach((value) => ta.assert(!schema.test(value)));
        fail.forEach((value) => {
          ta.assertThrows(
            () => schema.parse(value),
            Error,
            "Unexpected type at $",
          );
        });
      },
    });
  });

  const partialCases: [string, mod.AxiomObject<Any, Any, Any>][] = [
    ["object", $.object({ a: $.string }, $.string)],
    ["record", $.record($.string)],
  ];

  partialCases.forEach(([name, $object]) => {
    preparedSteps.push({
      title: `${name} partial`,
      test: () => {
        ta.assert($object.test({ a: "", b: "" }));
        ta.assert(!$object.test({ a: undefined }));
        ta.assert(!$object.test({ a: "", b: undefined }));
        ta.assert(!$object.test({ a: undefined, b: undefined }));

        const $partialObject = $object.partial();
        ta.assert($partialObject.test({ a: "", b: "" }));
        ta.assert($partialObject.test({ a: undefined }));
        ta.assert($partialObject.test({ a: "", b: undefined }));
        ta.assert($partialObject.test({ a: undefined, b: undefined }));
        ta.assert($partialObject.test({ a: undefined, b: undefined, c: "" }));
      },
    });
  });

  for await (const step of preparedSteps) {
    await tc.step(step.title, step.test);
  }

  await tc.step("optional", () => {
    ta.assert(!$.string.test(undefined));
    ta.assert($.string.optional().test(undefined));
    ta.assertEquals($.string.optional(), $.string.optional());

    const so = $.string.optional();
    ta.assert(mod.isAxiomOptional(so));
  });

  await tc.step("object index", () => {
    const $object = $.object({ foo: $.string }, $.number);
    ta.assert($object.test({ foo: "" }));
    ta.assert($object.test({ bar: 1, foo: "" }));
    ta.assert(!$object.test({ bar: "", foo: "" }));
  });

  await tc.step("object property reflection", () => {
    const $object = $.object({ foo: $.string });
    ta.assertEquals($object.axiomObjectDeclPropNames.length, 1);
    const $foo = $object.axiomObjectDecl.foo;
    ta.assert(mod.isAxiomObjectProperty($foo));
    ta.assertEquals("foo", $foo.axiomObjectPropertyName);
  });

  await tc.step("error", () => {
    const $object = $.object({
      "foo bar 😄": $.array($.object({ baz: $.string })),
    });
    const value = { "foo bar 😄": [{ baz: 1 }] };

    let onInvalidCalled = 0;
    let onInvalidCalledWith: string | undefined;

    ta.assert(
      !$object.test(value, {
        onInvalid: (reason: string) => {
          onInvalidCalled++;
          onInvalidCalledWith = reason;
        },
      }),
    );
    ta.assertEquals(onInvalidCalled, 1);
    ta.assertEquals(
      onInvalidCalledWith,
      'Unexpected type at $["foo bar 😄"][0].baz',
    );
    ta.assertThrows(
      () => $object.parse(value),
      Error,
      'Unexpected type at $["foo bar 😄"][0].baz',
    );
  });
});
