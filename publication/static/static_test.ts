import { testingAsserts as ta } from "../deps-test.ts";
import { path } from "../deps.ts";
import * as extn from "../../module/mod.ts";
import * as lds from "../../resource/design-system/lightning/mod.ts";
import * as orig from "../../resource/originate/mod.ts";
import * as ua from "../../resource/design-system/universal/assets.ts";
import * as udsp from "../../resource/design-system/universal/publication.ts";
import * as mod from "./static.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

// TODO: need to add test cases for Design System

Deno.test(`static site generator`, async (tc) => {
  const extensionsManager = new extn.CachedExtensions();

  const ccHome = path.fromFileUrl(import.meta.resolve("./client-cargo"));
  const resFactoryHome = path.fromFileUrl(import.meta.resolve("../.."));
  const populateCC = lds.ldsClientCargoSymlinker(ccHome, resFactoryHome);

  const destRootPath = path.relative(
    Deno.cwd(),
    path.fromFileUrl(import.meta.resolve("./public")),
  );

  await tc.step(
    `generate ${path.relative(Deno.cwd(), destRootPath)} with limited options`,
    async () => {
      // mod.destroyPathContents(destRootPath, {
      //   onAfterDestroy: (fsPath) => console.log(`destroyed ${fsPath}`),
      // });
      // const contentRootPath = path.fromFileUrl(
      //   import.meta.resolve("../resource/markdown/test/fixtures"),
      // );
      // const spc = new mod.StaticPublConfiguration({
      //   originationSources: [orig.walkGlobbedFilesExcludeGit(contentRootPath)],
      //   destRootPath,
      //   extensionsManager,
      // });
      // const sp = new class extends mod.StaticPublication {
      //   designSystemFactory(
      //     _config: mod.StaticPublConfiguration,
      //     routes: udsp.PublicationRoutes,
      //   ) {
      //     const designSystem = new lds.LightingDesignSystem(
      //       extensionsManager,
      //       ua.universalAssetsBaseURL,
      //     );
      //     const contentStrategy: lds.LightingDesignSystemContentStrategy = {
      //       layoutText: new lds.LightingDesignSystemText(),
      //       navigation: new lds.LightingDesignSystemNavigation(
      //         true,
      //         routes.navigationTree,
      //       ),
      //       assets: designSystem.assets(),
      //       branding: {
      //         contextBarSubject: "test",
      //         contextBarSubjectImageSrc: "test",
      //       },
      //     };
      //     return { designSystem, contentStrategy };
      //   }
      // }(spc);
      // await sp.produce();
      // await populateCC(destRootPath);
      // ta.assert(sp.resourcesIndex.resourcesIndex.length);
      // ta.assert(sp.resourcesIndex.flowMetrics());
      // ta.assert(sp.producerStats);
    },
  );

  await tc.step(
    // deno-fmt-ignore
    `TODO: generate ${path.relative(Deno.cwd(), destRootPath)} with Git options`,
    async () => {
      //   mod.destroyPathContents(destRootPath);
      //   const contentRootPath = path.fromFileUrl(
      //     import.meta.resolve(
      //       "../../../../../gl.infra.medigy.com/medigy-digital-properties/gpm.medigy.com/content",
      //     ),
      //   );
      //   console.log(contentRootPath);
      //   const spc = new mod.StaticPublConfiguration({
      //     originationSources: [orig.walkGlobbedFilesExcludeGit(contentRootPath)],
      //     destRootPath,
      //     extensionsManager,
      //   });
      //   const sp = new class extends mod.StaticPublication {
      //     designSystemFactory(
      //       _config: mod.StaticPublConfiguration,
      //       routes: udsp.PublicationRoutes,
      //     ) {
      //       const designSystem = new lds.LightingDesignSystem(
      //         extensionsManager,
      //         "/universal-cc",
      //       );
      //       const layoutText = new lds.LightingDesignSystemText();
      //       const navigation = new lds.LightingDesignSystemNavigation(
      //         true,
      //         routes.navigationTree,
      //       );
      //       const assets = designSystem.assets();
      //       const branding: lds.LightningBranding = {
      //         contextBarSubject: "test",
      //         contextBarSubjectImageSrc: "test",
      //       };
      //       const contentStrategy: lds.LightingDesignSystemContentStrategy = {
      //         layoutText,
      //         navigation,
      //         assets,
      //         branding,
      //         renderedAt: new Date(),
      //         mGitResolvers: {
      //           ...git.typicalGitWorkTreeAssetUrlResolvers(),
      //           remoteCommit: (commit, paths) => ({
      //             commit,
      //             remoteURL: "??",
      //             paths,
      //           }),
      //           workTreeAsset: git.typicalGitWorkTreeAssetResolver,
      //           changelogReportAnchorHref: () => "/activity-log/git-changelog/",
      //           cicdBuildStatusHTML: () => `TODO`,
      //         },
      //         routeGitRemoteResolver: (route, gitBranchOrTag, paths) => {
      //           return {
      //             assetPathRelToWorkTree: route.terminal?.qualifiedPath || "??",
      //             href: route.terminal?.qualifiedPath || "??",
      //             textContent: route.terminal?.qualifiedPath || "??",
      //             paths,
      //             gitBranchOrTag,
      //           };
      //         },
      //         wsEditorResolver: () => undefined,
      //         wsEditorRouteResolver: () => undefined,
      //         termsManager: new k.TypicalTermsManager(),
      //         operationalCtxClientCargo: {
      //           acquireFromURL: "/operational-context/index.json",
      //           assetsBaseAbsURL: "/operational-context",
      //         },
      //       };
      //       return { designSystem, contentStrategy };
      //     }
      //   }(spc);
      //   await populateCC(destRootPath);
    },
  );
});
