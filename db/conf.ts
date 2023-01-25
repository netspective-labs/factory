import { pg } from "./deps.ts";
import * as conf from "../conf/mod.ts";

export interface DatabaseConnectionArguments
  extends pg.ClientOptions, conf.DiagnosableConfiguration {
  readonly identity: string;
  readonly dbConnPoolCount: number;
}

export function envConfiguredDatabaseConnection(
  origin: string,
  envVarNamesPrefix?: string,
  decorate?: (
    suggested: DatabaseConnectionArguments,
    origin: string,
    envVarNamesPrefix?: string,
  ) => DatabaseConnectionArguments,
): DatabaseConnectionArguments {
  const dbccc = databaseConnectionConfigContext(origin, envVarNamesPrefix);
  const result = typicalCachedDbConnEnvConfig.configureSync(dbccc);
  return decorate ? decorate(result, origin, envVarNamesPrefix) : result;
}

export interface DatabaseConnectionConfigContext
  extends
    conf.CacheableConfiguration,
    conf.DiagnosableConfigurationGuard<DatabaseConnectionArguments>,
    conf.ConfigurablePropEnvVarNameStrategySupplier<
      DatabaseConnectionArguments,
      DatabaseConnectionConfigContext
    > {
  readonly construct: () => DatabaseConnectionArguments;
  readonly dbcArguments: () => DatabaseConnectionArguments;
  readonly origin: string;
}

export function databaseConnectionConfigContext(
  origin: string,
  envVarNamesPrefix?: string,
): DatabaseConnectionConfigContext {
  let valid = true;
  const diagnostics: Error[] = [];
  const registerError: (error: Error) => void = (error) => {
    valid = false;
    diagnostics.push(error);
  };
  const dbcArguments: DatabaseConnectionArguments = {
    identity: origin,
    dbConnPoolCount: 1,
    isValid: () => valid,
    diagnostics,
  };
  return {
    origin,
    configCacheKey: `${origin}${
      envVarNamesPrefix ? `[${envVarNamesPrefix}]` : ""
    }`,
    construct: () => dbcArguments,
    dbcArguments: () => dbcArguments,
    isConfiguration: (_o): _o is DatabaseConnectionArguments => valid,
    envVarName: conf.namespacedEnvVarNameUppercase(envVarNamesPrefix),
    registerError,
  };
}

function databaseConnConfigProperties(
  ec: conf.EnvConfiguration<
    DatabaseConnectionArguments,
    DatabaseConnectionConfigContext
  >,
): conf.ConfigurableEnvVarPropertiesSupplier<
  DatabaseConnectionArguments,
  DatabaseConnectionConfigContext
> {
  return {
    properties: [
      // keep aliases lowercase for conf.EnvConfiguration snake case converter
      // (xyAbc becomes XY_ABC so XYABC would become X_Y_A_B_C)
      ec.textProperty("identity", ["applicationName", {
        override: "pgappname",
      }]),
      ec.textProperty("applicationName", [{ override: "pgappname" }]),
      ec.requiredTextProperty("database", [{ override: "pgdatabase" }]),
      ec.requiredTextProperty("hostname", [{ override: "pghost" }, {
        override: "pghostaddr",
      }]),
      ec.requiredNumericProperty("port", [{ override: "pgport" }]),
      ec.requiredTextProperty("user", [{ override: "pguser" }]),
      {
        ...ec.requiredTextProperty("password", [{ override: "pgpassword" }]),
        isValueSecret: true,
      },
      ec.numericProperty("dbConnPoolCount", [{ override: "pgconnpool_count" }]),
    ],
  };
}

export class DatabaseConnectionEnvConfiguration
  extends conf.AsyncEnvConfiguration<
    DatabaseConnectionArguments,
    DatabaseConnectionConfigContext
  > {
  constructor(envVarNamesPrefix?: string) {
    super(
      databaseConnConfigProperties,
      conf.namespacedEnvVarNameUppercase(envVarNamesPrefix),
      // setting RF_ENVCONFIGEE_DB_CONN_VERBOSE=true will allow debugging
      conf.envConfigurationEventsConsoleEmitter(
        "RF_ENVCONFIGEE_DB_CONN_VERBOSE",
      ),
    );
  }

  assertContext(
    ctx?: DatabaseConnectionConfigContext,
  ): ctx is DatabaseConnectionConfigContext {
    return ctx ? true : false;
  }

  constructSync(
    ctx?: DatabaseConnectionConfigContext,
  ): DatabaseConnectionArguments {
    return ctx ? ctx.construct() : {
      identity: "_unknown",
      dbConnPoolCount: 1,
      isValid: () => true,
    };
  }

  unhandledPropertySync(
    attempts: conf.ConfigurableEnvVarPropertyPopulateAttempt<
      DatabaseConnectionArguments,
      // deno-lint-ignore no-explicit-any
      any,
      DatabaseConnectionConfigContext
    >[],
    property: conf.ConfigurableEnvVarProperty<
      DatabaseConnectionArguments,
      // deno-lint-ignore no-explicit-any
      any,
      DatabaseConnectionConfigContext
    >,
    _config: DatabaseConnectionArguments,
    ctx?: DatabaseConnectionConfigContext,
  ): unknown {
    if (!property.isRequired) return;
    let registerError: conf.ErrorSupplier;
    if (!this.assertContext(ctx)) {
      console.error(
        "DatabaseConnectionConfiguration expects DatabaseConnectionConfigContext",
      );
      registerError = (issue) => console.error(issue);
    } else {
      registerError = ctx.registerError;
    }
    const [name] = conf.propertyName(property.name);
    registerError(
      Error(
        `Required property ${name} was not supplied in Environment, expected: ${
          attempts.map((a) => a.envVarName).join(" or ")
        })`,
      ),
    );
    return undefined;
  }
}

export const typicalUncachedDbConnEnvConfig =
  new DatabaseConnectionEnvConfiguration();

export const typicalCachedDbConnEnvConfig = new conf
  .CacheableConfigurationSupplier(
  "DatabaseConnectionEnvConfiguration",
  typicalUncachedDbConnEnvConfig,
);
