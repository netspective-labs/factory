import {
  blue,
  green,
  red,
  white,
  yellow,
} from "https://deno.land/std@0.147.0/fmt/colors.ts";
import * as path from "https://deno.land/std@0.147.0/path/mod.ts";
import * as bjs from "../package/bundle-js.ts";

const relativeToCWD = (absPath: string) => path.relative(Deno.cwd(), absPath);

/**
 * bundleJsFromTsTwin is used in Taskfile.ts to find all *.{js,cjs,mjs}.ts and create
 * it's "twin" *.{js,cjs,mjs} file by using Deno.emit(). The default bundler rules are:
 * 1. Find all *.{js,cjs,mjs} files
 * 2. For each *.{js,cjs,mjs} file, see if it has a "twin" *.js.ts
 * 3. If a JS file is called xyz.auto.{js,cjs,mjs} (a good convention), .auto. is removed
 *    before checking
 * @param originRootPath which directory to start in, defaults to Deno.cwd()
 */
export function bundleJsFromTsTwinTask(
  originRootPath = Deno.cwd(),
  observer = consoleEE(),
) {
  return async () => {
    await bjs.bundleJsTargets(
      bjs.jsTargetsSupplier(bjs.allJsTargetsWithTsTwins(originRootPath)),
      observer,
    );
  };
}

/**
 * discoverBundleJsFromTsTwinTask is used in Taskfile.ts to discover all *.js.ts
 * files as a "dry-run" for bundleJsFromTsTwinIfNewerTask.
 * @param originRootPath which directory to start in, defaults to Deno.cwd()
 */
export function discoverBundleJsFromTsTwinTask(originRootPath = Deno.cwd()) {
  return async () => {
    const twins = bjs.jsTargetsSupplier(
      bjs.allJsTargetsWithTsTwins(originRootPath),
    );
    for await (const twin of twins()) {
      console.info(
        white(
          `${yellow(relativeToCWD(twin.jsAbsPath))} (${twin.jsNature}${
            twin.jsMinify ? ", minified" : ", not minified"
          }) may be bundled from ${
            green(relativeToCWD(twin.tsSrcRootSpecifier))
          }`,
        ),
      );
    }
  };
}

/**
 * discoverJsTargetsWithoutTsTwinsTask is used in Taskfile.ts to discover all *.js
 * files that do not have twins
 * @param originRootPath which directory to start in, defaults to Deno.cwd()
 */
export function discoverJsTargetsWithoutTsTwinsTask(
  originRootPath = Deno.cwd(),
) {
  return async () => {
    const lackingTwins = bjs.jsTargetsSupplier(
      bjs.allJsTargetsWithoutTsTwins(originRootPath),
    );
    for await (const twin of lackingTwins()) {
      console.info(
        white(
          `${yellow(relativeToCWD(twin.jsAbsPath))} (${twin.jsNature}${
            twin.jsMinify ? ", minified" : ", not minified"
          }) is missing its twin ${
            red(relativeToCWD(twin.tsSrcRootSpecifier))
          }`,
        ),
      );
    }
  };
}

function consoleEE() {
  const ttConsoleEE = new bjs.TransformTypescriptEventEmitter();
  // deno-lint-ignore require-await
  ttConsoleEE.on("persistedToJS", async (twin, event) => {
    console.info(
      white(
        `${yellow(relativeToCWD(twin.jsAbsPath))} generated from ${
          green(relativeToCWD(event.tsSrcRootSpecifier))
        }`,
      ),
    );
  });
  // deno-lint-ignore require-await
  ttConsoleEE.on("notBundledToJS", async (event) => {
    console.info(
      white(
        `*** ${
          yellow(relativeToCWD(event.tsSrcRootSpecifier))
        } not generated: ${blue(event.reason)}`,
      ),
    );
    if (event.error) {
      console.error("   ", red(event.error.toString()));
    }
    if (event.bundleEmit?.map) {
      console.warn("    ", event.bundleEmit?.map);
    }
  });
  return ttConsoleEE;
}
