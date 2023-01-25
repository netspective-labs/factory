import * as ta from "https://deno.land/std@0.147.0/testing/asserts.ts";
import * as mod from "./version.ts";

Deno.test("remote version without repoIdentity detector", async () => {
  const version = await mod.determineVersionFromRepoTag(
    "https://raw.githubusercontent.com/gov-suite/governed-text-template/v0.4.13/toctl.ts",
  );
  ta.assertEquals(version, "v0.4.13");
});

Deno.test("remote version with repoIdentity detector", async () => {
  const version = await mod.determineVersionFromRepoTag(
    "https://raw.githubusercontent.com/gov-suite/governed-text-template/v0.4.13/toctl.ts",
    { repoIdentity: "gov-suite/governed-text-template" },
  );
  ta.assertEquals(version, "v0.4.13");
});

Deno.test("local version detector", async () => {
  let isLocal: boolean | undefined;
  const version = await mod.determineVersionFromRepoTag(
    import.meta.url,
    {
      onIsLocalFile: () => {
        isLocal = true;
        return "0.0.0-local";
      },
    },
  );
  ta.assert(isLocal);
  ta.assertEquals(version, "0.0.0-local");
});
