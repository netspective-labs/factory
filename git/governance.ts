export type GitEntry = string;
export type GitWorkTreePath = string;
export type GitDir = string;

export interface ManagedGitReference {
  readonly paths: GitPathsSupplier;
}

export interface GitAsset extends ManagedGitReference {
  readonly assetPathRelToWorkTree: string;
  readonly gitBranchOrTag: GitBranchOrTag;
}

export interface GitWorkTreeAsset extends GitAsset, ManagedGitReference {
}

export interface GitWorkTreeAssetUrlResolver<Identity extends string> {
  readonly identity: Identity;
  readonly gitAssetUrl: (
    asset: GitWorkTreeAsset,
    fallback?: () => string | undefined,
  ) => string | undefined;
}

export interface GitWorkTreeAssetUrlResolvers<Identity extends string> {
  readonly gitAssetUrlResolver: (
    identity: string,
  ) => GitWorkTreeAssetUrlResolver<Identity> | undefined;
  readonly gitAssetUrlResolvers: Iterable<
    GitWorkTreeAssetUrlResolver<Identity>
  >;
  readonly registerResolver: (
    resolver: GitWorkTreeAssetUrlResolver<Identity>,
  ) => void;
}

export interface GitWorkTreeAssetResolver {
  (
    candidate: GitEntry | GitEntryStatus,
    gitBranchOrTag: GitBranch,
    paths: GitPathsSupplier,
  ): GitWorkTreeAsset | undefined;
}

export interface GitRemoteCommit<Field extends CommitField>
  extends ManagedGitReference {
  readonly remoteURL: string;
  readonly commit: GitCommitBase<Field> | GitCommitBaseWithFiles<Field>;
}

export interface GitRemoteCommitResolver<Field extends CommitField> {
  (
    commit: GitCommitBase<Field> | GitCommitBaseWithFiles<Field>,
    paths: GitPathsSupplier,
  ): GitRemoteCommit<Field> | undefined;
}

export interface GitRemoteChangelogReportHref<Field extends CommitField> {
  (
    commit?: GitCommitBase<Field> | GitCommitBaseWithFiles<Field>,
  ): string | undefined;
}

export interface ManagedGitResolvers<Identity extends string>
  extends GitWorkTreeAssetUrlResolvers<Identity> {
  readonly workTreeAsset: GitWorkTreeAssetResolver;
  // deno-lint-ignore no-explicit-any
  readonly remoteCommit: GitRemoteCommitResolver<any>;
  // deno-lint-ignore no-explicit-any
  readonly changelogReportAnchorHref?: GitRemoteChangelogReportHref<any>;
  readonly cicdBuildStatusHTML?: (...args: unknown[]) => string;
}

export interface GitPathsSupplier {
  readonly workTreePath: GitWorkTreePath; // git --work-tree argument
  readonly gitDir: GitDir; // git --git-dir argument
  readonly assetAbsWorkTreePath: (asset: GitAsset) => GitEntry;
}

export enum GitStatus {
  " " = "unmodified",
  "M" = "modified",
  "A" = "added",
  "D" = "deleted",
  "R" = "renamed",
  "C" = "copied",
  "U" = "umerged",
  "?" = "untracked",
  "!" = "ignored",
}

export interface GitEntryStatus {
  readonly x: GitStatus;
  readonly y: GitStatus;
  readonly entry: GitEntry;
  readonly fromEntry?: GitEntry;
}

export interface GitRunCmdDiagnostics {
  readonly isValid: boolean;
  readonly diagnostics?: string;
}

export interface GitEntriesStatusesSupplier {
  readonly statuses: GitEntryStatus[];
  readonly status: (entry: GitEntry) => GitEntryStatus | undefined;
  readonly statusDiags: GitRunCmdDiagnostics;
}

export const gitCommitFieldMap = {
  hash: "%H",
  abbrevHash: "%h",
  treeHash: "%T",
  abbrevTreeHash: "%t",
  parentHashes: "%P",
  abbrevParentHashes: "%P",
  authorName: "%an",
  authorEmail: "%ae",
  authorDate: "%ai",
  authorDateRel: "%ar",
  committerName: "%cn",
  committerEmail: "%ce",
  committerDate: "%cd",
  committerDateRel: "%cr",
  subject: "%s",
  body: "%b",
  rawBody: "%B",
} as const;

export type CommitField = keyof typeof gitCommitFieldMap;

export type GitCommitBase<Field extends string> = Record<Field, string>;
export type GitCommitBaseWithFiles<Field extends string> =
  & Record<
    Field | "status",
    string
  >
  & { files: string[] };

export interface GitRunCmdOptionsSupplier {
  (gp: GitPathsSupplier): Deno.RunOptions;
}

export type GitBranch = string;
export type GitTag = string;
export type GitBranchOrTag = string;

export interface FileLineRange {
  /** Will be pass as -L <startLine>,<endLine>:<file> */

  /** The file to get the commits for */
  file: string;
  /** The number of the first line in the desired range */
  startLine: number;
  /**
   * Either the absolute line number for the end of the desired range,
   * or the offset from the startLine
   */
  endLine: number | string;
}

export interface GitLogOptions {
  /**
   * Much more likely to set status codes to 'C' if files are exact copies of each other.
   *
   * @default false
   */
  findCopiesHarder?: boolean;
  /**
   * Find commits on all branches instead of just on the current one.
   *
   * @default false
   */
  all?: boolean;
  /**
   * Pass the -m option to includes files in a merge commit
   *
   * @default false
   */
  includeMergeCommitFiles?: boolean;
  /**
   * The number of commits to return, -1 for most recent, > 0 for more
   *
   * @default 500
   */
  number?: number;

  /**
   * Below fields was returned from the log:
   *
   * - files - changed files names (array)
   * - status - changed files status (array)
   *
   * @default true
   */
  nameStatus?: boolean;
  /**
   * Show only commits in the specified branch or revision range.
   * By default uses the current branch and defaults to HEAD (i.e.
   * the whole history leading to the current commit).
   */
  branch?: string;
  /** Range of lines for a given file to find the commits for */
  fileLineRange?: FileLineRange;
  /** File filter for the git log command */
  file?: string;
  /** Limit the commits output to ones with author header lines that match the specified pattern. */
  author?: string;
  /** Limit the commits output to ones with committer header lines that match the specified pattern. */
  committer?: string;
  /** Show commits more recent than a specific date. */
  since?: string;
  /** Show commits more recent than a specific date. */
  after?: string;
  /** Show commits older than a specific date */
  until?: string;
  /** Show commits older than a specific date */
  before?: string;
}

export interface GitCacheablesSupplier extends GitPathsSupplier {
  readonly currentBranch: GitBranch | undefined;
  readonly mostRecentCommit:
    // deno-lint-ignore no-explicit-any
    | GitCommitBase<any>
    // deno-lint-ignore no-explicit-any
    | GitCommitBaseWithFiles<any>
    | void;
  readonly status: GitEntriesStatusesSupplier;
  readonly isDirty: boolean;
}

export interface GitExecutive extends GitPathsSupplier {
  readonly cached: GitCacheablesSupplier;
  readonly currentBranch: (
    cmd?: GitRunCmdOptionsSupplier,
  ) => Promise<GitBranch | undefined>;
  readonly mostRecentCommit: <Field extends CommitField>(
    cmd?: GitRunCmdOptionsSupplier,
  ) => Promise<GitCommitBase<Field> | GitCommitBaseWithFiles<Field> | void>;
  readonly status: (
    cmd?: GitRunCmdOptionsSupplier,
  ) => Promise<GitEntriesStatusesSupplier>;
  readonly isDirty: () => Promise<boolean>;
  readonly log: <Field extends CommitField>(options?: GitLogOptions) => Promise<
    GitCommitBase<Field>[] | GitCommitBaseWithFiles<Field>[] | void
  >;
  readonly latestTag: (
    cmd?: GitRunCmdOptionsSupplier,
  ) => Promise<GitTag | undefined>;
  readonly mGitResolvers: ManagedGitResolvers<string>;
}
