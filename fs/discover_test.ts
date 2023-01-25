import { path } from "./deps.ts";
import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./discover.ts";

const isCICD = Deno.env.get("CI") ? true : false;

Deno.test("discover path in ancestors", async () => {
  const moduleAbsPath = path.fromFileUrl(import.meta.url);
  const factoryCanonical = path.resolve(moduleAbsPath, "..", "..");
  // when running in GitHub actions, the root of the repo is factory/factory
  // not netspective-labs/factory
  const result = await mod.discoverGlob(
    isCICD ? "**/factory/factory" : "**/netspective-labs/factory",
    path.dirname(path.fromFileUrl(import.meta.url)),
  );
  ta.assert(result);
  ta.assert(result.found);
  ta.assert(result.found.isDirectory);
  ta.assertEquals(result.found.name, "factory");
  ta.assertEquals(result.found.path, factoryCanonical);

  const relPath = result.found.pathRelative(moduleAbsPath);
  ta.assertEquals(
    path.resolve(moduleAbsPath, relPath, "lib", "fs", "discover_test.ts"),
    path.join(result.found.path, "lib", "fs", "discover_test.ts"),
  );
});

Deno.test("discover path in siblings", async () => {
  const moduleAbsPath = path.fromFileUrl(import.meta.url);
  const modelsCanonical = path.resolve(
    path.dirname(moduleAbsPath),
    "..",
    "sql",
    "models",
  );
  const result = await mod.discoverGlob(
    "**/sql/models",
    path.dirname(path.fromFileUrl(import.meta.url)),
  );
  ta.assert(result);
  ta.assert(result.found);
  ta.assert(result.found.isDirectory);
  ta.assertEquals(result.found.name, "models");
  ta.assertEquals(result.found.path, modelsCanonical);

  const relPath = result.found.pathRelative(moduleAbsPath);
  ta.assertEquals(
    path.resolve(moduleAbsPath, relPath, "lib", "fs", "discover_test.ts"),
    path.join(result.found.path, "lib", "fs", "discover_test.ts"),
  );
});
