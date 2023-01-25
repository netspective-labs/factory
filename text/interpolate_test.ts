import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./interpolate.ts";

Deno.test("interpolate text", async (tc) => {
  await tc.step(
    "typed env vars with single, observable, custom function using { } wrapped tokens",
    () => {
      const { interpolateObservable: interpO } = mod.textInterpolator<
        { ENV_USER: string; ENV_PASSWORD: string }
      >(
        {
          replace: (token) => {
            switch (token) {
              case "ENV_USER":
                return Deno.env.get("USER")!;
              case "ENV_PASSWORD":
                return Deno.env.get("PASSWORD") ?? "none";
              default:
                return false;
            }
          },
          regExp: /{([^\${}]*)}/g,
          unwrap: (wrapped: string) => wrapped.slice(1, wrapped.length - 1), // extract 'xyz' from '{xyz}'
        },
      );
      const user = Deno.env.get("USER") ?? "error";
      const synthetic1 =
        "this should replace {ENV_USER} and {ENV_PASSWORD}, leaving {UNKNOWN}";

      // interpolateObservable is useful when we want the interpolation result
      // to include not only the transformed text but also the interpolated
      // values
      ta.assertEquals(
        interpO(synthetic1),
        {
          interpolated: { ENV_USER: user, ENV_PASSWORD: "none" },
          transformedText:
            `this should replace ${user} and none, leaving {UNKNOWN}`,
        },
      );
    },
  );

  await tc.step(
    "typed env var with multiple functions using ${ } wrapped tokens",
    () => {
      const { interpolate } = mod.textInterpolator<
        { ENV_USER: string; ENV_PASSWORD: string }
      >({
        replace: {
          ENV_USER: () => Deno.env.get("USER")!,
          ENV_PASSWORD: () => Deno.env.get("PASSWORD") ?? "none",
        },
      });
      const user = Deno.env.get("USER") ?? "error";
      const synthetic1 =
        "this should replace ${ENV_USER} and ${ENV_PASSWORD}, leaving ${UNKNOWN}";
      ta.assertEquals(
        interpolate(synthetic1),
        `this should replace ${user} and none, leaving \${UNKNOWN}`,
      );
    },
  );
});
