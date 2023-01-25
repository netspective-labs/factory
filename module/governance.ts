export interface LocationSupplier {
  readonly moduleImportMetaURL: string;
}

export interface ExtensionExportsFilter {
  (key: string, value: unknown): boolean;
}

// deno-lint-ignore no-empty-interface
export interface UntypedExports extends Record<string, unknown> {
}

export interface ExtensionModule {
  readonly isValid: boolean;
  readonly provenance: string | URL;
  readonly module: unknown;
  readonly exports: <Export = UntypedExports>(
    assign?: ExtensionExportsFilter,
  ) => Export;
  readonly importError?: Error;
}

export interface ExtensionConsumer {
  readonly potentialModules: () => Iterable<string>;
  readonly consumeModule: (im: ExtensionModule) => Promise<ExtensionModule>;
}

export interface ExtensionsSupplier {
  readonly extensions: Iterable<ExtensionModule>;
}

export interface ExtensionsManagerNotifyArguments {
  readonly watcher: Deno.FsWatcher;
}

export interface ExtensionsManager {
  readonly extensions: Iterable<ExtensionModule>;
  readonly importModule: (name: string) => Promise<ExtensionModule>;
  readonly importDynamicScript: (
    source: {
      readonly typescript?: () => string;
      readonly javascript?: () => string;
    },
  ) => Promise<[extn?: ExtensionModule, dataURL?: string]>;
  readonly extend: (...ec: ExtensionConsumer[]) => Promise<void>;
  readonly isManagedExtension: (
    identity: string | Deno.FsEvent,
    watcher?: Deno.FsWatcher,
  ) => boolean;
  readonly notify: (
    event: Deno.FsEvent,
    watcher: Deno.FsWatcher,
  ) => Promise<void>;
}

export interface MutatableLocalFileInfoSupplier {
  localFileInfo?: Deno.FileInfo;
  localFileInfoError?: Error;
}

// should match output from deno info [url] --json
export interface ModuleStatus {
  readonly kind: string; // TODO: type this to "esm" | "X" | "Y", etc.
  readonly local: string;
  readonly size: number;
  readonly mediaType: string;
  readonly specifier: string;
}

// should match output from deno info [url] --json
export interface ModuleGraph {
  readonly roots: string[];
  readonly modules: ModuleStatus[];
}

export interface ModuleGraphs {
  readonly moduleGraph: (
    rootSpecifier: string,
    onError?: (error: Error) => Promise<ModuleGraph | undefined>,
  ) => Promise<ModuleGraph | undefined>;
  readonly localDependencies: (
    rootSpecifier: string,
    includeRootSpecifier?: boolean,
    onError?: (moduleGraphError: Error) => Promise<ModuleStatus[] | undefined>,
  ) => Promise<ModuleStatus[] | undefined>;
  readonly localDependenciesFileInfos: (
    rootSpecifier: string,
    includeRootSpecifier?: boolean,
    onError?: (moduleGraphError: Error) => Promise<ModuleStatus[] | undefined>,
  ) => Promise<
    (ModuleStatus & Readonly<MutatableLocalFileInfoSupplier>)[] | undefined
  >;
}
