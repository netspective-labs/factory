import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./detect-route.ts";

Deno.test("detectFileSysStyleRoute", async (ctx) => {
  await ctx.step("without modifiers", () => {
    const complexPath =
      "/some/long-ugly/file_sys_path/module-2_Component--_  1,=service_2.md";
    const result = mod.detectFileSysStyleRoute(complexPath);
    ta.assert(result);
    ta.assert(result.dir == "/some/long-ugly/file_sys_path");
    ta.assert(result.base == "module-2_Component--_  1,=service_2.md");
    ta.assert(result.name == "module-2_Component--_  1,=service_2");
    ta.assert(result.modifiers.length == 0);
    ta.assert(result.ext == ".md");
  });

  await ctx.step("with modifiers", () => {
    const complexPath =
      "/some/long-ugly/file_sys_path/module-2_Component--_  1,=service_2.mod1.mod2.md";
    const result = mod.detectFileSysStyleRoute(complexPath);
    ta.assert(result);
    ta.assert(result.root == "/");
    ta.assert(result.dir == "/some/long-ugly/file_sys_path");
    ta.assert(
      result.base == "module-2_Component--_  1,=service_2.mod1.mod2.md",
    );
    ta.assert(result.name == "module-2_Component--_  1,=service_2");
    ta.assert(result.modifiers.length == 2);
    ta.assert(result.ext == ".md");
  });
});
