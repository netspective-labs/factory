import { testingAsserts as ta } from "../../deps-test.ts";
import * as extn from "../../../module/mod.ts";
import * as c from "../../content/mod.ts";
import * as r from "../../../route/mod.ts";
import * as ldsGovn from "./governance.ts";
import * as git from "../../../git/mod.ts";
import * as k from "../../../knowledge/mod.ts";
import * as ua from "../../design-system/universal/assets.ts";
import * as mod from "./lightning.ts";

export type Resource = c.TextSyncSupplier;

Deno.test(`htmlLayoutTransformers with lds prime`, async () => {
  const lds = new mod.LightingDesignSystem(
    new extn.CachedExtensions(),
    ua.universalAssetsBaseURL,
  );
  const lss = lds.layoutStrategies.defaultLayoutStrategySupplier;
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
  const layoutText = new mod.LightingDesignSystemText();
  const navigation = new mod.LightingDesignSystemNavigation(true, routeTree);
  const assets = lds.assets();
  const branding: ldsGovn.LightningBranding = {
    contextBarSubject: "test",
    contextBarSubjectImageSrc: "test",
  };
  const contentStrategy: ldsGovn.LightingDesignSystemContentStrategy = {
    layoutText,
    navigation,
    assets,
    branding,
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
    lds.layout(resource, lss, contentStrategy),
  );
  ta.assert(c.isHtmlSupplier(syncResult));
  // console.dir(syncResult);
  // TODO:
  // ta.assertEquals(
  //   content.flexibleTextSync(syncResult, "error"),
  //   "Test of content transformation to HTML layout",
  // );
  // ***** TODO ****
  // ***** REPLACE surface in context ****
  const asyncResult = await ls.rendered(
    lds.layout(resource, lss, contentStrategy),
  );
  ta.assert(c.isHtmlSupplier(asyncResult));
  // console.dir(asyncResult);
  // TODO:
  // ta.assertEquals(
  //   await content.flexibleText(asyncResult, "error"),
  //   "__transform__ test with frontmatter",
  // );
  // ta.assertEquals(asyncResult.frontmatter, { first: "value", second: 40 });
});
