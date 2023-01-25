import * as safety from "../../../safety/mod.ts";
import * as git from "../../../git/mod.ts";
import * as c from "../../content/mod.ts";
import * as coll from "../../collection/mod.ts";
import * as fm from "../../frontmatter/mod.ts";
import * as notif from "../../../notification/mod.ts";
import * as r from "../../../route/mod.ts";
import * as ren from "../../render/mod.ts";
import * as redir from "../../html/commons/redirects.ts";

export const TypicalRoutesGitAssetUrlResolverID = "universal" as const;

export class ResourcesTree extends r.TypicalRouteTree {
  consumeRoute(
    rs: r.RouteSupplier | r.Route,
    options?: {
      readonly nodeExists?: r.RouteTreeNodeExists;
      readonly copyOf?: r.RouteTreeNode;
    },
  ): r.RouteTreeNode | undefined {
    const result = super.consumeRoute(rs, options);
    if (fm.isFrontmatterSupplier(rs)) {
      fm.referenceFrontmatter(rs, result);
    }
    if (c.isModelSupplier(rs)) {
      c.referenceModel(rs, result);
      if (notif.isNotificationsSupplier(rs.model)) {
        notif.referenceNotifications(rs.model, result);
      }
    }
    return result;
  }
}

export class NavigationTree extends r.TypicalRouteTree {
  consumeRoute(
    rs: r.RouteSupplier | r.Route,
    options?: {
      readonly nodeExists?: r.RouteTreeNodeExists;
      readonly copyOf?: r.RouteTreeNode;
    },
  ): r.RouteTreeNode | undefined {
    const result = super.consumeRoute(rs, options);
    const copyOf = options?.copyOf;
    if (c.isModelSupplier(copyOf)) {
      c.referenceModel(copyOf, result);
      if (notif.isNotificationsSupplier(copyOf.model)) {
        notif.referenceNotifications(copyOf.model, result);
      }
    }
    return result;
  }
}

/**
 * Implement this interface in RouteUnit terminals when you want to do special
 * handling of routes when they are consumed and inserted into resourcesTree.
 */
export interface PublicationRouteEventsHandler<Context> {
  /**
   * Mutate the resource route before a route tree node is created. Context is
   * an arbitrary return value that can be used to pass into
   * prepareResourceTreeNode as necessary.
   * @param rs the resource, which has rs.route and all other resource content
   */
  readonly prepareResourceRoute?: (
    rs: r.RouteSupplier<r.RouteNode>,
  ) => Context;

  /**
   * Mutate the resource's route tree node after construction plus frontmatter
   * and model references have been added. When this event handler is called,
   * the route and route tree node are fully resolved. This event handler is
   * useful if the route tree node should be mutated based on the resource's
   * content, frontmatter, model, or any other business/presentation logic.
   * @param rs the resource
   * @param rtn the route tree node, if creation was successful
   * @param ctx if prepareResourceRoute was called before prepareResourceTreeNode, this is the Context
   */
  readonly prepareResourceTreeNode?: (
    rs: r.RouteSupplier<r.RouteNode>,
    rtn?: r.RouteTreeNode,
    ctx?: Context,
  ) => void;
}

export const isPublicationRouteEventsHandler = safety.typeGuard<
  // deno-lint-ignore no-explicit-any
  PublicationRouteEventsHandler<any>
>("prepareResourceRoute", "prepareResourceTreeNode");

export class PublicationRoutes {
  readonly gitAssetPublUrlResolver: git.GitWorkTreeAssetUrlResolver<string> = {
    identity: TypicalRoutesGitAssetUrlResolverID,
    gitAssetUrl: (asset, fallback) => {
      let node = this.resourcesTree.fileSysPaths.get(
        asset.assetPathRelToWorkTree,
      );
      if (!node) {
        node = this.resourcesTree.fileSysPaths.get(
          asset.paths.assetAbsWorkTreePath(asset),
        );
      }
      if (node) return node.location();
      return fallback ? fallback() : undefined;
    },
  };

  constructor(
    readonly routeFactory: r.RouteFactory,
    readonly resourcesTree = new ResourcesTree(routeFactory),
    readonly navigationTree = new NavigationTree(routeFactory),
  ) {
  }

  /**
   * Add the given route to this.resourcesTree. Subclasses can override this
   * method if the route should be rejected for some reason.
   * @param rs The route supplier whose route will be consumed or rejected
   * @returns the newly create tree node or undefined if route is rejected
   */
  consumeResourceRoute(
    rs: r.RouteSupplier<r.RouteNode>,
  ): r.RouteTreeNode | undefined {
    let ctx: unknown;
    const terminal = rs?.route?.terminal;
    if (
      isPublicationRouteEventsHandler(terminal) && terminal.prepareResourceRoute
    ) {
      ctx = terminal.prepareResourceRoute(rs);
    }

    const result = this.resourcesTree.consumeRoute(rs);

    if (
      isPublicationRouteEventsHandler(terminal) &&
      terminal.prepareResourceTreeNode
    ) {
      terminal.prepareResourceTreeNode(rs, result, ctx);
    }

    return result;
  }

  /**
   * Supply a refinery which will observe each resource and, if it has a route,
   * will populate (consume/track) the route by creating a RouteTreeNode
   * instance tied to the resource. If the resource defines either frontmatter
   * or a model those objects are injected into the RouteTreeNode as well. The
   * job of the resourcesTreeConsumerSync refinery is to populate the
   * resourcesTree but not make any business logic or presentation logic
   * decisions. Presentation and business logic associated with routes should be
   * handled by prepareNavigationTree().
   * @returns resource refinery (sync)
   */
  resourcesTreePopulator(): coll.ResourceRefinery<
    r.RouteSupplier<r.RouteNode>
  > {
    // deno-lint-ignore require-await
    return async (resource) => {
      if (r.isRouteSupplier(resource)) {
        this.consumeResourceRoute(resource);
      }
      return resource;
    };
  }

  resourcesTreePopulatorSync(): coll.ResourceRefinerySync<
    r.RouteSupplier<r.RouteNode>
  > {
    return (resource) => {
      if (r.isRouteSupplier(resource)) {
        this.consumeResourceRoute(resource);
      }
      return resource;
    };
  }

  /**
   * Build a navigation tree that can be used for end-user UI/UX use. This
   * method is a companion to the resourcesTreePopulatorSync() refinery.
   * prepareNavigation assumes that this.resourcesTree has been populated with
   * all known resources and that the navigation tree is a navigable subset of
   * resourcesTree.
   */
  prepareNavigationTree() {
    this.resourcesTree.consumeAliases();
    this.navigationTree.consumeTree(
      this.resourcesTree,
      (node) =>
        ren.isRenderableMediaTypeResource(
            node.route,
            c.htmlMediaTypeNature.mediaType,
          )
          ? true
          : false,
    );
  }

  /**
   * Create a resource factory which can generate redirect resources; redirect
   * resources represent content whose job it is to redirect to a different URL
   * either within the same site or to external resources.
   * @returns
   */
  redirectResources(): coll.ResourcesFactoriesSupplier<c.HtmlResource> {
    return redir.redirectResources(this.resourcesTree);
  }
}
