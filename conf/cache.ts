import * as safety from "../safety/mod.ts";
import * as govn from "./governance.ts";

declare global {
  interface Window {
    // deno-lint-ignore no-explicit-any
    configurationsCache: Map<string, ConfigurationCache<any, any>>;
  }
}

if (!window.configurationsCache) {
  window.configurationsCache = new Map();
}

export type ConfigurationCacheKey = string;

export interface CacheableConfiguration {
  readonly configCacheKey: ConfigurationCacheKey;
}

export interface CacheExpirationSupplier<Configuration, Context> {
  readonly cacheExpired: ConfigurationCacheExpirationStrategy<
    Configuration,
    Context
  >;
}

export const isCacheableConfiguration = safety.typeGuard<
  CacheableConfiguration
>("configCacheKey");

export function isCacheExpirationSupplier<Configuration, Context>(
  o: unknown,
): o is CacheExpirationSupplier<Configuration, Context> {
  const isType = safety.typeGuard<
    CacheExpirationSupplier<Configuration, Context>
  >("cacheExpired");
  return isType(o);
}

export interface ConfigurationCacheExpirationStrategy<Configuration, Context> {
  (
    cached: ConfigurationCache<Configuration, Context>,
    ctx?: Context,
  ): boolean;
}

export interface ConfigurationCache<Configuration, Context> {
  readonly config: Configuration;
  readonly cachedAt: Date;
  readonly cacheExpired?: ConfigurationCacheExpirationStrategy<
    Configuration,
    Context
  >;
}

export const ageOneSecondMS = 1000;
export const ageOneMinuteMS = ageOneSecondMS * 60;
export const ageOneHourMS = ageOneMinuteMS * 60;
export const ageOneDayMS = ageOneHourMS * 24;

export function configCacheAgeExpirationStrategy<Configuration, Context>(
  maxAgeInMS: number,
): ConfigurationCacheExpirationStrategy<Configuration, Context> {
  return (cached) => {
    if ((Date.now() - cached.cachedAt.valueOf()) > maxAgeInMS) return true;
    return false;
  };
}

export class CacheableConfigurationSupplier<Configuration, Context>
  implements
    govn.ConfigurationSupplier<Configuration, Context>,
    govn.ConfigurationSyncSupplier<Configuration, Context> {
  constructor(
    readonly identity: string,
    readonly proxy:
      & govn.ConfigurationSupplier<Configuration, Context>
      & govn.ConfigurationSyncSupplier<Configuration, Context>,
    readonly cacheExpired?: (
      cached: ConfigurationCache<Configuration, Context>,
      ctx?: Context,
    ) => boolean,
  ) {
  }

  async configure(ctx?: Context): Promise<Configuration> {
    if (isCacheableConfiguration(ctx)) {
      const key = `${this.identity}:${ctx.configCacheKey}`;
      const found = window.configurationsCache.get(key);
      let cacheExpired = this.cacheExpired;
      if (isCacheExpirationSupplier<Configuration, Context>(ctx)) {
        cacheExpired = ctx.cacheExpired;
      }
      if (found) {
        if (isCacheExpirationSupplier<Configuration, Context>(found)) {
          cacheExpired = found.cacheExpired;
        }
        if (!cacheExpired || (cacheExpired && !cacheExpired(found, ctx))) {
          return found.config;
        }
      }
      const result = await this.proxy.configure(ctx);
      const cached = {
        config: result,
        cachedAt: new Date(),
        cacheExpired: isCacheExpirationSupplier<Configuration, Context>(result)
          ? result.cacheExpired
          : cacheExpired,
      };
      window.configurationsCache.set(key, cached);
      return result;
    }
    return await this.proxy.configure(ctx);
  }

  configureSync(ctx?: Context): Configuration {
    if (isCacheableConfiguration(ctx)) {
      const key = `${this.identity}:${ctx.configCacheKey}`;
      const found = window.configurationsCache.get(key);
      let cacheExpired = this.cacheExpired;
      if (isCacheExpirationSupplier<Configuration, Context>(ctx)) {
        cacheExpired = ctx.cacheExpired;
      }
      if (found) {
        if (isCacheExpirationSupplier<Configuration, Context>(found)) {
          cacheExpired = found.cacheExpired;
        }
        if (!cacheExpired || (cacheExpired && !cacheExpired(found, ctx))) {
          return found.config;
        }
      }
      const result = this.proxy.configureSync(ctx);
      const cached = {
        config: result,
        cachedAt: new Date(),
        cacheExpired: isCacheExpirationSupplier<Configuration, Context>(result)
          ? result.cacheExpired
          : cacheExpired,
      };
      window.configurationsCache.set(key, cached);
      return result;
    }
    return this.proxy.configureSync(ctx);
  }
}
