import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./human.ts";

Deno.test("humanFriendlyPhrase", () => {
  const inhumanText = "module-2_Component--_  1,=service_2";
  const result = mod.humanFriendlyPhrase(inhumanText);
  ta.assert(result == "Module 2 Component 1 Service 2");
});
