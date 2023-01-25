import * as safety from "../../safety/mod.ts";
import * as govn from "./governance.ts";
import * as e from "../../module/mod.ts";

export const isModelSupplier = safety.typeGuard<
  govn.ModelSupplier<govn.UntypedModel>
>("model");

/**
 * Ensure that the given resource is a ModelSupplier
 * @param r the resource to test
 * @returns r with an empty .model if it's not already present
 */
export function ensureModelSupplier<Resource>(
  r: Resource,
): govn.ModelSupplier<govn.UntypedModel> {
  if (isModelSupplier(r) && r.model) return r;
  const result = r as unknown as govn.MutatableModelSupplier<govn.UntypedModel>;
  result.model = {};
  return result;
}

/**
 * See if an object is a model supplier of the given shape
 * @param o potential model supplier
 * @param guard the expected shape of the model
 * @returns true if o is a model supplier and o.model is of type guard
 */
export function isModelShapeSupplier<Model>(
  o: unknown,
  guard: (o: unknown) => o is Model,
): o is govn.ModelSupplier<Model> {
  if (isModelSupplier(o) && guard(o.model)) {
    return true;
  }
  return false;
}
/**
 * Find the first model supplier in a list of model suppliers
 * @param o List of objects which might be potential model suppliers
 * @returns Either the first model supplier or undefined if none found
 */
export function potentialModelSupplier<Model>(
  ...o: unknown[]
): govn.ModelSupplier<Model> | undefined {
  const found = o.find((potential) => isModelSupplier(potential));
  if (found) return found as govn.ModelSupplier<Model>;
  return undefined;
}

/**
 * Find the first model supplier in a list of model suppliers
 * @param defaultSupplier What to return in case no model suppliers found
 * @param o List of objects which might be potential model suppliers
 * @returns Either the first model supplier or defaultSupplier
 */
export function modelSupplier<Model>(
  defaultSupplier:
    | govn.ModelSupplier<Model>
    | (() => govn.ModelSupplier<Model>),
  ...o: unknown[]
): govn.ModelSupplier<Model> | undefined {
  const found = o.find((potential) => isModelSupplier(potential));
  if (found) return found as govn.ModelSupplier<Model>;
  return typeof defaultSupplier === "function"
    ? defaultSupplier()
    : defaultSupplier;
}

/**
 * Find the first model in a list of model suppliers
 * @param defaultModel What to return in case no model suppliers supplied a model
 * @param o List of objects which might be potential model suppliers
 * @returns Either the first model supplier's model or defaultModel
 */
export function model<Model extends Record<string, unknown>>(
  defaultModel: Model | (() => Model),
  ...o: unknown[]
): Model {
  const found = o.find((potential) => isModelSupplier(potential));
  if (found) return (found as govn.ModelSupplier<Model>).model as Model;
  return typeof defaultModel === "function" ? defaultModel() : defaultModel;
}

export const isIdentifiableModelSupplier = safety.typeGuard<
  govn.IdentifiableModelSupplier<unknown>
>(
  "model",
  "modelIdentity",
);

/**
 * Transform the dest into a ModelSupplier, pointing to the source model
 * as a reference (not cloned).
 * @param source The model supplier we want the dest to reference
 * @param dest The target object that should reference the source model
 * @returns
 */
export function referenceModel<
  ModelSupplier extends govn.ModelSupplier<unknown>,
>(
  source: ModelSupplier,
  dest: unknown,
  options?: {
    readonly append?: Iterable<[key: string, value: unknown]>;
    readonly onDestIsNotMutatable?: (
      reason: string,
      source: ModelSupplier,
      dest: unknown,
    ) => unknown;
  },
): ModelSupplier | unknown {
  if (dest && typeof dest === "object") {
    if (isIdentifiableModelSupplier(source)) {
      // deno-lint-ignore no-explicit-any
      (dest as any).model = source.model;
      // deno-lint-ignore no-explicit-any
      (dest as any).modelIdentity = source.modelIdentity;
    } else if (isModelSupplier(source)) {
      // deno-lint-ignore no-explicit-any
      (dest as any).model = source.model;
    }
    const result = dest as ModelSupplier;
    if (options?.append) {
      const model = result.model as Record<string, unknown>;
      for (const append of options?.append) {
        const [key, value] = append;
        model[key] = value;
      }
    }
    return result;
  } else {
    if (options?.onDestIsNotMutatable) {
      return options?.onDestIsNotMutatable(
        "dest is not an object in referenceModel",
        source,
        dest,
      );
    } else {
      console.warn("referenceModel: dest is not an object");
    }
  }
  return dest;
}

/**
 * Transform the dest into a ModelSupplier, cloning to the source model
 * @param source The model supplier we want the dest to become a clone of
 * @param dest The target object that should clone from the source model
 * @returns
 */
export function cloneModel<
  ModelSupplier extends govn.ModelSupplier<unknown>,
>(
  source: ModelSupplier,
  dest: unknown,
  options?: {
    readonly append?: Iterable<[key: string, value: unknown]>;
    readonly onDestIsNotMutatable?: (
      reason: string,
      source: ModelSupplier,
      dest: unknown,
    ) => unknown;
  },
): ModelSupplier | unknown {
  if (dest && typeof dest === "object") {
    if (isIdentifiableModelSupplier(source)) {
      // deno-lint-ignore no-explicit-any
      (dest as any).model = e.deepClone(source.model);
      // deno-lint-ignore no-explicit-any
      (dest as any).modelIdentity = source.modelIdentity;
    } else if (isModelSupplier(source)) {
      // deno-lint-ignore no-explicit-any
      (dest as any).model = e.deepClone(source.model);
    }
    const result = dest as ModelSupplier;
    if (options?.append) {
      const model = result.model as Record<string, unknown>;
      for (const append of options?.append) {
        const [key, value] = append;
        model[key] = value;
      }
    }
    return result;
  } else {
    if (options?.onDestIsNotMutatable) {
      return options?.onDestIsNotMutatable(
        "dest is not an object in cloneModel",
        source,
        dest,
      );
    } else {
      console.warn("cloneModel: dest is not an object");
    }
  }
  return dest;
}

/**
 * Clone properties from source into dest.model if the property in source does
 * not alrady exist in dest.model.
 * @param source Any arbitrary string-keyed object
 * @param dest The destination's model to merge source keys into
 * @param filter Return transformed value that should be merged, undefined to skip property
 * @returns The destination
 */
export const mutateModelProperties = <
  ModelSupplier extends govn.ModelSupplier<unknown>,
>(
  source: Record<string, unknown>,
  dest: ModelSupplier,
  options?: {
    readonly append?: Iterable<[key: string, value: unknown]>;
    readonly filter?: (key: string, value: unknown) => unknown | undefined;
    readonly onDestIsNotMutatable?: (
      reason: string,
      source: Record<string, unknown>,
      dest: ModelSupplier,
    ) => ModelSupplier;
  },
): ModelSupplier => {
  if (isModelSupplier(dest)) {
    if (typeof dest.model === "object") {
      const merged = dest.model as Record<string, unknown>;
      if (options?.filter) {
        const filter = options?.filter;
        for (const prop in source) {
          if (!(prop in merged)) {
            const filtered = filter(prop, source[prop]);
            if (filtered) {
              merged[prop] = filtered;
            }
          }
        }
      } else {
        for (const prop in source) {
          if (!(prop in merged)) {
            merged[prop] = e.deepClone(source[prop]);
          }
        }
      }
      if (options?.append) {
        for (const append of options?.append) {
          const [key, value] = append;
          merged[key] = value;
        }
      }
    } else {
      if (options?.onDestIsNotMutatable) {
        return options?.onDestIsNotMutatable(
          "dest.model is not an object in mutateModelProperties",
          source,
          dest,
        );
      } else {
        console.warn("mutateModelProperties: dest.model is not an object");
      }
    }
  } else {
    if (options?.onDestIsNotMutatable) {
      return options?.onDestIsNotMutatable(
        "dest is not a ModelSupplier in mutateModelProperties",
        source,
        dest,
      );
    } else {
      console.warn("mutateModelProperties: dest is not a ModelSupplier");
    }
  }
  return dest;
};
