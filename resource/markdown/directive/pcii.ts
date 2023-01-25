import * as c from "../../content/mod.ts";
import * as mdDS from "../mod.ts";
import * as extn from "../../../module/mod.ts";

export interface ProxiedContentIIDirectiveAttrs {
  readonly module?: string;
}

export class ProxiedContentInfuseInterpolateDirective
  implements
    c.DirectiveExpectation<
      mdDS.MarkdownContentInlineDirective<ProxiedContentIIDirectiveAttrs>,
      string | undefined
    > {
  static readonly IDENTITY = "pcii";
  readonly identity = ProxiedContentInfuseInterpolateDirective.IDENTITY;

  constructor(readonly extnManager: extn.ExtensionsManager) {
  }

  text(
    symbol: string,
    extn: extn.ExtensionModule,
    directive: mdDS.MarkdownContentInlineDirective<
      ProxiedContentIIDirectiveAttrs
    >,
  ): undefined | string {
    let found = false;
    let symbolValue: unknown = undefined;
    extn.exports((key, value) => {
      if (key == symbol) {
        if (!found) {
          found = true;
          symbolValue = value;
          return true;
        }
      }
      return false;
    });
    if (!found) return undefined;

    switch (typeof symbolValue) {
      case "function":
        return `${symbolValue(directive)}`;

      default:
        return `${symbolValue}`;
    }
  }

  encountered(
    d: mdDS.MarkdownContentInlineDirective<ProxiedContentIIDirectiveAttrs>,
  ): string | undefined {
    const symbol = d.content;
    if (!symbol || symbol.length == 0) {
      return `PCII symbol not declared`;
    }

    if (symbol) {
      const searched = [];
      if (d.attributes?.module) {
        const module = d.attributes?.module;
        for (const extn of this.extnManager.extensions) {
          if (extn.provenance.toString().endsWith(module)) {
            const text = this.text(symbol, extn, d);
            if (text) return text;
            return `PCII symbol '${symbol}' was not found in module '${module}' (make sure it's defined and exported)`;
          }
          searched.push(extn.provenance);
        }
        // we cannot import a module since Markdown directives are synchronous-only (no async allowed)
        return `PCII module '${module}' was not found (be sure to import it into extensions manager), searched: ${
          searched.join(", ")
        }`;
      }

      for (const extn of this.extnManager.extensions) {
        const text = this.text(symbol, extn, d);
        if (text) return text;
        searched.push(extn.provenance);
      }
      return `PCII symbol '${symbol}' was not found in any module (make sure it's defined and exported in an imported module)`;
    }

    // TODO: support globals in window.*
    return `unknown PCII origin`;
  }
}
