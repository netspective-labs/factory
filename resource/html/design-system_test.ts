import { testingAsserts as ta } from "./deps-test.ts";
import * as fm from "../frontmatter/mod.ts";
import * as mod from "./design-system.ts";

Deno.test(`design system layout arguments`, () => {
  const testFM1: fm.UntypedFrontmatter = {
    layout: "ds/page/layout",
  };
  ta.assert(mod.isDesignSystemLayoutArgumentsSupplier(testFM1));

  const testFM2: fm.UntypedFrontmatter = {
    layout: {
      identity: "ds/page/layout",
    },
  };
  ta.assert(mod.isDesignSystemLayoutArgumentsSupplier(testFM2));
  ta.assert(typeof testFM2.layout != "string");
  ta.assert(!testFM2.layout.diagnostics);

  const testFM3: fm.UntypedFrontmatter = {
    layout: {
      identity: "ds/page/layout",
      diagnostics: true,
    },
  };
  ta.assert(mod.isDesignSystemLayoutArgumentsSupplier(testFM3));
  ta.assert(typeof testFM3.layout != "string");
  ta.assert(testFM3.layout.diagnostics);

  const testFM4: fm.UntypedFrontmatter = {
    layout: {
      diagnostics: true,
    },
  };
  ta.assert(mod.isDesignSystemLayoutArgumentsSupplier(testFM4));
  ta.assert(typeof testFM4.layout != "string");
  ta.assert(testFM4.layout.diagnostics);
});

Deno.test(`design system arguments`, () => {
  const testFM1: fm.UntypedFrontmatter = {
    designSystem: {
      layout: "ds/page/layout",
    },
  };
  ta.assert(mod.isDesignSystemArgumentsSupplier(testFM1));

  const testFM2: fm.UntypedFrontmatter = {
    designSystem: {
      layout: {
        identity: "ds/page/layout",
      },
    },
  };
  ta.assert(mod.isDesignSystemArgumentsSupplier(testFM2));

  const testFM3: fm.UntypedFrontmatter = {
    "design-system": {
      layout: {
        identity: "ds/page/layout",
      },
    },
  };
  ta.assert(!mod.isDesignSystemArgumentsSupplier(testFM3));

  ta.assertEquals(testFM3, {
    "design-system": {
      layout: {
        identity: "ds/page/layout",
      },
    },
  });
  ta.assert(mod.isFlexibleMutatedDesignSystemArgumentsSupplier(testFM3));
  ta.assertEquals(testFM3, {
    designSystem: {
      layout: {
        identity: "ds/page/layout",
      },
    },
  });
});
