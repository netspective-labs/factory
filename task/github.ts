import * as path from "https://deno.land/std@0.147.0/path/mod.ts";
import * as f from "./fetch.ts";
import * as colors from "https://deno.land/std@0.147.0/fmt/colors.ts";
import * as dzx from "https://deno.land/x/dzx@0.3.1/mod.ts";

export interface GitHubBinaryHandler {
  (
    fsPath: string,
    ghbs: GitHubBinarySource,
    options?: {
      readonly verbose?: boolean;
    },
  ): Promise<void>;
}

export function makeGitHubBinaryExecutable(): GitHubBinaryHandler {
  return async (fsPath) => {
    // 0o755 = owner can do anything, everyone can read/execute
    await Deno.chmod(fsPath, 0o755);
  };
}

export interface GitHubBinaryArchiveHandler {
  (
    archiveFsPath: string,
    finalize: GitHubBinaryHandler,
    ghbs: GitHubBinarySource,
    options?: {
      readonly verbose?: boolean;
    },
  ): Promise<string>;
}

export function extractSingleFileFromTarGZ(
  archiveName: string,
  destName: string = archiveName,
  esfOptions?: {
    readonly stripComponents?: number;
  },
): GitHubBinaryArchiveHandler {
  return async (archiveFsPath, finalize, ghbs, options) => {
    dzx.$.verbose = options?.verbose ?? false;
    if (esfOptions?.stripComponents) {
      await dzx
        .$`tar -xz -f ${archiveFsPath} -C ${ghbs.destPath} --strip-components=${esfOptions.stripComponents} ${archiveName}`;
    } else {
      await dzx
        .$`tar -xz -f ${archiveFsPath} -C ${ghbs.destPath} ${archiveName}`;
    }
    const destFsPath = path.join(ghbs.destPath, destName);
    await finalize(destFsPath, ghbs);
    return destFsPath;
  };
}

export async function gitHubRepoTags(
  { repo }: { readonly repo: string },
  options?: {
    readonly onFetchError?: (error: Error) => Promise<void>;
  },
) {
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${repo}/tags`,
    );
    return await resp.json() as { name: string }[];
  } catch (error) {
    options?.onFetchError?.(error);
    return undefined;
  }
}

export async function latestGitHubRepoTag(
  options: { readonly repo: string },
  defaultTag = "main",
) {
  const tags = await gitHubRepoTags(options);
  if (Array.isArray(tags) && tags.length > 0) {
    return tags[0].name;
  }
  return defaultTag;
}

export async function latestGitHubRepoRelease(
  { repo }: { readonly repo: string },
  options?: {
    readonly onFetchError?: (error: Error) => Promise<void>;
  },
) {
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${repo}/releases/latest`,
    );
    return await resp.json();
  } catch (error) {
    options?.onFetchError?.(error);
  }
}

export interface GitHubBinarySource {
  readonly repo: string;
  readonly destPath: string;
  readonly release: {
    readonly baseName: (latestRelease: { readonly tag_name: string }) => string;
    readonly unarchive?: GitHubBinaryArchiveHandler;
    readonly finalize?: GitHubBinaryHandler;
  };
}

export function ensureGitHubBinary(bin: GitHubBinarySource, options?: {
  verbose?: boolean;
  onFetchError?: (error: Error) => Promise<void>;
}) {
  return async () => {
    const verbose = options?.verbose;
    const latest = await latestGitHubRepoRelease(bin, options);
    const latestTagName = latest?.tag_name;
    await Deno.mkdir(bin.destPath, { recursive: true });
    const finalize = bin.release.finalize ?? makeGitHubBinaryExecutable();
    const baseName = bin.release.baseName(latest);
    const srcEndpoint =
      `https://github.com/${bin.repo}/releases/download/${latestTagName}/${baseName}`;
    const tmpDir = await Deno.makeTempDir();
    const tmpDownloadPath = path.join(tmpDir, baseName);
    await f.downloadAsset(
      srcEndpoint,
      bin.release.unarchive
        ? tmpDownloadPath
        : path.join(bin.destPath, baseName),
      async (srcEndpoint, destFile) => {
        if (verbose) {
          console.log(colors.yellow(srcEndpoint), colors.dim(destFile));
        }
        if (bin.release.unarchive) {
          await bin.release.unarchive(tmpDownloadPath, finalize, bin, options);
        } else {
          await finalize(destFile, bin);
        }
      },
      // deno-lint-ignore require-await
      async (error, destFile, srcEndpoint) => {
        console.error(error, colors.red(destFile), colors.dim(srcEndpoint));
      },
    );
  };
}
