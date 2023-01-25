import { path } from "../deps.ts";
import * as git from "../../git/mod.ts";
import * as r from "../mod.ts";

export const gitLabRemoteID = "gitLab-remote" as const;
export const vsCodeLocalID = "vscode-local" as const;

export interface GitRemoteHtmlAnchor extends git.GitAsset {
  readonly href: string;
  readonly textContent: string;
}

export type GitAssetUrlResolverIdentity =
  | typeof gitLabRemoteID
  | typeof vsCodeLocalID;

export function gitLabAssetUrlResolver(
  glEndpoint: string,
): git.GitWorkTreeAssetUrlResolver<GitAssetUrlResolverIdentity> {
  return {
    identity: gitLabRemoteID,
    gitAssetUrl: (asset) => {
      return `${glEndpoint}/-/tree/${asset.gitBranchOrTag}/${asset.assetPathRelToWorkTree}`;
    },
  };
}

export function gitLabRemoteCommitResolver(
  glEndpoint: string,
): git.GitRemoteCommitResolver<"hash"> {
  return (commit, paths) => {
    const remoteURL = `${glEndpoint}/-/commit/${commit.hash}`;
    // deno-lint-ignore no-explicit-any
    const result: git.GitRemoteCommit<any> = {
      commit,
      remoteURL,
      paths,
    };
    return result;
  };
}

export function gitLabWorkTreeAssetVsCodeURL(
  _glEndpoint: string,
): git.GitWorkTreeAssetUrlResolver<
  GitAssetUrlResolverIdentity
> {
  return {
    identity: vsCodeLocalID,
    gitAssetUrl: () => `TODO`,
  };
}

export function gitLabResolvers(
  gitLabRemoteUrlPrefix: string,
  remoteServerHumanName: string,
) {
  const assetUrlResolver = gitLabAssetUrlResolver(gitLabRemoteUrlPrefix);
  const commitResolver = gitLabRemoteCommitResolver(gitLabRemoteUrlPrefix);
  const gitWorkTreeAssetVsCodeURL = gitLabWorkTreeAssetVsCodeURL(
    gitLabRemoteUrlPrefix,
  );

  const mGitResolvers: git.ManagedGitResolvers<string> = {
    ...git.typicalGitWorkTreeAssetUrlResolvers<string>(
      assetUrlResolver,
      gitWorkTreeAssetVsCodeURL,
    ),
    remoteCommit: commitResolver,
    workTreeAsset: git.typicalGitWorkTreeAssetResolver,
    cicdBuildStatusHTML: () =>
      `<a href="${gitLabRemoteUrlPrefix}/-/commits/master"><img alt="pipeline status" src="${gitLabRemoteUrlPrefix}/badges/master/pipeline.svg"/></a>`,
  };

  const routeGitRemoteResolver: r.RouteGitRemoteResolver<GitRemoteHtmlAnchor> =
    (route, branch, paths) => {
      if (route.origin && r.isModuleRouteOrigin(route.origin)) {
        const candidate = route.origin.moduleImportMetaURL;
        if (candidate.startsWith("file:")) {
          const asset = mGitResolvers.workTreeAsset(
            path.fromFileUrl(candidate),
            branch,
            paths,
          );
          if (asset) {
            const href = assetUrlResolver.gitAssetUrl(asset);
            if (href) {
              const result: GitRemoteHtmlAnchor = {
                ...asset,
                href,
                textContent: `${route.origin.label} in ${
                  path.basename(asset.assetPathRelToWorkTree)
                } on ${remoteServerHumanName}`,
              };
              return result;
            }
          }
        }
      }

      const terminal = route.terminal;
      if (terminal) {
        if (r.isFileSysRouteUnit(terminal)) {
          const asset = mGitResolvers.workTreeAsset(
            terminal.fileSysPath,
            branch,
            paths,
          );
          if (asset) {
            const href = assetUrlResolver.gitAssetUrl(asset);
            if (href) {
              const result: GitRemoteHtmlAnchor = {
                ...asset,
                href,
                textContent:
                  `${terminal.fileSysPathParts.base} on ${remoteServerHumanName}`,
              };
              return result;
            }
          }
        }
      }
      return undefined;
    };

  return {
    mGitResolvers,
    routeGitRemoteResolver,
  };
}
