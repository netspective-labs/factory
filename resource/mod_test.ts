import { testingAsserts as ta } from "./deps-test.ts";
import * as extn from "../module/mod.ts";
import * as git from "../git/mod.ts";
import * as k from "../knowledge/mod.ts";
import * as ws from "../text/whitespace.ts";
import * as c from "./content/mod.ts";
import * as coll from "./collection/mod.ts";
import * as fm from "./frontmatter/mod.ts";
import * as r from "../route/mod.ts";
import * as md from "./markdown/mod.ts";
import * as ds from "./design-system/essential/mod.ts";

import "./html/mod.ts"; // ./html/mod_test.ts exists but just do an import test
import "./markdown/mod.ts"; // ./markdown/mod_test.ts exists but just do an import test

// TODO: test these, for now, we're just importing for type-check occurs
import "./bundle.ts";
import "./delimited-text.ts";
import "./json.ts";
import "./module.ts";
import "./sql.ts";
import "./text.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

Deno.test(`Single resource HTML producer`, async (tc) => {
  const routeFactory = new r.TypicalRouteFactory(
    r.defaultRouteLocationResolver(),
    r.defaultRouteWorkspaceEditorResolver(() => undefined),
  );

  const syntheticMarkdownNoDecoration = ws.unindentWhitespace(`
    ---
    folksonomy: [a, b, c]
    custom: value
    layout: essentialDS/no-decoration
    route:
      unit: home
      label: Home
      isRootUnit: true
    ---
    Test of content transformation with server-side-rendered HTML from Markdown.`);

  const mdRS = new md.MarkdownRenderStrategy(new md.MarkdownLayouts());
  const renderer =
    mdRS.layoutStrategies.defaultLayoutStrategySupplier.layoutStrategy;

  const twDS = new ds.TailwindDesignSystem(
    new extn.CachedExtensions(),
    `/universal-cc`,
  );

  await tc.step("discrete calls", async () => {
    // content from static Markdown text rendered using layout inferred from
    // frontmatter but we call each function discretely, one by one
    const mdSrc = md.constructStaticMarkdownTextResource({
      markdownText: syntheticMarkdownNoDecoration,
      route: routeFactory.route({ label: "synthetic", unit: "synthetic" }),
      diagnostics: (error, msg) => `${msg}: ${error}`,
    });

    // mutate the frontmatter discretely
    fm.prepareFrontmatterSync(fm.yamlTomlMarkdownFrontmatterRE)(mdSrc);

    // render the markdown to HTML discretely
    const markdown = await renderer.rendered(mdSrc);
    ta.assertEquals(mdSrc.frontmatter, {
      folksonomy: ["a", "b", "c"],
      custom: "value",
      layout: "essentialDS/no-decoration",
      route: { unit: "home", label: "Home", isRootUnit: true },
    });

    // the frontmatter should have parsed new route
    ta.assertEquals(mdSrc.route.terminal?.qualifiedPath, "/home");
    ta.assertEquals(mdSrc.route.terminal?.label, "Home");
    ta.assertEquals(mdSrc.route.terminal?.unit, "home");

    // discretely determine the layout strategy from the frontmatter
    const ils = twDS.inferredLayoutStrategy(mdSrc);

    // use the inferred layout strategy to render the markdown HTML as the body
    // of a design-system page layout
    const produced = await ils.layoutStrategy.rendered(
      twDS.layout(markdown, ils, twDS.contentStrategy),
    );
    ta.assertEquals(
      await c.flexibleText(produced.html, "?"),
      ws.unindentWhitespace(`
          <div class="md"><p>Test of content transformation with server-side-rendered HTML from Markdown.</p>
          </div>`),
    );
  });

  await tc.step("direct construction, refinery pipe", async () => {
    // content from static Markdown text rendered using layout inferred from
    // frontmatter but we bundle all the calls in a set of refinery pipe units
    const mdSrc = md.constructStaticMarkdownTextResource({
      markdownText: syntheticMarkdownNoDecoration,
      route: routeFactory.route({ label: "synthetic", unit: "synthetic" }),
      diagnostics: (error, msg) => `${msg}: ${error}`,
    });

    const pipe = coll.pipelineUnitsRefinery<Any>(
      fm.prepareFrontmatter(fm.yamlTomlMarkdownFrontmatterRE),
      mdRS.renderer(),
      twDS.pageRenderer(twDS.contentStrategy),
    );

    const produced = await pipe(mdSrc);

    ta.assertEquals(produced.frontmatter, {
      folksonomy: ["a", "b", "c"],
      custom: "value",
      layout: "essentialDS/no-decoration",
      route: { unit: "home", label: "Home", isRootUnit: true },
    });

    // the frontmatter should have parsed new route
    ta.assertEquals(mdSrc.route.terminal?.qualifiedPath, "/home");
    ta.assertEquals(mdSrc.route.terminal?.label, "Home");
    ta.assertEquals(mdSrc.route.terminal?.unit, "home");

    ta.assertEquals(
      await c.flexibleText(produced.html, "?"),
      ws.unindentWhitespace(`
          <div class="md"><p>Test of content transformation with server-side-rendered HTML from Markdown.</p>
          </div>`),
    );
  });
});

Deno.test(`Multiple resources HTML producers`, async () => {
  const twDS = new ds.TailwindDesignSystem(
    new extn.CachedExtensions(),
    `/universal-cc`,
  );
  const lss = twDS.layoutStrategies.defaultLayoutStrategySupplier;
  const ls = lss.layoutStrategy;
  const resource: c.TextSyncSupplier = {
    textSync: "Test of content transformation to HTML layout",
  };
  // ***** TODO ****
  // ***** REPLACE surface in context ****
  const rf = new r.TypicalRouteFactory(
    r.defaultRouteLocationResolver(),
    r.defaultRouteWorkspaceEditorResolver(() => undefined),
  );
  const routeTree = new r.TypicalRouteTree(rf);
  const layoutText = new ds.EssentialDesignSystemText();
  const navigation = new ds.EssentialDesignSystemNavigation(true, routeTree);
  const assets = twDS.assets();
  const contentStrategy: ds.EssentialDesignSystemContentStrategy = {
    layoutText,
    navigation,
    assets,
    renderedAt: new Date(),
    mGitResolvers: {
      ...git.typicalGitWorkTreeAssetUrlResolvers(),
      remoteCommit: (commit, paths) => ({
        commit,
        remoteURL: "??",
        paths,
      }),
      workTreeAsset: git.typicalGitWorkTreeAssetResolver,
      changelogReportAnchorHref: () => "/activity-log/git-changelog/",
      cicdBuildStatusHTML: () => `TODO`,
    },
    routeGitRemoteResolver: (route, gitBranchOrTag, paths) => {
      return {
        assetPathRelToWorkTree: route.terminal?.qualifiedPath || "??",
        href: route.terminal?.qualifiedPath || "??",
        textContent: route.terminal?.qualifiedPath || "??",
        paths,
        gitBranchOrTag,
      };
    },
    wsEditorResolver: () => undefined,
    wsEditorRouteResolver: () => undefined,
    termsManager: new k.TypicalTermsManager(),
    operationalCtxClientCargo: {
      acquireFromURL: "/operational-context/index.json",
      assetsBaseAbsURL: "/operational-context",
    },
  };
  const syncResult = ls.renderedSync(
    twDS.layout(resource, lss, contentStrategy),
  );
  ta.assert(c.isHtmlSupplier(syncResult));
  // console.dir(c.flexibleTextSync(syncResult.html, "?"));
  // TODO:
  // ta.assertEquals(
  //   content.flexibleTextSync(syncResult, "error"),
  //   "Test of content transformation to HTML layout",
  // );
  // ***** TODO ****
  // ***** REPLACE surface in context ****
  const asyncResult = await ls.rendered(
    twDS.layout(resource, lss, contentStrategy),
  );
  ta.assert(c.isHtmlSupplier(asyncResult));
  // console.dir(await c.flexibleText(syncResult.html, "?"));
  // TODO:
  // ta.assertEquals(
  //   await content.flexibleText(asyncResult, "error"),
  //   "__transform__ test with frontmatter",
  // );
  // ta.assertEquals(asyncResult.frontmatter, { first: "value", second: 40 });
});
