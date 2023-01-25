import * as r from "./synthetic.pcii.ts";

// in *.md.ts all exported symbols are considered "typed" frontmatter
export const title = "Dynamic Markdown";

// the default text is considered the markdown content and may be completely dynamic
// deno-fmt-ignore
export default `

${r.var1}

# Dynamic Heading

- dynamic bullet #1
- dynamic bullet #2
`;
