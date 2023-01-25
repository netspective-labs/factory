import { redis } from "./deps.ts";
import * as health from "../health/mod.ts";
import * as govn from "./governance.ts";
import * as tkp from "./text-key-proxy.ts";

export interface RedisCacheOptions<Resource> {
  readonly port?: number;
  readonly hostname?: string;
  readonly onSuccess?: (
    init: govn.TextKeyProxy<Resource>,
    report: Required<Pick<RedisCacheOptions<Resource>, "port" | "hostname">>,
  ) => void;
  readonly onError?: (
    error: Error,
  ) => [cache: govn.TextKeyProxy<Resource>, health: govn.CacheHealth];
}

export async function redisCache<T>(
  options?: RedisCacheOptions<T>,
): Promise<[cache: govn.TextKeyProxy<T>, health: govn.CacheHealth]> {
  const hostname = options?.hostname || "127.0.0.1";
  const port = options?.port || 6379;
  let client: redis.Redis;
  try {
    client = await redis.connect({ hostname, port });
  } catch (error) {
    const cache = options?.onError
      ? options.onError(error)
      : tkp.lruTextKeyedResourceProxy<T>();
    return [cache[0], (keyName: (given: string) => string) => {
      const content: health.ServiceHealthComponentStatus[] = [
        health.unhealthyComponent("warn", {
          componentType: "component",
          componentId: `redis-cache-content`,
          links: {},
          time: new Date(),
          output: `Redis Server ${hostname} at ${port}: ${error}`,
        }),
      ];
      const checks: Record<string, health.ServiceHealthComponentChecks> = {
        ...cache[1](keyName).checks,
        [keyName("redis")]: content,
      };
      return {
        checks,
      };
    }];
  }

  const result: govn.TextKeyProxy<T> = {};
  if (options?.onSuccess) {
    options.onSuccess(result, { hostname, port });
  }
  const handler = {
    get: async function (
      obj: govn.TextKeyProxy<T>,
      key: string,
    ): Promise<T | undefined> {
      let entry = obj[key];
      if (!entry) {
        const redisValue = await client.get(key);
        if (redisValue) {
          entry = JSON.parse(redisValue);
          obj[key] = entry;
        }
      }
      return entry;
    },
    set: function (
      obj: govn.TextKeyProxy<T>,
      key: string,
      value: T,
    ): boolean {
      obj[key] = value;
      // this is a Promise but we're not going to wait for finish
      // TODO: add a .then() to track telemetry (fail/pass)
      client.set(
        key,
        JSON.stringify(
          value,
          (_key, value) => typeof value === "bigint" ? value.toString() : value, // return everything else unchanged
        ),
      );
      return true;
    },
  };

  return [new Proxy(result, handler), (keyName: (given: string) => string) => {
    const statistics: Record<string, string> = {};
    Object.entries(result).forEach((entry) => {
      const [key, value] = entry;
      statistics[key] = typeof value === "string"
        ? Object.keys(value).join(", ")
        : (typeof value).toString();
    });
    const content: health.ServiceHealthComponentStatus[] = [
      health.healthyComponent({
        componentType: "component",
        componentId: `redis-cache-content`,
        metricName: "count",
        observedUnit: "cardinal",
        observedValue: Object.keys(result).length,
        links: statistics,
        time: new Date(),
      }),
    ];
    const checks: Record<string, health.ServiceHealthComponentChecks> = {
      [keyName("content")]: content,
    };
    return {
      checks,
    };
  }];
}
