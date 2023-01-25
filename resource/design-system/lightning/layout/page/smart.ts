import * as p from "../partial/mod.ts";
import * as t from "./typical.ts";

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const smartNavigationPage = t.lightningTemplate("lds/page/default", {moduleImportMetaURL: import.meta.url})`<!DOCTYPE html>
<html lang="en" ${(layout) => layout.origin.dataAttrs(layout, import.meta.url, "smartNavigationPage")}>
  <head>
    ${p.typicalHeadPartial}
    ${(layout) => layout.contributions.scripts.contributions()}
    ${(layout) => layout.contributions.stylesheets.contributions()}
    ${(layout) => layout.contributions.head.contributions("aft")}
  </head>
  <body>
  ${(layout) => layout.contributions.body.contributions("fore")}
  ${p.resourceDiagnosticsPartial}
  <header class="slds-no-print">
  ${p.contextBarPartial}
  </header>
  <main class="slds-container_x-large slds-container_center slds-p-around_medium">
    <div class="slds-grid slds-grid_align-left slds-gutters">
      <div class="slds-col slds-size_3-of-12 slds-no-print">
      ${p.verticalNavigationShadedPartial}
      </div>
      <!-- data-print-class="X" will replace class="Y" for printing, see lightning.js -->
      <div class="slds-size_7-of-12" data-print-class="slds-size_12-of-12">
        <div class="slds-box_x-small slds-m-around_x-small">
          <div class="slds-container--large slds-container--center">
          ${p.breadcrumbsPartial}
          ${t.pageHeadingPartial}
          <div id="content" class="slds-m-top_x-large">
          <article>
          ${p.typicalBodyPartial}
          </article>
          </div>
          ${p.layoutDiagnosticsPartial}
        </div>
        </div>
      </div>
      <div id="desktop-toc" class="tiktoc slds-col slds-size_2-of-12 slds-no-print">
        <aside class="toc-container slds-is-fixed">
          <div class="toc"></div> <!-- filled in by tocbot in asideTOC -->
          <div class="slds-p-top_large">
            ${p.frontmatterTagsPartial}
          </div>
        </aside>
      </div>
    </div>
  </main>
  ${p.asideTocPartial}
  ${p.footerFixedCopyrightBuildPartial}
  ${p.typicalTailPartial}
  ${(layout) => layout.contributions.body.contributions("aft")}
  </body>
</html>`;
