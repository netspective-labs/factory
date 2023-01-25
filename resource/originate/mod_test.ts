import { testingAsserts as ta } from "../deps-test.ts";
import { path } from "../deps.ts";
import * as extn from "../../module/mod.ts";
import * as fsrp from "../../route/fs-route-parse.ts";
import * as c from "../content/mod.ts";
import * as r from "../../route/mod.ts";
import * as md from "../markdown/mod.ts";
import * as mod from "./mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

Deno.test(`single instance resource factory`, async (tc) => {
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

  const tfseOriginators = mod.typicalfsFileSuffixOriginators(fsRouteOptions);

  await tc.step(
    "fs file extension (suffix-based) Markdown originators",
    async (tc) => {
      const testFsRoute = async (absPath: string) =>
        await fsRouteFactory.fsRoute(
          absPath,
          path.fromFileUrl(import.meta.resolve("../markdown/test")),
          fsRouteOptions,
        );

      await tc.step("invalid extension", () => {
        const invalidO = tfseOriginators.originator("markdown.docx");
        ta.assert(invalidO == undefined);
      });

      await tc.step("static Markdown resource originator", async () => {
        const srcMdFile = path.fromFileUrl(
          import.meta.resolve("../markdown/test/fixtures/markdownit.md"),
        );
        const staticMDO = tfseOriginators.originator(srcMdFile);
        ta.assert(staticMDO);
        ta.assert(staticMDO.factory);
        const resource = await tfseOriginators.instance<md.MarkdownResource>({
          fsPath: srcMdFile,
          route: await testFsRoute(srcMdFile),
        }, fsRouteOptions);
        ta.assert(resource);
        ta.assertEquals(resource.nature.mediaType, "text/markdown");
        ta.assert(c.isHtmlSupplier(resource));
        ta.assertEquals(
          await c.flexibleText(resource.html, "?"),
          Deno.readTextFileSync(
            path.fromFileUrl(
              import.meta.resolve("../markdown/test/golden/markdownit.md.html"),
            ),
          ),
        );
      });

      await tc.step("Markdown module resource originator", async () => {
        const srcMdFile = path.fromFileUrl(
          import.meta.resolve("../markdown/test/fixtures/dynamic.md.ts"),
        );
        const moduleMDO = tfseOriginators.originator(srcMdFile);
        ta.assert(moduleMDO);
        ta.assert(moduleMDO.factory);
        const resource = await tfseOriginators.instance<md.MarkdownResource>({
          fsPath: srcMdFile,
          route: await testFsRoute(srcMdFile),
          diagnostics: (error, msg) => `${msg}: ${error}`,
        }, fsRouteOptions);
        ta.assert(resource);
        ta.assertEquals(resource.nature.mediaType, "text/markdown");
        ta.assertEquals(resource.frontmatter, { title: "Dynamic Markdown" });
        ta.assert(c.isHtmlSupplier(resource));
        ta.assertEquals(
          await c.flexibleText(resource.html, "?"),
          Deno.readTextFileSync(
            path.fromFileUrl(
              import.meta.resolve("../markdown/test/golden/dynamic.md.ts.html"),
            ),
          ),
        );
      });
    },
  );

  await tc.step(
    "fs file extension (suffix-based) HTML originators",
    async (tc) => {
      const testFsRoute = async (absPath: string) =>
        await fsRouteFactory.fsRoute(
          absPath,
          path.fromFileUrl(import.meta.resolve("../html/test")),
          fsRouteOptions,
        );

      await tc.step("invalid extension", () => {
        const invalidO = tfseOriginators.originator("html.docx");
        ta.assert(invalidO == undefined);
      });

      await tc.step(
        "static HTML with frontmatter resource originator",
        async () => {
          const srcHtmlFile = path.fromFileUrl(
            import.meta.resolve(
              "../html/test/fixtures/client-side-markdown.html",
            ),
          );
          const staticMDO = tfseOriginators.originator(srcHtmlFile);
          ta.assert(staticMDO);
          ta.assert(staticMDO.factory);
          const resource = await tfseOriginators.instance<md.MarkdownResource>({
            fsPath: srcHtmlFile,
            route: await testFsRoute(srcHtmlFile),
          }, fsRouteOptions);
          ta.assert(resource);
          ta.assertEquals(resource.nature.mediaType, "text/html");
          ta.assert(c.isHtmlSupplier(resource));
          ta.assertEquals(
            await c.flexibleText(resource.html, "?"),
            Deno.readTextFileSync(
              path.fromFileUrl(
                import.meta.resolve(
                  "../html/test/golden/client-side-markdown.html",
                ),
              ),
            ),
          );
        },
      );
    },
  );
});

Deno.test(`multi-instance resource factory`, async (tc) => {
  const em = new extn.CachedExtensions();

  type WalkGlobExpectation = mod.FileSysWalkGlob & {
    readonly expected: <Resource>(instances: Resource[]) => Resource[];
    readonly expectedCount: number;
  };

  // the root is this file's parent directory
  const rootPath = path.dirname(
    path.dirname(path.fromFileUrl(import.meta.url)),
  );
  const globs: WalkGlobExpectation[] = [
    {
      ...mod.walkGlobbedFilesExcludeGit(rootPath, "markdown/**/fixtures/*.md"),
      expected: (instances) =>
        instances.filter((i) =>
          mod.isWalkGlobContextOriginationSupplier(i) &&
          path.dirname(i.origination.fsWalkCtx.entry.path).endsWith(
            "markdown/test/fixtures",
          ) && i.origination.fsWalkCtx.entry.name.endsWith(".md")
        ),
      expectedCount: 11,
    },
    {
      ...mod.walkGlobbedFilesExcludeGit(
        rootPath,
        "markdown/**/fixtures/*.md.ts",
      ),
      expected: (instances) =>
        instances.filter((i) =>
          mod.isWalkGlobContextOriginationSupplier(i) &&
          path.dirname(i.origination.fsWalkCtx.entry.path).endsWith(
            "markdown/test/fixtures",
          ) && i.origination.fsWalkCtx.entry.name.endsWith(".md.ts")
        ),
      expectedCount: 1,
    },
    {
      ...mod.walkGlobbedFilesExcludeGit(rootPath, "html/**/fixtures/*.html"),
      expected: (instances) =>
        instances.filter((i) =>
          mod.isWalkGlobContextOriginationSupplier(i) &&
          path.dirname(i.origination.fsWalkCtx.entry.path).endsWith(
            "html/test/fixtures",
          ) && i.origination.fsWalkCtx.entry.name.endsWith(".html")
        ),
      expectedCount: 3,
    },
  ];

  const fsRouteFactory = new r.FileSysRouteFactory(
    r.defaultRouteLocationResolver(),
    r.defaultRouteWorkspaceEditorResolver(() => undefined),
  );

  const fsRouteOptions: r.FileSysRouteOptions = {
    fsRouteFactory,
    routeParser: fsrp.humanFriendlyFileSysRouteParser,
    extensionsManager: em,
  };

  await tc.step(
    "default fs file extension (suffix-based) multi-resource originator",
    async (tc) => {
      const tfseOriginators = mod.typicalfsFileSuffixOriginators(
        fsRouteOptions,
      );
      const encountered = [];
      for await (const resource of tfseOriginators.instances(globs)) {
        encountered.push(resource);
      }
      for (const glob of globs) {
        const expected = glob.expected(encountered);
        await tc.step(
          `${glob.expectedCount} instances of ${glob.glob} in ${glob.rootPath}`,
          () => {
            ta.assertEquals(
              expected.length,
              glob.expectedCount,
              `expected ${glob.expectedCount} instances of ${glob.glob} in ${glob.rootPath}, found ${expected.length} instead`,
            );
          },
        );
      }
    },
  );

  await tc.step(
    "custom fs file extension (suffix-based) multi-resource originator",
    async (tc) => {
      const originated: {
        resource: unknown;
        fsPath: string;
        walkCtx?: mod.FilePathWalkContext;
      }[] = [];
      const originationErrors: {
        error: mod.OriginationError;
        fsPath: string;
        walkCtx?: mod.FilePathWalkContext;
      }[] = [];
      const encountered: unknown[] = [];

      const tfseOriginators = mod.typicalfsFileSuffixOriginators(
        fsRouteOptions,
        {
          // deno-lint-ignore require-await
          onOriginated: async (resource, fsPath, walkCtx) => {
            originated.push({ resource, fsPath, walkCtx });
          },
          // deno-lint-ignore require-await
          onOriginationError: async (fsPath, error, walkCtx) => {
            originationErrors.push({ error, fsPath, walkCtx });
          },
        },
      );

      for await (
        const resource of tfseOriginators.instances(globs)
      ) {
        ta.assert(c.isNatureSupplier(resource));
        ta.assert(c.isMediaTypeNature(resource.nature));
        encountered.push(resource);
      }
      ta.assert(encountered.length);
      ta.assertEquals(originated.length, encountered.length);
      ta.assertEquals(originationErrors.length, 0);

      for (const glob of globs) {
        const expected = glob.expected(encountered);
        await tc.step(
          `${glob.expectedCount} instances of ${glob.glob} in ${glob.rootPath}`,
          () => {
            ta.assertEquals(
              expected.length,
              glob.expectedCount,
              `expected ${glob.expectedCount} instances of ${glob.glob} in ${glob.rootPath}, found ${expected.length} instead`,
            );
          },
        );
      }
    },
  );
});
