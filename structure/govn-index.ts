import * as safety from "../safety/mod.ts";

export type GovnIndexFilterCacheKey = string;

export interface GovnIndexFilterPredicate<Resource> {
  (r: Resource, index: number, options: {
    total: number;
    isFirst: boolean;
    isLast: boolean;
  }): boolean;
}

export interface GovnIndexFilterCache {
  readonly cacheKey: GovnIndexFilterCacheKey;
  readonly cachedAt: Date;
}

export interface GovnIndexFilterOptions {
  readonly cacheKey?: GovnIndexFilterCacheKey;
  readonly constructCache?: (
    suggested: GovnIndexFilterCache,
  ) => GovnIndexFilterCache;
  readonly cacheExpired?: (
    cache: GovnIndexFilterCache,
  ) => boolean;
}

export type GovnIndexKeyNamespace = string;
export type GovnIndexKeyLiteral = string;

export interface GovnIndexKey {
  readonly literal: GovnIndexKeyLiteral;
  readonly namespace?: GovnIndexKeyNamespace;
}

export interface MutatableGovnIndexKeysSupplier {
  indexKeys: GovnIndexKey[];
}

export interface GovnIndexKeysSupplier extends MutatableGovnIndexKeysSupplier {
  readonly indexKeys: GovnIndexKey[];
}

export interface GovnIndexStrategy<Resource, IndexResult> {
  readonly index: (r: Resource) => Promise<IndexResult>;
  readonly reindex: (
    original: Resource,
    entry: number,
    enriched: Resource,
  ) => Promise<IndexResult>;
  readonly indexSync: (r: Resource) => IndexResult;
  readonly resources: () => Iterable<Resource>;
  readonly filter: (
    predicate: GovnIndexFilterPredicate<Resource>,
    options?: GovnIndexFilterOptions,
  ) => Promise<Iterable<Resource>>;
  readonly filterSync: (
    predicate: GovnIndexFilterPredicate<Resource>,
    options?: GovnIndexFilterOptions,
  ) => Iterable<Resource>;
  readonly keyed: (key: GovnIndexKey) => Resource[] | undefined;
  readonly keyedUnique: (
    key: GovnIndexKey,
    onNotUnique?: (
      r: Resource[],
      key: GovnIndexKey,
    ) => Resource | undefined,
  ) => Resource | undefined;
}

export function isGovnIndexableIfNotNull<Resource>(
  o: unknown,
): o is Resource {
  if (o) return true;
  return false;
}

export interface UniversalIndexFilterCache<Resource>
  extends GovnIndexFilterCache {
  readonly filtered: Resource[];
}

export const isGovnIndexKeysSupplier = safety.typeGuard<GovnIndexKeysSupplier>(
  "indexKeys",
);

export type NamespacedKeysIndex<Resource> = Map<
  GovnIndexKeyLiteral,
  Resource[]
>;

export class UniversalIndex<Resource>
  implements GovnIndexStrategy<Resource, void> {
  readonly isIndexable: safety.TypeGuard<Resource>;
  readonly resourcesIndex: Resource[] = [];
  readonly globalNamespaceKeysIndex: NamespacedKeysIndex<Resource>;
  readonly keyedResources = new Map<
    GovnIndexKeyNamespace,
    NamespacedKeysIndex<Resource>
  >();
  readonly cachedFilter = new Map<
    GovnIndexFilterCacheKey,
    UniversalIndexFilterCache<Resource>
  >();

  constructor(isIndexable?: safety.TypeGuard<Resource>) {
    this.isIndexable = isIndexable || isGovnIndexableIfNotNull;
    this.globalNamespaceKeysIndex = this.prepareNamespaceIndex(".GLOBAL");
  }

  resources(): Iterable<Resource> {
    return this.resourcesIndex;
  }

  // deno-lint-ignore require-await
  async index(r: Resource | unknown): Promise<void> {
    if (this.isIndexable(r)) {
      this.resourcesIndex.push(r);
      if (isGovnIndexKeysSupplier(r)) {
        this.registerKeys(r);
      }
    }
  }

  // deno-lint-ignore require-await
  async reindex(
    original: Resource,
    entryIdx: number,
    enriched: Resource,
  ): Promise<void> {
    if (this.isIndexable(original)) {
      this.resourcesIndex[entryIdx] = enriched;
      if (isGovnIndexKeysSupplier(original)) {
        this.unregisterKeys(original);
      }
      if (isGovnIndexKeysSupplier(enriched)) {
        this.registerKeys(enriched);
      }
    }
  }

  indexSync(r: Resource | unknown): void {
    if (this.isIndexable(r)) {
      this.resourcesIndex.push(r);
      if (isGovnIndexKeysSupplier(r)) {
        this.registerKeys(r);
      }
    }
  }

  prepareNamespaceIndex(
    ns: GovnIndexKeyNamespace,
  ): NamespacedKeysIndex<Resource> {
    const result = new Map();
    this.keyedResources.set(ns, result);
    return result;
  }

  registerKeys(r: Resource & GovnIndexKeysSupplier) {
    for (const key of r.indexKeys) {
      const ns = key.namespace
        ? (this.keyedResources.get(key.namespace) ||
          this.prepareNamespaceIndex(key.namespace))
        : this.globalNamespaceKeysIndex;
      let resources = ns.get(key.literal);
      if (!resources) {
        resources = [];
        ns.set(key.literal, resources);
      }
      resources.push(r);
    }
  }

  unregisterKeys(r: Resource & GovnIndexKeysSupplier) {
    for (const key of r.indexKeys) {
      const ns = key.namespace
        ? (this.keyedResources.get(key.namespace) ||
          this.prepareNamespaceIndex(key.namespace))
        : this.globalNamespaceKeysIndex;
      const resources = ns.get(key.literal);
      if (resources) {
        const itemIdx = resources.indexOf(r);
        if (itemIdx > -1) {
          resources.splice(itemIdx, 1); // 2nd parameter means remove one item only
        }
      }
    }
  }

  keyed(key: GovnIndexKey): Resource[] | undefined {
    const ns = key.namespace
      ? this.keyedResources.get(key.namespace)
      : this.globalNamespaceKeysIndex;
    return ns?.get(key.literal);
  }

  keyedUnique(
    key: GovnIndexKey,
    onNotUnique?: (
      r: Resource[],
      key: GovnIndexKey,
    ) => Resource | undefined,
  ): Resource | undefined {
    const keyed = this.keyed(key);
    if (keyed) {
      if (keyed.length == 1) {
        return keyed[0];
      }
      return onNotUnique ? onNotUnique(keyed, key) : undefined;
    }
    return undefined;
  }

  // deno-lint-ignore require-await
  async filter(
    predicate: GovnIndexFilterPredicate<Resource>,
    options?: GovnIndexFilterOptions,
  ): Promise<Iterable<Resource>> {
    return this.filterSync(predicate, options);
  }

  filterSync(
    predicate: GovnIndexFilterPredicate<Resource>,
    options?: GovnIndexFilterOptions,
  ): Iterable<Resource> {
    let filtered: Resource[] | undefined = undefined;
    if (options?.cacheKey) {
      const cached = this.cachedFilter.get(options?.cacheKey);
      if (cached) {
        if (options?.cacheExpired) {
          if (!options?.cacheExpired(cached)) filtered = cached.filtered;
        } else {
          filtered = cached.filtered;
        }
      }
    }
    if (!filtered) {
      const total = this.resourcesIndex.length;
      const lastIndex = this.resourcesIndex.length - 1;
      filtered = this.resourcesIndex.filter((r, index) =>
        predicate(r, index, {
          total,
          isFirst: index === 0,
          isLast: index === lastIndex,
        })
      );
    }
    if (options?.cacheKey) {
      this.cachedFilter.set(options?.cacheKey, {
        cacheKey: options?.cacheKey,
        cachedAt: new Date(),
        filtered,
      });
    }
    return filtered;
  }
}
