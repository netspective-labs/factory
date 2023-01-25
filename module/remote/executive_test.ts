import { testingAsserts as ta } from "../deps-test.ts";
import * as whs from "../../text/whitespace.ts";
import * as extn from "../mod.ts";
import * as govn from "./governance.ts";
import * as mod from "./executive.ts";

export function jsModule(
  code: string,
  args?: govn.ForeignCodeExpectedArguments,
): govn.ForeignCodeSupplier {
  return {
    foreignCodeLanguage: "js",
    foreignCode: whs.unindentWhitespace(code),
    foreignCodeArgsExpected: args,
  };
}

export function flexibleModuleArgs(
  ...args: govn.ForeignCodeExpectedArgument[]
): govn.ForeignCodeExpectedArguments {
  const srScriptArgs: Record<string, govn.ForeignCodeExpectedArgument> = {};
  for (const arg of args) {
    srScriptArgs[arg.identity] = arg;
  }
  return srScriptArgs;
}

// inventory is used as-is by the server-side but used as a reference by client;
// for security purposes, the user agent ("UA" or "client") is allowed to see
// the scripts but if the script is passed into the server, the server ignores
// the script and uses what is in the catalog. By letting clients see the
export function testInventory(
  identity = "testInventory",
): govn.ServerRuntimeScriptInventory<govn.ServerRuntimeScript> {
  const scriptsIndex = new Map<string, govn.ServerRuntimeScript>();

  const fcIdentityPlaceholder = "[TBD]";
  const defaultScript: govn.ServerRuntimeScript = {
    name: "default.js.json",
    label: "Test to see if we see exposed result with arguments",
    foreignModule: jsModule(`
      export default ({ exposed, args }) => ({ exposed, argsMirror: { testParam1: args.get("testParam1") } })`),
    foreignCodeIdentity: fcIdentityPlaceholder,
  };

  const result: govn.ServerRuntimeScriptInventory<govn.ServerRuntimeScript> = {
    script: (identity: string) => {
      return scriptsIndex.get(identity);
    },
    scriptIdentities: () => scriptsIndex.keys(),
    libraries: [{
      name: "test",
      label: "Test",
      scripts: [
        defaultScript,
        {
          name: "memory.js.json",
          label: "Show server runtime (Deno) memory statistics",
          foreignModule: jsModule(
            `export default ({ args }) => Deno.memoryUsage();`,
            flexibleModuleArgs({
              identity: "testArg1",
              dataType: "string",
            }),
          ),
          foreignCodeIdentity: fcIdentityPlaceholder,
        },
      ],
      qualifiedName: fcIdentityPlaceholder,
    }],
  };

  const indexLibraries = (
    libraries: Iterable<govn.ServerRuntimeScriptLibrary>,
  ) => {
    const indexScript = (
      script: govn.ServerRuntimeScript,
      library: govn.ServerRuntimeScriptLibrary,
    ) => {
      if (script.foreignCodeIdentity == fcIdentityPlaceholder) {
        // special cast required since script.qualifiedName is read-only
        (script as { foreignCodeIdentity: string }).foreignCodeIdentity =
          `${identity}_${library.name}_${script.name}`;
      }
      scriptsIndex.set(script.foreignCodeIdentity, script);
    };

    for (const library of libraries) {
      if (library.qualifiedName == fcIdentityPlaceholder) {
        // special cast required since library.qualifiedName is read-only
        (library as { qualifiedName: string }).qualifiedName = library.name;
      }
      for (const script of library.scripts) {
        indexScript(script, library);
      }
    }
  };

  indexLibraries(result.libraries);
  return result;
}

Deno.test("server runtime foreign code execution", async (tc) => {
  const inventory = testInventory();
  const extensions = new extn.CachedExtensions();

  ta.assert(inventory);
  ta.assert(extensions);

  await tc.step("default script with arguments", async () => {
    const foreignCodeExecArgs = new URLSearchParams();
    foreignCodeExecArgs.set("testParam1", "testParam1Value");
    const result = await mod.executeForeignCode({
      extensions,
      inventory,
      payload: {
        foreignCodeIdentity: "testInventory_test_default.js.json",
        foreignCodeExecArgs,
      },
      callModuleDefaultFn: (fn) => {
        return fn({ exposed: "test-exposed-text", args: foreignCodeExecArgs });
      },
    });
    ta.assert(result);
    ta.assertEquals("object", typeof result);
    // deno-lint-ignore no-explicit-any
    const value = result.value as Record<string, any>;
    ta.assert(result.value);
    ta.assertEquals("test-exposed-text", value.exposed);
    ta.assertEquals("testParam1Value", value.argsMirror.testParam1);
  });
});
