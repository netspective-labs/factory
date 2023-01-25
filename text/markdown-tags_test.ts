import { testingAsserts as ta } from "./deps-test.ts";
import * as md from "./markdown-tags.ts";
import * as tmpl from "./template.ts";

// deno-ignore-fmt
const golden = `---
title: Generated Markdown
---

# This is a heading.
## This is a heading.
### This is a heading.
#### This is a heading.
##### This is a heading.
###### This is a heading.
This is regular text.
***Italic text.***
**Bold text.**
~~Strike through text.~~
More regular text.
Text and \`inline code\` :-)
and then some more text.
  
1. Apples
2. Oranges
3. Bananas
  
* Apples
* Oranges
* Bananas
[example](https://github.com/skulptur/markdown-fns/tree/master/example)
<b>HTML without params</b>
<tag param>HTML tag with simple param</tag>
<span style="abc:xyz">span HTML with key/value param</span>`;

Deno.test(`simple Markdown content generator`, () => {
  const exampleUrl =
    "https://github.com/skulptur/markdown-fns/tree/master/example";
  const fruits = ["Apples", "Oranges", "Bananas"];

  const span = tmpl.htmlTagFn("span");
  const customTag = tmpl.htmlTagFn("tag");

  const markdown = md.lines([
    md.untypedFrontMatterYAML({ title: "Generated Markdown" }),
    md.lines(
      md.times((index) => md.heading(index + 1, "This is a heading."), 6),
    ),
    "This is regular text.",
    md.italic("Italic text."),
    md.bold("Bold text."),
    md.strike("Strike through text."),
    md.lines([
      "More regular text.",
      md.spaces("Text and", md.inlineCode("inline code"), ":-)"),
      "and then some more text.",
    ]),
    md.ordered(fruits),
    md.unordered(fruits),
    md.link("example", exampleUrl),
    tmpl.htmlTag("b", "HTML without params"),
    customTag("param", "HTML tag with simple param"),
    span({ style: "abc:xyz" }, "span HTML with key/value param"),
  ]);

  ta.assertEquals(markdown, golden);
});
