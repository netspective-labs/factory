import {
  blue,
  green,
  magenta,
  red,
  white,
} from "https://deno.land/std@0.147.0/fmt/colors.ts";
import * as path from "https://deno.land/std@0.147.0/path/mod.ts";
import * as bcss from "../package/bundle-css.ts";

const relativeToCWD = (absPath: string) => path.relative(Deno.cwd(), absPath);

/**
 * transformCssFromTsTwinTask is used in Taskfile.ts to find all *.{js,cjs,mjs}.ts and create
 * it's "twin" *.{js,cjs,mjs} file by using Deno.emit(). The default bundler rules are:
 * 1. Find all *.{js,cjs,mjs} files
 * 2. For each *.{js,cjs,mjs} file, see if it has a "twin" *.js.ts
 * 3. If a JS file is called xyz.auto.{js,cjs,mjs} (a good convention), .auto. is removed
 *    before checking
 * @param originRootPath which directory to start in, defaults to Deno.cwd()
 */
export function transformCssFromTsTwinTask(
  originRootPath = Deno.cwd(),
  observer = consoleEE(),
) {
  return async () => {
    await bcss.bundleCssTargets(
      bcss.cssTargetsSupplier(bcss.allCssTargetsWithTsTwins(originRootPath)),
      observer,
    );
  };
}

/**
 * discoverTransformCssFromTsTwinTask is used in Taskfile.ts to discover all *.js.ts
 * files as a "dry-run" for bundleJsFromTsTwinIfNewerTask.
 * @param originRootPath which directory to start in, defaults to Deno.cwd()
 */
export function discoverTransformCssFromTsTwinTask(
  originRootPath = Deno.cwd(),
) {
  return async () => {
    const twins = bcss.cssTargetsSupplier(
      bcss.allCssTargetsWithTsTwins(originRootPath),
    );
    for await (const twin of twins()) {
      console.info(
        white(
          `${magenta(relativeToCWD(twin.cssAbsPath))} (${
            twin.cssMinify ? "minified (NOT IMPLEMENTED YET)" : "not minified"
          }) may be bundled from ${
            green(relativeToCWD(twin.tsSrcRootSpecifier))
          }`,
        ),
      );
    }
  };
}

/**
 * discoverCssTargetsWithoutTsTwinsTask is used in Taskfile.ts to discover all *.js
 * files that do not have twins
 * @param originRootPath which directory to start in, defaults to Deno.cwd()
 */
export function discoverCssTargetsWithoutTsTwinsTask(
  originRootPath = Deno.cwd(),
) {
  return async () => {
    const lackingTwins = bcss.cssTargetsSupplier(
      bcss.allCssTargetsWithoutTsTwins(originRootPath),
    );
    for await (const twin of lackingTwins()) {
      console.info(
        white(
          `${magenta(relativeToCWD(twin.cssAbsPath))} (${
            twin.cssMinify ? "minified" : "not minified"
          }) is missing its twin ${
            red(relativeToCWD(twin.tsSrcRootSpecifier))
          }`,
        ),
      );
    }
  };
}

function consoleEE() {
  const ttConsoleEE = new bcss.TransformStylesheetEventEmitter();
  // deno-lint-ignore require-await
  ttConsoleEE.on("persistedToCSS", async (twin, event) => {
    console.info(
      white(
        `${magenta(relativeToCWD(twin.cssAbsPath))} generated from ${
          green(relativeToCWD(event.tsSrcRootSpecifier))
        }`,
      ),
    );
  });
  // deno-lint-ignore require-await
  ttConsoleEE.on("notBundledToCSS", async (event) => {
    console.info(
      white(
        `*** ${
          magenta(relativeToCWD(event.tsSrcRootSpecifier))
        } not generated: ${blue(event.reason)}`,
      ),
    );
    if (event.er) {
      console.warn("    ", Deno.formatDiagnostics(event.er.diagnostics));
    }
    if (event.error) {
      console.error("   ", red(event.error.toString()));
    }
  });
  return ttConsoleEE;
}
