import * as safety from "../safety/mod.ts";
import * as id from "../identity/mod.ts";
import * as govn from "./governance.ts";

export type OkrNamespace = typeof okrNamespaceText;
export const okrNamespaceText = "OKR" as const;
export const okrNamespaceUUIDv5: id.UUID =
  "7cd56c20-1743-4b4f-93aa-4921e42d91e9";

export interface KeyResultText extends String {
  // see [nominal typing](https://basarat.gitbook.io/typescript/main-1/nominaltyping#using-interfaces)
  readonly _okrKeyResultTextBrand: string; // To prevent type errors that could mix strings
}

export interface KeyResult<Namespace extends string>
  extends govn.InstrumentableExpectation<Namespace> {
  readonly keyResult: KeyResultText;
  readonly keyResultOKRs: ObjectivesAndKeyResults<Namespace>;
}

// deno-lint-ignore no-empty-interface
export interface KeyResults<Namespace extends string>
  extends govn.ExpectationsSupplier<{ keyResult: KeyResult<Namespace> }> {
}

export interface ObjectiveText extends String {
  readonly _okrObjectiveTextBrand: string; // To prevent type errors
}

export interface Objective<Namespace extends string>
  extends govn.Intention<OkrNamespace>, KeyResults<Namespace> {
  readonly objective: ObjectiveText;
  readonly childOKRs: ObjectivesAndKeyResults<Namespace>;
}

// deno-lint-ignore no-empty-interface
export interface ObjectivesAndKeyResults<Namespace extends string>
  extends govn.IntentionsSupplier<{ objective: Objective<Namespace> }> {
}

export const isObjectivesAndKeyResults = safety.typeGuard<
  ObjectivesAndKeyResults<OkrNamespace>
>("objectives");

export function okrsIdentitySupplier(
  uuidV5NS = okrNamespaceUUIDv5,
): id.NamespacedIdentityFactory<OkrNamespace, id.UUID> {
  return id.typicalNamespacedUuidFactory<OkrNamespace>(
    okrNamespaceText,
    uuidV5NS,
  );
}

export interface ObjectivesAndKeyResultsFactory<Namespace extends string> {
  readonly objectives: (
    content: (
      factory: ObjectivesAndKeyResultsFactory<Namespace>,
    ) => AsyncGenerator<Objective<Namespace>>,
  ) => Promise<ObjectivesAndKeyResults<Namespace>>;
  readonly objective: (
    text: string | ObjectiveText,
    content?:
      | Omit<Partial<Objective<Namespace>>, "objective">
      | ((
        objective: Omit<Objective<Namespace>, "keyResults">,
        factory: ObjectivesAndKeyResultsFactory<Namespace>,
      ) => AsyncGenerator<KeyResult<Namespace>>),
  ) => Promise<Objective<Namespace>>;
  readonly keyResult: (
    text: string | KeyResultText,
    defaults?: Omit<Partial<KeyResult<Namespace>>, "keyResult">,
  ) => Promise<KeyResult<Namespace>>;
}

export function typicalOkrFactory(
  ids = okrsIdentitySupplier(),
): ObjectivesAndKeyResultsFactory<OkrNamespace> {
  const factory: ObjectivesAndKeyResultsFactory<OkrNamespace> = {
    objectives: async (content) => {
      const objectives: Objective<OkrNamespace>[] = [];
      for await (const o of content(factory)) {
        objectives.push(o);
      }
      return {
        objectives,
      };
    },
    objective: async (text, defaults) => {
      const objective: Omit<Objective<OkrNamespace>, "keyResults"> = {
        identity: {
          UUID: await ids.idempotentNamespacedID(text as string),
        },
        // deno-lint-ignore no-explicit-any
        objective: text as any as ObjectiveText,
        childOKRs: typeof defaults === "function"
          ? { objectives: [] }
          : (defaults?.childOKRs || { objectives: [] }),
      };
      let keyResults: Iterable<KeyResult<OkrNamespace>>;
      if (typeof defaults === "function") {
        const generatedKRs = [];
        for await (const kr of defaults(objective, factory)) {
          generatedKRs.push(kr);
        }
        keyResults = generatedKRs;
      } else {
        keyResults = defaults?.keyResults || [];
      }
      return {
        ...objective,
        keyResults,
      };
    },
    keyResult: async (text, defaults) => {
      return {
        identity: {
          UUID: await ids.idempotentNamespacedID(text as string),
        },
        // deno-lint-ignore no-explicit-any
        keyResult: text as any as KeyResultText,
        keyResultOKRs: defaults?.keyResultOKRs || { objectives: [] },
        ...defaults,
      };
    },
  };
  return factory;
}
