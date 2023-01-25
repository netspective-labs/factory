import { events } from "./deps.ts";
import * as fsi from "../fs/inspect.ts";

export interface TypescriptSupplier {
  readonly tsSrcRootSpecifier: string;
}

export interface CssTarget {
  readonly cssAbsPath: string; // original, untouched, filename
  readonly cssBaseName: string;
  readonly cssMinify: boolean;
}

export interface CssTargetTsTwin extends CssTarget, TypescriptSupplier {
  readonly tsSrcRootSpecifierExists: () => Promise<Deno.FileInfo | false>;
}

export interface BundledStylesheetEvent extends TypescriptSupplier {
  readonly transformed: string;
}

export interface BundledStylesheetSupplier {
  readonly bundledCSS: () => string;
}

export interface NotBundledTypescriptEvent<ReasonCtx>
  extends TypescriptSupplier {
  readonly reason:
    | "business-rule"
    | "src-not-found"
    | "diagnosable-issue"
    | "undiagnosable-error"
    | string;
  readonly reasonCtx?: ReasonCtx;
}

export class TransformStylesheetEventEmitter extends events.EventEmitter<{
  bundledToCSS(
    evt: BundledStylesheetEvent & BundledStylesheetSupplier,
  ): Promise<void>;
  persistedToCSS(
    cssTarget: CssTarget,
    evt: BundledStylesheetEvent & BundledStylesheetSupplier,
  ): Promise<void>;
  notBundledToCSS(
    evt: NotBundledTypescriptEvent<unknown> & {
      readonly error?: Error;
    },
  ): Promise<void>;
  diagnosableBundleIssue(evt: BundledStylesheetEvent): Promise<void>;
  undiagnosableBundleError(ts: TypescriptSupplier, e: Error): Promise<void>;
}> {}

export interface TransformStylesheetOptions {
  readonly ee?: TransformStylesheetEventEmitter;
  readonly shouldBundle?: (
    rootSpecifier: string,
    dfi: Deno.FileInfo,
  ) => Promise<true | [string, unknown]>;
  readonly onBundledToCSS: (
    evt: BundledStylesheetEvent & BundledStylesheetSupplier,
  ) => Promise<void>;
}

export async function transformTypescriptToJS(
  ts: TypescriptSupplier,
  options?: TransformStylesheetOptions,
) {
  const { tsSrcRootSpecifier } = ts;
  try {
    const stat = await Deno.lstat(tsSrcRootSpecifier);
    if (options?.shouldBundle) {
      const should = await options.shouldBundle(tsSrcRootSpecifier, stat);
      if (should != true) {
        const [reason, reasonCtx] = should;
        await options?.ee?.emit("notBundledToCSS", {
          reason: reason || "business-rule",
          reasonCtx,
          ...ts,
        });
        return;
      }
    }
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      await options?.ee?.emit("notBundledToCSS", {
        reason: "src-not-found",
        ...ts,
        error: err,
      });
      return;
    }
    throw err;
  }

  try {
    const module = await import(tsSrcRootSpecifier);
    if (module && module.default) {
      let transformed: string | undefined;
      switch (typeof module.default) {
        case "function":
          transformed = module.default();
          break;
        case "string":
          transformed = module.default;
          break;
      }
      if (transformed) {
        const event = {
          ...ts,
          transformed,
          bundledCSS: () => transformed!,
        };
        options?.onBundledToCSS?.(event);
        await options?.ee?.emit("bundledToCSS", event);
      } else {
        await options?.ee?.emit("diagnosableBundleIssue", {
          ...ts,
          transformed:
            `no default text or function returning text available in ${tsSrcRootSpecifier}`,
        });
        await options?.ee?.emit("notBundledToCSS", {
          ...ts,
          reason: "diagnosable-issue",
          reasonCtx:
            `no default text or function returning text available in ${tsSrcRootSpecifier}`,
        });
      }
    }
  } catch (error) {
    await options?.ee?.emit("undiagnosableBundleError", ts, error);
    await options?.ee?.emit("notBundledToCSS", {
      reason: "undiagnosable-error",
      ...ts,
      error,
    });
  }
}

export interface cssTsTwinNamingStrategy {
  (cssAbsPath: string): CssTarget;
}

/**
 * Accept a file path like *.(auto?).css and normalize it to *.css
 * @param cssAbsPath the full path with .auto., .min, .css modifiers
 * @returns "normalized" file with just *.css and no .auto., min
 */
export const typicalCssNamingStrategy: cssTsTwinNamingStrategy = (
  cssAbsPath,
) => {
  // if the output file looks like xyz.auto.{js,cjs,mjs} rename it to xyz.js so that
  // the Typescript "twin" doesnt have the word auto/min in there and is normalized to .js
  let cssMinify = false;
  let cssBaseName = cssAbsPath.replace(".auto.", ".");
  if (cssBaseName.indexOf(".min.") > 0) {
    cssMinify = true;
    cssBaseName = cssBaseName.replace(".min.", ".");
  }
  return { cssAbsPath, cssBaseName, cssMinify };
};

export function cssPotentialTsTwin(
  cssTarget: CssTarget,
): CssTargetTsTwin {
  const tsSrcRootSpecifier = `${cssTarget.cssBaseName}.ts`;
  return {
    ...cssTarget,
    tsSrcRootSpecifier,
    tsSrcRootSpecifierExists: async () => {
      try {
        return await Deno.lstat(tsSrcRootSpecifier);
      } catch (error) {
        // if the *.js doesn't exist we want to build it
        if (error instanceof Deno.errors.NotFound) {
          return false;
        }
        throw error;
      }
    },
  };
}

export async function bundleCssFromTsTwin(
  twin: CssTargetTsTwin,
  ee?: TransformStylesheetEventEmitter,
) {
  await transformTypescriptToJS(twin, {
    ee,
    onBundledToCSS: async (event) => {
      const bundle =
        `/* Code generated by bundle-css.ts. DO NOT EDIT. */\n${event.bundledCSS()}`;
      await Deno.writeTextFile(twin.cssAbsPath, bundle);
      await ee?.emit("persistedToCSS", twin, event);
    },
  });
}

export async function bundleCssFromTsTwinIfNewer(
  twin: CssTargetTsTwin,
  ee?: TransformStylesheetEventEmitter,
) {
  await transformTypescriptToJS(twin, {
    ee,
    shouldBundle: async (src, srcStat) => {
      let destStat: Deno.FileInfo;
      try {
        destStat = await Deno.lstat(twin.cssAbsPath);
      } catch (error) {
        // if the *.js doesn't exist we want to build it
        if (error instanceof Deno.errors.NotFound) {
          return true;
        }
        return ["should-bundle-exception", {
          src,
          srcStat,
          dest: twin.cssAbsPath,
          error,
          twin,
        }];
      }

      if (srcStat.mtime && destStat.mtime) {
        if (srcStat.mtime.getTime() < destStat.mtime.getTime()) {
          return ["dest-is-newer-than-src", {
            src,
            srcStat,
            dest: twin.cssAbsPath,
            destStat,
            twin,
          }];
        }
      }
      return true;
    },
    onBundledToCSS: async (event) => {
      const bundle =
        `/* Code generated by bundle-css.ts. DO NOT EDIT. */\n${event.bundledCSS()}`;
      await Deno.writeTextFile(twin.cssAbsPath, bundle);
      await ee?.emit("persistedToCSS", twin, event);
    },
  });
}

export interface CssTargetTsTwinSupplier {
  (): AsyncGenerator<CssTargetTsTwin>;
}

export async function bundleCssTargets(
  supplier: CssTargetTsTwinSupplier,
  observer: TransformStylesheetEventEmitter,
) {
  for await (const jsTarget of supplier()) {
    const twin = cssPotentialTsTwin(jsTarget);
    await bundleCssFromTsTwin(twin, observer);
  }
}

export interface CssTargetsSupplierOptions {
  readonly originRootPath: string;
  readonly jsDiscoverGlob: string;
  readonly filter?: (twin: CssTargetTsTwin) => Promise<boolean>;
}

export function allCssTargets(
  originRootPath = Deno.cwd(),
): CssTargetsSupplierOptions {
  return {
    originRootPath,
    jsDiscoverGlob: "**/*.css",
  };
}

export function allCssTargetsWithTsTwins(
  originRootPath = Deno.cwd(),
): CssTargetsSupplierOptions {
  return {
    originRootPath,
    jsDiscoverGlob: "**/*.css",
    filter: async (twin) => {
      return await twin.tsSrcRootSpecifierExists() ? true : false;
    },
  };
}

export function allCssTargetsWithoutTsTwins(
  originRootPath = Deno.cwd(),
): CssTargetsSupplierOptions {
  return {
    originRootPath,
    jsDiscoverGlob: "**/*.css",
    filter: async (twin) => {
      return await twin.tsSrcRootSpecifierExists() ? false : true;
    },
  };
}

/**
 * Discover all potential *.css.ts files with intentional target twins. The
 * default bundler rules are:
 * 1. Find all *.css files in the originRootPath
 * 2. For each *.css file, see if it has a "twin" *.css.ts
 * 3. If a CSS file is called xyz.auto.css (a good convention), .auto. or .min
 * is removed before checking.
 * @param originRootPath which directory to start in, defaults to Deno.cwd()
 * @param jsDiscoverGlob which glob of files in originRootPath to match
 */
export function cssTargetsSupplier(
  options: CssTargetsSupplierOptions,
): CssTargetTsTwinSupplier {
  return async function* () {
    const filter = options?.filter;
    for await (
      const asset of fsi.discoverAssets({
        originRootPath: options.originRootPath,
        glob: options.jsDiscoverGlob,
      })
    ) {
      const twin = cssPotentialTsTwin(typicalCssNamingStrategy(asset.path));
      if (filter) {
        if (await filter(twin)) {
          yield twin;
        }
      } else {
        yield twin;
      }
    }
  };
}
