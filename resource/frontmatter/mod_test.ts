import { testingAsserts as ta } from "./deps-test.ts";
import * as govn from "./governance.ts";
import * as c from "../content/mod.ts";
import * as mod from "./mod.ts";

Deno.test(`prepareFrontmatterSync`, () => {
  const asset:
    & govn.FrontmatterContentSupplier
    & govn.FrontmatterSupplier<govn.UntypedFrontmatter>
    & govn.FrontmatterConsumer<govn.UntypedFrontmatter> = {
      textSync:
        "---\nfirst: value\nsecond: 40\n---\n__transform__ test with frontmatter and additional\n---\nseparators",
      frontmatter: { preParse: "value" },
      consumeParsedFrontmatter: (parsed) => {
        encounteredConsumeParsedFrontmatter = true;
        if (parsed.frontmatter && !parsed.error) {
          c.mutateFlexibleContent(asset, parsed.content);
          // deno-lint-ignore no-explicit-any
          (asset as any).frontmatter = parsed.frontmatter;
          return parsed.frontmatter;
        }
      },
    };

  let encounteredConsumeParsedFrontmatter = false;
  ta.assert(asset.frontmatter.preParse, "value");
  const syncResult = mod.prepareFrontmatterSync(
    mod.yamlTomlMarkdownFrontmatterRE,
  )(
    asset,
  );
  ta.assert(syncResult);
  ta.assert(mod.isFrontmatterSupplier(syncResult));
  ta.assert(encounteredConsumeParsedFrontmatter);
  ta.assertEquals(syncResult.frontmatter, { first: "value", second: 40 });
  ta.assertEquals("preParse" in asset.frontmatter, false);
  ta.assert(c.isFlexibleContentSyncSupplier(syncResult));
  ta.assertEquals(
    c.flexibleTextSync(syncResult, "error"),
    "__transform__ test with frontmatter and additional\n---\nseparators",
  );
});

Deno.test(`prepareFrontmatter`, async () => {
  const asset:
    & govn.FrontmatterContentSupplier
    & govn.FrontmatterSupplier<govn.UntypedFrontmatter>
    & govn.FrontmatterConsumer<govn.UntypedFrontmatter> = {
      textSync:
        "---\nfirst: value\nsecond: 40\n---\n__transform__ test with frontmatter and additional\n---\nseparators",
      frontmatter: { preParse: "value" },
      consumeParsedFrontmatter: (parsed) => {
        encounteredConsumeParsedFrontmatter = true;
        if (parsed.frontmatter) {
          c.mutateFlexibleContent(asset, parsed.content);
          // deno-lint-ignore no-explicit-any
          (asset as any).frontmatter = parsed.frontmatter;
          return parsed.frontmatter;
        }
      },
    };

  let encounteredConsumeParsedFrontmatter = false;
  ta.assert(asset.frontmatter.preParse, "value");
  const asyncResult = await mod.prepareFrontmatter(
    mod.yamlTomlMarkdownFrontmatterRE,
  )(asset);
  ta.assert(asyncResult);
  ta.assert(mod.isFrontmatterSupplier(asyncResult));
  ta.assert(encounteredConsumeParsedFrontmatter);
  ta.assertEquals(asyncResult.frontmatter, { first: "value", second: 40 });
  ta.assertEquals("preParse" in asset.frontmatter, false);
  ta.assert(c.isFlexibleContentSyncSupplier(asyncResult));
  ta.assertEquals(
    c.flexibleTextSync(asyncResult, "error"),
    "__transform__ test with frontmatter and additional\n---\nseparators",
  );
});
