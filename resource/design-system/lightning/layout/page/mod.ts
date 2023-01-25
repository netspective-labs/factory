import * as html from "../../../../html/mod.ts";
import * as ldsGovn from "../../governance.ts";
import * as smart from "./smart.ts";
import * as typ from "./typical.ts";

export * from "./smart.ts";
export * from "./typical.ts";

export const defaultPage: html.HtmlLayoutStrategy<ldsGovn.LightningLayout> = {
  ...smart.smartNavigationPage,
  identity: "lds/page/prime",
};

export const autoRegisterPages: html.HtmlLayoutStrategy<
  ldsGovn.LightningLayout
>[] = [
  defaultPage,
  typ.homePage,
  typ.innerIndexPage,
  typ.innerIndexAutoPage,
  typ.noDecorationPage,
  typ.noDefinitiveLayoutPage,
];
