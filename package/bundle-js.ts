import { denoEmit as de, events } from "./deps.ts";
import * as terser from "https://cdn.jsdelivr.net/gh/lumeland/terser-deno@v5.13.1/deno/mod.js";
import * as fsi from "../fs/inspect.ts";
import * as graph from "../module/graph.ts";

export interface CacheableTypescriptSource {
  readonly ts: TypescriptSupplier;
  readonly tsSrcFileStat: Deno.FileInfo;
  readonly javaScript: string;
  isNewerThanCached: (fi: Deno.FileInfo) => Promise<boolean>;
}

export type TsSrcFileJsCache = Map<string, CacheableTypescriptSource>;

export async function transformTypescriptToCacheableJS(
  tsJsCache: TsSrcFileJsCache,
  ts: TypescriptSupplier,
  options?: TransformTypescriptOptions & {
    cacheKey?: string;
    readonly minify: boolean;
  },
) {
  const cacheKey = options?.cacheKey ?? ts.tsSrcRootSpecifier;
  const tsSrcFileStat = await Deno.lstat(ts.tsSrcRootSpecifier);
  let cached = tsJsCache.get(cacheKey);
  console.log({ cached, cacheKey });
  if (!cached || await cached.isNewerThanCached(tsSrcFileStat)) {
    await transformTypescriptToJS(ts, {
      onBundledToJS: async (event) => {
        const javaScript = options?.minify
          ? await event.minifiedJS()
          : await event.bundledJS();
        cached = {
          ts,
          tsSrcFileStat,
          javaScript,
          isNewerThanCached: async (fi: Deno.FileInfo) => {
            const fiMtimeValue = fi.mtime?.valueOf();
            console.log({ ts, fi });
            if (tsSrcFileStat.mtime && fiMtimeValue) {
              if (fiMtimeValue > tsSrcFileStat.mtime.valueOf()) {
                return true;
              }
            }

            if (fiMtimeValue) {
              const deps = await graph.moduleGraphs.localDependenciesFileInfos(
                ts.tsSrcRootSpecifier,
                false,
                // deno-lint-ignore require-await
                async (error) => {
                  console.error(error);
                  return undefined;
                },
              );
              if (deps && deps.length > 0) {
                for (const dep of deps) {
                  if (dep.localFileInfo?.mtime) {
                    if (fiMtimeValue > dep.localFileInfo?.mtime.valueOf()) {
                      return true;
                    }
                  }
                }
              }
            }

            // if we don't have mtime we'll cache forever
            return false;
          },
        };
        tsJsCache.set(cacheKey, cached);
      },
    });
  }
  return cached;
}

export interface TerserOptions {
  /** Use when minifying an ES6 module. */
  module: boolean;

  /** To compress the code */
  compress: boolean;

  /** Pass false to skip mangling names */
  mangle: boolean;

  /** To generate a source map */
  sourceMap?: {
    filename: string;
    url: string;
  };
}

export interface TypescriptSupplier {
  readonly tsEmitBundle: "classic" | "module";
  readonly tsSrcRootSpecifier: string;
}

export interface JsTarget {
  readonly jsAbsPath: string; // original, untouched, filename
  readonly jsBaseName: string;
  readonly jsNature: "module" | "classic";
  readonly jsMinify: boolean;
}

export interface JsTargetTsTwin extends JsTarget, TypescriptSupplier {
  readonly tsSrcRootSpecifierExists: () => Promise<Deno.FileInfo | false>;
}

export interface BundledTypescriptEvent extends TypescriptSupplier {
  readonly bundleEmit: de.BundleEmit;
}

export interface BundledJavascriptSupplier {
  readonly bundledJS: () => Promise<string>;
  readonly minifiedJS: () => Promise<string>;
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

export class TransformTypescriptEventEmitter extends events.EventEmitter<{
  bundledToJS(
    evt: BundledTypescriptEvent & BundledJavascriptSupplier,
  ): Promise<void>;
  persistedToJS(
    jsTarget: JsTarget,
    evt: BundledTypescriptEvent & BundledJavascriptSupplier,
  ): Promise<void>;
  notBundledToJS(
    evt: NotBundledTypescriptEvent<unknown> & {
      readonly bundleEmit?: de.BundleEmit;
      readonly error?: Error;
    },
  ): Promise<void>;
  diagnosableBundleIssue(evt: BundledTypescriptEvent): Promise<void>;
  undiagnosableBundleError(ts: TypescriptSupplier, e: Error): Promise<void>;
}> {}

export interface TransformTypescriptOptions {
  readonly ee?: TransformTypescriptEventEmitter;
  readonly shouldBundle?: (
    rootSpecifier: string,
    dfi: Deno.FileInfo,
  ) => Promise<true | [string, unknown]>;
  readonly onBundledToJS?: (
    evt: BundledTypescriptEvent & BundledJavascriptSupplier,
  ) => Promise<void>;
  readonly bundleOptions?: de.BundleOptions;
}

export async function transformTypescriptToJS(
  ts: TypescriptSupplier,
  options?: TransformTypescriptOptions,
) {
  const { tsSrcRootSpecifier } = ts;
  try {
    const stat = await Deno.lstat(tsSrcRootSpecifier);
    if (options?.shouldBundle) {
      const should = await options.shouldBundle(tsSrcRootSpecifier, stat);
      if (should != true) {
        const [reason, reasonCtx] = should;
        await options?.ee?.emit("notBundledToJS", {
          reason: reason || "business-rule",
          reasonCtx,
          ...ts,
        });
        return;
      }
    }
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      await options?.ee?.emit("notBundledToJS", {
        reason: "src-not-found",
        ...ts,
        error: err,
      });
      return;
    }
    throw err;
  }

  try {
    const bundle = ts.tsEmitBundle || "module";
    const bundleEmit = await de.bundle(tsSrcRootSpecifier, {
      type: bundle,
      compilerOptions: {
        checkJs: true,
        sourceMap: false,
        inlineSourceMap: false,
      },
      ...options?.bundleOptions,
    });
    const event = {
      ...ts,
      bundleEmit,
      // deno-lint-ignore require-await
      bundledJS: async () => bundleEmit.code,
      minifiedJS: async () => {
        const minified = await terser.minify({
          ["jsCode"]: bundleEmit.code,
        }, {
          module: bundle == "module" ? true : false,
          compress: true,
          mangle: false,
        });
        return minified.code;
      },
    };
    options?.onBundledToJS?.(event);
    await options?.ee?.emit("bundledToJS", event);
  } catch (error) {
    await options?.ee?.emit("undiagnosableBundleError", ts, error);
    await options?.ee?.emit("notBundledToJS", {
      reason: "undiagnosable-error",
      ...ts,
      error,
    });
  }
}

export interface JsTargetNamingStrategy {
  (jsAbsPath: string): JsTarget;
}

/**
 * Accept a file path like *.(auto?).{js,cjs,mjs} and normalize it to *.js
 * @param jsAbsPath the full path with .auto., .js, .cjs, or .mjs modifiers
 * @returns "normalized" file with just *.js and no .auto., cjs, or mjs and type of module to emit
 */
export const typicalJsNamingStrategy: JsTargetNamingStrategy = (
  jsAbsPath,
) => {
  // if the output file looks like xyz.auto.{js,cjs,mjs} rename it to xyz.js so that
  // the Typescript "twin" doesnt have the word auto/min in there and is normalized to .js
  let jsMinify = false;
  let jsBaseName = jsAbsPath.replace(".auto.", ".");
  if (jsBaseName.indexOf(".min.") > 0) {
    jsMinify = true;
    jsBaseName = jsBaseName.replace(".min.", ".");
  }
  let jsNature: "module" | "classic" = "module";
  if (jsBaseName.endsWith(".cjs")) {
    jsNature = "classic";
    jsBaseName = jsBaseName.replace(/\.cjs$/i, ".js");
  } else {
    if (jsBaseName.endsWith(".mjs")) {
      jsBaseName = jsBaseName.replace(/\.mjs$/i, ".js");
    }
  }
  return { jsAbsPath, jsBaseName, jsNature, jsMinify };
};

export function jsPotentialTsTwin(jsTarget: JsTarget): JsTargetTsTwin {
  const tsSrcRootSpecifier = `${jsTarget.jsBaseName}.ts`;
  return {
    ...jsTarget,
    tsSrcRootSpecifier,
    tsEmitBundle: jsTarget.jsNature,
    tsSrcRootSpecifierExists: async () => {
      try {
        return await Deno.lstat(tsSrcRootSpecifier);
      } catch (error) {
        // if the *.ts doesn't exist it has no twin
        if (error instanceof Deno.errors.NotFound) {
          return false;
        }
        throw error;
      }
    },
  };
}

export async function bundleJsFromTsTwin(
  twin: JsTargetTsTwin,
  ee?: TransformTypescriptEventEmitter,
) {
  await transformTypescriptToJS(twin, {
    ee,
    onBundledToJS: async (event) => {
      await Deno.writeTextFile(
        twin.jsAbsPath,
        twin.jsMinify ? await event.minifiedJS() : await event.bundledJS(),
      );
      await ee?.emit("persistedToJS", twin, event);
    },
  });
}

export async function bundleJsFromTsTwinIfNewer(
  twin: JsTargetTsTwin,
  ee?: TransformTypescriptEventEmitter,
) {
  await transformTypescriptToJS(twin, {
    ee,
    shouldBundle: async (src, srcStat) => {
      let destStat: Deno.FileInfo;
      try {
        destStat = await Deno.lstat(twin.jsAbsPath);
      } catch (error) {
        // if the *.js doesn't exist we want to build it
        if (error instanceof Deno.errors.NotFound) {
          return true;
        }
        return ["should-bundle-exception", {
          src,
          srcStat,
          dest: twin.jsAbsPath,
          error,
          twin,
        }];
      }

      const destMTime = destStat.mtime?.getTime();
      if (!destMTime) {
        // unable to determine mtime so just always build
        return true;
      }

      if (srcStat.mtime) {
        if (srcStat.mtime.getTime() > destMTime) {
          // the source file is newer than dest, so emit bundle
          return true;
        }
      }

      const deps = await graph.moduleGraphs.localDependenciesFileInfos(
        src,
        false,
        // deno-lint-ignore require-await
        async (error) => {
          console.error(error);
          return undefined;
        },
      );
      if (deps && deps.length > 0) {
        for (const dep of deps) {
          const depMTime = dep.localFileInfo?.mtime?.getTime();
          if (depMTime && depMTime > destMTime) {
            // a dependent file is newer than the destination, so emit bundle
            return true;
          }
        }
      }

      // if we get to here, it means dest is newer than source and deps
      return ["dest-is-newer-than-src", {
        src,
        srcStat,
        deps,
        dest: twin.jsAbsPath,
        destStat,
        twin,
      }];
    },
    onBundledToJS: async (event) => {
      await Deno.writeTextFile(
        twin.jsAbsPath,
        twin.jsMinify ? await event.minifiedJS() : await event.bundledJS(),
      );
      await ee?.emit("persistedToJS", twin, event);
    },
  });
}

export interface JsTargetTsTwinSupplier {
  (): AsyncGenerator<JsTargetTsTwin>;
}

/**
 * Bundle given *.js.ts supply of JsTargets and re-generate the JsTarget's
 * "twin" *.{js,cjs,mjs} file by using Deno.emit().
 * @param supplier which directory to start in, defaults to Deno.cwd()
 */
export async function bundleJsTargets(
  supplier: JsTargetTsTwinSupplier,
  observer: TransformTypescriptEventEmitter,
) {
  for await (const jsTarget of supplier()) {
    const twin = jsPotentialTsTwin(jsTarget);
    await bundleJsFromTsTwin(twin, observer);
  }
}

export interface JsTargetsSupplierOptions {
  readonly originRootPath: string;
  readonly jsDiscoverGlob: string;
  readonly filter?: (jsTarget: JsTargetTsTwin) => Promise<boolean>;
}

export function allJsTargets(
  originRootPath = Deno.cwd(),
): JsTargetsSupplierOptions {
  return {
    originRootPath,
    jsDiscoverGlob: "**/*.{js,cjs,mjs}",
  };
}

export function allJsTargetsWithTsTwins(
  originRootPath = Deno.cwd(),
): JsTargetsSupplierOptions {
  return {
    originRootPath,
    jsDiscoverGlob: "**/*.{js,cjs,mjs}",
    filter: async (twin) => {
      return await twin.tsSrcRootSpecifierExists() ? true : false;
    },
  };
}

export function allJsTargetsWithoutTsTwins(
  originRootPath = Deno.cwd(),
): JsTargetsSupplierOptions {
  return {
    originRootPath,
    jsDiscoverGlob: "**/*.{js,cjs,mjs}",
    filter: async (twin) => {
      return await twin.tsSrcRootSpecifierExists() ? false : true;
    },
  };
}

/**
 * Discover all potential *.js.ts files with intentional target twins. The
 * default bundler rules are:
 * 1. Find all *.{js,cjs,mjs} files in the originRootPath
 * 2. For each *.{js,cjs,mjs} file, see if it has a "twin" *.js.ts
 * 3. If a JS file is called xyz.auto.{js,cjs,mjs} (a good convention), .auto.
 * or .min is removed before checking.
 * @param originRootPath which directory to start in, defaults to Deno.cwd()
 * @param jsDiscoverGlob which glob of files in originRootPath to match
 */
export function jsTargetsSupplier(
  options: JsTargetsSupplierOptions,
): JsTargetTsTwinSupplier {
  return async function* () {
    const filter = options?.filter;
    for await (
      const asset of fsi.discoverAssets({
        originRootPath: options.originRootPath,
        glob: options.jsDiscoverGlob,
      })
    ) {
      const twin = jsPotentialTsTwin(typicalJsNamingStrategy(asset.path));
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
