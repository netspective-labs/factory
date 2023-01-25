import { fs, path } from "./deps.ts";

export interface DiscoverPathResult {
  readonly searchGlob: string;
  readonly startSearchInAbsPath: string;
  readonly searchedPaths: { absPath: string; searchGlob: string }[];
  readonly found?: fs.WalkEntry & {
    pathRelative: (src: string) => string;
  };
}

/**
 * Look for search path, starting in startSearchInPath, and all parents and
 * descendants of siblings and parents.
 * @param searchGlob relative path to look for (e.g. netspective-labs/factory)
 * @param startSearchInAbsPath abs path of where to start (e.g. path.resolve(".."))
 * @returns what was searched and whether path was found
 */
export async function discoverGlob(
  searchGlob: string,
  startSearchInAbsPath: string,
): Promise<DiscoverPathResult> {
  const searchedPaths: { absPath: string; searchGlob: string }[] = [];
  async function findInDescendants(
    absPath: string,
  ): Promise<
    fs.WalkEntry & {
      pathRelative: (src: string) => string;
    } | undefined
  > {
    searchedPaths.push({ absPath, searchGlob });
    for await (const found of fs.expandGlob(searchGlob, { root: absPath })) {
      return {
        ...found,
        pathRelative: (src) => path.relative(src, found?.path),
      };
    }
    const parent = path.dirname(absPath);
    if (parent && parent.length > 0 && parent != ".") {
      return findInDescendants(parent);
    }
    return undefined;
  }

  const found = await findInDescendants(startSearchInAbsPath);
  return {
    searchGlob,
    startSearchInAbsPath,
    searchedPaths,
    found,
  };
}
