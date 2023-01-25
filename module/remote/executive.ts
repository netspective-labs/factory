import * as mGovn from "../governance.ts";
import * as rGovn from "./governance.ts";
import * as guard from "./guard.ts";
import * as safety from "../../safety/mod.ts";

export type ForeignCodePayload =
  & (
    | rGovn.ForeignCodeIdentitySupplier
    | rGovn.ForeignJsTsModuleSupplier
  )
  & Partial<rGovn.ForeignCodeExecutArgsSupplier>;

export interface ForeignJavascriptSupplier extends rGovn.ForeignCodeSupplier {
  readonly language: "js";
}

export interface ForeignTypescriptSupplier extends rGovn.ForeignCodeSupplier {
  readonly language: "ts";
}

export const isForeignCodeJsonResponseOptions = safety.typeGuard<
  rGovn.ForeignCodeJsonResponseOptions
>("isJsonResponseOptions");
export const isForeignCodeDenoInspectResponseOptions = safety.typeGuard<
  rGovn.ForeignCodeDenoInspectResponseOptions
>("isDenoInspectResponseOptions", "denoIO");

export function isPayloadForeignJsTsModuleSupplier(
  o: ForeignCodePayload,
): o is rGovn.ForeignJsTsModuleSupplier {
  return guard.isForeignJsTsModuleSupplier(o);
}

export function isJavascriptForeignCodeSupplier(
  o: rGovn.ForeignCodeSupplier,
): o is ForeignJavascriptSupplier {
  return guard.isForeignCodeSupplier(o) && o.foreignCodeLanguage == "js";
}

export function isTypescriptForeignCodeSupplier(
  o: rGovn.ForeignCodeSupplier,
): o is ForeignTypescriptSupplier {
  return guard.isForeignCodeSupplier(o) && o.foreignCodeLanguage == "ts";
}

export interface ExecuteForeignCodeArgsSupplier<
  Payload extends ForeignCodePayload = ForeignCodePayload,
  Script extends rGovn.ServerRuntimeScript = rGovn.ServerRuntimeScript,
> {
  readonly payload: Payload;
  readonly extensions: mGovn.ExtensionsManager;
  readonly callModuleDefaultFn: (
    fn: (...args: unknown[]) => Promise<unknown>,
  ) => Promise<unknown>;
  readonly inventory?: rGovn.ServerRuntimeScriptInventory<Script>;
}

export interface ExecuteForeignCodeResult<
  Value = unknown,
> {
  identifiedScript?: rGovn.ServerRuntimeScript;
  fcSupplier?: rGovn.ForeignCodeSupplier;
  fcExecArgs?: URLSearchParams;
  value?: Value;
  error?: unknown;
  errorCtx?: Record<string, unknown>;
  moduleInstance?: unknown;
  moduleInstanceDataURL?: string;
}

export async function executeForeignCode<
  Payload extends ForeignCodePayload,
  Value = unknown,
>(
  params: ExecuteForeignCodeArgsSupplier<Payload>,
): Promise<ExecuteForeignCodeResult<Value>> {
  const { payload } = params;
  const result: ExecuteForeignCodeResult = {};

  const valueResult = (value: unknown) => {
    result.value = value;
    return result as ExecuteForeignCodeResult<Value>;
  };

  const errorResult = (error: unknown, errorCtx?: Record<string, unknown>) => {
    result.error = error;
    result.errorCtx = errorCtx;
    return result as ExecuteForeignCodeResult<Value>;
  };

  if (guard.isForeignCodeIdentitySupplier(payload)) {
    if (!params.inventory) {
      return errorResult("identified script provided without an inventory");
    }
    result.identifiedScript = params.inventory.script(
      payload.foreignCodeIdentity,
    );
    if (result.identifiedScript) {
      result.fcSupplier = result.identifiedScript.foreignModule;
    } else {
      return errorResult("identified script not found", {
        searchedForID: payload.foreignCodeIdentity,
        available: Array.from(params.inventory.scriptIdentities()),
      });
    }
  } else {
    if (isPayloadForeignJsTsModuleSupplier(payload)) {
      result.fcSupplier = payload.foreignModule;
    } else {
      return errorResult("payload is not Typescript or Javascript");
    }
  }

  if (!result.fcSupplier) {
    return errorResult("unable to determine foreign code from payload");
  }

  // if the foreign code supplier has exec args, they are the defaults
  if (guard.isForeignCodeExecutArgsSupplier(result.fcSupplier)) {
    result.fcExecArgs = result.fcSupplier.foreignCodeExecArgs;
  }
  if (guard.isForeignCodeExecutArgsSupplier(payload)) {
    if (result.fcExecArgs) {
      result.fcExecArgs = new URLSearchParams({
        ...Object.fromEntries(result.fcExecArgs),
        ...Object.fromEntries(payload.foreignCodeExecArgs),
      });
    } else {
      result.fcExecArgs = payload.foreignCodeExecArgs;
    }
  }

  const source = {
    typescript: isTypescriptForeignCodeSupplier(result.fcSupplier)
      ? (() => result.fcSupplier!.foreignCode)
      : undefined,
    javascript: isJavascriptForeignCodeSupplier(result.fcSupplier)
      ? (() => result.fcSupplier!.foreignCode)
      : undefined,
  };
  if (source.javascript || source.typescript) {
    const [moduleInstance, moduleInstanceDataURL] = await params.extensions
      .importDynamicScript(
        source,
      );
    result.moduleInstance = moduleInstance;
    result.moduleInstanceDataURL = moduleInstanceDataURL;
    if (moduleInstance && moduleInstance.isValid) {
      // deno-lint-ignore no-explicit-any
      const value = (moduleInstance.module as any).default;
      if (typeof value === "function") {
        return valueResult(
          await params.callModuleDefaultFn(value),
        );
      } else if (value) {
        return valueResult(value);
      } else {
        return errorResult(
          "imported valid payload but no valid module default was found",
        );
      }
    } else {
      return errorResult(
        "unable to import payload as data URL",
        { importError: moduleInstance?.importError },
      );
    }
  } else {
    return errorResult(
      "payload is not Typescript or Javascript",
    );
  }
}
