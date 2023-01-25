import * as safety from "../safety/mod.ts";

export interface OriginationSupplier<Origination> {
  readonly origination: Origination;
}

const isUntypedOriginationSupplier = safety.typeGuard<
  OriginationSupplier<unknown>
>("origination");

export function isOriginationSupplier<Origination>(
  o: unknown,
): o is OriginationSupplier<Origination> {
  return isUntypedOriginationSupplier(o) ? true : false;
}

export function mutateOrigination<Origination>(
  supplier: unknown,
  onIsNotOriginationSupplier: (
    supplier: safety.Writeable<OriginationSupplier<Origination>>,
  ) => OriginationSupplier<Origination>,
  onIsOriginationSupplier?: (
    supplier: OriginationSupplier<Origination>,
  ) => OriginationSupplier<Origination>,
): OriginationSupplier<Origination> {
  if (isOriginationSupplier<Origination>(supplier)) {
    return onIsOriginationSupplier
      ? onIsOriginationSupplier(supplier)
      : supplier;
  }
  return onIsNotOriginationSupplier(
    supplier as safety.Writeable<OriginationSupplier<Origination>>,
  );
}
