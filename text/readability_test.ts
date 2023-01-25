import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./readability.ts";

Deno.test("readability", async () => {
  const result = await mod.extractReadableHTML(
    mod.originContentURL(
      "https://www.weforum.org/agenda/2022/02/digital-health-open-inclusive-and-patient-centred/",
    ),
  );
  ta.assert(result.content);
  // console.dir(result);
});
