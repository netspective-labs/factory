import * as extn from "../../../../../module/mod.ts";
import * as html from "../../../../html/mod.ts";
import * as c from "../../../../content/mod.ts";
import * as ldsGovn from "../../governance.ts";
import * as p from "../partial/mod.ts";

export function lightningTemplate(
  identity: string,
  location: extn.LocationSupplier,
): ldsGovn.LightningTemplate {
  return html.htmlLayoutTemplate<
    html.HelperFunctionOrString<ldsGovn.LightningLayout>,
    ldsGovn.LightningLayout
  >(identity, location);
}

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const pageHeadingPartial: ldsGovn.LightningPartial = (layout) => `<!-- pageHeadingPartial -->
${layout.activeTreeNode ? `<div class="schema-header">
  <h1 class="slds-text-heading_large">
    <strong>${layout.layoutText?.title(layout) ?? "no layout.layoutText supplier in typical.ts::pageHeadingPartial"}</strong>
  </h1>
</div>`: ''}`

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const typicalPageSurroundBodyPrePartial: ldsGovn.LightningPartial = (layout) => `<!-- typicalPageSurroundBodyPre -->
  <head>
    ${p.typicalHeadPartial(layout)}
    ${layout.contributions.scripts.contributions().text()}
    ${layout.contributions.stylesheets.contributions().text()}
    ${layout.contributions.head.contributions("aft").text()}
  </head>
  <body>
    ${layout.contributions.body.contributions("fore").text()}
    ${p.resourceDiagnosticsPartial(layout)}
    <header class="slds-no-print">
      ${p.contextBarPartial(layout)}
    </header>`

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const typicalPageSurroundBodyPostPartial: ldsGovn.LightningPartial = (layout) => `<!-- typicalPageSurroundBodyPost -->
    ${p.footerFixedCopyrightBuildPartial(layout)}
    ${p.typicalTailPartial(layout)}
    ${layout.contributions.body.contributions("aft").text()}
  </body>`

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const homePage = lightningTemplate("lds/page/home", {moduleImportMetaURL: import.meta.url})`<!DOCTYPE html>
<html lang="en" ${(layout) => layout.origin.dataAttrs(layout, import.meta.url, "homePage")}>
    ${typicalPageSurroundBodyPrePartial}

    <main class="container flex slds-m-vertical_small slds-container--center">
      <div class="slds-container--xlarge slds-container--center">
      ${p.typicalBodyPartial}
      </div>
      ${p.layoutDiagnosticsPartial}
    </main>

    ${typicalPageSurroundBodyPostPartial}
</html>`;

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const innerIndexPage = lightningTemplate("lds/page/inner-index", {moduleImportMetaURL: import.meta.url})`<!DOCTYPE html>
<html lang="en" ${(layout) => layout.origin.dataAttrs(layout, import.meta.url, "innerIndexPage")}>
    ${typicalPageSurroundBodyPrePartial}

    <main class="slds-container_x-large slds-container_center slds-p-around_medium">
        <div>
            ${p.breadcrumbsPartial}
            ${pageHeadingPartial}
            <div id="content" class="slds-m-top_x-large">
            ${p.typicalBodyPartial}
            </div>
            ${p.layoutDiagnosticsPartial}
        </div>
    </main>

    ${typicalPageSurroundBodyPostPartial}
</html>`;

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const innerIndexAutoPage = lightningTemplate("lds/page/inner-index-auto", {moduleImportMetaURL: import.meta.url})`<!DOCTYPE html>
<html lang="en" ${(layout) => layout.origin.dataAttrs(layout, import.meta.url, "innerIndexAutoPage")}>
    ${typicalPageSurroundBodyPrePartial}

    <main class="slds-container_x-large slds-container_center slds-p-around_medium">
        <div>
          ${p.breadcrumbsWithoutTerminalPartial}
          ${pageHeadingPartial}
          <div id="content" class="slds-m-top_x-large">
          ${(layout, body) => layout.model.isContentAvailable ? p.typicalBodyPartial(layout, body) : ''}
          ${p.autoIndexCardsBodyPartial}
          </div>
          ${p.layoutDiagnosticsPartial}
        </div>
    </main>

    ${typicalPageSurroundBodyPostPartial}
</html>`;

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const noDefinitiveLayoutPage = lightningTemplate("lds/page/no-layout", {moduleImportMetaURL: import.meta.url})`<!DOCTYPE html>
<html lang="en" ${(layout) => layout.origin.dataAttrs(layout, import.meta.url, "noDefinitiveLayoutPage")}>
  <head>
    ${p.typicalHeadPartial}
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.2.0/styles/default.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.2.0/highlight.min.js"></script>
    <script>hljs.highlightAll();</script>
    <title>SLDS Diagnostics</title>
    ${(layout) => layout.contributions.head.contributions("aft")}
  </head>
  <body>
    <h1>SLDS Diagnostics</h2>
    You did not choose a proper layout either programmtically or through frontmatter.
    ${p.resourceDiagnosticsPartial}
    <h2>Layout Strategy</h2>
    <pre><code class="language-js">${(layout) => c.escapeHTML(Deno.inspect(layout.layoutSS, { depth: undefined }).trimStart())}</code></pre>
    ${p.footerFixedCopyrightBuildPartial}
    ${p.typicalTailPartial}
  </body>
</html>`;

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const noDecorationPage = lightningTemplate("lds/page/no-decoration", {moduleImportMetaURL: import.meta.url})`${p.typicalBodyPartial}`;
