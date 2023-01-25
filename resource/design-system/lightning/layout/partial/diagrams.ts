import * as ldsGovn from "../../governance.ts";

const d3 = "d3";
const mermaid = "mermaid";
const kroki = "kroki";
const markmap = "markmap";
const diagramsNet = "diagrams-net";

function diagramScripts(fmProperty: unknown): string {
  const html: string[] = [];
  const specs: unknown[] = Array.isArray(fmProperty)
    ? fmProperty
    : [fmProperty];

  let d3Imported = false;
  const importD3 = () => {
    if (!d3Imported) {
      html.push(`<script src="https://cdn.jsdelivr.net/npm/d3"></script>`);
      d3Imported = true;
    }
  };

  for (const spec of specs) {
    if (typeof spec === "string") {
      switch (spec) {
        case mermaid:
          html.push(
            `<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>\n<script>mermaid.initialize({startOnLoad:true});</script>`,
          );
          break;

        case kroki:
          // TODO: fix /lighting so that it uses baseURL
          html.push(
            `<script type="module" src="/universal-cc/component/kroki-diagram.js"></script>`,
          );
          break;

        case d3:
          importD3();
          break;

        case markmap:
          importD3();
          // TODO: fix /lighting so that it uses baseURL
          html.push(
            `<script type="module" src="/universal-cc/component/markmap-diagram.js"></script>`,
          );
          break;

        case diagramsNet:
          // TODO: fix /lighting so that it uses baseURL
          html.push(
            `<script type="module" src="/universal-cc/component/diagrams-net.js"></script>`,
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
export const clientDiagramsContributionsPartial: ldsGovn.LightningPartial = (layout) =>
(layout?.frontmatter?.diagrams ? diagramScripts(layout.frontmatter.diagrams)
  : '<!-- layout.frontmatter.diagrams is false -->');
