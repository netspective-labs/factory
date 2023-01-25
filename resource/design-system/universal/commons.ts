import * as rws from "../../../route/commons/weight.ts";
import * as fm from "../../frontmatter/mod.ts";

export interface TypicalPageProperties extends rws.WeightSupplier {
  readonly title?: string;
}

export function typicalPageProperties<Resource>(
  resource: Resource,
): TypicalPageProperties {
  let weight: number | undefined;
  let title: string | undefined;
  let mainMenuName: string | undefined;
  if (fm.isFrontmatterSupplier(resource)) {
    const fmUntyped = resource.frontmatter;
    // deno-lint-ignore no-explicit-any
    const menu = fmUntyped.menu as any;
    weight = fmUntyped.weight || menu?.main?.weight;
    mainMenuName = menu?.main?.name;
    title = fmUntyped.title ? String(fmUntyped.title) : mainMenuName;
  }
  return {
    weight,
    title,
  };
}
