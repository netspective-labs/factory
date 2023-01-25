import * as r from "../../../../../route/mod.ts";
import * as ldsGovn from "../../governance.ts";
import * as icon from "./icon.ts";

function isHintable(item: r.RouteNode): item is r.RouteNode & { hint: string } {
  return "hint" in item ? true : false;
}

export const contextBarPartial: ldsGovn.LightningPartial = (layout) => {
  const cbs = layout.contentStrategy.branding.contextBarSubject;
  const subject = typeof cbs === "function"
    ? cbs(layout, layout.contentStrategy.assets)
    : cbs;
  let subjectLabel, subjectHref;
  if (typeof subject === "string") {
    subjectLabel = subject;
    subjectHref = layout.contentStrategy.navigation?.home;
  } else if (Array.isArray(subject)) {
    subjectLabel = subject[0];
    subjectHref = subject[1];
  }
  const cbsis = layout.contentStrategy.branding.contextBarSubjectImageSrc;
  const subjectImgSrc = typeof cbsis === "function"
    ? cbsis(layout.contentStrategy.assets, layout)
    : cbsis;
  let subjectImgSrcText, subjectImgSrcHref;
  if (typeof subjectImgSrc === "string") {
    subjectImgSrcText = subjectImgSrc;
    subjectImgSrcHref = subjectHref;
  } else if (Array.isArray(subjectImgSrc)) {
    subjectImgSrcText = subjectImgSrc[0];
    subjectImgSrcHref = subjectImgSrc[1];
  }
  // deno-fmt-ignore (because we don't want ${...} wrapped)
  return `
  <article style="background-color: #fff; border-bottom: 3px solid #1589ee;">
    <section class="slds-container_x-large slds-container_center slds-p-left_small slds-p-right_small">
  <!-- top section - 1 -->
    <div class="slds-clearfix">
      ${subjectLabel || subjectImgSrcText ? `
      <div class="slds-float_left">
        <div class="slds-context-bar__primary">
          ${subjectImgSrcText ? `
          <div class="slds-context-bar__icon-action">
            <a href="${subjectImgSrcHref}"><img src="${subjectImgSrcText}" width="30" height="30" alt="" class="slds-m-top_xx-small"></a>
          </div>
          `:''}
          ${subjectLabel ? `
          <span class="slds-context-bar__label-action slds-context-bar__app-name slds-m-top_xx-small">
          <span class="slds-truncate" title="${subjectLabel}"><a style="color: #000;" href="${subjectHref}">${subjectLabel}</a></span></span>
      </div>`:''}
      </div>`:''}
      <div class="slds-float_left" style="vertical-align: middle">
      <span id="rf-explorer-activate-container" style="display:none; position:relative; top: 7px;">
        Seeing this message? Report as a RF Console bug.
      </span>
      </div>
      <div class="slds-float_right">
        <div class="slds-grid slds-gutters slds-wrap slds-m-top_xx-small slds-text-align_right">
          <span id="rf-universal-tunnel-state-summary-container" style="display:none; position:relative; top: 7px;">
            Seeing this message? Report as a RF Tunnel State bug.
          </span>
          <div class="slds-col slds-m-vertical_xxx-small">
            <div class="slds-form-element">
              <div class="slds-form-element__control slds-input-has-icon slds-input-has-icon_right">
              <svg class="slds-icon slds-input__icon slds-input__icon_right slds-icon-text-default" aria-hidden="true">
              <use href="/lightning/image/slds-icons/utility-sprite/svg/symbols.svg#search"></use>
              </svg>
              <input type="text" id="text-input-id-1" placeholder="Search" class="slds-input">
              </div>
              </div>
          </div>
        </div>
      </div>
    </div>
    <hr class="slds-m-vertical_xxx-small">
  <!-- top section - 2 -->
    <div class="slds-clearfix">
      <div class="slds-float_left">
      <nav class="slds-context-bar__primary" role="navigation">
      <ul class="slds-grid">
        ${layout.contentStrategy.navigation?.contextBarItems(layout).map(item => { return `
        <li class="slds-context-bar__item${layout.activeRoute?.inRoute(item) ? ' slds-is-active' : ''}">
          <a href="${layout.contentStrategy.navigation?.location(item)}" class="slds-context-bar__label-action" ${isHintable(item) ? `title="${item.hint}"` : '' }">
            <span class="slds-truncate"${isHintable(item) ? ` title="${item.hint}"` : '' }>${item.label}</span>
          </a>
        </li>`}).join("\n")}
      </ul>
    </nav>

      </div>
      <div class="slds-float_right" style="width: 125px;">
        <div class="slds-grid slds-gutters slds-wrap slds-m-top_xx-small top-right-widget">
          <div class="slds-col">
            <div style="position: relative; top:-2px;"><span class="slds-avatar slds-avatar_circle">
              <img alt="Shahid Shah" src="/asset/image/shahid-shah.png" title="Shahid Shah">
            </span>
            <span style="display: inline-block; font-size: 11px; line-height: 13px; position: absolute; top: 2px;">Published by<br> <a target="_blank" href="http://shahidshah.com/">@ShahidNShah</a></span></div>
          </div>
        </div>
      </div>
    </div>
    </section>
  </article>`
};

export function routeTreePartial(
  node: r.RouteTreeNode | undefined,
  layout: ldsGovn.LightningLayout,
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
              ${icon.renderedButtonIcon(layout, "chevronright")}
              <span class="slds-assistive-text">Expand ${caption}</span>
          </button>
          <span class="slds-tree__item-label" title="${(isHintable(rtn) ? rtn.hint : caption) || caption}"><a href="${layout.contentStrategy.navigation?.location(rtn)}">${caption}<a/></span>
      </div>
      ${rtn.children.length > 0 ? routeTreePartial(rtn, layout, level+1) : '<!-- leaf node -->'}
    </li>`}).join("\n")}
  </ul>` : `<!-- node not provided -->`;
}

export const contentTreePartial: ldsGovn.LightningPartial = (layout) => {
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

export const verticalNavigationPartial: ldsGovn.LightningPartial = (layout) => {
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

export const verticalNavigationShadedPartial: ldsGovn.LightningPartial = (
  layout,
) => {
  const contentTree = layout.contentStrategy.navigation?.contentTree(layout);
  // deno-fmt-ignore (because we don't want ${...} wrapped)
  return contentTree ? `<div class="content-tree" style="background-color:#FAFAFB">
    <div class="slds-nav-vertical__section">
      <div>
      <fieldset class="slds-nav-vertical slds-nav-vertical_compact slds-nav-vertical_shade">
        <legend class="slds-nav-vertical__title">${contentTree.label}</legend>
        ${contentTree.children.map(rtn => {
          const isActive = layout.activeTreeNode && rtn.qualifiedPath == layout.activeTreeNode.qualifiedPath;
          const notifications = layout.contentStrategy.navigation?.descendantsNotifications<ldsGovn.LightningNavigationNotification>(rtn);
          return `<span class="slds-nav-vertical__item">
            <input type="radio" id="unique-id-03-recent" value="unique-id-03-recent" name="unique-id-shade"${isActive ? ' checked=""' : ''} />
            <label class="slds-nav-vertical__action" for="unique-id-03-recent">
              <a href="${layout.contentStrategy.navigation?.location(rtn)}">
                <span class="slds-nav-vertical_radio-faux">${rtn.label}</span>
              </a>
              ${notifications ? notifications.collection.map(lnn => `<span class="slds-badge slds-col_bump-left">
                ${lnn.icon ? icon.renderedIconContainer(layout, lnn.icon, "slds-icon_xx-small slds-icon-text-default slds-m-right_xx-small") : ''}<span class="slds-assistive-text">:</span>${lnn.count()}
                ${lnn.subject ? `<span class="slds-assistive-text">${lnn.subject}</span>` : ''}
              </span>`).join("\n") : '<!-- no notifications -->'}
            </label>
          </span>`;
        }).join('\n')}
      </fieldset>
      </div>
    </div>
  </div>` : `<!-- no vertical shaded navigation -->`
};

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const breadcrumbsPartial: ldsGovn.LightningPartial = (layout) => `
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
export const breadcrumbsWithoutTerminalPartial: ldsGovn.LightningPartial = (layout) => `
${layout?.activeRoute ?
`<!-- Breadcrumbs Navigation (see https://www.lightningdesignsystem.com/components/breadcrumbs/) -->
<nav role="navigation" aria-label="Breadcrumbs">
  <ol class="slds-breadcrumb slds-list_horizontal slds-wrap">
    ${layout?.activeTreeNode?.ancestors.slice(1).reverse().map(r => {
      return r.qualifiedPath == layout.activeTreeNode?.qualifiedPath ? '' : `<li class="slds-breadcrumb__item"><a href="${layout.contentStrategy.navigation?.location(r)}">${r.label}</a></li>`
    }).join("\n")}
  </ol>
</nav>`: '<!-- no breadcrumbs -->'}`
