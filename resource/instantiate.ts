import { path } from "./deps.ts";
import * as safety from "../safety/mod.ts";

// deno-lint-ignore no-explicit-any
export type ResourceInstantiatorFunction<Resource = any> = (
  // deno-lint-ignore no-explicit-any
  ...args: any[]
) => Resource;

export interface MutatableInstantiatorSupplier {
  instantiationProvenance: string;
  instantiatorIdentity: string;
  instantiatorRfExplorerNarrativeHTML?: string;
}

export type InstantiatorSupplier = Readonly<MutatableInstantiatorSupplier>;

export function typicalInstantiatorProps<Instantiator>(
  _instantiator: Instantiator,
  instantiationProvenance: string,
  instantiatorIdentity: string,
): InstantiatorSupplier {
  return {
    instantiationProvenance,
    instantiatorIdentity,
    instantiatorRfExplorerNarrativeHTML:
      `<a href="/workspace/editor-redirect/abs${
        path.fromFileUrl(instantiationProvenance)
      }" title="Edit ${instantiatorIdentity} in IDE"><code>${instantiatorIdentity}</code></a>`,
  };
}

export const isInstantiatorSupplier = safety.typeGuard<InstantiatorSupplier>(
  "instantiationProvenance",
);
