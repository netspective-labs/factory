import * as md from "../../mod.ts";

// simple variable example
export const var1 = "Sample";

// complex variable example
export const calc1 = `Sample calc 2 + 2 = ${2 + 2}`;

// function which takes input from directive, typesafe version is slower to compile/build
export const func1Typesafe = (
  directive: md.MarkdownContentInlineDirective<{ param1: string }>,
) => {
  return `value from func1 (param1: ${directive.attributes?.param1})`;
};

// function which takes input from directive (not type-safe but faster to compile/build)
// you can use the following in content outside of test fixtures:
// export const func1 = (directive: any) => {
//   return `value from func1 (param1: ${directive.attributes?.param1})`;
// };

// simple variable but should be markdown-pre-processed (format) after replacement
export const var2MarkdownPP = `
* First value of simple symbol \`var1\` in any module is **:pcii[var1]**
* First value of complex symbol \`calc1\` in any module is **:pcii[calc1]**
* First value of execution of \`func1\` in any module is **:pcii[func1]{param1="from markdown!"}**
* Value of symbol \`var1\` in first module found called \`synthetic.pcii.ts\` is **:pcii[var1]{module="synthetic.pcii.ts"}**
* Value of symbol \`var1\` in first module found that ends with \`./synthetic.pcii.ts\` is **:pcii[var1]{module="./synthetic.pcii.ts"}**
`;
