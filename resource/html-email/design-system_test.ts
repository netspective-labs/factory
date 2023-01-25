import { testingAsserts as ta } from "./deps-test.ts";
import * as fm from "../frontmatter/mod.ts";
import * as mod from "./design-system.ts";

Deno.test(`e-mail design system layout arguments`, () => {
  const testFM1: fm.UntypedFrontmatter = {
    layout: "eds/page/layout",
  };
  ta.assert(mod.isEmailDesignSystemLayoutArgumentsSupplier(testFM1));

  const testFM2: fm.UntypedFrontmatter = {
    layout: {
      identity: "eds/page/layout",
    },
  };
  ta.assert(mod.isEmailDesignSystemLayoutArgumentsSupplier(testFM2));
  ta.assert(typeof testFM2.layout != "string");
  ta.assert(!testFM2.layout.diagnostics);

  const testFM3: fm.UntypedFrontmatter = {
    layout: {
      identity: "eds/page/layout",
      diagnostics: true,
    },
  };
  ta.assert(mod.isEmailDesignSystemLayoutArgumentsSupplier(testFM3));
  ta.assert(typeof testFM3.layout != "string");
  ta.assert(testFM3.layout.diagnostics);

  const testFM4: fm.UntypedFrontmatter = {
    layout: {
      diagnostics: true,
    },
  };
  ta.assert(mod.isEmailDesignSystemLayoutArgumentsSupplier(testFM4));
  ta.assert(typeof testFM4.layout != "string");
  ta.assert(testFM4.layout.diagnostics);
});

Deno.test(`e-mail design system arguments`, () => {
  const testFM1: fm.UntypedFrontmatter = {
    designSystem: {
      layout: "eds/page/layout",
    },
  };
  ta.assert(mod.isEmailDesignSystemArgumentsSupplier(testFM1));

  const testFM2: fm.UntypedFrontmatter = {
    designSystem: {
      layout: {
        identity: "eds/page/layout",
      },
    },
  };
  ta.assert(mod.isEmailDesignSystemArgumentsSupplier(testFM2));

  const testFM3: fm.UntypedFrontmatter = {
    "design-system": {
      layout: {
        identity: "eds/page/layout",
      },
    },
  };
  ta.assert(!mod.isEmailDesignSystemArgumentsSupplier(testFM3));

  ta.assertEquals(testFM3, {
    "design-system": {
      layout: {
        identity: "eds/page/layout",
      },
    },
  });
  ta.assert(mod.isFlexibleMutatedEmailDesignSystemArgumentsSupplier(testFM3));
  ta.assertEquals(testFM3, {
    designSystem: {
      layout: {
        identity: "eds/page/layout",
      },
    },
  });
});
