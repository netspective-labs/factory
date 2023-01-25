import { fs, path } from "./deps.ts";
import * as govn from "./governance.ts";
import * as conf from "../conf/mod.ts";

export interface FileSysResourceAgeProxyArguments {
  readonly maxAgeInMS: number;
}

export class FileSysResourceAgeProxyEnvArgumentsConfiguration
  extends conf.AsyncEnvConfiguration<FileSysResourceAgeProxyArguments, never> {
  static readonly ageOneSecondMS = 1000;
  static readonly ageOneMinuteMS = this.ageOneSecondMS * 60;
  static readonly ageOneHourMS = this.ageOneMinuteMS * 60;
  static readonly ageOneDayMS = this.ageOneHourMS * 24;

  constructor(
    envVarNamesPrefix?: string,
    readonly maxAgeInMS =
      FileSysResourceAgeProxyEnvArgumentsConfiguration.ageOneHourMS,
  ) {
    super(
      (ec) => ({
        properties: [
          ec.numericProperty("maxAgeInMS"),
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

  constructSync(): FileSysResourceAgeProxyArguments {
    return {
      maxAgeInMS: this.maxAgeInMS,
    };
  }
}

export const fileSysResourceNeverProxyStrategy: govn.FileSysModelProxyStrategy =
  // deno-lint-ignore require-await
  async (proxyFilePathAndName) => {
    return {
      proxyFilePathAndName,
      isConstructFromOrigin: true,
      proxyRemarks: `fileSysResourceNeverProxyStrategy always ignores proxies`,
    };
  };

export function fileSysModelAgeProxyStrategy(
  maxAgeInMS: number,
): govn.FileSysModelProxyStrategy {
  return async (proxyFilePathAndName) => {
    const relFilePath = path.isAbsolute(proxyFilePathAndName)
      ? path.relative(Deno.cwd(), proxyFilePathAndName)
      : proxyFilePathAndName;
    if (maxAgeInMS == 0) {
      return {
        proxyFilePathAndName,
        isConstructFromOrigin: true,
        proxyRemarks:
          `cache is disabled since maxAgeInMS is 0 [fileSysResourceAgeProxyStrategy]`,
      };
    }
    if (fs.existsSync(proxyFilePathAndName)) {
      const proxyFileInfo = await Deno.stat(proxyFilePathAndName);
      if (proxyFileInfo && proxyFileInfo.mtime) {
        const proxyAgeMS = Date.now() - proxyFileInfo.mtime.valueOf();
        if (proxyAgeMS > maxAgeInMS) {
          return {
            proxyFilePathAndName,
            isConstructFromOrigin: true,
            proxyFileInfo,
            proxyRemarks:
              `${relFilePath} age (${proxyAgeMS} ms) is older than max age (${maxAgeInMS} ms) [fileSysResourceAgeProxyStrategy]`,
          };
        }
        return {
          proxyFilePathAndName,
          isConstructFromOrigin: false,
          proxyFileInfo,
          proxyRemarks:
            `${relFilePath} age (${proxyAgeMS} ms) is less than max age (${maxAgeInMS} ms) [fileSysResourceAgeProxyStrategy]`,
        };
      } else {
        return {
          proxyFilePathAndName,
          isConstructFromOrigin: true,
          proxyRemarks:
            // deno-fmt-ignore
            `${relFilePath} proxyFileInfo.mtime was not successful: proxyFileInfo = ${JSON.stringify(proxyFileInfo)} [fileSysResourceAgeProxyStrategy]`,
        };
      }
    } else {
      return {
        proxyFilePathAndName,
        isConstructFromOrigin: true,
        proxyRemarks:
          `${relFilePath} does not exist [fileSysResourceAgeProxyStrategy]`,
      };
    }
  };
}

export function modelProxyEnvVarAgeStrategy(
  proxyEnvVarName: string,
  proxyDefaultAgeMS =
    FileSysResourceAgeProxyEnvArgumentsConfiguration.ageOneHourMS,
): govn.FileSysModelProxyStrategy {
  const proxyConfig = new FileSysResourceAgeProxyEnvArgumentsConfiguration(
    proxyEnvVarName,
    proxyDefaultAgeMS,
  );
  return fileSysModelAgeProxyStrategy(
    proxyConfig.configureSync().maxAgeInMS,
  );
}

export const fileSysDirectoryNeverProxyStrategy:
  govn.FileSysDirectoryProxyStrategy =
  // deno-lint-ignore require-await
  async (proxyPath) => {
    return {
      proxyPath,
      isConstructFromOrigin: true,
      proxyRemarks: `fileSysDirectoryNeverProxyStrategy always ignores proxies`,
    };
  };

export function fileSysDirectoryAgeProxyStrategy(
  maxAgeInMS: number,
): govn.FileSysDirectoryProxyStrategy {
  return async (proxyPath) => {
    const relPath = path.isAbsolute(proxyPath)
      ? path.relative(Deno.cwd(), proxyPath)
      : proxyPath;
    if (fs.existsSync(proxyPath)) {
      const proxyPathInfo = await Deno.stat(proxyPath);
      if (proxyPathInfo && proxyPathInfo.mtime) {
        const proxyAgeMS = Date.now() - proxyPathInfo.mtime.valueOf();
        if (proxyAgeMS > maxAgeInMS) {
          return {
            proxyPath,
            isConstructFromOrigin: true,
            proxyPathInfo,
            proxyRemarks:
              `${relPath} age (${proxyAgeMS} ms) is older than max age (${maxAgeInMS} ms)`,
          };
        }
        return {
          proxyPath,
          isConstructFromOrigin: false,
          proxyPathInfo,
          proxyRemarks:
            `${relPath} age (${proxyAgeMS} ms) is less than max age (${maxAgeInMS} ms)`,
        };
      } else {
        return {
          proxyPath,
          isConstructFromOrigin: true,
          proxyRemarks:
            // deno-fmt-ignore
            `${relPath} proxyPathInfo.mtime was not successful: proxyFileInfo = ${JSON.stringify(proxyPathInfo)}`,
        };
      }
    } else {
      return {
        proxyPath,
        isConstructFromOrigin: true,
        proxyRemarks: `${relPath} does not exist`,
      };
    }
  };
}
