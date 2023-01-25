import * as html from "../../html/mod.ts";
import * as c from "../../content/mod.ts";
import * as r from "../../../route/mod.ts";
import * as dsGovn from "./governance.ts";
import * as git from "../../../git/mod.ts";
import * as ws from "../../../workspace/mod.ts";
import * as k from "../../../knowledge/mod.ts";

function isHintable(item: r.RouteNode): item is r.RouteNode & { hint: string } {
  return "hint" in item ? true : false;
}

export const typicalBodyPartial: dsGovn.EssentialPartial = (layout, body) => {
  return body
    ? `${
      layout.contributions.bodyMainContent.contributions("fore").text()
    }${body}${layout.contributions.bodyMainContent.contributions("aft").text()}`
    : "<!-- no typicalBodyPartial -->";
};

export const typicalHeadPartial: dsGovn.EssentialPartial = (layout) => {
  const dclHeadContribs = layout.contributions.domContentLoadedJS.contributions(
    "fore",
  );
  // deno-fmt-ignore (because we don't want ${...} wrapped)
  return `${layout.contributions.head.contributions("fore").text()}
<meta charset="utf-8" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<script src="${layout.contentStrategy.assets.uScript("/typical.js")}"></script>
<script src="${layout.contentStrategy.assets.dsScript("/essential.js")}"></script>
${clientDiagramsContributionsPartial(layout)}
${clientExtensionsContributionsPartial(layout)}
<link rel="shortcut icon" href="${layout.contentStrategy.assets.favIcon("/asset/image/favicon.ico")}"/>
<title>${layout.layoutText?.title(layout) ?? `no layout.layoutText in partial.ts::typicalHeadPartial`}</title>
${dclHeadContribs.contributions.length > 0 ? `<script>
  document.addEventListener("DOMContentLoaded", function () {
    ${dclHeadContribs.text()}
  });
  </script>` : ''}`;
};

export const typicalTailPartial: dsGovn.EssentialPartial = (layout) => {
  const dclTailContribs = layout.contributions.domContentLoadedJS.contributions(
    "aft",
  );
  // deno-fmt-ignore (because we don't want ${...} wrapped)
  return `${dclTailContribs.contributions.length ? `<script>
  document.addEventListener("DOMContentLoaded", function () {
    ${dclTailContribs.text()}
  });
  </script>` : ''}
  <script src="${layout.contentStrategy.assets.uScript("/typical-aft.js")}"></script>`
};

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

export function routeTreePartial(
  node: r.RouteTreeNode | undefined,
  layout: dsGovn.EssentialLayout,
  level = 0,
): string {
  // deno-fmt-ignore
  return node ? `<ul role="group">
      ${node.children.map(rtn => {
        const caption = rtn.label;
        // deno-fmt-ignore
        return `<li aria-expanded="true" aria-level="${level}"${(layout.activeTreeNode && rtn.qualifiedPath == layout.activeTreeNode.qualifiedPath) ? ' aria-selected="true" ' : ''}role="treeitem" tabindex="0">
        <div class="slds-tree__item">
            <button class="slds-button slds-button_icon slds-m-right_x-small slds-hidden" aria-hidden="true" tabindex="-1" title="Expand ${caption}">
                ICON chevronright
                <span class="slds-assistive-text">Expand ${caption}</span>
            </button>
            <span class="slds-tree__item-label" title="${(isHintable(rtn) ? rtn.hint : caption) || caption}"><a href="${layout.contentStrategy.navigation?.location(rtn)}">${caption}<a/></span>
        </div>
        ${rtn.children.length > 0 ? routeTreePartial(rtn, layout, level+1) : '<!-- leaf node -->'}
      </li>`}).join("\n")}
    </ul>` : `<!-- node not provided -->`;
}

export const contentTreePartial: dsGovn.EssentialPartial = (layout) => {
  const contentTree = layout.contentStrategy.navigation?.contentTree(layout);
  // deno-fmt-ignore (because we don't want ${...} wrapped)
  return contentTree ? `<div class="slds-box slds-box_x-small slds-text-align_center slds-m-around_x-small">
      <aside class="content-tree">
      <div class="slds-tree_container">
        <h4 class="slds-tree__group-header" id="treeheading">${contentTree.label}</h4>
        <ul aria-labelledby="treeheading" class="slds-tree" role="tree">
        ${routeTreePartial(contentTree, layout)}
        <ul>
      </div>
      </aside>
      </div>` : `<!-- no contentTree -->`
};

export const verticalNavigationPartial: dsGovn.EssentialPartial = (layout) => {
  const contentTree = layout.contentStrategy.navigation?.contentTree(layout);
  // deno-fmt-ignore (because we don't want ${...} wrapped)
  return contentTree ? `<nav class="slds-nav-vertical" aria-label="Sub page">
      <div class="slds-nav-vertical__section">
        <h2 id="entity-header" class="slds-nav-vertical__title">${contentTree.label}</h2>
        <ul aria-describedby="entity-header">
          ${contentTree.children.map(rtn => {
            const isActive = layout.activeTreeNode && rtn.qualifiedPath == layout.activeTreeNode.qualifiedPath;
            return `<li class="slds-nav-vertical__item ${isActive ? 'slds-is-active' : ''}">
              <a href="${layout.contentStrategy.navigation?.location(rtn)}" class="slds-nav-vertical__action"${isActive ? ' aria-current="true"' : ''}>${rtn.label}</a>
            </li>`;
          }).join('\n')}
        </ul>
      </div>
    </nav>` : `<!-- no vertical navigation -->`
};

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const breadcrumbsPartial: dsGovn.EssentialPartial = (layout) => `
  ${layout?.activeRoute ?
  `<!-- Breadcrumbs Navigation (see https://www.lightningdesignsystem.com/components/breadcrumbs/) -->
  <nav role="navigation" aria-label="Breadcrumbs">
    <ol class="slds-breadcrumb slds-list_horizontal slds-wrap">
      ${layout?.activeTreeNode?.ancestors.reverse().map(r => {
        return r.qualifiedPath == layout.activeTreeNode?.qualifiedPath ? '' : `<li class="slds-breadcrumb__item"><a href="${layout.contentStrategy.navigation?.location(r)}">${r.label}</a></li>`
      }).join("\n")}
    </ol>
  </nav>`: '<!-- no breadcrumbs -->'}`

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const breadcrumbsWithoutTerminalPartial: dsGovn.EssentialPartial = (layout) => `
  ${layout?.activeRoute ?
  `<!-- Breadcrumbs Navigation (see https://www.lightningdesignsystem.com/components/breadcrumbs/) -->
  <nav role="navigation" aria-label="Breadcrumbs">
    <ol class="slds-breadcrumb slds-list_horizontal slds-wrap">
      ${layout?.activeTreeNode?.ancestors.slice(1).reverse().map(r => {
        return r.qualifiedPath == layout.activeTreeNode?.qualifiedPath ? '' : `<li class="slds-breadcrumb__item"><a href="${layout.contentStrategy.navigation?.location(r)}">${r.label}</a></li>`
      }).join("\n")}
    </ol>
  </nav>`: '<!-- no breadcrumbs -->'}`

export const autoIndexCardsBodyPartial: dsGovn.EssentialPartial = (layout) => {
  const contentTree = layout.contentStrategy.navigation?.contentTree(layout);
  let cardNodes: r.RouteTreeNode[] | undefined;
  if (contentTree?.unit == html.indexUnitName) {
    cardNodes = contentTree?.parent
      ? [...contentTree.parent.children, ...contentTree.children]
      : contentTree.children;
  } else if (contentTree) {
    cardNodes = contentTree.children;
  }

  // deno-fmt-ignore (because we don't want ${...} wrapped)
  return cardNodes
      ? `<div class="slds-grid slds-wrap slds-var-m-around_medium">
          ${cardNodes.filter(rtn => rtn !== layout.activeTreeNode).map(rtn => {
            //const notifications = layout.contentStrategy.navigation.descendantsNotifications(rtn);
            return `<div class="slds-col slds-size_1-of-1 slds-medium-size_4-of-12 slds-order_2">
            ${rtn.label}
              {card.renderedCard(layout, {
                icon: { collection: "utility", name: rtn.children.length > 0 ? "open_folder": "page" },
                title: rtn.label,
                notifications,
                href: layout.contentStrategy.navigation.location(rtn),
              })}
            </div>`}).join('\n')}
        </div>`
      : `<!-- no index cards -->`;
};

/**
 * Place this in the <head> of your layouts to automatically include diagrams
 * generator code when layout.frontmatter.diagrams is true.
 * @param layout the active layout strategy execution instance
 * @returns diagrams scripts for <head> component
 */
// deno-fmt-ignore (because we don't want ${...} wrapped)
export const clientDiagramsContributionsPartial: dsGovn.EssentialPartial = (layout) =>
(layout?.frontmatter?.diagrams ? diagramScripts(layout.frontmatter.diagrams)
  : '<!-- layout.frontmatter.diagrams is false -->');

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
export const clientExtensionsContributionsPartial: dsGovn.EssentialPartial = (layout) =>
(layout?.frontmatter?.extensions ? extensionScripts(layout.frontmatter.extensions)
  : '<!-- layout.frontmatter.extensions is false -->');

export const footerFixedCopyrightBuildPartial: dsGovn.EssentialPartial = (
  layout,
) => {
  let gitBranch: string | undefined;
  let remoteAsset: html.GitRemoteAnchor | undefined;
  let remoteCommit:
    | git.GitRemoteCommit<"hash" | "authorName" | "subject">
    | undefined;
  let changelogReportHref: string | undefined;
  const buildStatusHTML = layout.contentStrategy.mGitResolvers
    ?.cicdBuildStatusHTML?.(layout);
  if (layout.contentStrategy.git) {
    const cached = layout.contentStrategy.git.cached;
    gitBranch = cached.currentBranch || "??";
    remoteCommit = cached.mostRecentCommit
      ? layout.contentStrategy.mGitResolvers?.remoteCommit(
        cached.mostRecentCommit,
        layout.contentStrategy.git,
      )
      : undefined;
    remoteAsset = layout.activeRoute
      ? layout.contentStrategy.routeGitRemoteResolver?.(
        layout.activeRoute,
        gitBranch,
        layout.contentStrategy.git,
      )
      : undefined;
    changelogReportHref = cached.mostRecentCommit
      ? layout.contentStrategy.mGitResolvers?.changelogReportAnchorHref?.(
        cached.mostRecentCommit,
      )
      : undefined;
  }
  let wsAsset: ws.WorkspaceEditorTarget | undefined;
  if (layout.activeRoute) {
    wsAsset = layout.contentStrategy.wsEditorRouteResolver?.(
      layout.activeRoute,
    );
  }
  // we hide the footer using display:none and then stickyFooter() in universal-cc/script/typical-aft.js will display it in the proper place
  // deno-fmt-ignore
  return `<footer class="footer font-size-medium slds-no-print" style="position: absolute; bottom: 0; height: 60px; margin-top: 40px; width: 100%; display:none;">
      <div class="slds-container_x-large slds-container_center slds-p-left_small slds-p-right_small">
        <article class="slds-text-align_center slds-p-top_small slds-p-bottom_large">
          <p class="slds-text-body_small">© 1997-<script>document.write(new Date().getFullYear())</script> Netspective Media LLC. All Rights Reserved.</p>
          <p class="slds-text-body_small">
            Publication created <span is="time-ago" date="${layout.contentStrategy.renderedAt}"/>
            ${remoteCommit ? ` (${changelogReportHref ? `<a href="${changelogReportHref}" class="git-changelog">triggered</a>`: 'triggered'} by <a href="${remoteCommit.remoteURL}" class="git-remote-commit" title="${remoteCommit.commit.subject}">${remoteCommit.commit.authorName}</a>)` : ''}
            ${buildStatusHTML ?? "<!-- no layout.contentStrategy.mGitResolvers -->"}
          </p>
          <p class="slds-text-body_small">
          ${remoteAsset
            ? `📄 <a href="${remoteAsset.href}" title="${remoteAsset.assetPathRelToWorkTree}" class="git-remote-object">${remoteAsset.textContent}</a>`
            : `<!-- no git remote -->`}
          ${layout.activeRoute?.terminal?.lastModifiedAt
            ? `modified <span is="time-ago" date="${layout.activeRoute?.terminal?.lastModifiedAt}" title="${layout.activeRoute?.terminal?.lastModifiedAt}"/>`
            : '<!-- no layout.activeRoute?.terminal?.lastModifiedAt -->'}
          ${wsAsset?.openInWorkspaceHTML ? ` (🧑‍💻 ${wsAsset.openInWorkspaceHTML("workspace-editor-target")})` : "<!-- workspace editor not resolved -->"}
          ${layout.contentStrategy.git ? ` 🌲 ${gitBranch}` : "<!-- not in Git work tree -->"}
          <div id="rf-universal-footer-experimental-server-workspace" style="display:none">Should only be displayed and dynamically populated if running in "experimental server" operational context.</div>
          </p>
        </article>
      </div>
    </footer>`;
};

export const frontmatterTagsPartial: dsGovn.EssentialPartial = (layout) => {
  const tm = layout.contentStrategy.termsManager;
  if (!tm) {
    return "<!-- no layout.contentStrategy.termsManager in frontmatterTagsPartial -->";
  }

  const badge = (term: k.Term) => {
    const ns = tm.termNamespace(term);
    // deno-fmt-ignore (because we don't want ${...} wrapped)
    return ns
        ? `<span class="slds-badge slds-badge_lightest"><em>${ns}</em>&nbsp;${tm.termLabel(term)}</span>`
        : `<span class="slds-badge slds-badge_lightest">${tm.termLabel(term)}</span>`;
  };

  const badges = (terms: k.Term | k.Term[]) => {
    // check for array first since a term can also be an array
    return Array.isArray(terms)
      ? terms.map((term) => badge(term!)).join(" ")
      : badge(terms);
  };

  return `${
    layout?.frontmatter?.folksonomy &&
      tm.isFolksonomy(layout.frontmatter.folksonomy)
      ? badges(layout.frontmatter.folksonomy)
      : "<!-- no folksonomy in frontmatter -->"
  }
    ${
    layout?.frontmatter?.taxonomy && tm.isTaxonomy(layout.frontmatter.taxonomy)
      ? badges(layout.frontmatter.taxonomy)
      : "<!-- no taxonomy in frontmatter -->"
  }`;
};

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const asideTocPartial: dsGovn.EssentialPartial = (layout) => `
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
export const asideTocIfRequestedPartial: dsGovn.EssentialPartial = (layout) => `${layout?.frontmatter?.asideTOC ? `
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

/**
 * Show the diagnostics text if the current layout's target body is supplying it, blank if not
 * @param _ body is not used
 * @param layout the active layout strategy execution instance
 * @returns HTML
 */
export const resourceDiagnosticsPartial: dsGovn.EssentialPartial = (layout) =>
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
export const layoutDiagnosticsPartial: dsGovn.EssentialPartial = (layout, body) => `${layout?.diagnostics ? `
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
