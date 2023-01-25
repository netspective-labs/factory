import * as safety from "../safety/mod.ts";
import * as ax from "./axiom.ts";
import * as axsd from "./axiom-serde.ts";

// deno-lint-ignore no-explicit-any
export type Any = any; // make it easier on Deno linting

export const freeTextToEnvVarName = (text: string) =>
  // change whitespace/dashes/dots to underscores, remove anything not alphanumeric or underscore
  text.replace(/[-\.\s]+/g, "_").replace(/[^\w]+/g, "").toLocaleUpperCase();

export const camelCaseToEnvVarName = (text: string) =>
  // find one or more uppercase characters and separate with _
  text.replace(/[A-Z]+/g, (match: string) => `_${match}`)
    .toLocaleUpperCase();

export type EnvVarNamingStrategy = (given: string) => string;

/**
 * An AxiomSerDe supplier which sets the default value of the Axiom to the value
 * of an environment variable. Useful when some Axiom values should be driven by
 * code while other values should be acquired from the environment.
 * @param axiomSD the AxiomSerDe base
 * @param envVarName a single env var name (or list of names, using the first one found)
 * @param defaultValue the value to default to in case the environment does not contain the given names
 * @param isDefaultable a function which determines whether the default value should be used
 * @returns an AxiomSerDe definition can be assigned to an axioms record collection
 */
export function envVarAxiomSD<
  AxiomSD extends axsd.AxiomSerDe<TsValueType>,
  TsValueType,
>(
  axiomSD: AxiomSD,
  envVarName: string | string[],
  defaultValue: TsValueType,
  isDefaultable?: <Context>(value?: TsValueType, ctx?: Context) => boolean,
) {
  const defaultValueSupplier = () => {
    const evnList: string[] = Array.isArray(envVarName)
      ? envVarName
      : [envVarName];
    for (const evName of evnList) {
      const envVarValue = Deno.env.get(evName);
      if (envVarValue) return axiomSD.fromText(envVarValue, { envVarValue });
    }
    return defaultValue;
  };
  return axsd.defaultable(
    axiomSD,
    defaultValueSupplier,
    isDefaultable ?? ((value) => value == undefined ? true : false),
  );
}

export function envBuilder(options?: {
  readonly ens?: EnvVarNamingStrategy;
}) {
  const { ens = (suggested: string) => suggested } = options ??
    {};
  const textEnvPlaceholder = "envVarUndefined";
  const intEnvPlaceholder = -1;
  return {
    textEnvPlaceholder,
    text: (
      envVarName: string,
      ...aliases: string[]
    ) => {
      return envVarAxiomSD(
        axsd.text(),
        [ens(envVarName), ...aliases],
        textEnvPlaceholder,
        (value) =>
          value == undefined || value == textEnvPlaceholder ? true : false,
      );
    },
    intEnvPlaceholder,
    integer: (
      envVarName: string,
      ...aliases: string[]
    ) => {
      return envVarAxiomSD(
        axsd.integer(),
        [ens(envVarName), ...aliases],
        intEnvPlaceholder,
        (value) =>
          value == undefined || value == intEnvPlaceholder ? true : false,
      );
    },
    textOptional: (
      envVarName: string,
      ...aliases: string[]
    ) => {
      const axiomSD = axsd.textOptional();
      return axsd.defaultable(axiomSD, () => {
        for (const evName of [ens(envVarName), ...aliases]) {
          const envVarValue = Deno.env.get(evName);
          if (envVarValue) {
            return axiomSD.fromText(envVarValue, { envVarValue });
          }
        }
        return undefined;
      }, (value) => value == undefined ? true : false);
    },
    bool: (
      envVarName: string,
      ...aliases: string[]
    ) => {
      const axiomSD = axsd.booleanOptional();
      return axsd.defaultable(axiomSD, () => {
        for (const evName of [ens(envVarName), ...aliases]) {
          const envVarValue = Deno.env.get(evName);
          if (envVarValue) {
            return axiomSD.fromText(envVarValue, { envVarValue });
          }
        }
        return undefined;
      }, (value) => value == undefined ? true : false);
    },
  };
}

export type EnvVarNamesSupplier<Name extends string> = {
  readonly envVarNames: Name[];
};

export function isEnvVarNamesSupplier<Name extends string>(
  o: unknown,
): o is EnvVarNamesSupplier<Name> {
  const isLSD = safety.typeGuard<EnvVarNamesSupplier<Name>>("envVarNames");
  return isLSD(o);
}

export type AliasedAxiomSerDe<TsValueType, Alias extends string> =
  & axsd.AxiomSerDe<TsValueType>
  & EnvVarNamesSupplier<Alias>;

export function isAliasedAxiomSerDe<TsValueType, Name extends string>(
  o: unknown,
): o is AliasedAxiomSerDe<TsValueType, Name> {
  const isLT = safety.typeGuard<AliasedAxiomSerDe<TsValueType, Name>>(
    "envVarNames",
  );
  return axsd.isAxiomSerDe(o) && isLT(o);
}

export function alias<TsValueType, Name extends string>(
  toggle: axsd.AxiomSerDe<TsValueType>,
  ...envVarNames: Name[]
): AliasedAxiomSerDe<TsValueType, Name> {
  return {
    ...toggle,
    envVarNames,
  };
}

/**
 * Given a record of Axiom definitions, convert each property's camel-cased name
 * to an uppercase environment variable name, attempt to find each property's
 * value in the environment as an individual env var value, and assign the value
 * to a type-safe record.
 *
 * Usually it's best to use individual envVarAxiomSD-defined Axioms but this
 * function is useful when the entire set of axioms comes from the environment.
 * Another benefit of using this function over individual envVarAxiomSD Axioms
 * is that this function is more "observable": it can report on found/missing
 * env vars.
 * @param props the collection of axioms to find in the environment
 * @param dieOptions env var naming strategy, initial values, and other options
 * @returns AxiomsSerDeSupplier along with env vars observability
 */
export function deserializeFullRecordUsingIndividualEnvVars<
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context,
>(
  props: TPropAxioms,
  dieOptions?: {
    readonly ctx?: Context;
    readonly evNS?: EnvVarNamingStrategy;
    readonly initValues?: ax.Simplify<
      ax.AxiomObjectTypeStrict<TPropAxioms, unknown>
    >;
    readonly onPropertyNotSerDeAxiom?: (
      name: string,
      axiom: ax.Axiom<Any>,
      toggles: axsd.IdentifiableAxiomSerDe<Any>[],
    ) => void;
  },
) {
  const { evNS = camelCaseToEnvVarName, initValues } = dieOptions ?? {};
  const asdo = axsd.axiomSerDeObject(props, dieOptions);

  type EnvVarValues = {
    [Property in keyof TPropAxioms]: {
      readonly envVarName: string;
      readonly envVarValue: string;
    };
  };
  const envVarDefns: axsd.SerDeAxiomDefns<TPropAxioms> = {} as Any;
  const envVarValues: EnvVarValues = {} as Any;
  type SerDeRecord = ax.AxiomType<typeof asdo>;
  const serDeAxiomRecord =
    (initValues ? initValues : asdo.prepareRecord()) as SerDeRecord;
  const envVarsSearched: {
    propName: keyof axsd.SerDeAxiomDefns<TPropAxioms>;
    envVarName: string;
    found: boolean;
    defaulted: boolean;
    defaultValue?: unknown;
    evDefn: axsd.IdentifiableAxiomSerDe<Any, string>;
  }[] = [];

  const attempt = (
    envVarName: string,
    evDefn: axsd.IdentifiableAxiomSerDe<Any, string>,
  ) => {
    const envVarValue = Deno.env.get(envVarName);
    const searched = {
      propName: evDefn.identity,
      envVarName,
      found: envVarValue != undefined ? true : false,
      defaulted: false,
      defaultValue: undefined,
      evDefn,
    };
    envVarsSearched.push(searched);
    if (envVarValue) {
      envVarValues[evDefn.identity as (keyof EnvVarValues)] = {
        envVarName,
        envVarValue,
      };
      serDeAxiomRecord[evDefn.identity as (keyof SerDeRecord)] = evDefn
        .fromText(envVarValue, { envVarValue });
    }
    return searched;
  };

  for (const evDefn of asdo.axiomProps) {
    const searched = attempt(evNS(evDefn.identity), evDefn);
    if (!searched.found) {
      let aliasFound = false;
      if (isAliasedAxiomSerDe(evDefn)) {
        for (const alias of evDefn.envVarNames) {
          const searchedAlias = attempt(alias, evDefn);
          if (searchedAlias.found) {
            aliasFound = true;
            break;
          }
        }
      }

      if (!aliasFound) {
        if (axsd.isDefaultableAxiomSerDe(evDefn)) {
          const dv = evDefn.defaultValue(undefined, {
            isAsync: true,
            ...dieOptions?.ctx,
          });
          serDeAxiomRecord[evDefn.identity as (keyof SerDeRecord)] = dv as Any;
          searched.defaulted = true;
          searched.defaultValue = dv as Any;
        }
      }
    }
    envVarDefns[evDefn.identity as (keyof TPropAxioms)] = evDefn;
  }

  return {
    ...asdo,
    envVarDefns,
    envVarValues,
    envVarsSearched,
    serDeAxiomRecord,
  };
}

/**
 * Given a record of Axiom definitions an a single env var name, find the value
 * of the env var, parse it as JSON, and assign the value to a type-safe record.
 * @param props the collection of axioms to find in the environment
 * @param omnibusEnvVarName the name of the env var to acquire
 * @param sdaOptions env var naming strategy, initial values, and other options
 * @returns AxiomsSerDeSupplier along with env vars observability
 */
export function deserializeFullRecordUsingOmnibusEnvVar<
  TPropAxioms extends Record<string, ax.Axiom<Any>>,
  Context,
>(
  props: TPropAxioms,
  omnibusEnvVarName: string,
  sdaOptions?: {
    readonly ctx?: Context;
    readonly initValues?: ax.Simplify<
      ax.AxiomObjectTypeStrict<TPropAxioms, unknown>
    >;
    readonly onPropertyNotSerDeAxiom?: (
      name: string,
      axiom: Any,
      iasd: axsd.IdentifiableAxiomSerDe<Any>[],
    ) => void;
  },
) {
  const omnibusEnvVarValue = Deno.env.get(omnibusEnvVarName);
  const asdo = axsd.axiomSerDeObject(props, sdaOptions);
  const djt = asdo.fromJsonText<Context>(
    omnibusEnvVarValue ?? "{}",
    sdaOptions,
  );

  return {
    ...djt,
    omnibusEnvVarName,
    omnibusEnvVarValue,
  };
}
