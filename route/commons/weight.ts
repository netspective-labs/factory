import * as r from "../mod.ts";

export interface WeightSupplier {
  readonly weight?: number;
}
/**
 * Hugo-style page weight sorting comparator
 * @param a The left tree node
 * @param b The right tree node
 * @returns 0 if weights are equal, +1 or -1 for sort order
 */

export const orderByWeight: (
  a: r.RouteTreeNode & WeightSupplier,
  b: r.RouteTreeNode & WeightSupplier,
) => number = (a, b) => {
  const weightA = a.weight;
  const weightB = b.weight;

  if (weightA && weightB) return weightA - weightB;
  if (weightA && !weightB) return -1;
  if (!weightA && weightB) return 1;
  return 0; // order doesn't matter if no weight
};
