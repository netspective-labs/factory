import { colors, events, json5 } from "./deps.ts";
import * as safety from "../safety/mod.ts";
import * as govn from "./governance.ts";

export class EnvConfigurationEventsEmitter<Configuration, Context>
  extends events.EventEmitter<{
    searchEnvForProperty(
      handled: boolean,
      cevpp:
        | ConfigurableEnvVarPropertyPopulate<
          Configuration,
          // deno-lint-ignore no-explicit-any
          any,
          Context
        >
        | ConfigurableEnvVarPropertyPopulateAttempt<
          Configuration,
          // deno-lint-ignore no-explicit-any
          any,
          Context
        >,
      cpn: govn.ConfigurablePropertyName<Configuration>,
      value: unknown,
    ): void;
    searchEnvPropertyAttempts(
      attempts: ConfigurableEnvVarPropertyPopulateAttempt<
        Configuration,
        // deno-lint-ignore no-explicit-any
        any,
        Context
      >[],
      handled: boolean,
      defaulted: boolean,
      value: unknown,
    ): void;
    envPropertyNotHandled(
      attempts: ConfigurableEnvVarPropertyPopulateAttempt<
        Configuration,
        // deno-lint-ignore no-explicit-any
        any,
        Context
      >[],
      p: ConfigurableEnvVarProperty<Configuration, unknown, Context>,
      config: Configuration,
      ps: ConfigurableEnvVarPropertiesSupplier<Configuration, Context>,
      ctx?: Context,
    ): void;
  }> {
  public isVerbose = false;

  constructor(verboseArg: string | boolean) {
    super();
    if (typeof verboseArg === "string") {
      let verboseEnvVarValue = Deno.env.get(verboseArg);
      if (verboseEnvVarValue) {
        verboseEnvVarValue = verboseEnvVarValue.toLocaleUpperCase();
        if (
          ["YES", "1", "TRUE", "ON"].find((arg) => arg == verboseEnvVarValue)
        ) {
          this.isVerbose = true;
        }
      }
    } else {
      this.isVerbose = verboseArg;
    }
  }
}

export function envConfigurationEventsConsoleEmitter<
  Configuration,
  Context,
>(
  verboseArg: string | boolean,
): EnvConfigurationEventsEmitter<Configuration, Context> {
  const result = new EnvConfigurationEventsEmitter<Configuration, Context>(
    verboseArg,
  );
  if (result.isVerbose) {
    console.log(
      colors.brightBlue(
        `envConfigurationEventsConsoleEmitter: verbose ${
          colors.gray(
            `(${verboseArg} EnvConfigurationEventsEmitter)`,
          )
        }`,
      ),
    );
  }
  result.on(
    "searchEnvPropertyAttempts",
    (attempts, handled, defaulted, value) => {
      if (result.isVerbose) {
        if (attempts && attempts.length > 0) {
          const terminal = attempts[attempts.length - 1];
          const property = terminal.property;
          const [name, namespace] = propertyName(property.name);
          const envVarValue = property.isValueSecret
            ? "******"
            : JSON.stringify(terminal.envVarValue);
          const typedValue = `${
            property.isValueSecret ? "******" : JSON.stringify(value)
          }, type: ${typeof value}, isValueSecret: ${
            property
              .isValueSecret || "no"
          }`;
          console.info(colors.brightBlue(
            `Searched environment for property '${name}' ${
              namespace ? `(namespace '${namespace || ""}') ` : ""
            }in ${attempts.map((a) => a.envVarName).join(", ")} [${
              handled
                ? colors.brightGreen(
                  `found envVarName: ${terminal.envVarName}, envVarValue: ${envVarValue}, value: ${typedValue}`,
                )
                : colors.brightMagenta(
                  defaulted
                    ? `not found, defaulted to value: ${typedValue}`
                    : `not found, no default`,
                )
            }]`,
          ));
        }
      }
    },
  );

  result.on(
    "envPropertyNotHandled",
    (attempts, property, _ps, _config, _ctx) => {
      if (result.isVerbose) {
        const [name, namespace] = propertyName(property.name);
        console.info(
          colors.brightBlue(
            `Property name ${name}${
              namespace
                ? `(namespace: '${
                  namespace ||
                  ""
                })`
                : ""
            } was not handled (attempt(s): ${attempts.length}, ${
              attempts.map((a) => a.envVarName).join(", ")
            })`,
          ),
        );
      }
    },
  );
  return result;
}

export interface ConfigurableEnvVarPropertyPopulate<
  Configuration,
  Value,
  Context,
> extends govn.ConfigurablePropertyPopulate<Configuration, Value, Context> {
  readonly property: ConfigurableEnvVarProperty<Configuration, Value, Context>;
  readonly envVarName: string;
  readonly envVarValue: string;
  readonly ps: ConfigurableEnvVarPropertiesSupplier<Configuration, Context>;
}

export type ConfigurableEnvVarPropertyPopulateAttempt<
  Configuration,
  Value,
  Context,
> =
  & Omit<
    ConfigurableEnvVarPropertyPopulate<Configuration, Value, Context>,
    "envVarValue"
  >
  & Partial<
    Pick<
      ConfigurableEnvVarPropertyPopulate<Configuration, Value, Context>,
      "envVarValue"
    >
  >;

export interface ConfigurableEnvVarProperty<Configuration, Value, Context>
  extends govn.ConfigurableProperty<Configuration, Value, Context> {
  readonly isRequired?: boolean;
  readonly populateEnvVarValueSync: (
    cevpp: ConfigurableEnvVarPropertyPopulate<Configuration, Value, Context>,
  ) => Value;
  readonly populateEnvVarValue?: (
    cevpp: ConfigurableEnvVarPropertyPopulate<Configuration, Value, Context>,
  ) => Promise<Value>;
}

export type ConfigurableEnvVarProperties<Configuration, Context> =
  ConfigurableEnvVarProperty<
    Configuration,
    // deno-lint-ignore no-explicit-any
    any,
    Context
  >[];

export interface ConfigurableEnvVarPropertiesSupplier<Configuration, Context>
  extends govn.ConfigurablePropertiesSupplier<Configuration, Context> {
  readonly properties: ConfigurableEnvVarProperties<Configuration, Context>;
  readonly configGuard?: {
    readonly guard: safety.TypeGuard<Configuration>;
    readonly onGuardFailureSync: (
      supplied: Configuration,
    ) => Configuration;
    readonly onGuardFailure?: (
      supplied: Configuration,
    ) => Promise<Configuration>;
  };
}

export interface ConfigurablePropEnvVarNameStrategy<Configuration, Context> {
  (
    name: govn.ConfigurablePropertyName<Configuration>,
    // deno-lint-ignore no-explicit-any
    property: ConfigurableEnvVarProperty<Configuration, any, Context>,
    config: Configuration,
    ctx?: Context,
  ): string;
}

export interface ConfigurablePropEnvVarNameStrategySupplier<
  Configuration,
  Context,
> {
  readonly envVarName: ConfigurablePropEnvVarNameStrategy<
    Configuration,
    Context
  >;
}

export function isConfigurablePropEnvVarNameStrategySupplier<
  Configuration,
  Context,
>(
  o: unknown,
): o is ConfigurablePropEnvVarNameStrategySupplier<Configuration, Context> {
  const isType = safety.typeGuard<
    ConfigurablePropEnvVarNameStrategySupplier<
      Configuration,
      Context
    >
  >("envVarName");
  return isType(o);
}

export const freeTextToEnvVarName = (text: string) =>
  // change whitespace/dashes/dots to underscores, remove anything not alphanumeric or underscore
  text.replace(/[-\.\s]+/g, "_").replace(/[^\w]+/g, "").toLocaleUpperCase();

export const camelCaseToEnvVarName = (text: string) =>
  // find one or more uppercase characters and separate with _
  text.replace(/[A-Z]+/g, (match: string) => `_${match}`)
    .toLocaleUpperCase();

export function propertyName<Configuration>(
  cpn: govn.ConfigurablePropertyName<Configuration>,
): [name: string, namespace: string | undefined] {
  let name: string;
  let namespace: string | undefined = undefined;
  if (typeof cpn === "object") {
    if ("override" in cpn) {
      name = cpn.override;
    } else {
      name = String(cpn.key);
    }
    if ("namespace" in cpn) {
      namespace = cpn.namespace;
    }
  } else {
    name = String(cpn);
  }
  return [name, namespace];
}

/**
 * Environment variable name strategy which upper snake-cases property name
 * @returns NAMESPACE_NAME or PREFIX_NAME if no namespace, with camel case conversion
 */
export function namespacedEnvVarNameUppercase<
  Configuration,
  Context,
>(
  defaultPrefix = "",
): ConfigurablePropEnvVarNameStrategy<Configuration, Context> {
  return (propName) => {
    const [name, namespace] = propertyName(propName);
    return `${
      namespace ? `${camelCaseToEnvVarName(namespace)}_` : defaultPrefix
    }${camelCaseToEnvVarName(name)}`;
  };
}

export abstract class EnvConfiguration<Configuration, Context = never>
  implements govn.ConfigurationSyncSupplier<Configuration, Context> {
  readonly ps: ConfigurableEnvVarPropertiesSupplier<
    Configuration,
    Context
  >;
  constructor(
    properties: (
      ec: EnvConfiguration<Configuration, Context>,
    ) => ConfigurableEnvVarPropertiesSupplier<Configuration, Context>,
    readonly envVarName = namespacedEnvVarNameUppercase<
      Configuration,
      Context
    >(),
    readonly ecee?: EnvConfigurationEventsEmitter<Configuration, Context>,
  ) {
    this.ps = properties(this);
  }

  abstract constructSync(ctx?: Context): Configuration;

  unhandledPropertySync(
    attempts: ConfigurableEnvVarPropertyPopulateAttempt<
      Configuration,
      // deno-lint-ignore no-explicit-any
      any,
      Context
    >[],
    p: ConfigurableEnvVarProperty<Configuration, unknown, Context>,
    _config: Configuration,
    _ctx?: Context,
  ): unknown {
    const [name] = propertyName(p.name);
    if (p.isRequired) {
      throw Error(
        `Property ${name} is required but no handler or default supplied. Searched: ${
          attempts.map((a) => a.envVarName).join(", ")
        }`,
      );
    }
    return undefined;
  }

  textProperty(
    name: govn.ConfigurablePropertyName<Configuration>,
    aliases?: govn.ConfigurablePropertyName<Configuration>[],
    populate?: (
      cevpp: ConfigurableEnvVarPropertyPopulate<Configuration, string, Context>,
    ) => string,
  ): ConfigurableEnvVarProperty<Configuration, string, Context> {
    return {
      name,
      aliases,
      populateEnvVarValueSync: populate ||
        (({ envVarValue, config }) => {
          const [mutate] = propertyName(name);
          // deno-lint-ignore no-explicit-any
          (config as any)[mutate] = envVarValue;
          return envVarValue;
        }),
    };
  }

  requiredTextProperty(
    name: govn.ConfigurablePropertyName<Configuration>,
    aliases?: govn.ConfigurablePropertyName<Configuration>[],
    populate?: (
      cevpp: ConfigurableEnvVarPropertyPopulate<Configuration, string, Context>,
    ) => string,
  ): ConfigurableEnvVarProperty<Configuration, string, Context> {
    return { ...this.textProperty(name, aliases, populate), isRequired: true };
  }

  booleanProperty(
    name: govn.ConfigurablePropertyName<Configuration>,
    aliases?: govn.ConfigurablePropertyName<Configuration>[],
    populate?: (
      cevpp: ConfigurableEnvVarPropertyPopulate<
        Configuration,
        boolean,
        Context
      >,
    ) => boolean,
  ): ConfigurableEnvVarProperty<Configuration, boolean, Context> {
    return {
      name,
      aliases,
      populateEnvVarValueSync: populate ||
        (({ envVarValue, config }) => {
          const [mutate] = propertyName(name);
          const flagText = envVarValue.toLocaleUpperCase();
          const flag = (envVarValue &&
              (["YES", "1", "TRUE", "ON"].find((v) => flagText == v))
            ? true
            : false);
          // deno-lint-ignore no-explicit-any
          (config as any)[mutate] = flag;
          return flag;
        }),
    };
  }

  requiredBooleanProperty(
    name: govn.ConfigurablePropertyName<Configuration>,
    aliases?: govn.ConfigurablePropertyName<Configuration>[],
    populate?: (
      cevpp: ConfigurableEnvVarPropertyPopulate<
        Configuration,
        boolean,
        Context
      >,
    ) => boolean,
  ): ConfigurableEnvVarProperty<Configuration, boolean, Context> {
    return {
      ...this.booleanProperty(name, aliases, populate),
      isRequired: true,
    };
  }

  numericProperty(
    name: govn.ConfigurablePropertyName<Configuration>,
    aliases?: govn.ConfigurablePropertyName<Configuration>[],
    onGuardFailure?: (o: unknown) => number,
    populate?: (
      cevpp: ConfigurableEnvVarPropertyPopulate<Configuration, number, Context>,
    ) => number,
  ): ConfigurableEnvVarProperty<Configuration, number, Context> {
    const valueGuard = {
      guard: (o: unknown): o is number => {
        if (typeof o === "number") return true;
        return false;
      },
      onGuardFailure: onGuardFailure || ((_: unknown) => NaN),
    };
    return {
      name,
      aliases,
      populateEnvVarValueSync: populate ||
        (({ envVarValue, config }) => {
          const [mutate] = propertyName(name);
          const value = parseFloat(envVarValue);
          if (valueGuard.guard(value)) {
            // deno-lint-ignore no-explicit-any
            (config as any)[mutate] = value;
            return value;
          }
          const onFailedValue = valueGuard.onGuardFailure(envVarValue);
          // deno-lint-ignore no-explicit-any
          (config as any)[mutate] = onFailedValue;
          return onFailedValue;
        }),
      valueGuard,
    };
  }

  requiredNumericProperty(
    name: govn.ConfigurablePropertyName<Configuration>,
    aliases?: govn.ConfigurablePropertyName<Configuration>[],
    onGuardFailure?: (o: unknown) => number,
    populate?: (
      cevpp: ConfigurableEnvVarPropertyPopulate<Configuration, number, Context>,
    ) => number,
  ): ConfigurableEnvVarProperty<Configuration, number, Context> {
    return {
      ...this.numericProperty(name, aliases, onGuardFailure, populate),
      isRequired: true,
    };
  }

  jsonTextProperty<Type>(
    name: govn.ConfigurablePropertyName<Configuration>,
    guard: safety.TypeGuard<Type>,
    onGuardFailure: (o: unknown, err?: Error) => Type | undefined,
    aliases?: govn.ConfigurablePropertyName<Configuration>[],
    populate?: (
      cevpp: ConfigurableEnvVarPropertyPopulate<
        Configuration,
        Type | undefined,
        Context
      >,
    ) => Type | undefined,
  ): ConfigurableEnvVarProperty<Configuration, Type | undefined, Context> {
    const valueGuard = {
      guard,
      onGuardFailure: onGuardFailure || ((_: unknown) => undefined),
    };
    return {
      name,
      aliases,
      populateEnvVarValueSync: populate ||
        (({ envVarValue, config }) => {
          const [mutate] = propertyName(name);
          try {
            const value = json5.default.parse(envVarValue);
            if (guard(value)) {
              // deno-lint-ignore no-explicit-any
              (config as any)[mutate] = value;
              return value;
            }
            const onFailedValue = valueGuard.onGuardFailure(envVarValue);
            // deno-lint-ignore no-explicit-any
            (config as any)[mutate] = onFailedValue;
            return onFailedValue;
          } catch (err) {
            const onFailedValue = valueGuard.onGuardFailure(envVarValue, err);
            // deno-lint-ignore no-explicit-any
            (config as any)[mutate] = onFailedValue;
            return onFailedValue;
          }
        }),
      valueGuard,
    };
  }

  requiredJsonTextProperty<Type>(
    name: govn.ConfigurablePropertyName<Configuration>,
    guard: safety.TypeGuard<Type>,
    onGuardFailure: (o: unknown, err?: Error) => Type | undefined,
    aliases?: govn.ConfigurablePropertyName<Configuration>[],
    populate?: (
      cevpp: ConfigurableEnvVarPropertyPopulate<
        Configuration,
        Type | undefined,
        Context
      >,
    ) => Type | undefined,
  ): ConfigurableEnvVarProperty<Configuration, Type | undefined, Context> {
    return {
      ...this.jsonTextProperty(name, guard, onGuardFailure, aliases, populate),
      isRequired: true,
    };
  }

  configureSync(ctx?: Context): Configuration {
    let config = this.constructSync(ctx);
    for (const property of this.ps.properties) {
      const tryNames = property.aliases
        ? [property.name, ...property.aliases]
        : [property.name];
      let handled = false;
      let defaulted = false;
      let value: unknown | undefined;
      const attempts = [];
      const envVarNameSupplier =
        isConfigurablePropEnvVarNameStrategySupplier<Configuration, Context>(
            ctx,
          )
          ? ctx.envVarName
          : this.envVarName;
      for (const tryName of tryNames) {
        const envVarName = envVarNameSupplier(tryName, property, config, ctx);
        const envVarValue = Deno.env.get(envVarName);
        const attempt: ConfigurableEnvVarPropertyPopulateAttempt<
          Configuration,
          // deno-lint-ignore no-explicit-any
          any,
          Context
        > = {
          property,
          propertyName: tryName,
          envVarName,
          config,
          ctx,
          ps: this.ps,
        };
        attempts.push(attempt);
        if (envVarValue) {
          value = property.populateEnvVarValueSync({ ...attempt, envVarValue });
          handled = true;
          // forceably inject envVarValue so event emitters properly emit value
          // deno-lint-ignore no-explicit-any
          (attempt as any).envVarValue = envVarValue;
        }
        if (this.ecee) {
          this.ecee.emitSync(
            "searchEnvForProperty",
            handled,
            attempt,
            tryName,
            value,
          );
        }
        if (handled) break;
      }
      if (!handled) {
        if (property.populateDefaultSync) {
          value = property.populateDefaultSync({
            config,
            property,
            propertyName: property.name,
            ctx,
          });
          defaulted = true;
        } else {
          if (this.ecee) {
            this.ecee.emitSync(
              "envPropertyNotHandled",
              attempts,
              property,
              config,
              this.ps,
              ctx,
            );
          }
          this.unhandledPropertySync(attempts, property, config, ctx);
        }
      }
      if (this.ecee) {
        this.ecee.emitSync(
          "searchEnvPropertyAttempts",
          attempts,
          handled,
          defaulted,
          value,
        );
      }
    }
    if (this.ps.configGuard) {
      if (!this.ps.configGuard.guard(config)) {
        config = this.ps.configGuard.onGuardFailureSync(config);
      }
    }
    return config;
  }
}

export abstract class AsyncEnvConfiguration<Configuration, Context = never>
  extends EnvConfiguration<Configuration, Context>
  implements govn.ConfigurationSupplier<Configuration, Context> {
  // deno-lint-ignore require-await
  async construct(ctx?: Context): Promise<Configuration> {
    return this.constructSync(ctx);
  }

  // deno-lint-ignore require-await
  async unhandledProperty(
    attempts: ConfigurableEnvVarPropertyPopulateAttempt<
      Configuration,
      // deno-lint-ignore no-explicit-any
      any,
      Context
    >[],
    p: ConfigurableEnvVarProperty<Configuration, unknown, Context>,
    config: Configuration,
    ctx?: Context,
  ): Promise<unknown> {
    return this.unhandledPropertySync(attempts, p, config, ctx);
  }

  async configure(ctx?: Context): Promise<Configuration> {
    let config: Configuration = await this.construct(ctx);
    for (const property of this.ps.properties) {
      const tryNames = property.aliases
        ? [property.name, ...property.aliases]
        : [property.name];
      let handled = false;
      let defaulted = false;
      let value: unknown | undefined;
      const attempts = [];
      const envVarNameSupplier =
        isConfigurablePropEnvVarNameStrategySupplier<Configuration, Context>(
            ctx,
          )
          ? ctx.envVarName
          : this.envVarName;
      for (const tryName of tryNames) {
        const envVarName = envVarNameSupplier(tryName, property, config, ctx);
        const envVarValue = Deno.env.get(envVarName);
        const attempt: ConfigurableEnvVarPropertyPopulateAttempt<
          Configuration,
          // deno-lint-ignore no-explicit-any
          any,
          Context
        > = {
          config,
          property,
          propertyName: tryName,
          envVarName,
          ctx,
          ps: this.ps,
        };
        attempts.push(attempt);
        if (envVarValue) {
          if (property.populateEnvVarValue) {
            value = await property.populateEnvVarValue({
              ...attempt,
              envVarValue,
            });
          } else {
            value = property.populateEnvVarValueSync({
              ...attempt,
              envVarValue,
            });
          }
          handled = true;
          // forceably inject envVarValue so event emitters properly emit value
          // deno-lint-ignore no-explicit-any
          (attempt as any).envVarValue = envVarValue;
        }
        if (this.ecee) {
          await this.ecee.emit(
            "searchEnvForProperty",
            handled,
            attempt,
            tryName,
            value,
          );
        }
        if (handled) break;
      }
      if (!handled) {
        if (property.populateDefault) {
          value = await property.populateDefault({
            config,
            property,
            propertyName: property.name,
            ctx,
          });
          defaulted = true;
        } else if (property.populateDefaultSync) {
          value = property.populateDefaultSync({
            config,
            property,
            propertyName: property.name,
            ctx,
          });
          defaulted = true;
        } else {
          if (this.ecee) {
            await this.ecee.emit(
              "envPropertyNotHandled",
              attempts,
              property,
              config,
              this.ps,
              ctx,
            );
          }
          await this.unhandledProperty(attempts, property, config, ctx);
        }
      }
      if (this.ecee) {
        await this.ecee.emit(
          "searchEnvPropertyAttempts",
          attempts,
          handled,
          defaulted,
          value,
        );
      }
    }
    if (this.ps.configGuard) {
      if (!this.ps.configGuard.guard(config)) {
        if (this.ps.configGuard.onGuardFailure) {
          config = await this.ps.configGuard.onGuardFailure(config);
        } else {
          config = this.ps.configGuard.onGuardFailureSync(config);
        }
      }
    }
    return config;
  }
}

export class TypicalEnvArgumentsConfiguration<Configuration>
  extends AsyncEnvConfiguration<Configuration, never> {
  constructor(
    readonly base: () => Configuration,
    properties: (
      ec: EnvConfiguration<Configuration, never>,
    ) => ConfigurableEnvVarPropertiesSupplier<Configuration, never>,
    envVarNamesPrefix?: string,
    consoleEmitterVerboseEnvVarName = "RF_ENVCONFIGEE_TYPICAL_VERBOSE",
  ) {
    super(
      properties,
      (propName) => {
        const [name] = propertyName(propName);
        return `${envVarNamesPrefix || ""}${camelCaseToEnvVarName(name)}`;
      },
      // setting RF_ENVCONFIGEE_TYPICAL_VERBOSE=true will allow debugging
      envConfigurationEventsConsoleEmitter(consoleEmitterVerboseEnvVarName),
    );
  }

  constructSync(): Configuration {
    return this.base();
  }
}

export interface OmnibusEnvJsonArgConfigurationPopulateAttempt<Context> {
  readonly envVarName: string;
  readonly envVarValue?: string;
  readonly guardFailure: boolean;
  readonly ctx?: Context;
}

export class OmnibusEnvJsonArgConfigurationEventsEmitter<Configuration, Context>
  extends events.EventEmitter<{
    searchEnvAttempts(
      attempts: OmnibusEnvJsonArgConfigurationPopulateAttempt<Context>[],
      value: unknown,
    ): void;
    envVarNotHandled(
      attempts: OmnibusEnvJsonArgConfigurationPopulateAttempt<Context>[],
      result: Configuration,
      ctx?: Context,
    ): void;
  }> {
  public isVerbose = false;

  constructor(verboseArg: string | boolean) {
    super();
    if (typeof verboseArg === "string") {
      let verboseEnvVarValue = Deno.env.get(verboseArg);
      if (verboseEnvVarValue) {
        verboseEnvVarValue = verboseEnvVarValue.toLocaleUpperCase();
        if (
          ["YES", "1", "TRUE", "ON"].find((arg) => arg == verboseEnvVarValue)
        ) {
          this.isVerbose = true;
        }
      }
    } else {
      this.isVerbose = verboseArg;
    }
  }
}

export function omnibusEnvJsonArgConfigurationEventsConsoleEmitter<
  Configuration,
  Context,
>(
  verboseArg: string | boolean,
): OmnibusEnvJsonArgConfigurationEventsEmitter<Configuration, Context> {
  const result = new OmnibusEnvJsonArgConfigurationEventsEmitter(
    verboseArg,
  );
  result.on(
    "searchEnvAttempts",
    (attempts, value) => {
      if (result.isVerbose) {
        if (attempts && attempts.length > 0) {
          const terminal = attempts[attempts.length - 1];
          console.info(
            colors.brightBlue(
              `Searched environment for omnibus JSON configuration in ${
                attempts.map((a) => a.envVarName).join(", ")
              } [${
                value
                  ? colors.brightGreen(
                    `found envVarName: ${terminal.envVarName}, type ${typeof value}, guard passed: ${!terminal
                      .guardFailure}`,
                  )
                  : colors.brightMagenta(`not found, using factory`)
              }]`,
            ),
          );
        }
      }
    },
  );

  result.on(
    "envVarNotHandled",
    (attempts) => {
      if (result.isVerbose) {
        console.info(
          // deno-fmt-ignore
          `Omnibus JSON env text was not handled (attempt(s): ${attempts.length}, ${attempts.map(a => a.envVarName).join(', ')})`,
        );
      }
    },
  );

  return result;
}

export class OmnibusEnvJsonArgConfiguration<Configuration, Context>
  implements
    govn.ConfigurationSyncSupplier<Configuration, Context>,
    govn.ConfigurationSupplier<Configuration, Context> {
  constructor(
    readonly envVarName: string | string[],
    readonly factory: (ctx?: Context) => Configuration,
    readonly guard: safety.TypeGuard<Configuration>,
    readonly onGuardFailure: (
      o: unknown,
      err?: Error,
    ) => Configuration,
    readonly ecee: OmnibusEnvJsonArgConfigurationEventsEmitter<
      Configuration,
      Context
    > = omnibusEnvJsonArgConfigurationEventsConsoleEmitter(
      "RF_ENVCONFIGEE_OMNIBUS_JSON_VERBOSE",
    ),
  ) {
  }

  // deno-lint-ignore require-await
  async configure(ctx?: Context): Promise<Configuration> {
    return this.configureSync(ctx);
  }

  configureSync(ctx?: Context): Configuration {
    const envVarNames = typeof this.envVarName === "string"
      ? [this.envVarName]
      : this.envVarName;
    const attempts: OmnibusEnvJsonArgConfigurationPopulateAttempt<Context>[] =
      [];
    let result: Configuration | undefined;
    let guardFailure = false;
    for (const envVarName of envVarNames) {
      const envVarValue = Deno.env.get(envVarName);
      if (envVarValue) {
        const jsonValue = json5.default.parse(envVarValue);
        if (this.guard(jsonValue)) {
          result = jsonValue;
        } else {
          result = this.onGuardFailure(jsonValue);
          guardFailure = true;
        }
      }
      const attempt = {
        envVarName: envVarName,
        envVarValue,
        guardFailure,
        ctx,
      };
      attempts.push(attempt);
      if (envVarValue && result) break;
    }
    if (this.ecee) {
      this.ecee.emitSync("searchEnvAttempts", attempts, result);
    }
    if (!result) {
      result = this.factory();
      if (this.ecee) {
        this.ecee.emitSync("envVarNotHandled", attempts, result, ctx);
      }
    }
    return result;
  }
}
