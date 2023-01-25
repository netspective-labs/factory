import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./mod.ts";

Deno.test(`typical identity`, () => {
  const ids = mod.typicalUuidFactory();
  ta.assert(ids.randomID());
});

const testNS = "test" as const;

Deno.test(`typical identity namespaced with 'test'`, () => {
  const nids = mod.typicalNamespacedUuidFactory<typeof testNS>(testNS);
  const nID = nids.randomNamespacedID();
  ta.assert(nID);
  ta.assert(nID.startsWith(`${testNS}::`));
});
