import * as safety from "../safety/mod.ts";
import * as axsd from "./axiom-serde.ts";
import * as hex from "https://deno.land/std@0.147.0/encoding/hex.ts";

// deno-lint-ignore no-explicit-any
export type Any = any; // make it easier on Deno linting

/**
 * An AxiomSerDe supplier which sets the default value of the Axiom to a UUIDv4
 * value.
 * @param axiomSD the AxiomSerDe base
 * @param isDefaultable a function which determines whether the default value should be used
 * @returns an AxiomSerDe definition can be assigned to an axioms record collection
 */
export function uuidAxiomSD(
  axiomSD = axsd.text(),
  isDefaultable: <Context>(value?: string, ctx?: Context) => boolean = (
    value,
  ) => value == undefined ? true : false,
) {
  return axsd.defaultable(
    axiomSD,
    (currentValue) => currentValue ?? crypto.randomUUID(),
    isDefaultable,
  );
}

export const isDigestAxiomSD = safety.typeGuard<{ isDigestAxiomSD: true }>(
  "isDigestAxiomSD",
);

export async function sha1Digest(
  textSupplier: string | Promise<string> | (() => string | Promise<string>),
) {
  const text = typeof textSupplier === "function"
    ? await textSupplier()
    : await textSupplier;
  const digest = await crypto.subtle.digest(
    "sha-1",
    new TextEncoder().encode(text),
  );
  return new TextDecoder().decode(hex.encode(new Uint8Array(digest)));
}

export const sha1DigestUndefined = `sha1DigestPlacholder` as const;
export const sha1DigestUndefinedHash = // the hash for `sha1DigestPlacholder`
  `00db1424f22e29b5251d349f5689655b8432363d`;

/**
 * An AxiomSerDe supplier which sets the default value of the Axiom to a SHA-1
 * digest of a given value. This default value supplier only works in an async
 * context (because of crypto library usage).
 * @param axiomSD the AxiomSerDe base
 * @param isDefaultable a function which determines whether the default value should be used
 * @returns an AxiomSerDe definition can be assigned to an axioms record collection
 */
export function sha1DigestAxiomSD(
  axiomSD = axsd.text(),
  isDefaultable?: <Context>(value?: string, ctx?: Context) => boolean,
) {
  return {
    isDigestAxiomSD: true, // should match isDigestAxiomSD() requirements
    ...axsd.defaultable(
      axiomSD,
      async (currentValue?: string | undefined) =>
        currentValue == undefined || currentValue == sha1DigestUndefined
          ? sha1DigestUndefined
          : await sha1Digest(currentValue),
      isDefaultable ??
        ((value) =>
          value == undefined || value == sha1DigestUndefined ? true : false),
    ),
  };
}
