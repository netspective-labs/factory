import * as safety from "../../../safety/mod.ts";
import * as html from "../mod.ts";

export interface VisualCuesFrontmatter {
  readonly "syntax-highlight": "highlight.js";
}

export const isVisualCuesFrontmatter = safety.typeGuard<VisualCuesFrontmatter>(
  "syntax-highlight",
);

export const isVisualCuesFrontmatterSupplier = safety.typeGuard<
  { "visual-cues": VisualCuesFrontmatter }
>("visual-cues");

export function htmlSyntaxHighlightContribs(
  contribs: html.HtmlLayoutContributions,
  highlighter: "highlight.js",
): boolean {
  switch (highlighter) {
    case "highlight.js":
      contribs.stylesheets
        .aft`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.2.0/styles/default.min.css">`;
      contribs.scripts
        .aft`<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.2.0/highlight.min.js"></script>`;
      contribs.body.aft`<script>hljs.highlightAll();</script>`;
      return true;

    default:
      return false;
  }
}

export function visualCuesContributions(
  layout: html.HtmlLayout,
  reportIssue?: (
    issue: { locationHref?: string; errorSummary: string },
  ) => void,
): html.HtmlLayoutContributions {
  if (layout.frontmatter) {
    if (isVisualCuesFrontmatterSupplier(layout.frontmatter)) {
      const visualCues = layout.frontmatter?.["visual-cues"];
      if (isVisualCuesFrontmatter(visualCues)) {
        const highlighter = visualCues["syntax-highlight"];
        if (!htmlSyntaxHighlightContribs(layout.contributions, highlighter)) {
          reportIssue?.({
            locationHref: layout
              .activeRoute?.terminal?.qualifiedPath,
            errorSummary:
              `Frontmatter "visual-cues"."syntax-highlighter" is invalid type: "${highlighter}"`,
          });
        }
      }
    }
  }
  return layout.contributions;
}
