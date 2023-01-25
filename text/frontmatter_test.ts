import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./frontmatter.ts";

Deno.test(`frontmatter Markdown-style parser`, async (tc) => {
  await tc.step("not found (missing)", () => {
    const result = mod.parseYamlTomlFrontmatter(
      "__transform__ test without frontmatter but has \n---\nseparators",
    );
    ta.assert(result);
    ta.assert(!result.error);
    ta.assertEquals(result.frontmatter, undefined);
    ta.assertEquals(result.nature, "not-found-in-text");
    ta.assertEquals(
      result.content,
      "__transform__ test without frontmatter but has \n---\nseparators",
    );
  });

  await tc.step("YAML error", () => {
    const result = mod.parseYamlTomlFrontmatter(
      "---\nforgot: to close\n__transform__ test without frontmatter but has \n---\nseparators",
    );
    ta.assert(result);
    ta.assertIsError(result.error);
    ta.assertEquals(result.nature, "error");
  });

  await tc.step("YAML with content", () => {
    const result = mod.parseYamlTomlFrontmatter(
      "---\nfirst: value\nsecond: 40\n---\n__transform__ test with frontmatter and additional\n---\nseparators",
    );
    ta.assert(result);
    ta.assert(!result.error);
    ta.assertEquals(result.nature, "yaml");
    ta.assertEquals(result.frontmatter, { first: "value", second: 40 });
    ta.assertEquals(
      result.content,
      "__transform__ test with frontmatter and additional\n---\nseparators",
    );
  });

  await tc.step("YAML without content", () => {
    const result = mod.parseYamlTomlFrontmatter(
      "---\nfirst: value\nsecond: 75\n---",
    );
    ta.assert(result);
    ta.assert(!result.error);
    ta.assertEquals(result.nature, "yaml");
    ta.assertEquals(result.frontmatter, { first: "value", second: 75 });
    ta.assertEquals(result.content, "");
  });

  await tc.step("TOML with content", () => {
    const result = mod.parseYamlTomlFrontmatter(
      `+++\nfirst = "value"\nsecond = 50\n+++\n__transform__ test with frontmatter and additional\n---\nseparators`,
    );
    ta.assert(result);
    ta.assert(!result.error);
    ta.assertEquals(result.nature, "toml");
    ta.assertEquals(result.frontmatter, { first: "value", second: 50 });
    ta.assertEquals(
      result.content,
      "__transform__ test with frontmatter and additional\n---\nseparators",
    );
  });

  await tc.step("TOML error", () => {
    const result = mod.parseYamlTomlFrontmatter(
      "+++\nfirst = value\nsecond = 50\n+++\n__transform__ test with frontmatter and additional\n---\nseparators",
    );
    ta.assert(result);
    ta.assert(result.error);
  });
});

Deno.test(`frontmatter HTML-style parser`, async (tc) => {
  await tc.step("not found", () => {
    const result = mod.parseYamlHtmlFrontmatter("<div>no frontmatter</div>");
    ta.assert(result);
    ta.assert(!result.error);
    ta.assertEquals(result.frontmatter, undefined);
    ta.assertEquals(result.nature, "not-found-in-text");
    ta.assertEquals(result.content, "<div>no frontmatter</div>");
  });

  await tc.step("YAML", () => {
    const result = mod.parseYamlHtmlFrontmatter(
      "<!---\nfirst: value\nsecond: 40\n--->\n__transform__ test with frontmatter and additional\n---\nseparators",
    );
    ta.assert(result);
    if (result.error) console.error(result.error);
    ta.assert(!result.error);
    ta.assertEquals(result.nature, "yaml");
    ta.assertEquals(result.frontmatter, { first: "value", second: 40 });
    ta.assertEquals(
      result.content,
      "__transform__ test with frontmatter and additional\n---\nseparators",
    );
  });
});
