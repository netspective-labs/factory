import * as govn from "./governance.ts";

declare global {
  interface Window {
    // deno-lint-ignore no-explicit-any
    proxyableMemoryFirstModelsCache: Map<string, any>;
  }
}

if (!window.proxyableMemoryFirstModelsCache) {
  window.proxyableMemoryFirstModelsCache = new Map();
}

export function typicalProxyableFileSysModelArgs<
  Model,
  OriginContext,
>(
  args: Omit<
    govn.ProxyableFileSysModelLifecycle<Model, OriginContext>,
    "constructFromCachedProxy"
  >,
): govn.ProxyableFileSysModelLifecycle<Model, OriginContext> {
  return {
    ...args,
    constructFromCachedProxy: async (pfsr) => {
      return JSON.parse(
        await Deno.readTextFile(pfsr.proxyStrategyResult.proxyFilePathAndName),
      );
    },
  };
}

export function proxyableFileSysModel<Model, OriginContext>(
  args: govn.ProxyableFileSysModelArguments<Model, OriginContext>,
): govn.ProxyableModel<Model> {
  return async () => {
    if (window.disableAllProxies) {
      return args.constructNotConfigured
        ? await args.constructNotConfigured(args)
        : await args.constructFromCachedProxy({
          proxyConfigState: undefined,
          proxyStrategyResult: {
            isConstructFromOrigin: false,
            proxyFilePathAndName: args.proxyFilePathAndName,
            proxyRemarks: "all proxies are disabled",
          },
        }, args);
    }

    let proxyConfigState: govn.ProxyConfigurationState | undefined;
    const fsrpsr = await args.proxyStrategy(args.proxyFilePathAndName);
    if (args.configState) {
      // if this proxy needs to be "configured" (e.g. coming from a database or
      // an API which requires secrets) and the configuration is not provided
      // then just try to construct from proxy without trying to originate.
      proxyConfigState = await args.configState();
      if (!proxyConfigState.isConfigured) {
        return args.constructNotConfigured
          ? await args.constructNotConfigured(args)
          : await args.constructFromCachedProxy({
            proxyConfigState,
            proxyStrategyResult: fsrpsr,
          }, args);
      }
    }

    if (fsrpsr.isConstructFromOrigin) {
      try {
        const ctx = await args.isOriginAvailable(fsrpsr, args);
        if (ctx) {
          const model = await args.constructFromOrigin(ctx, fsrpsr, args);
          return await args.cacheProxied(model, fsrpsr, ctx, args);
        } else {
          if (fsrpsr.proxyFileInfo) {
            // origin was not available, use the proxy
            return await args.constructFromCachedProxy({
              proxyStrategyResult: fsrpsr,
              proxyConfigState,
            }, args);
          }
          // origin was not available, and proxy is not available
          return await args.constructFromError(
            {
              originNotAvailable: true,
              proxyStrategyResult: fsrpsr,
              proxyConfigState,
            },
            undefined,
            args,
          );
        }
      } catch (proxyOriginError) {
        // origin was not accessible, proxy might be available
        let cachedProxy: Model | undefined;
        try {
          cachedProxy = await args.constructFromCachedProxy({
            proxyStrategyResult: fsrpsr,
            proxyConfigState,
          }, args);
        } catch {
          cachedProxy = undefined;
        }
        return await args.constructFromError(
          {
            proxyStrategyResult: fsrpsr,
            originNotAvailable: false,
            proxyOriginError,
            proxyConfigState,
          },
          cachedProxy,
          args,
        );
      }
    } else {
      // fsrpsr.isConstructFromOrigin is false
      return await args.constructFromCachedProxy({
        proxyStrategyResult: fsrpsr,
        proxyConfigState,
      }, args);
    }
  };
}

export function proxyableMemoryFirstFileSysModel<Model, OriginContext>(
  args: govn.ProxyableFileSysModelArguments<Model, OriginContext>,
): govn.ProxyableModel<Model> {
  const proxyableModel = proxyableFileSysModel<Model, OriginContext>(args);
  return async () => {
    let model = window.proxyableMemoryFirstModelsCache.get(
      args.proxyFilePathAndName,
    ) as Model;
    if (model) return model;
    model = await proxyableModel();
    window.proxyableMemoryFirstModelsCache.set(
      args.proxyFilePathAndName,
      model,
    );
    return model;
  };
}
