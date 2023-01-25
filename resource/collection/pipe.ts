import * as safety from "../../safety/mod.ts";
import * as govn from "./governance.ts";
import * as i from "../../identity/mod.ts";

export const defaultIdentityFactory = i.typicalUuidFactory();

export const isResourceIdentitySupplier = i.isUniversallyUniqueIdentitySupplier;

export function autoResourceIdentity<Resource>(
  r: Resource,
  idf: i.IdentityFactory<govn.ResourceIdentity> = defaultIdentityFactory,
): govn.ResourceIdentity {
  if (isResourceIdentitySupplier(r)) return r.identity;
  const mutatedUuidSupplier =
    r as unknown as i.MutatableUniversallyUniqueIdentitySupplier;
  mutatedUuidSupplier.identity = idf.randomID();
  return mutatedUuidSupplier.identity;
}

export const isResourceSupplierUntyped = safety.typeGuard<
  govn.ResourceSupplier<unknown>
>("resource");

export function isIdentifiableResourceSupplier<Resource>(
  o: unknown,
): o is govn.ResourceSupplier<Resource & govn.ResourceIdentitySupplier> {
  return isResourceSupplierUntyped(o) && isResourceIdentitySupplier(o.resource);
}

export function isResourceSupplier<Resource>(
  o: unknown,
): o is govn.ResourceSupplier<Resource> {
  return isResourceSupplierUntyped(o);
}

export const isResourceFactorySupplierUntyped = safety.typeGuard<
  govn.ResourceFactorySupplier<unknown>
>("resourceFactory");

export function isResourceFactorySupplier<Resource>(
  o: unknown,
): o is govn.ResourceFactorySupplier<Resource> {
  return isResourceFactorySupplierUntyped(o);
}

export const isResourcesFactoriesSupplierUntyped = safety.typeGuard<
  govn.ResourcesFactoriesSupplier<unknown>
>("resourcesFactories");

export function isResourcesFactoriesSupplier<Resource>(
  o: unknown,
): o is govn.ResourcesFactoriesSupplier<Resource> {
  return isResourcesFactoriesSupplierUntyped(o);
}

export const isChildResourcesFactoriesSupplierUntyped = safety.typeGuard<
  govn.ChildResourcesFactoriesSupplier<unknown>
>("resourcesFactories", "isChildResourcesFactoriesSupplier");

export function isChildResourcesFactoriesSupplier<Resource>(
  o: unknown,
): o is govn.ChildResourcesFactoriesSupplier<Resource> {
  return isChildResourcesFactoriesSupplierUntyped(o);
}

export const isResourcesSupplierUntyped = safety.typeGuard<
  govn.ResourcesSupplier<unknown>
>("resources");

export function isResourcesSupplier<Resource>(
  o: unknown,
): o is govn.ResourcesSupplier<Resource> {
  return isResourcesSupplierUntyped(o);
}

export type ResourcePipeline<Resource> = govn.ResourceRefinery<Resource>[];
export type ResourcePipelineSync<Resource> = govn.ResourceRefinerySync<
  Resource
>[];

export async function traversePipeline<Resource>(
  operateOn: Resource,
  pipeline: ResourcePipeline<Resource>,
): Promise<Resource> {
  let resource = operateOn;
  for (const plUnit of pipeline) {
    resource = await plUnit(resource);
  }
  return resource;
}

export function traversePipelineSync<Resource>(
  operateOn: Resource,
  pipeline: ResourcePipelineSync<Resource>,
): Resource {
  return pipeline.reduce((prev, curr) => curr(prev), operateOn);
}

export async function traversePipelineUnits<Resource>(
  operateOn: Resource,
  ...units: ResourcePipeline<Resource>
): Promise<Resource> {
  let resource = operateOn;
  for (const plUnit of units) {
    resource = await plUnit(resource);
  }
  return resource;
}

export function traversePipelineUnitsSync<Resource>(
  operateOn: Resource,
  ...units: ResourcePipelineSync<Resource>
): Resource {
  return units.reduce((prev, curr) => curr(prev), operateOn);
}

export async function traversePipelines<Resource>(
  operateOn: Resource,
  ...pipelines: ResourcePipeline<Resource>[]
): Promise<Resource> {
  let resource = operateOn;
  for (const pipeline of pipelines) {
    for (const plUnit of pipeline) {
      resource = await plUnit(resource);
    }
  }
  return resource;
}

export function traversePipelinesSync<Resource>(
  operateOn: Resource,
  ...pipelines: ResourcePipelineSync<Resource>[]
): Resource {
  let resource = operateOn;
  for (const pipeline of pipelines) {
    resource = pipeline.reduce((prev, curr) => curr(prev), resource);
  }
  return resource;
}

export function pipelineUnitsRefinery<Resource>(
  ...units: ResourcePipeline<Resource>
): govn.ResourceRefinery<Resource> {
  return async (operateOn) => {
    let resource = operateOn;
    for (const plUnit of units) {
      resource = await plUnit(resource);
    }
    return resource;
  };
}

export function pipelineUnitsRefineryUntyped(
  // deno-lint-ignore no-explicit-any
  ...units: ResourcePipeline<any>
  // deno-lint-ignore no-explicit-any
): govn.ResourceRefinery<any> {
  return async (operateOn) => {
    let resource = operateOn;
    for (const plUnit of units) {
      resource = await plUnit(resource);
    }
    return resource;
  };
}

export function pipelineUnitsRefineryUntypedObservable<
  Context,
  // deno-lint-ignore no-explicit-any
  EachContext extends { refinery: govn.ResourceRefinery<any> },
>(
  fore: () => Promise<Context>,
  foreEach: (ctx: EachContext) => Promise<void>,
  aftEach: (ctx: EachContext) => Promise<void>,
  aft: (ctx: Context) => Promise<void>,
  ...units: EachContext[]
  // deno-lint-ignore no-explicit-any
): govn.ResourceRefinery<any> {
  return async (operateOn) => {
    let resource = operateOn;
    const ctx = await fore();
    for (const plUnit of units) {
      const eachCtx = { resource, ...plUnit };
      await foreEach(eachCtx);
      resource = await plUnit.refinery(resource);
      await aftEach(eachCtx);
    }
    aft(ctx);
    return resource;
  };
}

export function pipelineUnitsRefinerySyncUntyped(
  // deno-lint-ignore no-explicit-any
  ...units: ResourcePipelineSync<any>
  // deno-lint-ignore no-explicit-any
): govn.ResourceRefinerySync<any> {
  return (operateOn) => {
    let resource = operateOn;
    for (const plUnit of units) {
      resource = plUnit(resource);
    }
    return resource;
  };
}

export function pipelineRefiner<Resource>(
  pipeline: ResourcePipeline<Resource>,
): govn.ResourceRefinery<Resource> {
  return async (operateOn) => {
    let resource = operateOn;
    for (const plUnit of pipeline) {
      resource = await plUnit(resource);
    }
    return resource;
  };
}

export function pipelinesRefiner<Resource>(
  pipelines: ResourcePipeline<Resource>[],
): govn.ResourceRefinery<Resource> {
  return async (operateOn) => {
    let resource = operateOn;
    for (const pipeline of pipelines) {
      for (const plUnit of pipeline) {
        resource = await plUnit(resource);
      }
    }
    return resource;
  };
}

export function pipelineUnitsRefinerySync<Resource>(
  ...units: ResourcePipelineSync<Resource>
): govn.ResourceRefinerySync<Resource> {
  return (resource) => {
    return units.reduce((prev, curr) => curr(prev), resource);
  };
}

export function pipelineRefinerySync<Resource>(
  pipeline: ResourcePipelineSync<Resource>,
): govn.ResourceRefinerySync<Resource> {
  return (resource) => {
    return pipeline.reduce((prev, curr) => curr(prev), resource);
  };
}

export function pipelinesRefinerySync<Resource>(
  pipelines: ResourcePipelineSync<Resource>[],
): govn.ResourceRefinerySync<Resource> {
  return (operateOn) => {
    let resource = operateOn;
    for (const pipeline of pipelines) {
      resource = pipeline.reduce((prev, curr) => curr(prev), resource);
    }
    return resource;
  };
}
