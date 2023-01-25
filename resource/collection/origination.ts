import * as govn from "./governance.ts";
import * as pipe from "./pipe.ts";
import * as safety from "../../safety/mod.ts";
import * as og from "../governance.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export type CloneableOrigination<Origination, Resource> =
  & Origination
  & safety.Writeable<govn.ResourceFactorySupplier<Resource>>;

export type CloneableSupplier<Origination, Resource> = og.OriginationSupplier<
  CloneableOrigination<Origination, Resource>
>;

export function isOriginationCloneable<Origination, Resource>(
  o: unknown,
): o is CloneableSupplier<Origination, Resource> {
  return (
    og.isOriginationSupplier<CloneableOrigination<Origination, Resource>>(o) &&
    pipe.isResourceFactorySupplier(o.origination)
  );
}

export function mutateOriginationCloneable<Origination, Resource>(
  supplier: unknown,
  onIsNotOriginationSupplier: (
    supplier: safety.Writeable<CloneableSupplier<Origination, Resource>>,
  ) => CloneableSupplier<Origination, Resource>,
  onIsOriginationSupplier?: (
    supplier: CloneableSupplier<Origination, Resource>,
  ) => CloneableSupplier<Origination, Resource>,
): CloneableSupplier<Origination, Resource> {
  if (isOriginationCloneable<Origination, Resource>(supplier)) {
    return onIsOriginationSupplier
      ? onIsOriginationSupplier(supplier)
      : supplier;
  }
  return onIsNotOriginationSupplier(
    supplier as safety.Writeable<CloneableSupplier<Origination, Resource>>,
  );
}

export function forceOriginationRF<Resource, Origination = Any>(
  supplier: unknown,
  resourceFactory: () => Promise<Resource>,
): CloneableSupplier<Origination, Resource> {
  return mutateOriginationCloneable(supplier, (cs) => {
    cs.origination.resourceFactory = resourceFactory;
    return cs;
  }, (cs) => {
    cs.origination.resourceFactory = resourceFactory;
    return cs;
  });
}
