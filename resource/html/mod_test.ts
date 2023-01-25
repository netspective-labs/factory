import { testingAsserts as ta } from "./deps-test.ts";
import { path } from "../deps.ts";
import * as extn from "../../module/mod.ts";
import * as fsrp from "../../route/fs-route-parse.ts";
import * as c from "../content/mod.ts";
import * as r from "../../route/mod.ts";
import * as mod from "./mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

// TODO: need to add test cases for Design System

Deno.test(`acquire HTML with frontmatter from local file`, async (tc) => {
  const em = new extn.CachedExtensions();

  const fsRouteFactory = new r.FileSysRouteFactory(
    r.defaultRouteLocationResolver(),
    r.defaultRouteWorkspaceEditorResolver(() => undefined),
  );

  const fsRouteOptions: r.FileSysRouteOptions = {
    fsRouteFactory,
    routeParser: fsrp.humanFriendlyFileSysRouteParser,
    extensionsManager: em,
  };

  const testFsRoute = async (absPath: string) =>
    await fsRouteFactory.fsRoute(
      absPath,
      path.fromFileUrl(import.meta.resolve("./test")),
      fsRouteOptions,
    );

  const fsehrOriginator = mod.fsFileSuffixHtmlResourceOriginator(em);

  await tc.step("fs extension-based originator", async (tc) => {
    await tc.step("invalid extension", () => {
      const invalidHDO = fsehrOriginator("content.md");
      ta.assert(invalidHDO == undefined);
    });

    await tc.step("static HTML resource originator", async () => {
      const srcHtmlFile = path.fromFileUrl(
        import.meta.resolve("./test/fixtures/client-side-markdown.html"),
      );
      const staticHDO = fsehrOriginator(srcHtmlFile);
      ta.assert(staticHDO);
      ta.assert(staticHDO.construct);
      ta.assert(staticHDO.refine); // by default we parse and mutate frontmatter
      const resource = await staticHDO?.construct({
        fsPath: srcHtmlFile,
        route: await testFsRoute(srcHtmlFile),
        diagnostics: (error, msg) => `${msg}: ${error}`,
      });
      ta.assertEquals(resource.nature.mediaType, "text/html");
    });
  });

  await tc.step(
    "pipelined content from file extension originator",
    async () => {
      const srcHtmlFile = path.fromFileUrl(
        import.meta.resolve("./test/fixtures/client-side-markdown.html"),
      );
      const factory = fsehrOriginator(srcHtmlFile);
      ta.assert(factory);

      const produced = await factory.instance({
        fsPath: srcHtmlFile,
        route: await testFsRoute(srcHtmlFile),
        diagnostics: (error, msg) => `${msg}: ${error}`,
      }, fsRouteOptions);

      ta.assertEquals(produced.frontmatter, {
        route: { unit: "client-side-markdown", label: "Client Side Markdown" },
      });

      // the "produced" HTML is basically the same as the original minus frontmatter
      ta.assert(c.isHtmlSupplier(produced));
      ta.assertEquals(
        await c.flexibleText(produced.html, "?"),
        Deno.readTextFileSync(
          path.fromFileUrl(
            import.meta.resolve("./test/golden/client-side-markdown.html"),
          ),
        ),
      );
    },
  );
});
