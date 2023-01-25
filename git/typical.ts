import { fs, path } from "./deps.ts";
import * as safety from "../safety/mod.ts";
import * as govn from "./governance.ts";
import * as gl from "./git-log.ts";

declare global {
  interface Window {
    discoverGitWorkTreeResults: Map<string, GitWorkTreeDiscoveryResult>;
    cachedGitExecutives: Map<string, CachedGitExecutive>;
  }
}

if (!window.discoverGitWorkTreeResults) {
  window.discoverGitWorkTreeResults = new Map();
}
if (!window.cachedGitExecutives) {
  window.cachedGitExecutives = new Map();
}

export interface GitWorkTreeDiscoveryResult extends govn.GitPathsSupplier {
  readonly cachedAt: Date;
}

export function discoverGitWorkTree(
  fileSysPath: string,
  cacheExpired?: (gwtdr: GitWorkTreeDiscoveryResult) => boolean,
): false | GitWorkTreeDiscoveryResult {
  let current = path.isAbsolute(fileSysPath)
    ? fileSysPath
    : path.join(Deno.cwd(), fileSysPath);

  const cacheKey = current;
  const cached = window.discoverGitWorkTreeResults.get(cacheKey);
  if (cached && (!cacheExpired || !cacheExpired(cached))) {
    return cached;
  }

  let parent = path.join(current, "..");

  function gitWorkTreeResult(): false | GitWorkTreeDiscoveryResult {
    const gitDir = path.join(current, ".git");
    if (fs.existsSync(gitDir)) {
      return {
        workTreePath: current,
        gitDir,
        cachedAt: new Date(),
        assetAbsWorkTreePath: (asset: govn.GitAsset) =>
          path.join(current, asset.assetPathRelToWorkTree),
      };
    }
    return false;
  }

  for (; parent !== current; parent = path.join(current, "..")) {
    const result = gitWorkTreeResult();
    if (result) return result;
    current = parent;
  }

  const result = gitWorkTreeResult();
  if (result) {
    window.discoverGitWorkTreeResults.set(cacheKey, result);
  }
  return result;
}

export interface CachedGitExecutive {
  readonly gitPaths: GitWorkTreeDiscoveryResult;
  readonly executive: govn.GitExecutive;
}

export function discoverGitWorktreeExecutiveSync(
  fileSysPath: string,
  factory: (
    gitPaths: GitWorkTreeDiscoveryResult,
  ) => govn.GitExecutive | undefined,
  options?: {
    readonly geCacheExpired?: (cge: CachedGitExecutive) => boolean;
    readonly gwtdrCacheExpired?: (gwtdr: GitWorkTreeDiscoveryResult) => boolean;
  },
): govn.GitExecutive | undefined {
  const gitPaths = discoverGitWorkTree(fileSysPath, options?.gwtdrCacheExpired);
  if (!gitPaths) return undefined;

  const cacheKey = gitPaths.workTreePath;
  const cached = window.cachedGitExecutives.get(cacheKey);
  if (
    cached && (!options?.geCacheExpired || !options?.geCacheExpired(cached))
  ) {
    return cached.executive;
  }

  const executive = factory(gitPaths);
  if (executive) {
    window.cachedGitExecutives.set(cacheKey, { gitPaths, executive });
  }
  return executive;
}

export async function discoverGitWorktreeExecutive(
  fileSysPath: string,
  mGitResolvers: govn.ManagedGitResolvers<string>,
  options?: {
    readonly factory?: (
      fsp: string,
    ) => Promise<govn.GitExecutive | undefined> | govn.GitExecutive | undefined;
    readonly geCacheExpired?: (cge: CachedGitExecutive) => boolean;
    readonly gwtdrCacheExpired?: (gwtdr: GitWorkTreeDiscoveryResult) => boolean;
  },
): Promise<govn.GitExecutive | undefined> {
  const gitPaths = discoverGitWorkTree(fileSysPath, options?.gwtdrCacheExpired);
  if (!gitPaths) return undefined;

  const cacheKey = gitPaths.workTreePath;
  const cached = window.cachedGitExecutives.get(cacheKey);
  if (
    cached && (!options?.geCacheExpired || !options?.geCacheExpired(cached))
  ) {
    // if we constructed synchronously but not init yet, do so now just in case;
    // TypicalGit.init() is idempotent
    if (cached.executive instanceof TypicalGit) await cached.executive.init();
    return cached.executive;
  }

  let executive: govn.GitExecutive | undefined;
  if (!options?.factory) {
    executive = new TypicalGit(gitPaths, mGitResolvers);
    await (executive as TypicalGit).init();
  } else {
    executive = await options?.factory(fileSysPath);
  }
  if (executive) {
    window.cachedGitExecutives.set(cacheKey, { gitPaths, executive });
  }
  return executive;
}

export function gitStatusCmd(
  inherit?: Partial<Deno.RunOptions>,
): govn.GitRunCmdOptionsSupplier {
  return (gp) => {
    return {
      cmd: [
        "git",
        `--git-dir=${gp.gitDir}`,
        `--work-tree=${gp.workTreePath}`,
        "--no-pager",
        "status",
        "--porcelain",
      ],
      stdout: "piped",
      stderr: "piped",
      ...inherit,
    };
  };
}

export function gitShowCurrentBranchCmd(
  inherit?: Partial<Deno.RunOptions>,
): govn.GitRunCmdOptionsSupplier {
  return (gp) => {
    return {
      cmd: [
        "git",
        `--git-dir=${gp.gitDir}`,
        `--work-tree=${gp.workTreePath}`,
        "--no-pager",
        "branch",
        "--show-current",
      ],
      stdout: "piped",
      stderr: "piped",
      ...inherit,
    };
  };
}

export function gitLatestTagCmd(
  inherit?: Partial<Deno.RunOptions>,
): govn.GitRunCmdOptionsSupplier {
  return (gp) => {
    return {
      cmd: [
        "git",
        `--git-dir=${gp.gitDir}`,
        `--work-tree=${gp.workTreePath}`,
        "describe",
        "--tags",
        "--abbrev=0",
      ],
      stdout: "piped",
      stderr: "piped",
      ...inherit,
    };
  };
}

export function parseGitStatus(
  status: string,
  delim = "\n",
): govn.GitEntryStatus[] {
  const chunks = status.split(delim);
  const result: govn.GitEntryStatus[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.length) {
      const x = chunk[0] as govn.GitStatus;
      const fileStatus: govn.GitEntryStatus = {
        x,
        y: chunk[1] as govn.GitStatus,
        entry: chunk.substring(3),
      };
      if (x === govn.GitStatus.R) {
        i++;
        // deno-lint-ignore no-explicit-any
        (fileStatus as any).from = chunks[i];
      }
      result.push(fileStatus);
    }
  }
  return result;
}

export interface GitCmdResult {
  readonly status: Deno.ProcessStatus;
}

export interface GitCmdSuccessResult extends GitCmdResult {
  readonly stdOut: string;
}

export const isGitCmdSuccessful = safety.typeGuard<GitCmdSuccessResult>(
  "stdOut",
);

export interface GitCmdFailureResult extends GitCmdResult {
  readonly stdErr: string;
}

export const isGitCmdFailure = safety.typeGuard<GitCmdFailureResult>(
  "stdErr",
);

export function typicalGitWorkTreeAssetUrlResolvers<Identity extends string>(
  ...defaults: govn.GitWorkTreeAssetUrlResolver<Identity>[]
): govn.GitWorkTreeAssetUrlResolvers<Identity> {
  const gitAssetUrlResolvers = new Map<
    string,
    govn.GitWorkTreeAssetUrlResolver<Identity>
  >();
  defaults.forEach((resolver) =>
    gitAssetUrlResolvers.set(resolver.identity, resolver)
  );
  return {
    gitAssetUrlResolver: (identity) => gitAssetUrlResolvers.get(identity),
    gitAssetUrlResolvers: gitAssetUrlResolvers.values(),
    registerResolver: (resolver) =>
      gitAssetUrlResolvers.set(resolver.identity, resolver),
  };
}

export const typicalGitWorkTreeAssetResolver: govn.GitWorkTreeAssetResolver = (
  candidate,
  gitBranchOrTag,
  paths,
) => {
  const entry = typeof candidate === "string" ? candidate : candidate.entry;
  const workTreePath = paths.workTreePath;
  if (path.isAbsolute(entry)) {
    if (entry.startsWith(workTreePath)) {
      return {
        assetPathRelToWorkTree: entry.substr(workTreePath.length + 1), // +1 is because we don't want a leading /
        gitAssetWorkTreeAbsPath: entry,
        gitBranchOrTag,
        paths,
      };
    }
    // the entry doesn't belong to paths.workTreePath
    return undefined;
  }
  return {
    assetPathRelToWorkTree: entry,
    gitAssetWorkTreeAbsPath: path.join(paths.workTreePath, entry),
    gitBranchOrTag,
    paths,
  };
};

export class TypicalGit implements govn.GitExecutive {
  readonly workTreePath: govn.GitWorkTreePath; // git --work-tree argument
  readonly gitDir: govn.GitDir; // git --git-dir argument
  #initialized: boolean | undefined;
  #cached: govn.GitCacheablesSupplier | undefined;

  constructor(
    gps: govn.GitPathsSupplier,
    readonly mGitResolvers: govn.ManagedGitResolvers<string>,
  ) {
    this.workTreePath = gps.workTreePath;
    this.gitDir = gps.gitDir;
  }

  assetAbsWorkTreePath(asset: govn.GitAsset) {
    return path.join(this.workTreePath, asset.assetPathRelToWorkTree);
  }

  async init(): Promise<void> {
    if (this.#initialized) return;
    this.#cached = {
      gitDir: this.gitDir,
      workTreePath: this.workTreePath,
      assetAbsWorkTreePath: (asset) =>
        path.join(this.workTreePath, asset.assetPathRelToWorkTree),
      currentBranch: await this.currentBranch(),
      mostRecentCommit: await this.mostRecentCommit(),
      status: await this.status(),
      isDirty: await this.isDirty(),
    };
    this.#initialized = true;
  }

  get cached() {
    if (!this.#initialized) {
      throw new Error(
        "TypicalGit.init() must be called before TypicalGit.cached() can be used",
      );
    }
    return this.#cached!;
  }

  async run(
    cmdOptions: govn.GitRunCmdOptionsSupplier,
  ): Promise<GitCmdSuccessResult | GitCmdFailureResult> {
    let result: GitCmdSuccessResult | GitCmdFailureResult;
    const cmd = Deno.run(cmdOptions(this));

    // see https://github.com/denoland/deno/issues/4568 why this is necessary
    const [stdErrRaw, stdOutRaw, status] = await Promise.all([
      cmd.stderrOutput(),
      cmd.output(),
      cmd.status(),
    ]);
    if (status.success) {
      const stdOut = new TextDecoder().decode(stdOutRaw);
      result = { status, stdOut };
    } else {
      const stdErr = new TextDecoder().decode(stdErrRaw);
      result = { status, stdErr };
    }
    cmd.close();
    return result;
  }

  async isDirty(): Promise<boolean> {
    const cmd = Deno.run({
      cmd: [
        "git",
        `--git-dir=${this.gitDir}`,
        `--work-tree=${this.workTreePath}`,
        "diff",
        "--no-ext-diff",
        "--quiet",
      ],
    });
    const status = await cmd.status();
    cmd.close();
    return status.code == 0 ? false : true;
  }

  async status(
    cmdOptions = gitStatusCmd(),
  ): Promise<govn.GitEntriesStatusesSupplier> {
    const cmdResult = await this.run(cmdOptions);
    if (isGitCmdSuccessful(cmdResult)) {
      const statuses = parseGitStatus(cmdResult.stdOut);
      return {
        statusDiags: { isValid: true },
        status: (entry) => statuses.find((e) => e.entry == entry),
        statuses,
      };
    } else {
      return {
        statusDiags: { isValid: false, diagnostics: cmdResult.stdErr },
        status: () => undefined,
        statuses: [],
      };
    }
  }

  async currentBranch(
    cmdOptions = gitShowCurrentBranchCmd(),
  ): Promise<govn.GitBranch | undefined> {
    const cmdResult = await this.run(cmdOptions);
    if (isGitCmdSuccessful(cmdResult)) {
      return cmdResult.stdOut?.trim();
    } else {
      return undefined;
    }
  }

  async mostRecentCommit<
    Field extends govn.CommitField = gl.DefaultField,
  >(): Promise<
    govn.GitCommitBase<Field> | govn.GitCommitBaseWithFiles<Field> | void
  > {
    const [cmdOptions, onSuccess] = gl.gitLogCmd<Field>(-1);
    const cmdResult = await this.run(cmdOptions);
    if (isGitCmdSuccessful(cmdResult)) {
      const success = onSuccess(cmdResult.stdOut);
      if (success && success.length > 0) {
        return success[0];
      }
    } else {
      return undefined;
    }
  }

  async latestTag(
    cmdOptions = gitLatestTagCmd(),
  ): Promise<govn.GitTag | undefined> {
    const cmdResult = await this.run(cmdOptions);
    if (isGitCmdSuccessful(cmdResult)) {
      return cmdResult.stdOut;
    } else {
      return undefined;
    }
  }

  async log<Field extends govn.CommitField = gl.DefaultField>(
    options?: govn.GitLogOptions,
  ): Promise<
    govn.GitCommitBase<Field>[] | govn.GitCommitBaseWithFiles<Field>[] | void
  > {
    const [cmdOptions, onSuccess] = gl.gitLogCmd<Field>(options);
    const cmdResult = await this.run(cmdOptions);
    if (isGitCmdSuccessful(cmdResult)) {
      return onSuccess(cmdResult.stdOut);
    } else {
      return undefined;
    }
  }
}
