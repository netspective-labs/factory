import * as ldsGovn from "../../governance.ts";

const readability = "readable";

function extensionScripts(fmProperty: unknown): string {
  const html: string[] = [];
  const specs: unknown[] = Array.isArray(fmProperty)
    ? fmProperty
    : [fmProperty];

  for (const spec of specs) {
    if (typeof spec === "string") {
      switch (spec) {
        case readability:
          // TODO: fix /lighting so that it uses baseURL
          html.push(
            `<script type="module" src="/universal-cc/component/readability.js"></script>`,
          );
          break;
      }
    }
  }
  return html.join("\n");
}

/**
 * Place this in the <head> of your layouts to automatically include diagrams
 * generator code when layout.frontmatter.diagrams is true.
 * @param layout the active layout strategy execution instance
 * @returns diagrams scripts for <head> component
 */
// deno-fmt-ignore (because we don't want ${...} wrapped)
export const clientExtensionsContributionsPartial: ldsGovn.LightningPartial = (layout) =>
(layout?.frontmatter?.extensions ? extensionScripts(layout.frontmatter.extensions)
  : '<!-- layout.frontmatter.extensions is false -->');
