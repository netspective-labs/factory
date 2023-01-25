import { gpm } from "./deps.ts";
import * as cache from "../cache/mod.ts";
import * as link from "../fs/link.ts";

export interface RemotePackage {
  readonly acquire: () => Promise<boolean>;
}

export interface RemotePackageFileSysProxyPathSupplier {
  readonly proxyFileSysPath: string;
}

export interface GitHubPackage
  extends RemotePackage, RemotePackageFileSysProxyPathSupplier {
  readonly package: gpm.Package;
}

export interface SymlinkPackage
  extends RemotePackage, RemotePackageFileSysProxyPathSupplier {
  readonly srcPath: string;
}

export function gitHubPackage(
  gpmPkg: gpm.Package,
  proxyFileSysPath: string,
  onError?: (err: Error, gpmPkg: gpm.Package, dest: string) => Promise<boolean>,
): GitHubPackage {
  return {
    acquire: async () => {
      try {
        await gpm.default([gpmPkg], proxyFileSysPath);
        return true;
      } catch (err) {
        if (onError) return onError(err, gpmPkg, proxyFileSysPath);
        return false;
      }
    },
    package: gpmPkg,
    proxyFileSysPath,
  };
}

export function gitHubPackageCustom(
  gpmPkg: gpm.Package,
  proxyFileSysPath: string,
  extract: (
    gpmPkg: gpm.Package,
    tmpPath: string,
    dest: string,
  ) => Promise<void>,
  onError?: (
    err: Error,
    gpmPkg: gpm.Package,
    tmpPath: string,
    dest: string,
  ) => Promise<boolean>,
): GitHubPackage {
  return {
    acquire: async () => {
      const tmpPath = Deno.makeTempDirSync();
      try {
        await gpm.default([gpmPkg], tmpPath);
        await extract(gpmPkg, tmpPath, proxyFileSysPath);
        return true;
      } catch (err) {
        if (onError) return onError(err, gpmPkg, tmpPath, proxyFileSysPath);
        return false;
      } finally {
        await Deno.remove(tmpPath, { recursive: true });
      }
    },
    package: gpmPkg,
    proxyFileSysPath,
  };
}

export function symlinkChildren(
  srcPath: string,
  proxyFileSysPath: string,
  ignoreSpecFileName: string | undefined,
  options?: link.SymlinkDirectoryChildrenOptions,
): SymlinkPackage {
  return {
    acquire: async () => {
      await link.symlinkDirectoryChildren(
        srcPath,
        proxyFileSysPath,
        ignoreSpecFileName,
        options,
      );
      return true;
    },
    srcPath,
    proxyFileSysPath,
  };
}

export interface RemotePackageFileSysProxyContext {
  readonly packages: RemotePackage[];
}

export class RemotePackageFileSysProxy
  extends cache.ProxyableFileSysDirectory<RemotePackageFileSysProxyContext> {
  constructor(
    readonly proxyPath: string,
    readonly proxyStrategy: cache.FileSysDirectoryProxyStrategy,
    readonly packages: RemotePackage[],
    readonly fsdpEE?: cache.FileSysDirectoryProxyEventsEmitter,
  ) {
    super(proxyPath, proxyStrategy, fsdpEE);
  }

  // deno-lint-ignore require-await
  async isOriginAvailable(): Promise<RemotePackageFileSysProxyContext | false> {
    return { packages: this.packages };
  }

  async constructFromOrigin(
    ctx: RemotePackageFileSysProxyContext,
  ): Promise<void> {
    for (const p of ctx.packages) {
      await p.acquire();
    }
  }
}
