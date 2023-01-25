import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./template.ts";

Deno.test(`textTemplateLiteral string with no context`, () => {
  const ttl = mod.textTemplateLiteral<string>((interpolated) => interpolated);
  const result = ttl`this is a test where 2+4 should equal 6: ${2 + 4}`;
  ta.assertEquals(
    result,
    "this is a test where 2+4 should equal 6: 6",
  );
});

interface TemplateLiteralContext {
  test: string;
}

interface TemplateLiteralResult {
  interpolated: string;
  ctx?: TemplateLiteralContext;
}

Deno.test(`textTemplateLiteral object with context`, () => {
  const ctx = { test: "value" };
  const ttl = mod.textTemplateLiteral<
    TemplateLiteralResult,
    TemplateLiteralContext
  >(
    (interpolated, ctx) => {
      return { interpolated, ctx };
    },
    ctx,
  );
  const result = ttl`this is a test where 2+4 should equal 6: ${2 + 4}`;
  ta.assertEquals(
    result.interpolated,
    "this is a test where 2+4 should equal 6: 6",
  );
  ta.assertEquals(
    result.ctx?.test,
    "value",
  );
});

Deno.test(`htmlTag`, () => {
  ta.assertEquals(
    mod.htmlTag("b", "HTML without params"),
    "<b>HTML without params</b>",
  );

  const customTag = mod.htmlTagFn("tag");
  ta.assertEquals(
    customTag("param", "HTML tag with simple param"),
    "<tag param>HTML tag with simple param</tag>",
  );

  const span = mod.htmlTagFn("span");
  ta.assertEquals(
    span({ style: "abc:xyz" }, "span HTML with key/value param"),
    `<span style="abc:xyz">span HTML with key/value param</span>`,
  );
});
