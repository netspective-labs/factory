import * as safety from "../safety/mod.ts";
import * as m from "../safety/merge.ts";
import * as ax from "./axiom.ts";

/**
 * An `AxiomSerDe` is an Axiom-typed "data definition" for defining type-safe
 * "serializable deserializable" (SerDe) atomic data components that can be
 * stored in the environment, a database, etc.
 *
 * A `serDeAxioms` object groups multiple Axiom-typed `AxiomSerDe` instances and
 * treats them as a collection so that they can be treated as a single unit.
 * `serDeAxioms` objects are special in that each AxiomSerDe can be independently
 * identifiable by using simple TypeScript object declarations.
 */

// deno-lint-ignore no-explicit-any
export type Any = any; // make it easier on Deno linting

export interface AixomSerDeLintIssueSupplier {
  readonly lintIssue: string;
  readonly location?: (options?: { maxLength?: number }) => string;
}

export const isAixomSerDeLintIssueSupplier = safety.typeGuard<
  AixomSerDeLintIssueSupplier
>("lintIssue");

export interface AxiomSerDeLintIssuesSupplier {
  readonly lintIssues: AixomSerDeLintIssueSupplier[];
}

export const isAxiomSerDeLintIssuesSupplier = safety.typeGuard<
  AxiomSerDeLintIssuesSupplier
>("lintIssues");

export function axiomSerDeLintIssue<TsValueType>(
  axiomSD: AxiomSerDe<TsValueType>,
  issue: string,
  location?: (options?: { maxLength?: number }) => string,
): AxiomSerDeLintIssuesSupplier & AxiomSerDe<TsValueType> {
  const lintIssue = { lintIssue: issue, location };
  if (isAxiomSerDeLintIssuesSupplier(axiomSD)) {
    axiomSD.lintIssues.push(lintIssue);
    return axiomSD;
  } else {
    const lintable = axiomSD as
      & safety.Writeable<AxiomSerDeLintIssuesSupplier>
      & AxiomSerDe<TsValueType>;
    lintable.lintIssues = [lintIssue];
    return lintable;
  }
}

export type AxiomSerDeValueSupplierContext = {
  readonly isAsync?: boolean;
};

export type AxiomSerDeValueSupplierSync<TsValueType> = <
  Context extends AxiomSerDeValueSupplierContext,
>(
  currentValue?: TsValueType | undefined,
  ctx?: Context,
  ...args: Any[]
) => TsValueType;

export type AxiomSerDeValueSupplier<TsValueType> = <
  Context extends AxiomSerDeValueSupplierContext,
>(
  currentValue?: TsValueType | undefined,
  ctx?: Context,
  ...args: Any[]
) => Promise<TsValueType>;

export type AxiomSerDe<TsValueType> = ax.Axiom<TsValueType> & {
  readonly fromText: <Origin>(text: string, origin: Origin) => TsValueType;
  readonly isOptional: boolean;
};

export function isAxiomSerDe<TsValueType>(
  o: unknown,
): o is AxiomSerDe<TsValueType> {
  const isAT = safety.typeGuard<
    AxiomSerDe<TsValueType>
  >("isOptional");
  return isAT(o);
}

export type IdentifiableAxiomSerDe<
  TsValueType,
  SerDeIdentity extends string = string,
> =
  & AxiomSerDe<TsValueType>
  & { readonly identity: SerDeIdentity };

export function isIdentifiableAxiomSerDe<
  TsValueType,
  Identity extends string = string,
>(o: unknown): o is IdentifiableAxiomSerDe<TsValueType, Identity> {
  const isIASD = safety.typeGuard<
    IdentifiableAxiomSerDe<TsValueType, Identity>
  >("identity");
  return isAxiomSerDe(o) && isIASD(o);
}

export type GovernableAxiomSerDe<TsValueType, Governance> =
  & AxiomSerDe<TsValueType>
  & { readonly governance: Governance };

export function isGovernableAxiomSerDe<TsValueType, Governance>(
  o: unknown,
  govnGuard?: (o: unknown) => o is Governance,
): o is GovernableAxiomSerDe<TsValueType, Governance> {
  const isGASD = safety.typeGuard<
    GovernableAxiomSerDe<TsValueType, Governance>
  >("governance");
  return isAxiomSerDe(o) &&
    (govnGuard ? (isGASD(o) && govnGuard(o.governance)) : isGASD(o));
}

export function governed<TsValueType, Governance>(
  axiom: AxiomSerDe<TsValueType>,
  governance: Governance,
) {
  return { ...axiom, governance };
}

export type DefaultableAxiomSerDe<TsValueType> = {
  readonly isDefaultable: <Context extends AxiomSerDeValueSupplierContext>(
    value?: TsValueType,
    ctx?: Context,
  ) => boolean;
  readonly defaultValue:
    | AxiomSerDeValueSupplierSync<TsValueType>
    | AxiomSerDeValueSupplier<TsValueType>;
};

export type DefaultableAxiomSerDeSync<TsValueType> =
  & Pick<DefaultableAxiomSerDe<TsValueType>, "isDefaultable">
  & {
    readonly defaultValue: AxiomSerDeValueSupplierSync<TsValueType>;
  };

export function isDefaultableAxiomSerDe<TsValueType>(
  o: unknown,
): o is DefaultableAxiomSerDe<TsValueType> {
  const isDASD = safety.typeGuard<DefaultableAxiomSerDe<TsValueType>>(
    "isDefaultable",
    "defaultValue",
  );
  return isAxiomSerDe(o) && isDASD(o);
}

export function isDefaultableAxiomSerDeAsync<TsValueType>(
  o: DefaultableAxiomSerDe<TsValueType>,
) {
  return o.defaultValue.constructor.name === "AsyncFunction";
}

export function isDefaultableAxiomSerDeSync<TsValueType>(
  o: DefaultableAxiomSerDe<TsValueType>,
) {
  return o.defaultValue.constructor.name === "Function";
}

export function defaultable<TsValueType>(
  axiom: AxiomSerDe<TsValueType>,
  defaultValue:
    | AxiomSerDeValueSupplierSync<TsValueType>
    | AxiomSerDeValueSupplier<TsValueType>,
  isDefaultable: <Context extends AxiomSerDeValueSupplierContext>(
    value?: TsValueType,
    ctx?: Context,
  ) => boolean,
): AxiomSerDe<TsValueType> & DefaultableAxiomSerDe<TsValueType> {
  return { ...axiom, defaultValue, isDefaultable };
}

export function defaultableOptional<TsValueType>(
  axiom: AxiomSerDe<TsValueType | undefined>,
  defaultValue:
    | AxiomSerDeValueSupplierSync<TsValueType | undefined>
    | AxiomSerDeValueSupplier<TsValueType | undefined>,
  isDefaultable: <Context>(
    value?: TsValueType | undefined,
    ctx?: Context,
  ) => boolean = (
    value,
  ) => value == undefined ? true : false,
):
  & AxiomSerDe<TsValueType | undefined>
  & DefaultableAxiomSerDe<TsValueType | undefined> {
  return {
    ...axiom,
    isOptional: true,
    defaultValue,
    isDefaultable,
  };
}

export function untyped(
  axiom: ax.Axiom<unknown> = ax.$.unknown,
  atOptions?: Partial<AxiomSerDe<unknown>>,
): AxiomSerDe<unknown> {
  return {
    ...axiom,
    fromText: (text) => text,
    isOptional: false,
    ...atOptions,
  };
}

export function untypedOptional(
  axiom: ax.Axiom<unknown | undefined> = ax.$.string.optional(),
  atOptions?: Partial<AxiomSerDe<unknown>>,
): AxiomSerDe<unknown | undefined> {
  return { ...axiom, fromText: (text) => text, isOptional: true, ...atOptions };
}

export function text(
  axiom: ax.Axiom<string> = ax.$.string,
  atOptions?: Partial<AxiomSerDe<string>>,
): AxiomSerDe<string> {
  return {
    ...axiom,
    fromText: (text) => text,
    isOptional: false,
    ...atOptions,
  };
}

export function textOptional(
  axiom: ax.Axiom<string | undefined> = ax.$.string.optional(),
  atOptions?: Partial<AxiomSerDe<string>>,
): AxiomSerDe<string | undefined> {
  return { ...axiom, fromText: (text) => text, isOptional: true, ...atOptions };
}

export function date(
  axiom: ax.Axiom<Date> = ax.$.date,
  atOptions?: Partial<AxiomSerDe<Date>>,
): AxiomSerDe<Date> {
  return {
    ...axiom,
    fromText: (text) => new Date(text),
    isOptional: false,
    ...atOptions,
  };
}

export function dateOptional(
  axiom: ax.Axiom<Date | undefined> = ax.$.date.optional(),
  atOptions?: Partial<AxiomSerDe<Date | undefined>>,
): AxiomSerDe<Date | undefined> {
  return {
    ...axiom,
    fromText: (text) => new Date(text),
    isOptional: true,
    ...atOptions,
  };
}

export function dateTime(
  axiom: ax.Axiom<Date> = ax.$.date,
  atOptions?: Partial<AxiomSerDe<Date>>,
): AxiomSerDe<Date> {
  return {
    ...axiom,
    fromText: (text) => new Date(text),
    isOptional: false,
    ...atOptions,
  };
}

export function dateTimeOptional(
  axiom: ax.Axiom<Date | undefined> = ax.$.date.optional(),
  atOptions?: Partial<AxiomSerDe<Date | undefined>>,
): AxiomSerDe<Date | undefined> {
  return {
    ...axiom,
    fromText: (text) => new Date(text),
    isOptional: true,
    ...atOptions,
  };
}

export function boolean(
  axiom: ax.Axiom<boolean> = ax.$.boolean,
  atOptions?: Partial<AxiomSerDe<boolean>>,
): AxiomSerDe<boolean> {
  return {
    ...axiom,
    fromText: (text) => JSON.parse(text),
    isOptional: false,
    ...atOptions,
  };
}

export function booleanOptional(
  axiom: ax.Axiom<boolean | undefined> = ax.$.boolean.optional(),
  atOptions?: Partial<AxiomSerDe<boolean>>,
): AxiomSerDe<boolean | undefined> {
  return {
    ...axiom,
    fromText: (text) => JSON.parse(text),
    isOptional: true,
    ...atOptions,
  };
}

export function integer(
  axiom: ax.Axiom<number> = ax.$.number,
  atOptions?: Partial<AxiomSerDe<number>>,
): AxiomSerDe<number> {
  return {
    ...axiom,
    fromText: (text) => parseInt(text),
    isOptional: false,
    ...atOptions,
  };
}

export function integerOptional(
  axiom: ax.Axiom<number | undefined> = ax.$.number.optional(),
  atOptions?: Partial<AxiomSerDe<number>>,
): AxiomSerDe<number | undefined> {
  return {
    ...axiom,
    fromText: (text) => parseInt(text),
    isOptional: true,
    ...atOptions,
  };
}

export function float(
  axiom: ax.Axiom<number> = ax.$.number,
  atOptions?: Partial<AxiomSerDe<number>>,
): AxiomSerDe<number> {
  return {
    ...axiom,
    fromText: (text) => parseFloat(text),
    isOptional: false,
    ...atOptions,
  };
}

export function floatOptional(
  axiom: ax.Axiom<number | undefined> = ax.$.number.optional(),
  atOptions?: Partial<AxiomSerDe<number>>,
): AxiomSerDe<number | undefined> {
  return {
    ...axiom,
    fromText: (text) => parseFloat(text),
    isOptional: true,
    ...atOptions,
  };
}

export function bigint(
  axiom: ax.Axiom<bigint> = ax.$.bigint,
  atOptions?: Partial<AxiomSerDe<bigint>>,
): AxiomSerDe<bigint> {
  return {
    ...axiom,
    fromText: (text) => BigInt(JSON.parse(text)),
    isOptional: false,
    ...atOptions,
  };
}

export function bigintOptional(
  axiom: ax.Axiom<bigint | undefined> = ax.$.bigint.optional(),
  atOptions?: Partial<AxiomSerDe<bigint>>,
): AxiomSerDe<bigint | undefined> {
  return {
    ...axiom,
    fromText: (text) => BigInt(JSON.parse(text)),
    isOptional: true,
    ...atOptions,
  };
}

export function object<TPropAxioms extends Record<string, ax.Axiom<Any>>>(
  axiom: TPropAxioms,
  atOptions?: Partial<AxiomSerDe<string>>,
) {
  return {
    ...ax.$.object(axiom),
    fromText: (text: string) => JSON.parse(text),
    isOptional: false,
    ...atOptions,
  };
}

export function objectOptional<
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
>(axiom: TPropAxioms) {
  return {
    ...ax.$.object(axiom).optional(),
    fromText: (text: string) => JSON.parse(text),
    isOptional: true,
  };
}

export function jsonText(
  axiom: ax.Axiom<string> = ax.$.string,
  atOptions?: Partial<AxiomSerDe<string>>,
): AxiomSerDe<string> {
  return {
    ...axiom,
    fromText: (text) => JSON.parse(text),
    isOptional: false,
    ...atOptions,
  };
}

export function jsonTextOptional(
  axiom: ax.Axiom<string | undefined> = ax.$.string.optional(),
  atOptions?: Partial<AxiomSerDe<string>>,
): AxiomSerDe<string | undefined> {
  return {
    ...axiom,
    fromText: (text) => JSON.parse(text),
    isOptional: true,
    ...atOptions,
  };
}

export interface AxiomsSerDeSupplier<TsValueType = Any> {
  readonly serDeAxioms: IdentifiableAxiomSerDe<TsValueType>[];
}

export type SerDeAxiomDefns<TPropAxioms extends Record<string, ax.Axiom<Any>>> =
  {
    [Property in keyof TPropAxioms]: IdentifiableAxiomSerDe<
      TPropAxioms[Property] extends ax.Axiom<infer T> ? T : never
    >;
  };

export function isAxiomsSerDeSupplier<TsValueType>(
  o: unknown,
): o is AxiomsSerDeSupplier<TsValueType> {
  const isSDS = safety.typeGuard<AxiomsSerDeSupplier<TsValueType>>(
    "serDeAxioms",
  );
  return isSDS(o);
}

type AxiomSerDeDefaultables<TPropAxioms extends Record<string, ax.Axiom<Any>>> =
  {
    [
      Property in keyof TPropAxioms as Extract<
        Property,
        TPropAxioms[Property] extends { defaultValue: Any } ? Property
          : never
      >
    ]: <ASDVSC extends AxiomSerDeValueSupplierContext>(
      currentValue?:
        | (TPropAxioms[Property] extends ax.Axiom<infer T> ? T : never)
        | undefined,
      ctx?: ASDVSC,
    ) => TPropAxioms[Property] extends ax.Axiom<infer T> ? T | Promise<T>
      : never;
  };

export function axiomSerDeObjectDefaultables<
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
>(...axiomProps: IdentifiableAxiomSerDe<Any>[]) {
  type Defaultables = AxiomSerDeDefaultables<TPropAxioms>;
  type DefaultableValueKey = keyof Defaultables;

  const defaultValues: Defaultables = {} as Any;
  for (const ap of axiomProps) {
    if (isDefaultableAxiomSerDe(ap)) {
      defaultValues[ap.identity as DefaultableValueKey] = (
        currentValue: Any | undefined,
        ctx: Any,
      ) => ap.defaultValue?.(currentValue, ctx) as Any;
    }
  }
  return defaultValues;
}

export function axiomSerDeObject<
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
>(
  props: TPropAxioms,
  sdaOptions?: {
    readonly onPropertyNotSerDeAxiom?: (
      name: string,
      axiom: Any,
      axiomSD: IdentifiableAxiomSerDe<Any>[],
    ) => void;
  },
) { // we let Typescript infer function return to allow generics to be more effective
  const { onPropertyNotSerDeAxiom } = sdaOptions ?? {};
  const axiomProps: IdentifiableAxiomSerDe<Any>[] = [];
  const axiom = ax.$.object(props);
  Object.entries(axiom.axiomObjectDecl).forEach((entry) => {
    const [name, axiom] = entry;
    if (isAxiomSerDe<Any>(axiom)) {
      const mutatableIT = axiom as safety.Writeable<
        IdentifiableAxiomSerDe<Any>
      >;
      mutatableIT.identity = name as Any;
      axiomProps.push(mutatableIT);
    } else {
      onPropertyNotSerDeAxiom?.(name, axiom, axiomProps);
    }
  });

  type SerDeRecord = ax.AxiomType<typeof axiom>;

  // we let Typescript infer function return to allow generics to be more
  // easily passed to consumers (if we typed it to an interface we'd limit
  // the type-safety)
  // ESSENTIAL: be sure it adheres to AxiomsSerDeSupplier contract
  const result = {
    ...axiom,
    axiomProps,
    defaultable: axiomSerDeObjectDefaultables<TPropAxioms>(...axiomProps),
    /**
     * Construct an empty record filled with defaults, synchronously
     * @param initValues Start with values from this optional object
     * @param ctx arbitrary context to pass into AxiomSerDe defaultValue() function
     * @returns an "empty" typed SerDeRecord with defaults filled in
     */
    prepareRecordSync: <Context extends AxiomSerDeValueSupplierContext>(
      initValues?: Partial<SerDeRecord>,
      ctx?: Context,
    ) => {
      const defaults = (initValues ?? {}) as Record<string, Any>;

      for (const a of axiomProps) {
        if (isDefaultableAxiomSerDe(a)) {
          const currentValue = defaults[a.identity];
          if (!a.isDefaultable<Context>(currentValue, ctx)) {
            continue;
          }
          defaults[a.identity] = isDefaultableAxiomSerDeSync(a)
            ? a.defaultValue(currentValue, { isAsync: true, ...ctx })
            : undefined;
        }
      }

      return defaults as SerDeRecord;
    },
    /**
     * Construct an empty record filled with defaults, asynchronously
     * @param initValues Start with values from this optional object
     * @param ctx arbitrary context to pass into AxiomSerDe defaultValue() function
     * @returns an "empty" typed SerDeRecord with defaults filled in
     */
    prepareRecord: async <Context extends AxiomSerDeValueSupplierContext>(
      initValues?: Partial<SerDeRecord>,
      ctx?: Context,
    ) => {
      const defaults = (initValues ?? {}) as Record<string, Any>;

      for (const a of axiomProps) {
        if (isDefaultableAxiomSerDe(a)) {
          const currentValue = defaults[a.identity];
          if (!a.isDefaultable<Context>(currentValue, ctx)) {
            continue;
          }
          defaults[a.identity] = isDefaultableAxiomSerDeAsync(a)
            ? await a.defaultValue(
              currentValue,
              ctx as AxiomSerDeValueSupplierContext,
            )
            : a.defaultValue(currentValue, { isAsync: true, ...ctx });
        }
      }

      return defaults as SerDeRecord;
    },
    missingValues: (
      values: SerDeRecord,
      ...validate: (keyof SerDeRecord)[]
    ) => {
      const missingProps: IdentifiableAxiomSerDe<Any>[] = [];
      for (const prop of validate) {
        const axiomSD = axiomProps.find((asd) => asd.identity == prop);
        // axiomSD.isDefaultable will be true if value is not set
        if (
          axiomSD &&
          isDefaultableAxiomSerDe(axiomSD) &&
          axiomSD.isDefaultable(values[prop] as Any) // if isDefaultable returns true, it means that it's "empty"
        ) {
          missingProps.push(axiomSD);
        }
      }
      return missingProps;
    },
    fromJsonText: <Context>(
      jsonTextSupplier: string | ((ctx?: Context) => string),
      options?: {
        readonly ctx?: Context;
        readonly initValues?: SerDeRecord | ((ctx?: Context) => SerDeRecord);
      },
    ) => {
      const { ctx, initValues } = options ?? {};
      const jsonText = typeof jsonTextSupplier === "function"
        ? jsonTextSupplier(ctx)
        : jsonTextSupplier;
      const jsonValue = JSON.parse(jsonText) as SerDeRecord;

      const init =
        (typeof initValues === "function" ? initValues(ctx) : initValues) ??
          result.prepareRecordSync();
      const serDeAxiomRecord = m.safeMerge(
        { ...init },
        jsonValue,
      ) as unknown as SerDeRecord;

      return {
        ...axiom,
        jsonText,
        jsonValue,
        serDeAxiomRecord,
      };
    },
    fromTextRecord: (textRecord: Record<string, unknown>) => {
      for (const a of axiomProps) {
        const value = textRecord[a.identity];
        if (typeof value === "string") {
          textRecord[a.identity] = a.fromText(value, "textRecord");
        }
      }
      return textRecord as unknown as SerDeRecord;
    },
    governed: function* <Governance, TsValueType = Any>(
      include?: (
        govnAP:
          & IdentifiableAxiomSerDe<TsValueType, string>
          & GovernableAxiomSerDe<TsValueType, Governance>,
      ) => boolean,
    ) {
      for (const ap of axiomProps) {
        if (
          isGovernableAxiomSerDe<TsValueType, Governance>(ap) &&
          (!include || include(ap))
        ) {
          yield ap;
        }
      }
    },
  };
  return result;
}

export function* axiomsSerDeLintIssues<
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context,
>(
  props: TPropAxioms,
  sdaOptions?: {
    readonly ctx?: Context;
    readonly onPropertyNotSerDeAxiom?: (
      name: string,
      axiom: Any,
      iasd: IdentifiableAxiomSerDe<Any>[],
    ) => void;
  },
) {
  const asdo = axiomSerDeObject(props, sdaOptions);
  for (const ap of asdo.axiomProps) {
    if (isAxiomSerDeLintIssuesSupplier(ap)) {
      for (const li of ap.lintIssues) {
        yield { ap, ...li };
      }
    }
  }
}
