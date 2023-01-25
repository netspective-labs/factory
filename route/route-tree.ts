import * as safety from "../safety/mod.ts";
import * as govn from "./governance.ts";
import * as r from "./route.ts";
import * as fsr from "./fs-route.ts";

export const isRouteTreeSupplier = safety.typeGuard<govn.RouteTreeSupplier>(
  "routeTree",
);

export const isRouteTreeNode = safety.typeGuard<govn.RouteTreeNode>(
  "owner",
  "ancestors",
  "children",
  "select",
);

/**
 * Convert relative path to absolute
 * @param base the path that `relative` is relative to
 * @param relative the path relative to `base` (can be ./, ../.., etc.)
 * @returns
 */
export function selectTreeNode(
  node: govn.RouteTreeNode,
  query: string,
  noMatch?: (endIndex: number, parseError?: boolean) => govn.RouteTreeNode,
): govn.RouteTreeNode | undefined {
  const path = [node, ...node.ancestors].reverse();
  let pathIndex = path.length - 1;
  let result: govn.RouteTreeNode | undefined = node;
  if (pathIndex < 0) return undefined;
  const parts = query.split("/");
  const lastPartsIndex = parts.length - 1;
  for (let i = 0; i < parts.length; i++) {
    const activePart = parts[i];
    if (activePart == "." || activePart == "") {
      continue;
    }
    if (activePart == "..") {
      pathIndex--;
      result = (pathIndex >= 0 && pathIndex < path.length)
        ? path[pathIndex]
        : undefined;
    } else {
      // a subdirectory is requested
      if (result?.children) {
        const child = result.children.find((n) => n.unit == activePart);
        if (child) {
          if (i < lastPartsIndex) {
            return selectTreeNode(child, parts.slice(i + 1).join("/"));
          }
          return child;
        } else {
          return noMatch ? noMatch(pathIndex, true) : undefined;
        }
      } else {
        return noMatch ? noMatch(pathIndex, true) : undefined;
      }
    }
  }
  if (result) return result;
  return noMatch ? noMatch(pathIndex) : undefined;
}

/**
 * Walk all the nodes of the route tree until the inspector returns false
 * @param nodes The tree nodes to traverse
 * @param inspector The function to call for each node, return true to continue traversal or false to end traversal
 * @param maxLevel Stop once the level reaches this maximum
 * @returns a single node that cause traversal to end or void if all nodes traversed
 */
export function inspectNodes(
  nodes: govn.RouteTreeNode[],
  inspector: (entry: govn.RouteTreeNode) => boolean,
  maxLevel?: number,
): govn.RouteTreeNode | void {
  for (const node of nodes) {
    const result = inspector(node);
    if (!result) return node;
    if (typeof maxLevel === "number" && node.level > maxLevel) continue;
    if (node.children.length > 0) {
      inspectNodes(node.children, inspector, maxLevel);
    }
  }
}

/**
 * Traverse the tree and populate a flat array of all matching nodes
 * @param nodes The tree nodes to traverse
 * @param inspector The function to call for each node, return true to populate or false to skip node
 * @param populate The array to fill with nodes that inspector agrees to populate
 * @param level The current level being inspected
 * @param maxLevel Stop populating once the level reaches this maximum
 */
export function flatFilterNodes(
  nodes: govn.RouteTreeNode[],
  inspector: (entry: govn.RouteTreeNode) => boolean,
  populate: govn.RouteTreeNode[],
  level: number,
  maxLevel?: number,
): void {
  const filtered = nodes.filter((n) => inspector(n));
  populate.push(...filtered);
  for (const node of filtered) {
    if (
      typeof maxLevel !== "number" ||
      level <= maxLevel && node.children.length > 0
    ) {
      flatFilterNodes(node.children, inspector, populate, level + 1, maxLevel);
    }
  }
}

export interface RouteTreeNodeExists {
  (
    prospect: govn.RouteNode,
    siblings: govn.RouteTreeNode[],
    rs: govn.RouteSupplier | govn.Route,
  ): govn.RouteTreeNode | undefined;
}

export class TypicalRouteTree implements govn.RouteTree {
  readonly fileSysPaths = new Map<string, govn.RouteTreeNode>();
  readonly locations = new Map<govn.RouteLocation, govn.RouteTreeNode>();
  readonly items: govn.RouteTreeNode[] = [];
  readonly aliasesSuppliers: govn.RouteTreeNode[] = [];
  readonly redirects: (govn.RouteTreeNode & govn.RedirectSupplier)[] = [];
  readonly targetableRouteNodes = new Map<
    govn.TargetableRouteIdentity,
    govn.RouteTreeNode
  >();
  readonly duplicateTargetableNodeIDs = new Map<
    govn.TargetableRouteIdentity,
    govn.RouteTreeNode[]
  >();
  readonly targetableRoutes = new Map<
    govn.TargetableRouteIdentity,
    govn.Route
  >();
  readonly duplicateTargetableRouteIDs = new Map<
    govn.TargetableRouteIdentity,
    govn.Route[]
  >();

  constructor(
    readonly routeFactory: govn.RouteFactory,
    readonly nodeExists?: RouteTreeNodeExists,
  ) {
  }

  targetableRouteNode(
    ID: govn.TargetableRouteIdentity,
  ): govn.RouteTreeNode | undefined {
    return this.targetableRouteNodes.get(ID);
  }

  targetableRoute(
    ID: govn.TargetableRouteIdentity,
  ): govn.Route | undefined {
    return this.targetableRoutes.get(ID);
  }

  node(location: govn.RouteLocation): govn.RouteTreeNode | undefined {
    return this.locations.get(location);
  }

  fileSysNode(fileSysAbsPath: string): govn.RouteTreeNode | undefined {
    return this.fileSysPaths.get(fileSysAbsPath);
  }

  registerAliases(node: govn.RouteTreeNode) {
    if (node.aliases) {
      // TODO: this might allow duplicate aliases; should we allow this?
      // current assumption is that the renderer will deal with dupes.
      this.aliasesSuppliers.push(node);
    }
  }

  registerTargetableNode(node: govn.RouteTreeNode) {
    if (!node.targetableID) return;

    const ID = node.targetableID;
    const found = this.targetableRouteNode(ID);
    if (!found) {
      this.targetableRouteNodes.set(ID, node);
    } else {
      const foundDT = this.duplicateTargetableNodeIDs.get(ID);
      if (foundDT) {
        foundDT.push(node);
      } else {
        const dupes = [found, node];
        this.duplicateTargetableNodeIDs.set(ID, dupes);
      }
    }
  }

  registerTargetableRoute(route: govn.Route) {
    if (!route.targetableID) return;

    const ID = route.targetableID;
    const found = this.targetableRoute(ID);
    if (!found) {
      this.targetableRoutes.set(ID, route);
    } else {
      const foundDT = this.duplicateTargetableRouteIDs.get(ID);
      if (foundDT) {
        foundDT.push(route);
      } else {
        const dupes = [found, route];
        this.duplicateTargetableRouteIDs.set(ID, dupes);
      }
    }
  }

  consumeRoute(
    rs: govn.RouteSupplier | govn.Route,
    options?: {
      readonly nodeExists?: RouteTreeNodeExists;
      readonly copyOf?: govn.RouteTreeNode;
    },
  ): govn.RouteTreeNode | undefined {
    const nodeExists = options?.nodeExists || this.nodeExists ||
      ((node, collection) => collection.find((cn) => cn.unit == node.unit));
    const route = r.isRouteSupplier(rs) ? rs.route : rs;
    this.registerTargetableRoute(route);
    const units = route.units;
    const terminalIndex = units.length - 1;
    const createTreeNode = (
      unitIndex: number,
      collection: govn.RouteTreeNode[],
      ancestors: govn.RouteTreeNode[],
    ) => {
      // the first ancestor is the parent, second is grandparent, etc.
      const routeNode = units[unitIndex];
      let result = nodeExists(routeNode, collection, rs);
      if (!result) {
        const isTerminal = unitIndex == terminalIndex;
        const parent = ancestors.length > 0 ? ancestors[0] : undefined;
        result = {
          owner: this,
          parent,
          ancestors,
          route: isTerminal ? route : undefined,
          select: (query) => {
            return selectTreeNode(result!, query);
          },
          walk: (inspector) => {
            return inspectNodes(result!.children, inspector);
          },
          ...routeNode,
          children: [],
        };
        collection.push(result);
        this.locations.set(result.qualifiedPath, result);
        if (fsr.isFileSysRouteUnit(routeNode)) {
          this.fileSysPaths.set(routeNode.fileSysPath, result);
        }
        if (result.targetableID) this.registerTargetableNode(result);
        if (result.aliases) this.registerAliases(result);
      }
      return result;
    };

    let treeItem: govn.RouteTreeNode | undefined;
    if (units.length > 0) {
      treeItem = createTreeNode(0, this.items, []);

      const recurse = (
        level: number,
        ancestors: govn.RouteTreeNode[],
      ): govn.RouteTreeNode | undefined => {
        const parent = ancestors[0];
        if (level < units.length) {
          const child = createTreeNode(level, parent.children, ancestors);
          return recurse(level + 1, [child, ...ancestors]);
        }
        return parent;
      };
      treeItem = recurse(1, [treeItem]);
    }
    return treeItem;
  }

  consumeAliases() {
    for (const node of this.aliasesSuppliers) {
      const consumeRelativePathOrIdentity = (
        path: govn.TargetableRouteIdentityOrRelPath,
      ): govn.RouteTreeNode | undefined => {
        const found = node.select(path);
        if (found) {
          if (r.isRedirectSupplier(found)) {
            console.warn(
              `${node.qualifiedPath} is requesting an alias from ${found.qualifiedPath} but it's already an alias for ${found.redirect}`,
            );
            return undefined;
          }
          // deno-lint-ignore no-explicit-any
          (found as any).redirect = node;
          if (!found.route) {
            // deno-lint-ignore no-explicit-any
            (found as any).route = this.routeFactory.route(found);
          }
          if (r.isRedirectSupplier(found)) {
            this.redirects.push(found);
          } else {
            console.error(
              `${node.qualifiedPath} is requesting an alias from path and '${path}' is valid but r.isRedirectSupplier(found) is false`,
            );
          }
          return found;
        } else {
          console.error(
            `${node.qualifiedPath} is requesting an alias from path but '${path}' could not be resolved to a proper route tree node`,
          );
        }
      };

      if (node.aliases) {
        for (const alias of node.aliases) {
          if (typeof alias === "string") {
            consumeRelativePathOrIdentity(alias);
          } else {
            const rtn = consumeRelativePathOrIdentity(alias.routeIdOrPath);
            if (rtn) {
              // deno-lint-ignore no-explicit-any
              (rtn as any).label = alias.label ? alias.label : node.label;
            }
          }
        }
      }
    }
  }

  consumeTree(
    source: govn.RouteTree,
    filter: (n: govn.RouteTreeNode) => boolean,
    options?: {
      readonly nodeExists?: RouteTreeNodeExists;
      readonly order?: (a: govn.RouteTreeNode, b: govn.RouteTreeNode) => number;
    },
  ): void {
    const order = options?.order;
    inspectNodes(source.items, (node) => {
      if (node.route && filter(node)) {
        this.consumeRoute(node.route, { ...options, copyOf: node });
      }
      return true;
    });
    if (order) this.organize(order);
  }

  walkNodes(
    inspector: (entry: govn.RouteTreeNode) => boolean,
    maxLevel?: number,
  ): govn.RouteTreeNode | void {
    return inspectNodes(this.items, inspector, maxLevel);
  }

  filterNodes(
    inspector: (entry: govn.RouteTreeNode) => boolean,
    maxLevel?: number,
  ): Iterable<govn.RouteTreeNode> {
    const result: govn.RouteTreeNode[] = [];
    flatFilterNodes(this.items, inspector, result, 0, maxLevel);
    return result;
  }

  organize(
    order: (a: govn.RouteTreeNode, b: govn.RouteTreeNode) => number,
  ): void {
    const organizeTreeNodes = (parent: govn.RouteTreeNode) => {
      const sorted = parent.children.sort(order);
      parent.children.splice(0, sorted.length, ...sorted);
      for (const node of parent.children) {
        organizeTreeNodes(node);
      }
    };

    const sorted = this.items.sort(order);
    this.items.splice(0, sorted.length, ...sorted);
    for (const node of this.items) {
      organizeTreeNodes(node);
    }
  }
}
