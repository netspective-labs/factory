import { path } from "./deps.ts";
import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./mod.ts";

const testPath = path.relative(
  Deno.cwd(),
  path.dirname(import.meta.url).substr("file://".length),
);
const testPathLoc = testPath.trim().length > 0 ? testPath : "./";

Deno.test(`Git in ${testPathLoc}`, async () => {
  const gitPaths = mod.discoverGitWorkTree(Deno.cwd());
  ta.assert(gitPaths);

  ta.assertEquals(
    path.relative(testPath, gitPaths.workTreePath),
    "..",
  );
  ta.assertEquals(
    path.relative(testPath, gitPaths.gitDir),
    "../.git",
  );

  const git = new mod.TypicalGit(gitPaths, {
    ...mod.typicalGitWorkTreeAssetUrlResolvers(),
    remoteCommit: () => undefined,
    workTreeAsset: mod.typicalGitWorkTreeAssetResolver,
    changelogReportAnchorHref: () => "/activity-log/git-changelog/",
    cicdBuildStatusHTML: () => `TODO`,
  });
  await git.init();
  const currentBranch = await git.currentBranch();
  const isDirty = await git.isDirty();
  ta.assert(currentBranch);
  ta.assert(git.cached.currentBranch == currentBranch);
  ta.assert(git.cached.isDirty == isDirty);

  // TODO: figure out how to test this deterministically
  ta.assert(await git.status());
  ta.assert(await git.log());
});

Deno.test(`Git Executive in ${testPathLoc}`, async () => {
  const git = await mod.discoverGitWorktreeExecutive(testPath, {
    ...mod.typicalGitWorkTreeAssetUrlResolvers(),
    remoteCommit: () => undefined,
    workTreeAsset: mod.typicalGitWorkTreeAssetResolver,
    changelogReportAnchorHref: () => "/activity-log/git-changelog/",
    cicdBuildStatusHTML: () => `TODO`,
  });
  ta.assert(git);

  const currentBranch = await git.currentBranch();
  const isDirty = await git.isDirty();
  ta.assert(currentBranch);
  ta.assert(git.cached.currentBranch == currentBranch);
  ta.assert(git.cached.isDirty == isDirty);

  // TODO: figure out how to test this deterministically
  ta.assert(await git.status());
  ta.assert(await git.log());
});

Deno.test(`Git single file history in ${testPathLoc}`, async () => {
  const git = await mod.discoverGitWorktreeExecutive(testPath, {
    ...mod.typicalGitWorkTreeAssetUrlResolvers(),
    remoteCommit: () => undefined,
    workTreeAsset: mod.typicalGitWorkTreeAssetResolver,
    changelogReportAnchorHref: () => "/activity-log/git-changelog/",
    cicdBuildStatusHTML: () => `TODO`,
  });
  ta.assert(git);

  const currentBranch = await git.currentBranch();
  const isDirty = await git.isDirty();
  ta.assert(currentBranch);
  ta.assert(isDirty || !isDirty);

  // TODO: figure out how to test this deterministically
  const status = await git.status();
  ta.assert(status);

  // TODO: support --follow? git log --follow pubctl.ts
  const log = await git.log({ file: "./mod_test.ts", number: -1 });
  ta.assert(log);
});
