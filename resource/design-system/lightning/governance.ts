import * as safety from "../../../safety/mod.ts";
import * as c from "../../content/mod.ts";
import * as r from "../../../route/mod.ts";
import * as html from "../../html/mod.ts";
import * as l from "./layout/mod.ts";

export interface MutableNavigationTreeContextBarNode {
  isContextBarRouteNode: boolean;
}

export type NavigationTreeContextBarNode = Readonly<
  MutableNavigationTreeContextBarNode
>;

export const isMutableNavigationTreeContextBarNode = safety.typeGuard<
  MutableNavigationTreeContextBarNode
>();

export const isNavigationTreeContextBarNode = safety.typeGuard<
  NavigationTreeContextBarNode
>();

/**
 * Used by Deno HTML modules as html: { text: LightningLayoutBodySupplier }
 */
export interface LightningLayoutBodySupplier {
  (layout: LightningLayout): string;
}

export interface LightningAssetLocations
  extends html.DesignSystemAssetLocations {
  readonly ldsIcons: html.DesignSystemAssetLocationSupplier; // specific to Lightning icons in SVG
}

export interface LightningNavigationNotification
  extends html.DesignSystemNotification {
  readonly icon?: l.IconIdentity;
}

// deno-lint-ignore no-empty-interface
export interface LightningNavigationNotifications
  extends html.DesignSystemNotifications<LightningNavigationNotification> {
}

export interface LightningNavigation
  extends html.DesignSystemNavigationStrategy<LightningLayout> {
  readonly contextBarItems: (
    layout: LightningLayout,
  ) => r.RouteNode[];
}

export type LightningContextBarSubject = string | [label: string, href: string];
export type LightningContextBarSubjectImageSrc = string | [
  src: string,
  href: string,
];

export interface LightningBranding {
  readonly contextBarSubject?:
    | LightningContextBarSubject
    | ((
      lnc: html.HtmlLayoutNavigationContext,
      assets: LightningAssetLocations,
    ) => LightningContextBarSubject);
  readonly contextBarSubjectImageSrc?:
    | LightningContextBarSubjectImageSrc
    | ((
      assets: LightningAssetLocations,
      lnc: html.HtmlLayoutNavigationContext,
    ) => LightningContextBarSubjectImageSrc);
}

// deno-lint-ignore no-empty-interface
export interface LightningLayoutText
  extends html.HtmlLayoutText<LightningLayout> {
}

export interface LightingDesignSystemContentStrategy
  extends
    html.DesignSystemContentStrategy<
      LightningLayout,
      LightningLayoutText,
      LightningAssetLocations,
      LightningNavigation
    > {
  readonly branding: LightningBranding;
}

export interface LightningLayout
  extends
    html.HtmlLayout<LightningLayoutText>,
    c.ModelSupplier<c.ContentModel> {
  readonly contentStrategy: LightingDesignSystemContentStrategy;
}

// deno-lint-ignore no-empty-interface
export interface LightningLayoutStrategy<Layout extends LightningLayout>
  extends html.HtmlLayoutStrategy<Layout> {
}

export type LightningPartial = html.HtmlPartial<LightningLayout>;

// deno-lint-ignore no-empty-interface
export interface LightningTemplate extends
  html.TemplateLiteralHtmlLayout<
    html.HelperFunctionOrString<LightningLayout>,
    LightningLayout
  > {
}

// deno-lint-ignore no-empty-interface
export interface LightningDesignSystemFactory extends
  html.DesignSystemFactory<
    LightningLayout,
    LightningLayoutText,
    LightningAssetLocations,
    LightningNavigation
  > {
}
