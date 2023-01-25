import { colors, fs, path } from "./deps.ts";
import * as gip from "https://cdn.skypack.dev/gitignore-parser@0.0.2";

/**
 * Walk a root path and sym/hard link all content that matches globs.
 * @param originRootPath Where to start
 * @param destRootPath Where to put the sym/hard link referencing originRootPath glob
 * @param globs Optionally, the files to match
 */
export async function linkAssets(
  originRootPath: string,
  destRootPath: string,
  options: {
    readonly destExistsHandler?: (src: fs.WalkEntry, dest: string) => void;
  },
  ...globs: {
    readonly glob: string;
    readonly options?: fs.ExpandGlobOptions;
    readonly include?: (we: fs.WalkEntry) => boolean;
    readonly hardlink?: boolean;
  }[]
) {
  const handleDestExists = options.destExistsHandler ||
    ((src, dest) =>
      console.warn(colors.red(
        `unable to symlink ${src.path} to ${dest}: cannot overwrite destination`,
      )));
  for (const g of globs) {
    const options: fs.ExpandGlobOptions = {
      root: originRootPath,
      includeDirs: false,
      globstar: true,
      ...g.options,
    };
    for await (
      const a of fs.expandGlob(g.glob, options)
    ) {
      const include = g.include ? g.include(a) : a.isFile;
      if (include) {
        const relPath = path.relative(
          g.options?.root || originRootPath,
          a.path,
        );
        const dest = path.join(destRootPath, relPath);
        if (!fs.existsSync(dest)) {
          if (g.hardlink) {
            await fs.ensureLink(a.path, dest);
          } else {
            await fs.ensureSymlink(a.path, dest);
          }
        } else {
          handleDestExists(a, dest);
        }
      }
    }
  }
}

export interface SymlinkDirectoryChildrenOptions {
  readonly maxDepth?: number;
  readonly reportSync?: (src: string, dest: string) => void;
  readonly reportIgnore?: (ignored: fs.WalkEntry, spec: string) => void;
  readonly reportOriginNotFound?: (originRootPath: string) => void;
}

export const symlinkDirectoryChildrenConsoleReporters: Pick<
  SymlinkDirectoryChildrenOptions,
  "reportSync" | "reportIgnore" | "reportOriginNotFound"
> = {
  reportIgnore: (we, spec) =>
    console.log(colors.gray(`ignored ${we.path} from ${spec}`)),
  reportSync: (src, dest) =>
    console.log(colors.green(`symlinked ${src} to ${dest}`)),
  reportOriginNotFound: (originRootPath) => {
    console.warn(
      colors.red(
        `Unable to symlinkDirectoryChildren of ${
          colors.brightRed(originRootPath)
        }: path does not exist`,
      ),
    );
  },
};

/**
 * Symlink top-level directories under origin in destination
 * @param originRootPath The path to search for top-level directories
 * @param destRootPath The destination where the symlinks will reside
 * @param ignoreSpecFileName The name of a file which will act like .gitignore and ignore specific files from link request
 */
export async function symlinkDirectoryChildren(
  originRootPath: string,
  destRootPath: string,
  ignoreSpecFileName: string | undefined,
  options?: SymlinkDirectoryChildrenOptions,
) {
  if (fs.existsSync(originRootPath)) {
    const maxDepth = typeof options?.maxDepth === "number"
      ? options?.maxDepth
      : 1;
    const reportSync = options?.reportSync;
    const reportIgnore = options?.reportIgnore;
    // deno-lint-ignore no-explicit-any
    let rfIgnore: any | undefined;
    let topLevelIgnoreSpec: string | undefined;
    if (ignoreSpecFileName) {
      topLevelIgnoreSpec = path.join(
        originRootPath,
        ignoreSpecFileName,
      );
      if (fs.existsSync(topLevelIgnoreSpec)) {
        const decoder = new TextDecoder("utf-8");
        const tlIgnoreContent = Deno.readFileSync(topLevelIgnoreSpec);
        rfIgnore = gip.compile(decoder.decode(tlIgnoreContent));
      }
    }
    for await (
      const we of fs.walk(originRootPath, {
        maxDepth,
        includeDirs: true,
        includeFiles: true,
      })
    ) {
      if (we.path === originRootPath) continue;
      if (ignoreSpecFileName && we.name == ignoreSpecFileName) {
        if (reportIgnore) {
          reportIgnore(we, ignoreSpecFileName);
        }
        continue;
      }
      if (rfIgnore && rfIgnore.denies(we.name)) {
        if (reportIgnore && topLevelIgnoreSpec) {
          reportIgnore(we, topLevelIgnoreSpec);
        }
        continue;
      }
      const symLinkSrc = path.resolve(we.path);
      const symLinkDest = path.join(destRootPath, we.name);
      await fs.ensureSymlink(symLinkSrc, symLinkDest);
      if (reportSync) reportSync(symLinkSrc, symLinkDest);
    }
  } else {
    if (options?.reportOriginNotFound) {
      options.reportOriginNotFound(originRootPath);
    }
  }
}
