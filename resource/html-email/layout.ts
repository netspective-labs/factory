import * as contrib from "../../text/contributions.ts";
import * as e from "../../text/escape.ts";
import * as extn from "../../module/mod.ts";
import * as c from "../content/mod.ts";
import * as ren from "../render/mod.ts";
import * as govn from "./governance.ts";

export const htmlEmailOperationalCtxDataAttrs:
  govn.HtmlEmailOperationalCtxDomDataAttrsResolver = (
    layout: govn.HtmlEmailLayout,
  ): string => {
    return `data-rf-operational-ctx='${
      e.escapeHtmlCustom(
        JSON.stringify(layout.operationalCtxClientCargo),
        e.matchHtmlRegExpForAttrSingleQuote,
      )
    }'`;
  };

export const htmlEmailMetaOriginDomDataAttrs:
  govn.HtmlEmailMetaOriginDomDataAttrsResolver = (
    layout: govn.HtmlEmailLayout,
  ): string => {
    return `${
      layout.frontmatter
        ? `data-rf-origin-frontmatter='${
          e.escapeHtmlCustom(
            JSON.stringify(layout.frontmatter),
            e.matchHtmlRegExpForAttrSingleQuote,
          )
        }'`
        : ""
    }`;
  };

export const htmlEmailDesignSystemOriginDataAttrs:
  govn.HtmlEmailDesignSystemOriginDomDataAttrsResolver = (
    layout: govn.HtmlEmailLayout,
    srcModuleImportMetaURL: string,
    symbol: string,
  ): string => {
    const ls = layout.layoutSS.layoutStrategy;
    return `data-rf-origin-design-system='${
      e.escapeHtmlCustom(
        JSON.stringify({
          identity: layout.designSystem.identity,
          location: layout.designSystem.location,
          layout: {
            symbol,
            name: ren.isIdentifiableLayoutStrategy(ls)
              ? ls.identity
              : undefined,
            src: srcModuleImportMetaURL,
            diagnostics: layout.diagnostics,
          },
          isPrettyURL: true, // TODO: if RF ever makes it optional, update this and account for it
          moduleAssetsBaseAbsURL: "", // TODO fill in base URL
          dsAssetsBaseAbsURL: layout.designSystem.dsAssetsBaseURL,
          universalAssetsBaseAbsURL: layout.designSystem.universalAssetsBaseURL,
        }),
        e.matchHtmlRegExpForAttrSingleQuote,
      )
    }'`;
  };

export const typicalEmailHtmlOriginResolvers: govn.HtmlEmailOriginResolvers = {
  meta: htmlEmailMetaOriginDomDataAttrs,
  designSystem: htmlEmailDesignSystemOriginDataAttrs,
  operationalCtx: htmlEmailOperationalCtxDataAttrs,
  dataAttrs: (layout, srcModuleImportMetaURL, layoutSymbol) => {
    return `${typicalEmailHtmlOriginResolvers.meta(layout)} ${
      typicalEmailHtmlOriginResolvers.designSystem(
        layout,
        srcModuleImportMetaURL,
        layoutSymbol,
      )
    } ${typicalEmailHtmlOriginResolvers.operationalCtx(layout)}`;
  },
};

const bodyAsync = (
  instance: c.FlexibleContent | c.FlexibleContentSync | c.HtmlSupplier,
) => c.isHtmlSupplier(instance) ? instance.html : instance;

const bodySync = (
  instance: c.FlexibleContentSync | c.FlexibleContent | c.HtmlSupplier,
) => c.isHtmlSupplier(instance) ? instance.html : instance;

export function htmlEmailLayoutContributions(): govn.HtmlEmailLayoutContributions {
  return {
    scripts: contrib.contributions("<!-- scripts contrib -->"),
    stylesheets: contrib.contributions("<!-- stylesheets contrib -->"),
    head: contrib.contributions("<!-- head contrib -->"),
    body: contrib.contributions("<!-- body contrib -->"),
    bodyMainContent: contrib.contributions(
      "<!-- body main content contrib -->",
    ),
    diagnostics: contrib.contributions("<!-- diagnostics contrib -->"),
  };
}

export function htmlEmailLayoutTemplate<
  T,
  Layout extends govn.HtmlEmailLayout,
>(
  identity: string,
  location: extn.LocationSupplier,
): govn.TemplateLiteralHtmlEmailLayout<T, Layout> {
  return (literals, ...suppliedExprs) => {
    const interpolate: (layout: Layout, body?: string) => string = (
      layout,
      body,
    ) => {
      // evaluate expressions and look for contribution placeholders
      const placeholders: number[] = [];
      const expressions: unknown[] = [];
      let exprIndex = 0;
      for (let i = 0; i < suppliedExprs.length; i++) {
        const expr = suppliedExprs[i];
        if (typeof expr === "function") {
          const exprValue = expr(layout, body);
          if (contrib.isTextContributionsPlaceholder(exprValue)) {
            placeholders.push(exprIndex);
            expressions[exprIndex] = expr; // we're going to run the function later
          } else {
            expressions[exprIndex] = exprValue;
          }
        } else {
          expressions[exprIndex] = expr;
        }
        exprIndex++;
      }
      if (placeholders.length > 0) {
        for (const ph of placeholders) {
          const tcph = (expressions[ph] as govn.HtmlEmailPartial<Layout>)(
            layout as Layout,
            body,
          );
          expressions[ph] = contrib.isTextContributionsPlaceholder(tcph)
            ? tcph.contributions.map((c) => c.content).join("\n")
            : tcph;
        }
      }
      let interpolated = "";
      for (let i = 0; i < expressions.length; i++) {
        interpolated += literals[i];
        interpolated += typeof expressions[i] === "string"
          ? expressions[i]
          : Deno.inspect(expressions[i]);
      }
      interpolated += literals[literals.length - 1];
      return interpolated;
    };
    const layoutStrategy: govn.HtmlEmailLayoutStrategy<Layout> = {
      identity,
      location,
      rendered: async (layout) => {
        const resource = layout.bodySource;
        const ftcOptions = { functionArgs: [layout] };
        const activeBody = c.isHtmlSupplier(resource)
          ? await c.flexibleTextCustom(resource.html, ftcOptions)
          : (c.isFlexibleContentSupplier(resource)
            ? await c.flexibleTextCustom(bodyAsync(resource), ftcOptions)
            : undefined);

        return { ...resource, html: interpolate(layout, activeBody) };
      },
      renderedSync: (layout) => {
        const resource = layout.bodySource;
        const ftcOptions = { functionArgs: [layout] };
        const activeBody = c.isHtmlSupplier(resource)
          ? c.flexibleTextSyncCustom(resource.html, ftcOptions)
          : (c.isFlexibleContentSyncSupplier(resource)
            ? c.flexibleTextSyncCustom(bodySync(resource), ftcOptions)
            : undefined);

        return { ...resource, html: interpolate(layout, activeBody) };
      },
    };

    return layoutStrategy;
  };
}
