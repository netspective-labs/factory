export interface TemplateEngineSupplier<TemplateEngine> {
  readonly templateEngine: TemplateEngine;
}

export interface TemplateEnginesSupplier<TemplateEngine, Identity> {
  readonly templateEngine: (name: Identity) => TemplateEngine;
}

export interface TemplateSupplier<Template> {
  readonly template: Template;
}

export interface TemplatesSupplier<Template, Identity> {
  readonly template: (name: Identity) => Template;
}

export interface TemplateRenderingSupplier<Context, Result> {
  readonly renderedTemplate: (ctx: Context) => Result;
}

export interface TextInterpolationResult {
  readonly interpolated: string;
}

// deno-lint-ignore no-empty-interface
export interface TextInterpolationTemplate
  extends TemplateRenderingSupplier<unknown, TextInterpolationResult> {
}

// deno-lint-ignore no-empty-interface
export interface TextInterpolationTemplateSupplier<Result>
  extends TemplateSupplier<TextTemplateLiteral<Result>> {
}

export interface TextTemplateLiteral<Result> {
  (
    literals: TemplateStringsArray,
    ...expressions: unknown[]
  ): Result;
}

export interface HtmlTag {
  (
    paramsOrBody: string | string[] | Record<string, unknown>,
    body?: string,
  ): string;
}

export function textTemplateLiteral<Result, Context = unknown>(
  factory: (interpolated: string, ctx?: Context) => Result,
  ctx?: Context,
): TextTemplateLiteral<Result> {
  return (literals: TemplateStringsArray, ...expressions: unknown[]) => {
    let interpolated = "";
    for (let i = 0; i < expressions.length; i++) {
      interpolated += literals[i];
      interpolated += expressions[i];
    }
    interpolated += literals[literals.length - 1];
    return factory(interpolated, ctx);
  };
}

export const htmlTag = (
  ht: string | [string, string | string[] | Record<string, unknown>],
  body?: string,
  wrapBody = "",
) => {
  const tag = typeof ht === "string" ? ht : ht[0];
  const params = typeof ht === "string"
    ? ""
    : (" " + (typeof ht[1] === "string"
      ? ht[1]
      : (Array.isArray(ht[1])
        ? ht[1].join(" ")
        : Object.entries(ht[1]).map((e) =>
          `${e[0]}=${JSON.stringify(e[1])}`
        ))));
  return body
    ? `<${tag}${params}>${wrapBody}${body}${wrapBody}</${tag}>`
    : `<${tag}${params}/>`;
};

export const htmlTagFn = (ht: string, wrapBody = ""): HtmlTag => {
  return (
    paramsOrBody: string | string[] | Record<string, unknown>,
    body?: string,
  ) => {
    if (body) {
      // we have both params and body
      return htmlTag([ht, paramsOrBody], body, wrapBody);
    }

    // we have no params, the body is passed into first parameter
    return htmlTag(ht, paramsOrBody.toString(), wrapBody);
  };
};
