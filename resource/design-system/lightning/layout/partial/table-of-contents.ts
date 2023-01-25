import * as ldsGovn from "../../governance.ts";

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const asideTocPartial: ldsGovn.LightningPartial = (layout) => `
${layout.contributions.scripts.prime`<script src="https://cdnjs.cloudflare.com/ajax/libs/tocbot/4.12.0/tocbot.min.js"></script>`}
${layout.contributions.stylesheets.prime`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tocbot/4.12.0/tocbot.css">`}
<script>
tocbot.init({
  tocSelector: '.toc',
  contentSelector: 'article',
  headingSelector: 'h1, h2, h3',
  includeHtml: true,
});
</script>`;

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const asideTocIfRequestedPartial: ldsGovn.LightningPartial = (layout) => `${layout?.frontmatter?.asideTOC ? `
${layout.contributions.scripts.prime`<script src="https://cdnjs.cloudflare.com/ajax/libs/tocbot/4.12.0/tocbot.min.js"></script>`}
${layout.contributions.stylesheets.prime`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tocbot/4.12.0/tocbot.css">`}
<script>
tocbot.init({
  tocSelector: '.toc',
  contentSelector: 'article',
  headingSelector: 'h1, h2, h3',
  includeHtml: true,
});
</script>` : ''}`;
