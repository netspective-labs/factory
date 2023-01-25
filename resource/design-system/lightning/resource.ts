import * as gi from "../../../structure/govn-index.ts";
import * as c from "../../content/mod.ts";
import * as coll from "../../collection/mod.ts";
import * as fm from "../../frontmatter/mod.ts";
import * as r from "../../../route/mod.ts";
import * as h from "../../html/mod.ts";
import * as lds from "./governance.ts";
import * as ldsL from "./layout/mod.ts";

export function typicalHtmlResource(
  rf: r.RouteFactory,
  parentRoute: r.Route,
  childUnit: r.RouteUnit,
  frontmatter:
    & fm.UntypedFrontmatter
    & h.DesignSystemLayoutArgumentsSupplier,
  HTML: lds.LightningLayoutBodySupplier,
  origin?: r.ModuleRouteOrigin,
  indexKeys?: gi.GovnIndexKey[],
): [
  route: r.Route,
  factory: h.PersistableHtmlResource,
] {
  const route = {
    ...rf.childRoute(
      childUnit,
      parentRoute,
      true,
    ),
    nature: h.htmlContentNature,
    origin,
  };
  const htmlResource:
    & h.PersistableHtmlResource
    & r.RouteSupplier
    & fm.FrontmatterSupplier<fm.UntypedFrontmatter> = {
      nature: h.htmlContentNature,
      frontmatter,
      route,
      html: {
        // deno-lint-ignore require-await
        text: async (layout: lds.LightningLayout) => HTML(layout),
        textSync: HTML,
      },
    };
  if (indexKeys) {
    (htmlResource as unknown as gi.MutatableGovnIndexKeysSupplier)
      .indexKeys = indexKeys;
  }
  return [route, htmlResource];
}

export function smartNavigationPageHtmlFactory(
  rf: r.RouteFactory,
  parentRoute: r.Route,
  childUnit: r.RouteUnit,
  HTML: lds.LightningLayoutBodySupplier,
  origin?: r.ModuleRouteOrigin,
  indexKeys?: gi.GovnIndexKey[],
): [
  route: r.Route,
  factory: coll.ResourceFactorySupplier<c.HtmlResource>,
] {
  const frontmatter:
    & fm.UntypedFrontmatter
    & h.DesignSystemLayoutArgumentsSupplier = {
      layout: {
        identity: ldsL.smartNavigationPage.identity,
      },
    };

  return typicalHtmlFactory(
    rf,
    parentRoute,
    childUnit,
    frontmatter,
    HTML,
    origin,
    indexKeys,
  );
}

export function typicalHtmlFactory(
  rf: r.RouteFactory,
  parentRoute: r.Route,
  childUnit: r.RouteUnit,
  frontmatter:
    & fm.UntypedFrontmatter
    & h.DesignSystemLayoutArgumentsSupplier,
  HTML: lds.LightningLayoutBodySupplier,
  origin?: r.ModuleRouteOrigin,
  indexKeys?: gi.GovnIndexKey[],
): [
  route: r.Route,
  factory: coll.ResourceFactorySupplier<c.HtmlResource>,
] {
  const [route, resource] = typicalHtmlResource(
    rf,
    parentRoute,
    childUnit,
    frontmatter,
    HTML,
    origin,
    indexKeys,
  );
  return [route, {
    // deno-lint-ignore require-await
    resourceFactory: async () => {
      return resource;
    },
  }];
}

export function autoIndexHtmlFactory(
  rf: r.RouteFactory,
  parentRoute: r.Route,
  label: string,
  origin?: r.ModuleRouteOrigin,
  indexKeys?: gi.GovnIndexKey[],
): [
  route: r.Route,
  factory: coll.ResourceFactorySupplier<c.HtmlResource>,
] {
  const route = {
    ...rf.childRoute(
      { unit: h.indexUnitName, label },
      parentRoute,
      true,
    ),
    nature: h.htmlContentNature,
    origin,
  };
  return [route, {
    // deno-lint-ignore require-await
    resourceFactory: async () => {
      const frontmatter:
        & fm.UntypedFrontmatter
        & h.DesignSystemLayoutArgumentsSupplier = {
          layout: {
            identity: ldsL.innerIndexAutoPage.identity,
          },
        };

      // body is empty since it's an auto-index page
      const HTML = ``;
      const htmlResource:
        & h.PersistableHtmlResource
        & r.RouteSupplier
        & fm.FrontmatterSupplier<fm.UntypedFrontmatter> = {
          nature: h.htmlContentNature,
          frontmatter,
          route,
          html: {
            text: HTML,
            textSync: HTML,
          },
        };
      if (indexKeys) {
        (htmlResource as unknown as gi.MutatableGovnIndexKeysSupplier)
          .indexKeys = indexKeys;
      }
      return htmlResource;
    },
  }];
}
