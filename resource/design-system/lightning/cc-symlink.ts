import { path } from "../../deps.ts";
import * as fsl from "../../../fs/link.ts";
import * as ds from "../../html/mod.ts";
import * as ua from "../universal/assets.ts";

/**
 * Create a function which, when called with the `public`, or other destination
 * root for a web server, will create symlinks to the destination path. This is
 * useful so that `client cargo` (basically anything that will statically be
 * served to a user agent) can easily be made available without copying files.
 * @param clientCargoHome usually `client-cargo`, where the source should be placed
 * @param dsLocalFileSysHomeRel the location of the design system assets
 * @param universalAssetsBaseUnit usually `universal-cc` but the destination location of the universal client cargo
 * @param pdsaEnvVarsPrefix a env var prefix that should be used to update (CC usually expires in 1 day)
 * @returns
 */
export function ldsClientCargoSymlinker(
  clientCargoHome: string,
  dsLocalFileSysHomeRel = path.fromFileUrl(import.meta.resolve("../../../..")),
  universalAssetsBaseUnit = ua.universalAssetsBaseUnit,
  pdsaEnvVarsPrefix = "RF_DS_LIGHTNING_CLIENTCARGO_",
): ds.HtmlLayoutClientCargoPersister {
  return async (publishDest) => {
    // prepare to grab the universal client-cargo (universal-cc)
    const { proxyable: uP } = ua.proxyableDesignSystemAssets({
      clientCargoHome,
      publishDest,
      dsClientCargoRelSrcHome:
        "lib/resource/design-system/universal/client-cargo",
      dsClientCargoRelDestHome: universalAssetsBaseUnit,
      dsLocalFileSysHomeRel,
      pdsaEnvVarsPrefix,
    });
    await uP.prepareDirectory();

    // prepare to grab the design-system client-cargo
    const { proxyable: dsP, populateOptions: dsPO } = ua
      .proxyableDesignSystemAssets({
        clientCargoHome,
        publishDest,
        dsClientCargoRelSrcHome:
          "lib/resource/design-system/lightning/client-cargo",
        dsClientCargoRelDestHome: `lightning`,
        dsLocalFileSysHomeRel,
        pdsaEnvVarsPrefix,
      });
    await dsP.prepareDirectory();

    // after prepareDirectory() the proxyable remotes are local, just symlink
    await fsl.symlinkDirectoryChildren(
      clientCargoHome,
      publishDest,
      ".rfignore",
      dsPO.verbose ? fsl.symlinkDirectoryChildrenConsoleReporters : undefined,
    );
  };
}
