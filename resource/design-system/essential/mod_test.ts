import { testingAsserts as ta } from "../../deps-test.ts";
import { path } from "../../deps.ts";
import * as extn from "../../../module/mod.ts";
import * as ws from "../../../text/whitespace.ts";
import * as c from "../../content/mod.ts";
import * as ua from "../../design-system/universal/assets.ts";
import * as html from "../../html/mod.ts";
import * as mod from "./mod.ts";

type Resource = c.TextSyncSupplier;

Deno.test(`TailwindDesignSystem layouts`, async (tc) => {
  const twDS = new mod.TailwindDesignSystem(
    new extn.CachedExtensions(),
    ua.universalAssetsBaseURL,
  );

  await tc.step("named layouts", () => {
    ta.assertEquals(Array.from(twDS.layoutStrategies.layouts.keys()), [
      "ds/page/no-decoration",
      "essentialDS/prime", // alias for essentialDS/smart, the "default" layout
      "essentialDS/home",
      "essentialDS/inner-index",
      "essentialDS/inner-index-auto",
      "essentialDS/smart",
      "essentialDS/no-decoration",
      "essentialDS//no-layout",
    ]);
  });

  await tc.step("named layouts same as type-safe consts", () => {
    ta.assert(
      twDS.layoutStrategies.layouts.get("ds/page/no-decoration") ===
        html.designSystemNoDecorationPage,
    );
    ta.assert(
      twDS.layoutStrategies.layouts.get("essentialDS/no-decoration") ===
        mod.noDecorationPage,
    );
    ta.assert(
      twDS.layoutStrategies.layouts.get("essentialDS/smart") ===
        mod.smartNavigationPage,
    );
    ta.assert(
      twDS.layoutStrategies.defaultLayoutStrategySupplier.layoutStrategy ===
        mod.defaultPage,
    );
  });
});

Deno.test(`TailwindDesignSystem rendering with no HTML decoration`, async () => {
  const twDS = new mod.TailwindDesignSystem(
    new extn.CachedExtensions(),
    ua.universalAssetsBaseURL,
  );
  const resource: Resource = {
    textSync: "Test of content transformation to HTML layout",
  };
  // typically a layout strategy allows dynamic layout selection but in our test
  // case we're "hardcoding" it
  const lss: html.HtmlLayoutStrategySupplier<mod.EssentialLayout> = {
    layoutStrategy: mod.noDecorationPage,
  };
  const syncResult = lss.layoutStrategy.renderedSync(
    twDS.layout(resource, lss, twDS.contentStrategy),
  );
  ta.assert(c.isHtmlSupplier(syncResult));
  ta.assertEquals(
    c.flexibleTextSync(syncResult.html, "error"),
    resource.textSync,
  );

  const asyncResult = await lss.layoutStrategy.rendered(
    twDS.layout(resource, lss, twDS.contentStrategy),
  );
  ta.assert(c.isHtmlSupplier(asyncResult));
  ta.assertEquals(
    await c.flexibleText(asyncResult.html, "error"),
    resource.textSync,
  );
});

// deno-fmt-ignore
const syntheticLayout = mod.essentialPageLayout(mod.pageIdentity('synthetic'), { moduleImportMetaURL: import.meta.url })`<!DOCTYPE html>
<html lang="en">
    ${mod.typicalPageSurroundBodyPrePartial}

    <main>
      <div>${mod.typicalBodyPartial}</div>
      ${mod.layoutDiagnosticsPartial}
    </main>

    ${mod.typicalPageSurroundBodyPostPartial}
</html>`;

Deno.test(`TailwindDesignSystem rendering with synthetic HTML layout, no navigation`, async () => {
  const twDS = new mod.TailwindDesignSystem(
    new extn.CachedExtensions(),
    ua.universalAssetsBaseURL,
  );
  const resource: Resource = {
    textSync:
      "Test of content transformation with server-side-rendered Tailwind CSS",
  };
  const golden = Deno.readTextFileSync(
    path.fromFileUrl(
      import.meta.resolve("./mod_test-synthetic-layout-rendered.golden.html"),
    ),
  );

  // typically a layout strategy allows dynamic layout selection but in our test
  // case we're "hardcoding" it
  const lss: html.HtmlLayoutStrategySupplier<mod.EssentialLayout> = {
    layoutStrategy: syntheticLayout,
  };
  const syncResult = lss.layoutStrategy.renderedSync(
    twDS.layout(resource, lss, twDS.contentStrategy),
  );
  ta.assert(c.isHtmlSupplier(syncResult));
  ta.assertEquals(c.flexibleTextSync(syncResult.html, "error"), golden);

  const asyncResult = await lss.layoutStrategy.rendered(
    twDS.layout(resource, lss, twDS.contentStrategy),
  );
  ta.assert(c.isHtmlSupplier(asyncResult));
  ta.assertEquals(await c.flexibleText(asyncResult.html, "error"), golden);
});

Deno.test(`TailwindDesignSystem rendering with synthetic HTML layout, with navigation and dynamic content`, async () => {
  const _syntheticMarkdownNoDecoration = ws.unindentWhitespace(`
    ---
    folksonomy: [a, b, c]
    custom: value
    layout: essentialDS/no-decoration
    route:
      unit: home
      label: Home
      isRootUnit: true
    ---
    Test of content transformation with server-side-rendered Tailwind CSS from Markdown.`);

  const twDS = new mod.TailwindDesignSystem(
    new extn.CachedExtensions(),
    ua.universalAssetsBaseURL,
  );
  const resource: Resource = {
    textSync:
      "Test of content transformation with server-side-rendered Tailwind CSS",
  };
  const golden = Deno.readTextFileSync(
    path.fromFileUrl(
      import.meta.resolve("./mod_test-synthetic-layout-rendered.golden.html"),
    ),
  );

  // typically a layout strategy allows dynamic layout selection but in our test
  // case we're "hardcoding" it
  const lss: html.HtmlLayoutStrategySupplier<mod.EssentialLayout> = {
    layoutStrategy: syntheticLayout,
  };
  const syncResult = lss.layoutStrategy.renderedSync(
    twDS.layout(resource, lss, twDS.contentStrategy),
  );
  ta.assert(c.isHtmlSupplier(syncResult));
  ta.assertEquals(c.flexibleTextSync(syncResult.html, "error"), golden);

  const asyncResult = await lss.layoutStrategy.rendered(
    twDS.layout(resource, lss, twDS.contentStrategy),
  );
  ta.assert(c.isHtmlSupplier(asyncResult));
  ta.assertEquals(await c.flexibleText(asyncResult.html, "error"), golden);
});

// Deno.test(`navigable htmlLayoutTransformers with EssentialDS`, async () => {
//   const twDS = new mod.TailwindDesignSystem(
//     new extn.CachedExtensions(),
//     ua.universalAssetsBaseURL,
//   );
//   const lss = twDS.layoutStrategies.defaultLayoutStrategySupplier;
//   const ls = lss.layoutStrategy;
//   const resource: c.TextSyncSupplier = {
//     textSync: "Test of content transformation to HTML layout",
//   };
//   // ***** TODO ****
//   // ***** REPLACE surface in context ****
//   const rf = new r.TypicalRouteFactory(
//     r.defaultRouteLocationResolver(),
//     r.defaultRouteWorkspaceEditorResolver(() => undefined),
//   );
//   const routeTree = new r.TypicalRouteTree(rf);
//   const layoutText = new mod.EssentialDesignSystemText();
//   const navigation = new mod.EssentialDesignSystemNavigation(true, routeTree);
//   const assets = twDS.assets();
//   const contentStrategy: mod.EssentialDesignSystemContentStrategy = {
//     layoutText,
//     navigation,
//     assets,
//     renderedAt: new Date(),
//     mGitResolvers: {
//       ...git.typicalGitWorkTreeAssetUrlResolvers(),
//       remoteCommit: (commit, paths) => ({
//         commit,
//         remoteURL: "??",
//         paths,
//       }),
//       workTreeAsset: git.typicalGitWorkTreeAssetResolver,
//       changelogReportAnchorHref: () => "/activity-log/git-changelog/",
//       cicdBuildStatusHTML: () => `TODO`,
//     },
//     routeGitRemoteResolver: (route, gitBranchOrTag, paths) => {
//       return {
//         assetPathRelToWorkTree: route.terminal?.qualifiedPath || "??",
//         href: route.terminal?.qualifiedPath || "??",
//         textContent: route.terminal?.qualifiedPath || "??",
//         paths,
//         gitBranchOrTag,
//       };
//     },
//     wsEditorResolver: () => undefined,
//     wsEditorRouteResolver: () => undefined,
//     termsManager: new k.TypicalTermsManager(),
//     operationalCtxClientCargo: {
//       acquireFromURL: "/operational-context/index.json",
//       assetsBaseAbsURL: "/operational-context",
//     },
//   };
//   const syncResult = ls.renderedSync(
//     twDS.layout(resource, lss, contentStrategy),
//   );
//   ta.assert(c.isHtmlSupplier(syncResult));
//   // console.dir(c.flexibleTextSync(syncResult.html, "?"));
//   // TODO:
//   // ta.assertEquals(
//   //   content.flexibleTextSync(syncResult, "error"),
//   //   "Test of content transformation to HTML layout",
//   // );
//   // ***** TODO ****
//   // ***** REPLACE surface in context ****
//   const asyncResult = await ls.rendered(
//     twDS.layout(resource, lss, contentStrategy),
//   );
//   ta.assert(c.isHtmlSupplier(asyncResult));
//   // console.dir(await c.flexibleText(syncResult.html, "?"));
//   // TODO:
//   // ta.assertEquals(
//   //   await content.flexibleText(asyncResult, "error"),
//   //   "__transform__ test with frontmatter",
//   // );
//   // ta.assertEquals(asyncResult.frontmatter, { first: "value", second: 40 });
// });
