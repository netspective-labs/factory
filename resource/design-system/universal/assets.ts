import * as colors from "https://deno.land/std@0.173.0/fmt/colors.ts";
import * as path from "https://deno.land/std@0.173.0/path/mod.ts";
import * as fs from "https://deno.land/std@0.173.0/fs/mod.ts";
import * as cache from "../../../cache/mod.ts";
import * as conf from "../../../conf/mod.ts";
import * as pkg from "../../../package/mod.ts";
import * as fsl from "../../../fs/link.ts";

export const universalAssetsBaseUnit = "universal-cc";
export const universalAssetsBaseURL = `/${universalAssetsBaseUnit}`;

function pdsAssetsEnvVarArgs(proxyEnvVarsPrefix: string) {
  const proxyEE = cache.fileSysDirectoryProxyEventsConsoleEmitter(
    "populateClientCargoDirEventsEmitter",
    proxyEnvVarsPrefix,
  );
  const proxyConfig = new cache
    .FileSysResourceAgeProxyEnvArgumentsConfiguration(
    proxyEnvVarsPrefix,
    cache.FileSysResourceAgeProxyEnvArgumentsConfiguration.ageOneDayMS,
  );
  const proxyOptions = proxyConfig.configureSync();
  return { proxyOptions, proxyEE };
}

function pdsAssetsPopulateEnvVarArgs(envVarsPrefix: string) {
  const populateConfig = new conf.TypicalEnvArgumentsConfiguration<
    { verbose: boolean }
  >(
    () => ({ verbose: false }),
    (ec) => ({ properties: [ec.booleanProperty("verbose")] }),
    envVarsPrefix,
  );
  return populateConfig.configureSync();
}

/**
 * Resource Factory Design System ("theme") proxyable assets. Assets can be,
 * optionally, symlink'd to a local directory (for developer convenience) or
 * acquired from a remote (usually GitHub) package if assets are not available
 * locally. Once acquired, the remote copy is proxied (cached) for one day.
 */
export function proxyableDesignSystemAssets(
  {
    clientCargoHome,
    publishDest,
    dsClientCargoRelSrcHome,
    dsClientCargoRelDestHome,
    dsLocalFileSysHomeRel,
    pdsaEnvVarsPrefix,
  }: {
    readonly clientCargoHome: string;
    readonly publishDest: string;
    readonly dsClientCargoRelSrcHome: string;
    readonly dsClientCargoRelDestHome: string;
    readonly dsLocalFileSysHomeRel: string;
    readonly pdsaEnvVarsPrefix: string;
  },
) {
  const { proxyOptions, proxyEE } = pdsAssetsEnvVarArgs(
    `${pdsaEnvVarsPrefix}THEME_PROXY_`,
  );
  const populateOptions = pdsAssetsPopulateEnvVarArgs(
    `${pdsaEnvVarsPrefix}POPULATE_`,
  );

  const destination = path.join(clientCargoHome, dsClientCargoRelDestHome);

  const dsLocalFileSysHome = path.resolve(
    clientCargoHome,
    dsLocalFileSysHomeRel,
  );
  const localPackage = pkg.symlinkChildren(
    path.join(
      dsLocalFileSysHome,
      dsClientCargoRelSrcHome,
    ),
    path.join(publishDest, dsClientCargoRelDestHome),
    undefined,
    populateOptions.verbose
      ? fsl.symlinkDirectoryChildrenConsoleReporters
      : undefined,
  );

  const ghPackagePath = "netspective-labs/factory";
  const remotePackage = pkg.gitHubPackageCustom(
    {
      name: ghPackagePath,
    },
    destination,
    async (_gpmPkg, tmpPath, dest) => {
      const srcPath = path.join(tmpPath, "factory", dsClientCargoRelSrcHome);
      if (populateOptions.verbose) {
        console.info(
          colors.green(
            `${colors.gray(`[${ghPackagePath}]`)} acquired ${
              colors.white(srcPath)
            } as ${dest}`,
          ),
        );
      }
      await fs.move(srcPath, dest, { overwrite: true });
    },
  );

  const proxyable = new pkg.RemotePackageFileSysProxy(
    destination,
    cache.fileSysDirectoryAgeProxyStrategy(proxyOptions.maxAgeInMS),
    [{
      acquire: async () => {
        if (await fs.exists(dsLocalFileSysHome)) {
          if (await localPackage.acquire()) {
            if (populateOptions.verbose) {
              console.info(colors.gray(
                `${dsLocalFileSysHomeRel} found, symlink'd for development convenience`,
              ));
            }
            return true;
          }
          console.info(colors.red(
            `${dsLocalFileSysHomeRel} found, but symlinking for development convenience failed: localPackage.acquire() is false`,
          ));
        } else {
          if (populateOptions.verbose) {
            console.info(colors.gray(
              `${dsLocalFileSysHome} not found, acquiring from remote`,
            ));
          }
        }
        return await remotePackage.acquire();
      },
    }],
    proxyEE,
  );
  return { proxyable, populateOptions };
}
