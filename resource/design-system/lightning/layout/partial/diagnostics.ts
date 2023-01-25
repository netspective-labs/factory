import * as c from "../../../../content/mod.ts";
import * as ldsGovn from "../../governance.ts";

/**
 * Show the diagnostics text if the current layout's target body is supplying it, blank if not
 * @param _ body is not used
 * @param layout the active layout strategy execution instance
 * @returns HTML
 */
export const resourceDiagnosticsPartial: ldsGovn.LightningPartial = (layout) =>
  // deno-fmt-ignore (because we don't want ${...} wrapped)
  `${c.isDiagnosticsSupplier(layout?.bodySource)? `<h1>Resource Diagnostics</h1><pre>${layout.bodySource.diagnostics}</pre>`: ""}`;

const escapeHtmlJsonReplacer = (_key: string, value: unknown) =>
  typeof value === "string" ? c.escapeHTML(value) : value;

// hide properties that could have circular references which will break JSON.stringify()
const routeTreeJsonReplacer = (key: string, value: unknown) =>
  ["owner", "parent", "ancestors", "notifications"].find((name) => name == key)
    ? "(ignored)"
    : escapeHtmlJsonReplacer(key, value);

// hide properties that could have circular references which will break JSON.stringify()
const routeJsonReplacer = (key: string, value: unknown) =>
  ["notifications"].find((name) => name == key) ? "(ignored)" : value;

/**
 * Show LDS diagnostics for debugging if layout `diagnostics` argument is true,
 * blank if not.
 * @param _ body is not used
 * @param layout the active layout strategy execution instance
 * @returns diagnostics HTML
 */
// deno-fmt-ignore (because we don't want ${...} wrapped)
export const layoutDiagnosticsPartial: ldsGovn.LightningPartial = (layout, body) => `${layout?.diagnostics ? `
${layout.contributions.scripts.prime`<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.2.0/highlight.min.js"></script>`}
${layout.contributions.scripts.prime`<script src="https://cdn.rawgit.com/caldwell/renderjson/master/renderjson.js"></script>`}
${layout.contributions.stylesheets.prime`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.2.0/styles/default.min.css">`}
${layout.contributions.scripts.prime`<script>function toggleDiagnostic(id) { const el = document.getElementById(id); el.style.display = el.style.display === 'none' ? 'block' : 'none'; }</script>`}
<button class="slds-button slds-button_neutral" onclick="toggleDiagnostic('ldsDiagnostics'); hljs.highlightAll();">
  Lightning Design System (LDS) Diagnostics
</button>
<div id="ldsDiagnostics" style="display:none">
  ${resourceDiagnosticsPartial(layout, body)}
  <h1>Layout Strategy</h1>
  <pre><code class="language-js">${c.escapeHTML(Deno.inspect(layout.layoutSS, { depth: undefined }).trimStart())}</code></pre>
  <h1>Layout Contributions</h1>
  <div id="diag_contributionsRenderJSON"></div>
  <table>
    <tr>
      <th>Active Route</th>
      <th>Active Route Terminal</th>
      <th>Active Route Tree Node</th>
      <th>Active Route Tree Node Parent</th>
    </tr>
    <tr>
      <td id="diag_activeRouteRenderJSON" valign="top"></td>
      <td id="diag_activeRouteTerminalRenderJSON" valign="top"></td>
      <td id="diag_activeRouteTreeNodeRenderJSON" valign="top"></td>
      <td id="diag_activeRouteTreeNodeParentRenderJSON" valign="top"></td>
    </tr>
  </table>
  <p><b>Route Tree</b></p>
  <div id="diag_routeTreeRenderJSON"></div>
  <button class="slds-button slds-button_neutral" onclick="toggleDiagnostic('ldsDiagnostics_bodySource')">bodySource</button>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <button class="slds-button slds-button_neutral" onclick="toggleDiagnostic('ldsDiagnostics_content')">content</button>
  <div id="ldsDiagnostics_bodySource" style="display:none">
    <h1>Body Source</h1>
    <div id="diag_bodySourceRenderJSON"></div>
    <button class="slds-button slds-button_neutral" onclick="toggleDiagnostic('diag_bodySourceDenoInspect')">Deno bodySource Inspection</button>
    <div id="diag_bodySourceDenoInspect" style="display:none">
      <pre><code class="language-js">${c.escapeHTML(Deno.inspect(layout.bodySource, { depth: undefined }).trimStart())}</code></pre>
    </div>
  </div>
  <div id="ldsDiagnostics_content" style="display:none">
    <h1>Layout Frontmatter</h1>
    <pre><code class="language-js">${c.escapeHTML(Deno.inspect(layout.frontmatter, { depth: undefined }).trimStart())}</code></pre>
    <h1>Rendered HTML Body</h1>
    <pre><code class="language-html">${c.escapeHTML(body || "NO BODY SUPPLIED in ldsLayoutDiagnostics")}</code></pre>
    <h1>Layout Contributions</h1>
    <pre><code class="language-js">${c.escapeHTML(Deno.inspect(layout.contributions, { depth: undefined }).trimStart())}</code></pre>
  </div>
  <script>
    window.addEventListener("load", function() {
      document.getElementById("diag_activeRouteRenderJSON").prepend(renderjson(${JSON.stringify(layout.activeRoute, routeJsonReplacer)}));
      document.getElementById("diag_activeRouteTerminalRenderJSON").prepend(renderjson(${JSON.stringify(layout.activeRoute?.terminal, routeTreeJsonReplacer)}));
      document.getElementById("diag_activeRouteTreeNodeRenderJSON").prepend(renderjson(${JSON.stringify(layout.activeTreeNode, routeTreeJsonReplacer)}));
      document.getElementById("diag_activeRouteTreeNodeParentRenderJSON").prepend(renderjson(${JSON.stringify(layout.activeTreeNode?.parent, routeTreeJsonReplacer)}));
      document.getElementById("diag_routeTreeRenderJSON").prepend(renderjson(${JSON.stringify(layout.contentStrategy.navigation?.routeTree, routeTreeJsonReplacer)}));
      document.getElementById("diag_bodySourceRenderJSON").prepend(renderjson(${JSON.stringify(layout.bodySource, routeJsonReplacer)}));
      document.getElementById("diag_contributionsRenderJSON").prepend(renderjson(${JSON.stringify(layout.contributions, escapeHtmlJsonReplacer)}));
    });
  </script>
</div>` : ''}`;
