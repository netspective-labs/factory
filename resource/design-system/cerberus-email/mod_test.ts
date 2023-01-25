import { testingAsserts as ta } from "../../deps-test.ts";
import * as c from "../../content/mod.ts";
import * as mod from "./mod.ts";

export type Resource = c.TextSyncSupplier;

Deno.test(`CerberusEmailDesignSystem`, async () => {
  const ceDS = new mod.CerberusEmailDesignSystem(`/universal-cc`);
  const input: c.TextSyncSupplier = {
    textSync: `Test of content transformation to email layout`,
  };
  const assets = ceDS.assets();
  const result = await ceDS.emailRenderer({ assets })(input);
  ta.assert(c.isHtmlSupplier(result));
  //std.persistResourceFile(result, result.html, "test.html");
});
