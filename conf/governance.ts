import * as safety from "../safety/mod.ts";

export interface ConfigurationSupplier<Configuration, Context> {
  readonly configure: (ctx?: Context) => Promise<Configuration>;
}

export interface ConfigurationSyncSupplier<Configuration, Context> {
  readonly configureSync: (ctx?: Context) => Configuration;
}

export interface NamespacedConfigurablePropertyName<Configuration> {
  readonly key: keyof Configuration;
  readonly namespace: string;
}

export interface UntypedConfigurablePropertyName {
  readonly override: string;
  readonly namespace?: string;
}

export type ConfigurablePropertyName<Configuration> =
  | keyof Configuration
  | NamespacedConfigurablePropertyName<Configuration>
  | UntypedConfigurablePropertyName;

export interface ConfigurablePropertyPopulate<Configuration, Value, Context> {
  readonly config: Configuration;
  readonly property: ConfigurableProperty<Configuration, Value, Context>;
  readonly propertyName: ConfigurablePropertyName<Configuration>;
  readonly ctx?: Context;
}

export interface ConfigurableProperty<Configuration, Value, Context> {
  readonly name: ConfigurablePropertyName<Configuration>;
  readonly isNameSensitive?: boolean;
  readonly isValueSecret?: boolean;
  readonly aliases?: ConfigurablePropertyName<Configuration>[];
  readonly valueGuard?: {
    readonly guard: safety.TypeGuard<Value>;
    readonly onGuardFailure: (supplied: unknown, exception?: Error) => Value;
  };
  readonly populateDefaultSync?: (
    cpp: ConfigurablePropertyPopulate<Configuration, Value, Context>,
  ) => Value;
  readonly populateDefault?: (
    cpp: ConfigurablePropertyPopulate<Configuration, Value, Context>,
  ) => Promise<Value>;
}

export type ConfigurableProperties<Configuration, Context> =
  ConfigurableProperty<
    Configuration,
    // deno-lint-ignore no-explicit-any
    any,
    Context
  >[];

export interface ConfigurablePropertiesSupplier<Configuration, Context> {
  readonly properties: ConfigurableProperties<Configuration, Context>;
}

export interface ErrorSupplier {
  (error: Error): void;
}

export interface DiagnosableConfigurationGuard<Configuration> {
  readonly isConfiguration: (o: unknown) => o is Configuration;
  readonly registerError: ErrorSupplier;
}

export interface DiagnosableConfiguration {
  readonly isValid: () => boolean;
  readonly diagnostics?: Error[];
}
