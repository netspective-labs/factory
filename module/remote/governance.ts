export type ForeignCodeExpectedArgDataType =
  | "boolean"
  | "number"
  | "bigint"
  | "string"
  | "null"
  | "undefined"
  | "Date"
  | "Uint8Array";

export interface ForeignCodeExpectedArgument {
  readonly identity: string;
  readonly dataType: ForeignCodeExpectedArgDataType;
}

export type ForeignCodeExpectedArguments =
  | Record<string, ForeignCodeExpectedArgument>
  | Array<ForeignCodeExpectedArgument>;

export interface ServerRuntimeScriptResultTransformer {
  (result: unknown): unknown;
}

/**
 * A foreign code identity supplier provides the qualified name of a block of
 * foreign code. Instead of supplying the entire code, the identifier provides
 * a key to lookup the code in our foreign code inventory.
 */
export interface ForeignCodeIdentitySupplier {
  readonly foreignCodeIdentity: string;
}

export type ForeignCodeResponseStrategy = "JSON" | "Deno.inspect";
export type ForeignCodeJsonResponseOptions = {
  readonly isJsonResponseOptions: true;
  readonly decycle: boolean; // "https://raw.githubusercontent.com/douglascrockford/JSON-js/master/cycle.js"
  readonly indent?: string;
};
export type ForeignCodeDenoInspectResponseOptions = {
  readonly isDenoInspectResponseOptions: true;
  readonly denoIO: Deno.InspectOptions;
};
export type ForeignCodeResponseOptions =
  | ForeignCodeJsonResponseOptions
  | ForeignCodeDenoInspectResponseOptions;

export interface ForeignCodeResponseSupplier {
  readonly foreignCodeResponseStrategy?: ForeignCodeResponseStrategy;
  readonly foreignCodeResponseStrategyOptions?: ForeignCodeResponseOptions;
}

export interface ForeignCodeSupplier extends ForeignCodeResponseSupplier {
  readonly foreignCodeLanguage: "js" | "ts";
  readonly foreignCode: string;
  readonly foreignCodeArgsExpected?: ForeignCodeExpectedArguments;
  readonly foreignCodeResponseStrategy?: ForeignCodeResponseStrategy;
  readonly foreignCodeResponseStrategyOptions?: ForeignCodeResponseOptions;
}

export interface ForeignCodeExecutArgsSupplier {
  readonly foreignCodeExecArgs: URLSearchParams;
}

export interface ForeignJsTsModuleSupplier {
  readonly foreignModule: ForeignCodeSupplier;
}

export interface ServerRuntimeScript
  extends ForeignCodeIdentitySupplier, ForeignJsTsModuleSupplier {
  readonly name: string;
  readonly label: string;
  readonly transformResult?: ServerRuntimeScriptResultTransformer;
}

export interface ServerRuntimeScriptLibrary {
  readonly qualifiedName: string;
  readonly name: string;
  readonly label: string;
  readonly scripts: Iterable<ServerRuntimeScript>;
}

export interface ServerRuntimeScriptInventory<
  Script extends ServerRuntimeScript,
  Library extends ServerRuntimeScriptLibrary = ServerRuntimeScriptLibrary,
> {
  readonly libraries: Iterable<Library>;
  readonly script: (identity: string) => Script | undefined;
  readonly scriptIdentities: () => Iterable<string>;
}
