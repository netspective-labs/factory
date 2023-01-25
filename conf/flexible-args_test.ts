import * as ta from "https://deno.land/std@0.147.0/testing/asserts.ts";
import * as mod from "./flexible-args.ts";

const syntheticScalarHook = "synthetic";
const syntheticArrayHook = ["synthetic"];
const syntheticObjectHook = { synthetic: "yes" };
function syntheticFunctionHook() {}
class SyntheticClassHook {}

Deno.test(`js-eval`, async (ctx) => {
  await ctx.step("jsTokenEvalResult (invalid)", () => {
    let goodValues = 0;
    let badValues = 0;
    mod.jsTokenEvalResult(
      "alert('potential attack foiled!'))",
      eval, // scope doesn't matter
      () => goodValues++,
      () => {
        badValues++;
      },
    );
    mod.jsTokenEvalResult(
      "badFunction",
      eval, // scope doesn't matter
      () => goodValues++,
      undefined,
      (_error) => {
        badValues++;
      },
    );
    ta.assertEquals(goodValues, 0);
    ta.assertEquals(badValues, 2);
  });

  const evalInCurrentScope = (token: string) => eval(token);

  await ctx.step("jsTokenEvalResult (class)", () => {
    const synthetic = mod.jsTokenEvalResult(
      "SyntheticClassHook",
      evalInCurrentScope,
    );
    ta.assertStrictEquals(synthetic, SyntheticClassHook);
  });

  await ctx.step("jsTokenEvalResult (function)", () => {
    const synthetic = mod.jsTokenEvalResult(
      "syntheticFunctionHook",
      evalInCurrentScope,
    );
    ta.assertStrictEquals(synthetic, syntheticFunctionHook);
  });

  await ctx.step("jsTokenEvalResult (values)", () => {
    let synthetic = mod.jsTokenEvalResult(
      "syntheticScalarHook",
      evalInCurrentScope,
    );
    ta.assertStrictEquals(synthetic, syntheticScalarHook);
    synthetic = mod.jsTokenEvalResult("syntheticArrayHook", evalInCurrentScope);
    ta.assertStrictEquals(synthetic, syntheticArrayHook);
    synthetic = mod.jsTokenEvalResult(
      "syntheticObjectHook",
      evalInCurrentScope,
    );
    ta.assertStrictEquals(synthetic, syntheticObjectHook);
  });
});

Deno.test(`flexible-args`, async (ctx) => {
  await ctx.step("flexibleArgs with no supplied args and rules object", () => {
    const result = mod.flexibleArgs<{ test: string }>({}, {
      defaultArgs: { test: "value" },
    });
    ta.assert(result);
    ta.assert(typeof result === "object");
    ta.assert(result.args.test, "value");
    ta.assert(typeof result?.rules?.defaultArgs == "object");
    ta.assert(result.rules.defaultArgs.test, "value");
  });

  await ctx.step("flexibleArgs with supplied args and rules function", () => {
    const result = mod.flexibleArgs<
      { optional?: string; required: string }
    >(
      { optional: "value" },
      () => ({ defaultArgs: { required: "value" } }),
    ); // rules can be a function
    ta.assertEquals(result.args.required, "value");
    ta.assertEquals(result.args.optional, "value");
  });

  await ctx.step(
    "flexibleArgs with supplied args hook function, rules hook function, and defaultArgs hook function",
    () => {
      const result = mod.flexibleArgs<{ test: string; another?: string }>(
        (defaults) => ({ ...defaults, another: "value" }), // if argsSupplier is a function, very important that ...defaults is spread
        () => ({
          defaultArgs: () => ({ test: "value" }),
        }),
      ); // rules can be a function, and so can defaultArgs
      ta.assert(result.args.test == "value"); // from defaultArgs
      ta.assert(result.args.another == "value"); // from argsSupplier
    },
  );
});
