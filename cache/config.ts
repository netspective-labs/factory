import * as govn from "./governance.ts";
import * as conf from "../conf/mod.ts";

export class ProxyConfigStateEnvConfiguration
  extends conf.AsyncEnvConfiguration<
    govn.ProxyConfigurationState,
    never
  > {
  constructor(envVarNamesPrefix?: string, readonly isConfigured = false) {
    super(
      (ec) => ({
        properties: [
          ec.booleanProperty("isConfigured", [{ override: "configured" }]),
        ],
      }),
      (propName) => {
        const [name] = conf.propertyName(propName);
        return `${envVarNamesPrefix || ""}${conf.camelCaseToEnvVarName(name)}`;
      },
      // setting RF_ENVCONFIGEE_FSR_PROXY_VERBOSE=true will allow debugging
      conf.envConfigurationEventsConsoleEmitter(
        "RF_ENVCONFIGEE_FSR_PROXY_VERBOSE",
      ),
    );
  }

  constructSync(): govn.ProxyConfigurationState {
    return {
      isConfigured: this.isConfigured,
    };
  }
}

export function proxyEnvVarConfigState(
  proxyEnvVarName: string,
): govn.ProxyConfigurationState {
  const proxyConfig = new ProxyConfigStateEnvConfiguration(
    proxyEnvVarName,
  );
  return proxyConfig.configureSync();
}
