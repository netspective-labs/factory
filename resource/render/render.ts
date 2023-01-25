import * as safety from "../../safety/mod.ts";
import * as govn from "./governance.ts";
import * as c from "../content/mod.ts";
import * as fm from "../frontmatter/mod.ts";

export const isRenderMetricsSupplier = safety.typeGuard<
  govn.RenderMetricsSupplier
>("renderMeasure");

export function isRenderTargetsSupplier<Nature>(
  o: unknown,
): o is govn.RenderTargetsSupplier<Nature> {
  const isType = safety.typeGuard<govn.RenderTargetsSupplier<Nature>>(
    "renderTargets",
  );
  return isType(o);
}

export function isRenderableMediaTypeTarget(
  o: unknown,
  mti: c.MediaTypeIdentity,
): boolean {
  const isTargetsSupplier = safety.typeGuard<
    // deno-lint-ignore no-explicit-any
    govn.RenderTargetsSupplier<c.MediaTypeNature<any>>
  >("renderTargets");
  if (isTargetsSupplier(o)) {
    if (Array.isArray(o.renderTargets)) {
      return o.renderTargets.find((mt) => mt.mediaType == mti) ? true : false;
    } else {
      return o.renderTargets.mediaType == mti;
    }
  }
  return false;
}

/**
 * Test resource to see if it can render the given media type identity. If the
 * resource has a `nature` and that nature has a mediaType which matches mti
 * then return true. If the resource implements renderTargets[] check to see if
 * one of the render targets matches -- if it does, return true. Lastly, if the
 * nature type doesn't match exactly but nature implements renderTargets() then
 * accept it if it's available.
 * @param o the resource to test
 * @param mti the mediaType identity to test
 * @returns true if the resource is able to render the given mediaType identity
 */
export function isRenderableMediaTypeResource<Resource>(
  o: unknown,
  mti: c.MediaTypeIdentity,
): o is Resource {
  const isNatureSupplier = safety.typeGuard<
    // deno-lint-ignore no-explicit-any
    c.NatureSupplier<c.MediaTypeNature<any>>
  >("nature");
  if (isNatureSupplier(o)) {
    if (o.nature?.mediaType == mti) return true;
    if (isRenderableMediaTypeTarget(o, mti)) return true;
    if (isRenderableMediaTypeTarget(o.nature, mti)) return true;
  }
  return isRenderableMediaTypeTarget(o, mti);
}

export function isIdentifiableLayoutStrategy<Layout, LayoutResult>(
  o: unknown,
): o is govn.IdentifiableLayoutStrategy<Layout, LayoutResult> {
  const isType = safety.typeGuard<
    govn.IdentifiableLayoutStrategy<Layout, LayoutResult>
  >("identity", "rendered", "renderedSync");
  return isType(o);
}

export function isLayoutStrategySupplier<Layout, LayoutResult>(
  o: unknown,
): o is govn.LayoutStrategySupplier<Layout, LayoutResult> {
  const isType = safety.typeGuard<
    govn.LayoutStrategySupplier<Layout, LayoutResult>
  >("layoutStrategy");
  return isType(o);
}

export function isRenderStrategy<Layout, LayoutResult>(
  o: unknown,
): o is govn.RenderStrategy<Layout, LayoutResult> {
  const isType = safety.typeGuard<
    govn.RenderStrategy<Layout, LayoutResult>
  >(
    "identity",
    "layoutStrategies",
    "inferredLayoutStrategy",
  );
  return isType(o);
}

export function isRenderStrategySupplier<Layout, LayoutResult>(
  o: unknown,
): o is govn.RenderStrategySupplier<Layout, LayoutResult> {
  const isType = safety.typeGuard<
    govn.RenderStrategySupplier<Layout, LayoutResult>
  >(
    "renderStrategy",
  );
  return isType(o);
}

export class RenderStrategiesFactory implements govn.RenderStrategies {
  readonly renderStrategies: Map<
    govn.RenderStrategyIdentity,
    // deno-lint-ignore no-explicit-any
    govn.RenderStrategy<any, any>
  > = new Map();
  constructor(
    // deno-lint-ignore no-explicit-any
    readonly defaultSupplier: govn.DefaultRenderStrategySupplier<any, any>,
    readonly dsFrontmatterPropNames = ["render-strategy", "renderStrategy"],
  ) {
    this.renderStrategies.set(
      this.defaultSupplier.renderStrategy.identity,
      this.defaultSupplier.renderStrategy,
    );
  }

  defaultRenderStrategySupplier<
    Layout,
    LayoutResult,
  >(): govn.DefaultRenderStrategySupplier<
    Layout,
    LayoutResult
  > {
    return this
      .defaultSupplier as unknown as govn.DefaultRenderStrategySupplier<
        Layout,
        LayoutResult
      >;
  }

  renderStrategy(
    name: govn.RenderStrategyIdentity,
    // deno-lint-ignore no-explicit-any
  ): govn.RenderStrategy<any, any> | undefined {
    return this.renderStrategies.get(name);
  }

  diagnosticRenderStrategy<Layout, LayoutResult>(
    renderErrorDiagnostic: string,
    ddss?: govn.DefaultRenderStrategySupplier<Layout, LayoutResult>,
  ): govn.ErrorRenderStrategySupplier<Layout, LayoutResult> {
    return {
      ...(ddss ||
        this
          .defaultRenderStrategySupplier as unknown as govn.DefaultRenderStrategySupplier<
            Layout,
            LayoutResult
          >),
      isErrorRenderStrategySupplier: true,
      renderErrorDiagnostic,
    };
  }

  namedRenderStrategy<Layout, LayoutResult>(
    name: govn.RenderStrategyIdentity,
    ddss?: govn.DefaultRenderStrategySupplier<Layout, LayoutResult>,
  ): govn.RenderStrategySupplier<Layout, LayoutResult> {
    const designSystem = this.renderStrategy(name);
    if (designSystem) {
      const named: govn.NamedRenderStrategySupplier<
        Layout,
        LayoutResult
      > = {
        isNamedRenderStrategySupplier: true,
        renderStrategyIdentity: name,
        renderStrategy: designSystem,
      };
      return named;
    }
    return this.diagnosticRenderStrategy(
      `design system '${name}' not found`,
      ddss,
    );
  }

  inferredLayoutStrategy<Layout, LayoutResult>(
    s: Partial<
      | fm.FrontmatterSupplier<fm.UntypedFrontmatter>
      | c.ModelSupplier<c.UntypedModel>
    >,
    ddss?: govn.DefaultRenderStrategySupplier<Layout, LayoutResult>,
  ): govn.RenderStrategySupplier<Layout, LayoutResult> {
    if (
      fm.isFrontmatterSupplier(s) && s.frontmatter &&
      this.dsFrontmatterPropNames.length > 0
    ) {
      for (const propName of this.dsFrontmatterPropNames) {
        if (propName in s.frontmatter) {
          const identity = String(s.frontmatter[propName]);
          const renderStrategy = this.renderStrategy(identity);
          if (renderStrategy) {
            const named:
              & govn.NamedRenderStrategySupplier<Layout, LayoutResult>
              & govn.FrontmatterRenderStrategySupplier<
                Layout,
                LayoutResult
              > = {
                renderStrategy,
                isNamedRenderStrategySupplier: true,
                isInferredRenderStrategySupplier: true,
                isFrontmatterRenderStrategySupplier: true,
                renderStrategyIdentity: identity,
                frontmatterRenderStrategyPropertyName: propName,
              };
            return named;
          }
          return this.diagnosticRenderStrategy(
            `frontmatter design system '${propName}' property '${identity}' not found`,
            ddss,
          );
        }
      }
      return this.diagnosticRenderStrategy(
        `frontmatter ${
          this.dsFrontmatterPropNames.join(" or ")
        } property not found, using default`,
        ddss,
      );
    }
    return this.diagnosticRenderStrategy(
      `neither frontmatter nor model available, using default`,
      ddss,
    );
  }
}
