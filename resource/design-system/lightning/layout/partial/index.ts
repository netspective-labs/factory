import * as r from "../../../../../route/mod.ts";
import * as ds from "../../../../html/mod.ts";
import * as ldsGovn from "../../governance.ts";
import * as card from "./card.ts";

export const autoIndexCardsBodyPartial: ldsGovn.LightningPartial = (layout) => {
  const contentTree = layout.contentStrategy.navigation?.contentTree(layout);
  let cardNodes: r.RouteTreeNode[] | undefined;
  if (contentTree?.unit == ds.indexUnitName) {
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
          const notifications = layout.contentStrategy.navigation?.descendantsNotifications(rtn);
          return `<div class="slds-col slds-size_1-of-1 slds-medium-size_4-of-12 slds-order_2">
            ${card.renderedCard(layout, {
              icon: { collection: "utility", name: rtn.children.length > 0 ? "open_folder": "page" },
              title: rtn.label,
              notifications,
              href: layout.contentStrategy.navigation?.location(rtn),
            })}
          </div>`}).join('\n')}
      </div>`
    : `<!-- no index cards -->`;
};
