import * as coll from "../collection/mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

/**
 * Given an instantiated resource, automatically construct and yield any child
 * resources (with unlimited descendants)
 * @param instance the instance to construct and yield descendants of
 * @param options whether to do any refining or custom yielding
 */
export async function* originateDescendants<Resource>(
  instance: Resource,
  options?: {
    readonly refine?: coll.ResourceRefinerySync<Any>;
    readonly yieldInstance?: false | "before" | "after";
  },
) {
  const { refine, yieldInstance = "before" } = options ?? {};

  async function* originate<Resource>(
    supplier: coll.ResourceFactorySupplier<Resource>,
  ): AsyncGenerator<Resource> {
    const child = await supplier.resourceFactory();
    const resource = refine ? refine(child) as Resource : child;
    // TODO: mutate with resource.origination = { ? }
    let hasChildren = false;
    let yieldWithChildren = false;
    if (coll.isChildResourcesFactoriesSupplier<Resource>(resource)) {
      // our constructed resource wants to create its own resources so allow
      // it become a dynamic supplier of resource factories via recursion
      yield* originateDescendants(resource, { yieldInstance: false });
      hasChildren = true;
      yieldWithChildren = resource.yieldParentWithChildren ? true : false;
    }
    if (!hasChildren || (hasChildren && yieldWithChildren)) {
      yield resource;
    }
  }

  if (yieldInstance == "before") {
    yield refine ? refine(instance) as Resource : instance;
  }
  if (coll.isResourcesFactoriesSupplier<Resource>(instance)) {
    for await (const rf of instance.resourcesFactories()) {
      yield* originate<Resource>(rf);
    }
  } else if (coll.isResourceFactorySupplier<Resource>(instance)) {
    yield* originate<Resource>(instance);
  }
  if (yieldInstance == "after") {
    yield refine ? refine(instance) as Resource : instance;
  }
}

/**
 * Given a set of AsyncIterable resources, automatically construct and yield any
 * child resources (with unlimited descendants)
 * @param supplier the instances to construct and yield descendants of
 * @param options whether to do any refining or custom yielding
 */
export async function* originateAll<Resource>(
  supplier: AsyncIterable<Resource>,
  yieldInstance: "before" | "after",
  options?: {
    readonly refine?: coll.ResourceRefinerySync<Any>;
  },
) {
  const descendantOptions = { yieldInstance, ...options };
  for await (const resource of supplier) {
    for await (
      const instance of originateDescendants(resource, descendantOptions)
    ) {
      yield instance;
    }
  }
}
