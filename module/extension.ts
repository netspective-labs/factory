import * as govn from "./governance.ts";

// deno-lint-ignore no-explicit-any
export const deepClone = (value: any): any | never => {
  const typeofValue = typeof value;
  // primatives are copied by value.
  if (
    [
      "string",
      "number",
      "boolean",
      "string",
      "bigint",
      "symbol",
      "null",
      "undefined",
      "function",
    ].includes(typeofValue)
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  if (typeofValue === "object") {
    // deno-lint-ignore no-explicit-any
    const clone: any = {};
    for (const prop in value) {
      clone[prop] = deepClone(value[prop]);
    }
    return clone;
  }
  throw new Error(`You've tried to clone something that can't be cloned`);
};

export type CachedExtensionIdentity = string;

export interface CachedExtensionsOptions {
  readonly onBeforeImport?: (
    identity: CachedExtensionIdentity,
  ) => string;
  readonly onAllowCacheImport?: (
    identity: CachedExtensionIdentity,
    module: govn.ExtensionModule,
  ) => boolean;
  readonly onAfterCacheImport?: (
    identity: CachedExtensionIdentity,
    module: govn.ExtensionModule,
  ) => Promise<void>;
  readonly onAllowCacheEvict?: (
    identity: CachedExtensionIdentity,
    args?: {
      module?: govn.ExtensionModule;
      event?: Deno.FsEvent;
      watcher?: Deno.FsWatcher;
    },
  ) => boolean;
  readonly onBeforeCacheEvict?: (
    identity: CachedExtensionIdentity,
    module?: govn.ExtensionModule,
  ) => Promise<void>;
}

export class CachedExtensions implements govn.ExtensionsManager {
  readonly cache = new Map<CachedExtensionIdentity, govn.ExtensionModule>();

  constructor(readonly options?: CachedExtensionsOptions) {
  }

  get extensions() {
    return this.cache.values();
  }

  identity(provenance: string): CachedExtensionIdentity {
    // TODO: check for "file://" and normalize it, etc. be sure to support data URLs too
    return provenance;
  }

  importSpecifier(identity: CachedExtensionIdentity): string {
    if (this.options?.onBeforeImport) {
      return this.options.onBeforeImport(identity);
    }
    return identity;
  }

  async importModule(provenance: string): Promise<govn.ExtensionModule> {
    const identity = this.identity(provenance);
    let importedModule: govn.ExtensionModule;
    try {
      const found = this.cache.get(identity);
      if (found) return found;

      const module = await import(this.importSpecifier(identity));
      importedModule = {
        isValid: true,
        provenance,
        module,
        exports: <Export>(assign?: govn.ExtensionExportsFilter) => {
          const properties: Record<string, unknown> = {};
          for (
            const entry of Object.entries(module as Record<string, unknown>)
          ) {
            const [key, value] = entry;
            if (!assign || assign(key, value)) {
              properties[key] = value;
            }
          }
          return properties as Export;
        },
      };
    } catch (importError) {
      importedModule = {
        isValid: false,
        provenance,
        exports: <Export>() => {
          return {} as Export;
        },
        module: undefined,
        importError,
      };
    }
    let allowCacheImport = true;
    if (this.options?.onAllowCacheImport) {
      if (!this.options.onAllowCacheImport(identity, importedModule)) {
        allowCacheImport = false;
      }
    }
    if (allowCacheImport) {
      this.cache.set(identity, importedModule);
      if (this.options?.onAfterCacheImport) {
        await this.options.onAfterCacheImport(identity, importedModule);
      }
    }
    return importedModule;
  }

  async importDynamicScript(
    source: {
      readonly typescript?: () => string;
      readonly javascript?: () => string;
    },
  ): Promise<[extn?: govn.ExtensionModule, dataURL?: string]> {
    // see https://deno.com/blog/v1.7#support-for-importing-data-urls

    if (source.typescript) {
      // deno-fmt-ignore
      const dataURL = `data:application/typescript;base64,${btoa(source.typescript())}`;
      return [await this.importModule(dataURL), dataURL];
    }

    if (source.javascript) {
      // deno-fmt-ignore
      const dataURL = `data:application/javascript;base64,${btoa(source.javascript())}`;
      return [await this.importModule(dataURL), dataURL];
    }

    return [undefined, undefined];
  }

  async extend(...consumers: govn.ExtensionConsumer[]): Promise<void> {
    for (const ec of consumers) {
      for (const pe of ec.potentialModules()) {
        ec.consumeModule(await this.importModule(pe));
      }
    }
  }

  isManagedExtension(
    provenance: string | Deno.FsEvent,
    _watcher?: Deno.FsWatcher,
  ): boolean {
    if (typeof provenance === "string") {
      return this.cache.has(this.identity(provenance));
    }
    for (const p of provenance.paths) {
      if (this.cache.has(this.identity(p))) return true;
    }
    return false;
  }

  async notify(
    event: Deno.FsEvent,
    watcher?: Deno.FsWatcher,
  ): Promise<void> {
    if (event.kind === "modify" || event.kind === "remove") {
      for (const p of event.paths) {
        const identity = this.identity(p);
        if (this.cache.has(identity)) {
          const module = this.cache.get(identity);
          let evictFromCache = true;
          if (this.options?.onAllowCacheEvict) {
            if (
              !this.options.onAllowCacheEvict(identity, {
                module,
                event,
                watcher,
              })
            ) {
              evictFromCache = false;
            }
          }
          if (evictFromCache) {
            if (this.options?.onBeforeCacheEvict) {
              await this.options.onBeforeCacheEvict(identity, module);
            }
            this.cache.delete(identity);
          }
        }
      }
    }
  }
}

export class ReloadableCachedExtensions extends CachedExtensions {
  readonly extensionsEvicted = new Set<CachedExtensionIdentity>();
  constructor(
    options?: Pick<
      CachedExtensionsOptions,
      "onBeforeImport" | "onBeforeCacheEvict"
    >,
  ) {
    super({
      onBeforeImport: (identity) => {
        let specifier = identity;
        if (options?.onBeforeImport) {
          specifier = options.onBeforeImport(specifier);
        }
        if (this.extensionsEvicted.has(identity)) {
          this.extensionsEvicted.delete(identity);
          specifier = `${identity}#${new Date().valueOf()}`;
        }
        return specifier;
      },
      // deno-lint-ignore require-await
      onBeforeCacheEvict: async (identity) => {
        if (options?.onBeforeCacheEvict) {
          options.onBeforeCacheEvict(identity);
        }
        this.extensionsEvicted.add(identity);
      },
    });
  }

  // deno-lint-ignore require-await
  async reset(): Promise<void> {
    this.extensionsEvicted.clear();
  }
}
