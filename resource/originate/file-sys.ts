import { fs, path } from "../deps.ts";
import * as safety from "../../safety/mod.ts";
import * as govn from "../governance.ts";
import * as r from "../../route/mod.ts";
import * as md from "../markdown/mod.ts";
import * as module from "../module.ts";
import * as html from "../html/mod.ts";

// TODO: support JS/TS/CSS bundle "twins" instead of old-style RF

// deno-lint-ignore no-explicit-any
type Any = any;

export type OriginationError = { originationError: Error };

export const isOriginationError = safety.typeGuard<OriginationError>(
  "originationError",
);

export interface FileExtnOriginationFactory<Resource> {
  factory: (fsPath: string) => Promise<
    | ((
      we: r.RouteSupplier & {
        fsPath: string;
        diagnostics?: (error: Error, message?: string) => string;
      },
      options?: r.FileSysRouteOptions,
    ) => Resource | undefined)
    | OriginationError
    | undefined
  >;
}

export interface FilePathWalkContext {
  readonly fpSupplier: FilePathsSupplier;
  readonly fsPath: string;
  readonly fsRouteOptions: r.FileSysRouteOptions;
}

export interface FilePathsSupplier {
  readonly label?: string;
  readonly rootPath: string;
  readonly files: (
    defaultRouteOptions: r.FileSysRouteOptions,
  ) => AsyncIterable<FilePathWalkContext>;
  readonly relative: (path: string) => string;
  readonly fileSuffixes: (path: string) => string;
  readonly onOriginated?: <Resource>(
    resource: Resource,
    fsPath: string,
    fsWalkCtx?: FilePathWalkContext,
  ) => Promise<void>;
  readonly onOriginationError?: (
    fsPath: string,
    oe: OriginationError,
    fsWalkCtx?: FilePathWalkContext,
  ) => Promise<void>;
  readonly fsrOptionsSupplier?: (path: string) => r.FileSysRouteOptions;
  readonly forceIsOriginationSupplier?: boolean;
}

export interface FilePathWalkContextSupplier {
  readonly fsWalkCtx: FilePathWalkContext;
}

export interface FileSysWalkGlob extends FilePathsSupplier {
  readonly glob: string;
  readonly include: (we: fs.WalkEntry) => boolean;
  readonly globOptions?: (path: string) => fs.ExpandGlobOptions;
}

export interface FileSysWalkGlobContext extends FilePathWalkContext {
  readonly entry: fs.WalkEntry;
  readonly globOptions?: fs.ExpandGlobOptions;
}

export interface FileSysWalkGlobContextSupplier
  extends FilePathWalkContextSupplier {
  readonly fsWalkCtx: FileSysWalkGlobContext;
}

export function walkFilesBase(
  rootPath: string,
  inherit?: Partial<Omit<FilePathsSupplier, "rootPath" | "files">>,
) {
  return {
    rootPath,
    label: inherit?.label ?? path.basename(rootPath),
    relative: (fsPath: string) => path.relative(rootPath, fsPath),
    fileSuffixes: (fsPath: string) => {
      // we don't use path.extname(fsPath) because it only returns last suffix
      const basename = path.basename(fsPath);
      const firstSuffixIndex = basename.indexOf(".");
      return firstSuffixIndex >= 0 ? basename.slice(firstSuffixIndex) : "";
    },
  };
}

export function walkGlobbedFilesExcludeGit(
  rootPath: string,
  glob = "**/*",
  inherit?: Partial<Omit<FileSysWalkGlob, "rootPath" | "glob">>,
) {
  const fswGlob: FileSysWalkGlob = {
    ...walkFilesBase(rootPath),
    glob,
    include: inherit?.include ?? ((we) => we.isFile),
    globOptions: inherit?.globOptions ?? ((path) => ({
      root: path,
      includeDirs: false,
      globstar: true,
      extended: true,
      exclude: [".git"],
    })),
    files: async function* (defaultRouteOptions) {
      const { glob, rootPath, fsrOptionsSupplier } = fswGlob;
      const fsRouteOptions = fsrOptionsSupplier
        ? fsrOptionsSupplier(rootPath)
        : defaultRouteOptions;
      const globOptions = fswGlob.globOptions?.(rootPath);
      const globCtx = { fswGlob, globOptions, fsRouteOptions };
      for await (const we of fs.expandGlob(glob, globOptions)) {
        const fsWalkCtx: FileSysWalkGlobContext = {
          fsPath: we.path,
          fpSupplier: fswGlob,
          entry: we,
          ...globCtx,
        };
        yield fsWalkCtx;
      }
    },
  };
  return fswGlob;
}

export const isWalkGlobContextSupplier = safety.typeGuard<
  FileSysWalkGlobContextSupplier
>("fsWalkCtx");

export const isWalkGlobContextOriginationSupplier = (
  o: unknown,
): o is govn.OriginationSupplier<FileSysWalkGlobContextSupplier> => {
  if (
    govn.isOriginationSupplier(o) && isWalkGlobContextSupplier(o.origination)
  ) {
    return true;
  }
  return false;
};

export function typicalfsFileSuffixOriginators(
  defaultRouteOptions: r.FileSysRouteOptions,
  typicalSuffixOptions?: {
    readonly markdownRS?: md.MarkdownRenderStrategy;
    readonly onOriginated?: <Resource>(
      resource: Resource,
      fsPath: string,
      walkCtx?: FilePathWalkContext,
    ) => Promise<void>;
    readonly onOriginationError?: (
      fsPath: string,
      oe: OriginationError,
      walkCtx?: FilePathWalkContext,
    ) => Promise<void>;
  },
) {
  const { extensionsManager: em } = defaultRouteOptions;
  const originators = new Map<string, FileExtnOriginationFactory<Any>>();

  /**
   * Given a path, check only the file name for all extensions like .md or .md.ts
   * @param fsPath either a relative or absolute path with file name and extension
   * @returns all the extensions and modifiers
   */
  const allExtns = (fsPath: string) => {
    const fileName = path.basename(fsPath);
    return fileName.slice(fileName.indexOf("."));
  };
  const loc = path.basename(import.meta.url);
  const oe = (message: string) => ({
    originationError: new Error(
      `${message} (${loc}::typicalfsFileSuffixOriginators)`,
    ),
  });

  const moduleSuffixFactory = module.fsFileSuffixModuleOriginator(em);
  const moduleSuffixOriginator: FileExtnOriginationFactory<Any> = {
    // deno-lint-ignore require-await
    factory: async (fsPath) => {
      const factory = moduleSuffixFactory(fsPath);
      if (!factory) {
        return oe("moduleSuffixFactory should not return undefined");
      }
      return async (we, options) => {
        return await factory.instance(we, options ?? defaultRouteOptions);
      };
    },
  };
  originators.set(".rf.ts", moduleSuffixOriginator);
  originators.set(".rf.js", moduleSuffixOriginator);

  const mdSuffixFactory = md.fsFileSuffixRenderedMarkdownResourceOriginator(
    em,
    typicalSuffixOptions?.markdownRS,
  );
  const mdSuffixOriginator: FileExtnOriginationFactory<Any> = {
    // deno-lint-ignore require-await
    factory: async (fsPath) => {
      const factory = mdSuffixFactory(fsPath);
      if (!factory) return oe("mdSuffixFactory should not return undefined");
      return async (we, options) => {
        return await factory.instance(we, options);
      };
    },
  };
  originators.set(".md", mdSuffixOriginator);
  originators.set(".md.ts", mdSuffixOriginator);

  const htmlSuffixFactory = html.fsFileSuffixHtmlResourceOriginator(em);
  const htmlSuffixOriginator: FileExtnOriginationFactory<Any> = {
    // deno-lint-ignore require-await
    factory: async (fsPath) => {
      const factory = htmlSuffixFactory(fsPath);
      if (!factory) return oe("htmlSuffixFactory should not return undefined");
      return async (we, options) => {
        return await factory.instance(we, options);
      };
    },
  };
  originators.set(".html", htmlSuffixOriginator); // html with optional frontmatter
  originators.set(".fm.html", htmlSuffixOriginator); // alias for above, .fm means frontmatter
  // TODO: originators.set(".html.ts", htmlExtnOriginator);

  const result = {
    originators,
    allExtns,
    originator: (fsPath: string) => originators.get(allExtns(fsPath)),
    instance: async <Resource>(
      origin: r.RouteSupplier & {
        fsPath: string;
        diagnostics?: (error: Error, message?: string) => string;
      },
      options?: r.FileSysRouteOptions,
      fsWalkCtx?: FilePathWalkContext,
    ) => {
      const fsPath = origin.fsPath;
      const originator = result?.originator(fsPath);
      if (originator) {
        const factory = await originator.factory(fsPath);
        if (factory) {
          if (isOriginationError(factory)) {
            const onError = fsWalkCtx?.fpSupplier?.onOriginationError ??
              typicalSuffixOptions?.onOriginationError;
            onError?.(fsPath, factory, fsWalkCtx);
            return undefined;
          } else {
            const instance = factory(origin, options) as Resource;
            const onOriginated = fsWalkCtx?.fpSupplier?.onOriginated ??
              typicalSuffixOptions?.onOriginated;
            onOriginated?.(instance, fsPath, fsWalkCtx);
            return instance;
          }
        }
      }
      return undefined;
    },
    instances: async function* <Resource>(fps: Iterable<FilePathsSupplier>) {
      for (const fp of fps) {
        for await (const fsWalkCtx of fp.files(defaultRouteOptions)) {
          const { fsPath, fsRouteOptions } = fsWalkCtx;
          const instance = await result.instance(
            {
              fsPath: fsWalkCtx.fsPath,
              route: await fsRouteOptions.fsRouteFactory.fsRoute(
                fsPath,
                fp.rootPath,
                fsRouteOptions,
              ),
            },
            fsRouteOptions,
            fsWalkCtx,
          );
          if (instance && (fp?.forceIsOriginationSupplier ?? true)) {
            const isForced = "${loc}::typicalfsFileSuffixOriginators";
            govn.mutateOrigination(instance, (instance) => {
              instance.origination = {
                fsWalkCtx,
                isForcedOriginationSupplier: isForced,
              };
              return instance;
            }, (instance) => {
              if (!isWalkGlobContextSupplier(instance.origination)) {
                (instance.origination as Any).fsWalkCtx = fsWalkCtx;
                (instance.origination as Any).isForcedOriginationSupplier =
                  isForced;
              }
              return instance;
            });
          }
          if (instance) yield instance as Resource;
        }
      }
    },
  };
  return result;
}
