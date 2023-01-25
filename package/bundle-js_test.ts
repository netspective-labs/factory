import { testingAsserts as ta } from "./deps-test.ts";
import { denoEmit, path } from "./deps.ts";
import { unindentWhitespace as uws } from "../text/whitespace.ts";
import * as mod from "./bundle-js.ts";

const cwdPath = (local: string) =>
  path.resolve(path.dirname(path.fromFileUrl(import.meta.url)), local);

Deno.test("Transpile and bundle JavaScript", async (tc) => {
  await tc.step("valid Javascript", async () => {
    let persistedToJsCalled = false;
    let notBundledToJsCalled = false;
    let validJS: string | undefined;
    const ee = new mod.TransformTypescriptEventEmitter();
    ee.on("bundledToJS", async (evt) => {
      validJS = await evt.bundledJS();
      // if you want to see what's in validJS, write it out:
      // Deno.writeTextFile(cwdPath("test.js"), validJS);
    });
    // deno-lint-ignore require-await
    ee.on("persistedToJS", async (jsTarget, evt) => {
      persistedToJsCalled = true;
      console.log("persistedToJS should not be called", { jsTarget, evt });
    });
    // deno-lint-ignore require-await
    ee.on("notBundledToJS", async (evt) => {
      notBundledToJsCalled = true;
      console.log("notBundledToJS should not be called", { evt });
    });

    await mod.transformTypescriptToJS({
      tsSrcRootSpecifier: cwdPath("bundle-js-test-fixture-good.js.ts"),
      tsEmitBundle: "classic",
    }, {
      // deno-lint-ignore require-await
      shouldBundle: async () => true,
      bundleOptions: {
        // TODO: as of `deno_emit` 0.3.0 these are ignored, hopefully they'll
        // come back soon
        compilerOptions: {
          checkJs: true,
          inlineSourceMap: false,
          sourceMap: false,
        },
      },
      ee,
    });

    ta.assert(validJS);
    ta.assert(
      validJS?.indexOf(
        `console.log("test transpiled code", syntheticType, true);\n`,
      ) > 0,
    );
    ta.assertEquals(persistedToJsCalled, false);
    ta.assertEquals(notBundledToJsCalled, false);
  });

  await tc.step(
    "Javascript compile error (will not trap Typescript type errors)",
    async () => {
      let bundledToJsCalled = false;
      let persistedToJsCalled = false;
      let notBundledToJsEvent:
        | mod.NotBundledTypescriptEvent<unknown> & {
          readonly deEmitResult?: denoEmit.BundleEmit | undefined;
          readonly error?: Error | undefined;
        }
        | undefined;
      const ee = new mod.TransformTypescriptEventEmitter();
      // deno-lint-ignore require-await
      ee.on("bundledToJS", async (evt) => {
        bundledToJsCalled = true;
        console.log("bundledToJsCalled should not be called", { evt });
      });
      // deno-lint-ignore require-await
      ee.on("persistedToJS", async (jsTarget, evt) => {
        persistedToJsCalled = true;
        console.log("persistedToJS should not be called", { jsTarget, evt });
      });
      // deno-lint-ignore require-await
      ee.on("notBundledToJS", async (evt) => {
        notBundledToJsEvent = evt;
        // uncomment the following to see the actual error event
        // console.log("debug notBundledToJS", { evt });
      });

      await mod.transformTypescriptToJS({
        tsSrcRootSpecifier: cwdPath("bundle-js-test-fixture-bad.js.ts"),
        tsEmitBundle: "classic",
      }, {
        // deno-lint-ignore require-await
        shouldBundle: async () => true,
        bundleOptions: {
          // TODO: as of `deno_emit` 0.3.0 these are ignored, hopefully they'll
          // come back soon
          compilerOptions: {
            checkJs: true,
            inlineSourceMap: false,
            sourceMap: false,
          },
        },
        ee,
      });

      ta.assert(notBundledToJsEvent?.reason, "undiagnosable-error");
      ta.assert(notBundledToJsEvent?.error);
      ta.assertEquals(bundledToJsCalled, false);
      ta.assertEquals(persistedToJsCalled, false);
    },
  );
});

// this is what the output for a "good" JS would look like
const _goodFixtureGolden = uws(`
  const syntheticType = {
      one: "one"
  };
  console.log("test transpiled code", syntheticType, true);
  //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vaG9tZS9zbnNoYWgvd29ya3NwYWNlcy9naXRodWIuY29tL3Jlc0ZhY3RvcnkvZmFjdG9yeS9saWIvcGFja2FnZS9idW5kbGUtanMtdGVzdC1maXh0dXJlLWdvb2QuanMudHMiLCJmaWxlOi8vL2hvbWUvc25zaGFoL3dvcmtzcGFjZXMvZ2l0aHViLmNvbS9yZXNGYWN0b3J5L2ZhY3RvcnkvbGliL3BhY2thZ2UvYnVuZGxlLWpzLXRlc3QtZml4dHVyZS1nb29kLWRlcC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBkZXAgZnJvbSBcIi4vYnVuZGxlLWpzLXRlc3QtZml4dHVyZS1nb29kLWRlcC50c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFN5bnRoZXRpY1R5cGUge1xuICByZWFkb25seSBvbmU6IHN0cmluZztcbn1cblxuY29uc3Qgc3ludGhldGljVHlwZTogU3ludGhldGljVHlwZSA9IHtcbiAgb25lOiBcIm9uZVwiLFxufTtcblxuY29uc29sZS5sb2coXCJ0ZXN0IHRyYW5zcGlsZWQgY29kZVwiLCBzeW50aGV0aWNUeXBlLCBkZXAuaXNGcm9tRGVwKTtcbiIsImV4cG9ydCBjb25zdCBpc0Zyb21EZXAgPSB0cnVlO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU1BLE1BQU0sYUFBYSxHQUFrQjtJQUNuQyxHQUFHLEVBQUUsS0FBSztDQUNYLEFBQUM7QUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLGFBQWEsRUNWeEIsSUFBSSxDRFVvQyxDQUFDIn0=
  `);
