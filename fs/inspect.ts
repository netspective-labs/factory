import { fs } from "./deps.ts";

export interface InspectAssetsGlob {
  readonly originRootPath: string;
  readonly glob: string;
  readonly options?: fs.ExpandGlobOptions;
  readonly include?: (we: fs.WalkEntry) => boolean;
}

export interface InspectableAsset extends fs.WalkEntry {
  readonly srcGlob: InspectAssetsGlob;
  readonly srcGlobOptions: fs.ExpandGlobOptions;
}

/**
 * Walk a root path and yield assets whose name that matches globs.
 * @param originRootPath Where to start
 * @param globs Optionally, the files to match
 */
export async function* discoverAssets(
  ...globs: InspectAssetsGlob[]
): AsyncGenerator<InspectableAsset> {
  for (const srcGlob of globs) {
    const srcGlobOptions: fs.ExpandGlobOptions = {
      root: srcGlob.originRootPath,
      includeDirs: false,
      globstar: true,
      ...srcGlob.options,
    };
    for await (const a of fs.expandGlob(srcGlob.glob, srcGlobOptions)) {
      const include = srcGlob.include ? srcGlob.include(a) : a.isFile;
      if (include) {
        yield {
          ...a,
          srcGlob,
          srcGlobOptions,
        };
      }
    }
  }
}
