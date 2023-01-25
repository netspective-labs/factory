export type SemanticVersion = string;

export interface ModuleVersionSupplier<O> {
  (
    importMetaURL: URL | string,
    options?: O,
  ): Promise<SemanticVersion | undefined>;
}

export interface DetermineVersionFromRepoTagOptions {
  readonly repoIdentity?: string;
  readonly onIsLocalFile?: (src: URL) => SemanticVersion | undefined;
  readonly onInvalidRemoteMatch?: (
    repoVersionRegExp: RegExp,
  ) => SemanticVersion;
}

// deno-lint-ignore require-await
export async function determineVersionFromRepoTag(
  importMetaURL: URL | string,
  options?: DetermineVersionFromRepoTagOptions,
): Promise<SemanticVersion | undefined> {
  // if we're running locally, see if Git tag can be discovered
  const url = importMetaURL instanceof URL
    ? importMetaURL
    : new URL(importMetaURL);
  if (url.protocol == "file:") {
    if (options?.onIsLocalFile) return options.onIsLocalFile(url);
    return undefined;
  }

  // if we're running remote, get the version from the URL in the format
  // *repoIdentity/vX.Y.Z/* or */vX.Y.Z/* if repoIdentity not supplied
  const repoVersionRegExp = options?.repoIdentity
    ? new RegExp(
      `${options.repoIdentity}/v?(?<version>\\d+\\.\\d+\\.\\d+)/`,
    )
    : /\/v?(?<version>\d+\.\d+\.\d+)\//;
  const matched = url.href.match(repoVersionRegExp);
  if (matched) {
    return `v${matched.groups!["version"]}`;
  }
  if (options?.onInvalidRemoteMatch) {
    return options.onInvalidRemoteMatch(repoVersionRegExp);
  }
  return undefined;
}
