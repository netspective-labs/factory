import * as axsd from "./axiom-serde.ts";
import { monotonicUlid, ulid } from "../identity/ulid.ts";

// deno-lint-ignore no-explicit-any
export type Any = any; // make it easier on Deno linting

/**
 * An AxiomSerDe supplier which sets the default value of the Axiom to the value
 * of Unique Lexicographically Sortable Identifier (ULID).
 * @param axiomSD the AxiomSerDe base
 * @param isDefaultable a function which determines whether the default value should be used
 * @returns an AxiomSerDe definition can be assigned to an axioms record collection
 */
export function ulidAxiomSD(
  axiomSD = axsd.text(),
  isDefaultable?: <Context>(value?: string, ctx?: Context) => boolean,
) {
  return axsd.defaultable(
    axiomSD,
    (currentValue) => currentValue ?? ulid(),
    isDefaultable ?? ((value) => value == undefined ? true : false),
  );
}

/**
 * An AxiomSerDe supplier which sets the default value of the Axiom to the value
 * of Unique Lexicographically Sortable Identifier (ULID).
 * @param axiomSD the AxiomSerDe base
 * @param isDefaultable a function which determines whether the default value should be used
 * @returns an AxiomSerDe definition can be assigned to an axioms record collection
 */
export function monotonicUlidAxiomSD(
  axiomSD = axsd.text(),
  isDefaultable?: <Context>(value?: string, ctx?: Context) => boolean,
) {
  return axsd.defaultable(
    axiomSD,
    (currentValue) => currentValue ?? monotonicUlid(),
    isDefaultable ?? ((value) => value == undefined ? true : false),
  );
}
