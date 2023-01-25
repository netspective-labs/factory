import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./mod.ts";

Deno.test(`OKRs`, async () => {
  const okrsF = mod.typicalOkrFactory();
  const sharedKR = okrsF.keyResult("Shared (reusable) KR instance");

  const okrs = await okrsF.objectives(async function* (f) {
    yield await f.objective("objective 1", async function* (o) {
      yield await f.keyResult(`${o.objective} KR 1 (with children)`, {
        keyResultOKRs: await f.objectives(async function* (f) {
          yield await f.objective(
            `sub objective 1 for ${o.objective}`,
            async function* (kr1O) {
              yield await f.keyResult(`${kr1O.objective} KR 1`);
              yield await f.keyResult(`${kr1O.objective} KR 2`);
              yield sharedKR;
            },
          );
        }),
        // mission: mission1,
      });
      yield await f.keyResult(`${o.objective} KR 2 (no children)`);
      yield await f.keyResult(`${o.objective} KR 3 (no children)`);
      yield sharedKR;
    });
  });

  // console.dir(okrs, { depth: undefined });

  const objectives = Array.from(okrs.objectives);
  const kr1 = Array.from(objectives[0].keyResults);
  ta.assertEquals(objectives.length, 1);
  ta.assertEquals(kr1.length, 4);
});
