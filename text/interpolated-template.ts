import * as path from "https://deno.land/std@0.147.0/path/mod.ts";
import * as safety from "../safety/mod.ts";
import * as tw from "./whitespace.ts";

// TODO: allow "embedding" more than template literals?
//       see https://github.com/deligenius/view-engine to perhaps allow
//       passing in "nature" or auto-detect template types into single
//       unified engine to provider multiple strategies?

export interface InterpolationProvenanceHumanReadableSourceSupplier {
  (p: InterpolationProvenance): string;
}

export type SemanticVersionText = string;

export interface InterpolationProvenance {
  readonly identity: string;
  readonly version: SemanticVersionText;
  readonly source: string;
  readonly humanReadableSource:
    InterpolationProvenanceHumanReadableSourceSupplier;
}

export interface TextTransformer {
  (text: string): string;
}

export const noTextTransformation: TextTransformer = (text) => {
  return text;
};

export interface Indentable {
  readonly indent: TextTransformer;
  readonly unindent: TextTransformer;
}

export const noIndentation: Indentable = {
  indent: noTextTransformation,
  unindent: noTextTransformation,
};

export const isIndentable = safety.typeGuard<Indentable>(
  "indent",
  "unindent",
);

export interface TypeScriptModuleProvenance extends InterpolationProvenance {
  readonly importMetaURL: string;
}

export const isTypeScriptModuleProvenance = safety.typeGuard<
  TypeScriptModuleProvenance
>("importMetaURL");

export interface InterpolationExecution {
  readonly provenance: InterpolationProvenance;
}

export type InterpolationStrategyIdentity = string;
export type InterpolatedContent = string;

export interface InterpolationStrategy {
  readonly identity?: InterpolationStrategyIdentity;
  readonly version: SemanticVersionText;
  readonly prepareInterpolation: (
    p: InterpolationProvenance,
  ) => InterpolationExecution;
  readonly prepareResult: (
    interpolated: InterpolatedContent,
    state: InterpolationState,
    options: InterpolationOptions,
  ) => InterpolationResult;
}

export interface InterpolationState {
  readonly ie: InterpolationExecution;
}

export interface EmbeddedInterpolationState extends InterpolationState {
  readonly parent: InterpolationState;
}

export const isEmbeddedInterpolationState = safety.typeGuard<
  EmbeddedInterpolationState
>("ie", "parent");

// deno-lint-ignore no-empty-interface
export interface InterpolationOptions {
}

export interface InterpolationResult {
  readonly state: InterpolationState;
  readonly options: InterpolationOptions;
  readonly interpolated: string;
  readonly formatted: () => string;
}

export interface SnippetSupplier {
  (state: InterpolatedTemplateState): string;
}

export interface InterpolatedTemplateState extends InterpolationState {
  readonly ic: InterpolatedTemplateContext;
  readonly indentation: Indentable;
  readonly headers: SnippetSupplier[];
}

export const isInterpolatedTemplateState = safety.typeGuard<
  InterpolatedTemplateState
>(
  "ic",
  "indentation",
  "headers",
);

export interface InterpolationContextStateOptions {
  readonly headers?: {
    readonly standalone?: SnippetSupplier[];
    readonly embedded?: SnippetSupplier[];
  };
}

export interface InterpolatedTemplateResult extends InterpolationResult {
  readonly ctx: InterpolatedTemplateContext;
  readonly state: InterpolatedTemplateState;
}

export interface TemplateInterpolationStrategy extends InterpolationStrategy {
  readonly prepareResult: (
    interpolated: InterpolatedContent,
    state: InterpolationState,
    options: InterpolationOptions,
  ) => InterpolatedTemplateResult;
}

export interface InterpolatedTemplateContext {
  readonly version: SemanticVersionText;
  readonly strategy: TemplateInterpolationStrategy;
  readonly prepareTsModuleExecution: (
    importMetaURL: string,
    defaultP?: Partial<Omit<InterpolationProvenance, "importMetaURL">>,
  ) => InterpolationExecution;
  readonly prepareState: (
    ie: InterpolationExecution,
    options?: InterpolationContextStateOptions,
  ) => InterpolatedTemplateState;
  readonly embed: (
    ic: InterpolatedTemplateContext,
    state: InterpolatedTemplateState,
    irFn: (
      eic: EmbeddedInterpolatedTemplateContext,
    ) => InterpolatedTemplateResult,
  ) => InterpolatedContent;
}

export interface EmbeddedInterpolatedTemplateContext
  extends InterpolatedTemplateContext {
  readonly parent: InterpolationState;
}

export const isEmbeddedInterpolatedTemplateContext = safety.typeGuard<
  EmbeddedInterpolatedTemplateContext
>("parent");

export interface InterpolatedTemplateLiteral<
  Result extends InterpolatedTemplateResult = InterpolatedTemplateResult,
> {
  (
    literals: TemplateStringsArray,
    ...expressions: unknown[]
  ): Result;
}

export interface InterpolatedTemplateOptions extends InterpolationOptions {
  readonly prependHeaders: boolean;
}

/**
 * Creates a template tag which can be "executed" in the given context
 * with a local state.
 * @param ctx is the context that all templates can use across invocations
 * @param state is the "local" state of a single interpolation
 * @returns the interpolated template text
 */
export function interpolatedTemplate(
  ctx: InterpolatedTemplateContext,
  state: InterpolationState,
  options: InterpolatedTemplateOptions = { prependHeaders: true },
): InterpolatedTemplateLiteral {
  return (literals: TemplateStringsArray, ...expressions: unknown[]) => {
    let interpolated = "";
    if (isInterpolatedTemplateState(state)) {
      if (state.headers.length > 0) {
        const { indent } = state.indentation;
        interpolated = state.headers.map((h) => {
          return indent(h(state));
        }).join("\n") + "\n" + interpolated;
      }
    }
    for (let i = 0; i < expressions.length; i++) {
      interpolated += literals[i];
      interpolated += expressions[i];
    }
    interpolated += literals[literals.length - 1];
    return {
      ...ctx.strategy.prepareResult(interpolated, state, options),
      ctx,
    };
  };
}

export function typicalHumanReadableSourceProvenance(
  relativeTo?: string,
): InterpolationProvenanceHumanReadableSourceSupplier {
  return (p) => {
    const fileRes = "file://";
    return relativeTo
      ? (p.source.startsWith(fileRes)
        ? path.relative(
          relativeTo,
          p.source.substring(fileRes.length),
        )
        : p.source)
      : p.source;
  };
}

export function interpolatedTemplateContext(
  identity: InterpolationStrategyIdentity,
  version: SemanticVersionText,
  hrSrcSupplier: InterpolationProvenanceHumanReadableSourceSupplier = (p) =>
    p.source,
): InterpolatedTemplateContext {
  const itCtx: InterpolatedTemplateContext = {
    version,
    strategy: {
      identity,
      version,
      prepareInterpolation: (provenance) => ({ provenance }),
      prepareResult: (interpolated, state, options) => {
        if (!isInterpolatedTemplateState(state)) {
          throw Error(
            `prepareResult(): state is expected to be of type InterpolatedTemplateState not ${typeof state}`,
          );
        }
        return {
          ctx: itCtx,
          state,
          interpolated,
          options,
          formatted: () => state.indentation.unindent(interpolated),
        };
      },
    },
    prepareTsModuleExecution: (importMetaURL, defaultP) => {
      const provenance: TypeScriptModuleProvenance & Indentable = {
        source: importMetaURL,
        importMetaURL,
        identity: defaultP?.identity || importMetaURL.split("/").pop() ||
          importMetaURL,
        version: defaultP?.version || "0.0.0",
        humanReadableSource: defaultP?.humanReadableSource || hrSrcSupplier,
        indent: (text) => {
          return text.replace(/^/gm, "    ");
        },
        unindent: (text) => {
          return tw.unindentWhitespace(text);
        },
      };
      return {
        provenance,
      };
    },
    prepareState: (ie, options) => {
      const itState: InterpolatedTemplateState = {
        ic: itCtx,
        ie,
        indentation: isIndentable(ie.provenance)
          ? ie.provenance
          : noIndentation,
        headers: options?.headers?.standalone ?? [],
      };
      return itState;
    },
    embed: (ic, parent, irFn) => {
      const eic: EmbeddedInterpolatedTemplateContext = {
        ...ic,
        parent,
        prepareState: (ie, options): InterpolatedTemplateState => {
          // an embedded template is basically the same as its parent except
          // it might have different headers
          const base = ic.prepareState(ie, options);
          return {
            ...base,
            headers: options?.headers?.embedded ?? [],
          };
        },
      };
      const eir = irFn(eic);
      if (!isInterpolatedTemplateState(eir.state)) {
        throw Error(
          `embed(): eir.state is expected to be of type InterpolatedTemplateState not ${typeof eir
            .state}`,
        );
      }
      // When embedding, we first add the indented headers expected then
      // unident the embedded interpolation result and finally indent it
      // at the parent's indentation level so that everything aligns
      const { state } = eir;
      return parent.indentation.indent(
        state.indentation.unindent(eir.interpolated),
      );
    },
  };
  return itCtx;
}
