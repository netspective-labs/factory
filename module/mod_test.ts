import { path } from "./deps.ts";
import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./graph.ts";

const locate = (relative: string) => {
  const thisAbsPath = path.dirname(path.fromFileUrl(import.meta.url));
  return path.join(path.relative(Deno.cwd(), thisAbsPath), relative);
};

// deno-lint-ignore require-await
const errorHandler = async (error: Error): Promise<undefined> => {
  console.error(error);
  return undefined;
};

Deno.test("deno info module graph", async () => {
  const graph = await mod.moduleGraphs.moduleGraph(
    locate("./extension.ts"),
    errorHandler,
  );
  ta.assert(graph);
});

Deno.test("deno info module dependencies (include root specifier)", async () => {
  const deps = await mod.moduleGraphs.localDependencies(
    locate("./extension.ts"),
    true,
    errorHandler,
  );
  ta.assert(deps);
  ta.assert(deps.length == 2);
});

Deno.test("deno info module dependencies (exclude root specifier)", async () => {
  const deps = await mod.moduleGraphs.localDependencies(
    locate("./extension.ts"),
    false,
    errorHandler,
  );
  ta.assert(deps);
  ta.assert(deps.length == 1);
  ta.assert(deps[0].local == path.resolve(locate("./governance.ts")));
});

Deno.test("deno info module dependencies with Deno.FileInfo", async () => {
  const deps = await mod.moduleGraphs.localDependenciesFileInfos(
    locate("./extension.ts"),
    false,
    errorHandler,
  );
  ta.assert(deps);
  ta.assert(deps.length == 1);
  ta.assert(deps[0].local == path.resolve(locate("./governance.ts")));
  ta.assert(deps[0].localFileInfo);
});
