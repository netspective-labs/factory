import * as health from "../health/mod.ts";
import * as govn from "./governance.ts";

/**
 * Create a simple LRU cache which looks and acts like a normal object but
 * is backed by a Proxy object that stores expensive to construct objects.
 * @param maxEntries evict cached items after this many entries
 */
export function lruTextKeyedResourceProxy<T>(
  maxEntries = 50,
): [cache: govn.TextKeyProxy<T>, health: govn.CacheHealth] {
  const result: govn.TextKeyProxy<T> = {};
  const handler = {
    // Set objects store the cache keys in insertion order.
    cache: new Set<string>(),
    get: function (obj: govn.TextKeyProxy<T>, key: string): T | undefined {
      const entry = obj[key];
      if (entry) {
        // move the most recent key to the end so it's last to be evicted
        this.cache.delete(key);
        this.cache.add(key);
      }
      return entry;
    },
    set: function (obj: govn.TextKeyProxy<T>, key: string, value: T): boolean {
      obj[key] = value;
      if (this.cache.size >= maxEntries) {
        // least-recently used cache eviction strategy, the oldest
        // item is the first one in the list
        const keyToDelete = this.cache.keys().next().value;
        delete obj[key];
        this.cache.delete(keyToDelete);
      }
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
        componentId: `local-cache-content`,
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
      checks: checks,
    };
  }];
}
