import { twSheets } from "./deps.ts";
import * as c from "../../content/mod.ts";
import * as html from "../../html/mod.ts";

/**
 * These interfaces and types are separated as `governance.ts` so that pages,
 * partials, and other Typescript modules can use the governed types without
 * circular references in `design-system.ts`.
 */

export interface EssentialLayoutBodySupplier {
  (layout: EssentialLayout): string;
}

// deno-lint-ignore no-empty-interface
export interface EssentialAssetLocations
  extends html.DesignSystemAssetLocations {
}

// deno-lint-ignore no-empty-interface
export interface EssentialNavigationStrategy
  extends html.DesignSystemNavigationStrategy<EssentialLayout> {
}

export class EssentialDesignSystemNavigation
  extends html.DesignSystemNavigation<EssentialLayout>
  implements EssentialNavigationStrategy {
}

// deno-lint-ignore no-empty-interface
export interface EssentialLayoutText
  extends html.HtmlLayoutText<EssentialLayout> {
}

// deno-lint-ignore no-empty-interface
export interface EssentialDesignSystemContentStrategy
  extends
    html.DesignSystemContentStrategy<
      EssentialLayout,
      EssentialLayoutText,
      EssentialAssetLocations,
      EssentialNavigationStrategy
    > {
}

export interface EssentialLayout
  extends
    html.HtmlLayout<EssentialLayoutText>,
    Partial<c.ModelSupplier<c.ContentModel>> {
  readonly contentStrategy: EssentialDesignSystemContentStrategy;
  readonly designSystem: EssentialDesignSystem;
}

// deno-lint-ignore no-empty-interface
export interface EssentialLayoutStrategy
  extends html.HtmlLayoutStrategy<EssentialLayout> {
}

export type EssentialPartial = html.HtmlPartial<EssentialLayout>;

// deno-lint-ignore no-empty-interface
export interface EssentialPage extends
  html.TemplateLiteralHtmlLayout<
    html.HelperFunctionOrString<EssentialLayout>,
    EssentialLayout
  > {
}

export interface EssentialDesignSystem
  extends html.DesignSystem<EssentialLayout> {
  readonly twSheet: twSheets.VirtualSheet;
}

// deno-lint-ignore no-empty-interface
export interface EssentialDesignSystemFactory extends
  html.DesignSystemFactory<
    EssentialLayout,
    EssentialLayoutText,
    EssentialAssetLocations,
    EssentialNavigationStrategy
  > {
}
