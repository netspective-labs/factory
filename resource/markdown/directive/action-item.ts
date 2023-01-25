import * as safety from "../../../safety/mod.ts";
import * as r from "../../../route/mod.ts";
import * as aiM from "../../model/action-item.ts";
import * as htmlDS from "../../html/mod.ts";
import * as notif from "../../../notification/mod.ts";

export interface RouteNodeActionItem {
  readonly node: r.RouteTreeNode;
  readonly actionItem: aiM.ActionItem;
}

export const isRouteNodeActionItem = safety.typeGuard<RouteNodeActionItem>(
  "node",
  "actionItem",
);

export function routeNodesActionItems(
  nodes: r.RouteTreeNode[],
  accumulate: RouteNodeActionItem[],
  options?: {
    readonly recurse: boolean;
  },
): void {
  const actions = (
    parentRTN: r.RouteTreeNode,
    recurse?: boolean,
  ) => {
    if (recurse) {
      parentRTN.walk((rtn) => {
        if (aiM.isActionItemsModelSupplier(rtn)) {
          accumulate.push(
            ...(rtn.model.actionItems.map((actionItem) => ({
              actionItem,
              node: rtn,
            }))),
          );
        }
        return true;
      });
    }
    if (notif.isNotificationsSupplier(parentRTN)) {
      if (aiM.isActionItemsModelSupplier(parentRTN)) {
        accumulate.push(
          ...(parentRTN.model.actionItems.map((actionItem) => ({
            actionItem,
            node: parentRTN,
          }))),
        );
      }
    }
    return accumulate;
  };

  for (const node of nodes) {
    actions(node, options?.recurse);
  }
}

export function activeRouteNodeActionItems(
  activeNode: r.RouteTreeNode | undefined,
): RouteNodeActionItem[] {
  let actionNodes: r.RouteTreeNode[] | undefined;
  if (activeNode?.unit == htmlDS.indexUnitName) {
    actionNodes = activeNode?.parent
      ? [...activeNode.parent.children, ...activeNode.children]
      : activeNode.children;
  } else if (activeNode) {
    actionNodes = activeNode.children;
  }
  const actionItems: RouteNodeActionItem[] = [];
  if (actionNodes) {
    routeNodesActionItems(actionNodes, actionItems, {
      recurse: true,
    });
  }
  return actionItems;
}
