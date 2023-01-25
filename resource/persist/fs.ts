import { path } from "../deps.ts";
import * as safety from "../../safety/mod.ts";
import * as govn from "./governance.ts";
import * as c from "../content/mod.ts";
import * as coll from "../collection/mod.ts";
import * as rt from "../../route/mod.ts";

export const isLocalFileSystemDestsListener = safety.typeGuard<
  govn.LocalFileSystemDestsListener<unknown>
>("persistedLocalFileSysDest");

export interface PersistOptions<Context> {
  readonly ensureDirSync?: (destFileName: string) => void;
  readonly unhandledSync?: c.FlexibleContentSync;
  readonly unhandled?: c.FlexibleContent;
  readonly functionArgs?: unknown[];
  readonly eventsEmitter?: govn.FileSysPersistenceEventsEmitter;
  readonly context?: Context;
}

export function isFileSysPersistenceSupplier<Resource>(
  o: unknown,
): o is govn.FileSysPersistenceSupplier<Resource> {
  const isType = safety.typeGuard<
    govn.FileSysPersistenceSupplier<Resource>
  >("persistFileSys", "persistFileSysRefinery");
  return isType(o);
}

export const isFileSysTextPersistenceNamingStrategySupplier = safety.typeGuard<
  govn.FileSysPersistenceNamingStrategySupplier
>("persistFileSysNamingStrategy");

export function routePersistForceExtnNamingStrategy(
  fileExtn: string,
): govn.LocalFileSystemNamingStrategy<rt.RouteSupplier> {
  return (resource, destPath) => {
    const routeUnit = resource.route.terminal;
    if (routeUnit) {
      const parentUnit = routeUnit.level > 0
        ? resource.route.units[routeUnit.level - 1]
        : undefined;
      const fileName = c.replaceExtn(routeUnit.unit, fileExtn);
      return parentUnit
        ? path.join(destPath, parentUnit.qualifiedPath, fileName)
        : path.join(destPath, fileName);
    }
    return "no_terminal_route_in_routePersistForceExtnNamingStrategy" +
      fileExtn;
  };
}

export function routePersistPrettyUrlHtmlNamingStrategy(
  isIndex: (unit: rt.RouteUnit) => boolean,
): govn.LocalFileSystemNamingStrategy<rt.RouteSupplier> {
  const typical = routePersistForceExtnNamingStrategy(".html");
  return (resource, destPath) => {
    const routeUnit = resource.route.terminal;
    if (routeUnit) {
      if (isIndex(routeUnit)) return typical(resource, destPath);
      return path.join(destPath, routeUnit.qualifiedPath, "index.html");
    }
    return "no_terminal_route_in_routePersistPrettyUrlHtmlNamingStrategy.html";
  };
}

export async function persistContributionFile<Context>(
  contributor: c.FlexibleContent | c.FlexibleContentSync | string,
  destFileName: govn.LocalFileSystemDestination,
  options?: PersistOptions<Context>,
): Promise<false | govn.FileSysPersistResult<Context>> {
  const beforePersist = Date.now();
  const ee = options?.eventsEmitter;
  const defaults = {
    destFileName,
    contributor,
    context: options?.context,
  };
  let result: govn.FileSysPersistResult<Context>;
  // always ensure in sync mode, never async
  if (options?.ensureDirSync) {
    options?.ensureDirSync(path.dirname(destFileName));
  }
  if (typeof contributor === "string") {
    await Deno.writeTextFile(destFileName, contributor);
    result = {
      ...defaults,
      contribution: "string",
      persistDurationMS: Date.now() - beforePersist,
    };
    await ee?.emit(
      "afterPersistContributionFile",
      result,
    );
    return result;
  }
  if (c.isTextSupplier(contributor)) {
    await Deno.writeTextFile(
      destFileName,
      typeof contributor.text === "string"
        ? contributor.text
        : await contributor.text(...(options?.functionArgs || [])),
    );
    result = {
      ...defaults,
      contribution: "text",
      persistDurationMS: Date.now() - beforePersist,
    };
    await ee?.emit("afterPersistContributionFile", result);
    return result;
  }
  if (c.isUint8ArraySupplier(contributor)) {
    await Deno.writeFile(
      destFileName,
      typeof contributor.uint8Array === "function"
        ? await contributor.uint8Array(...(options?.functionArgs || []))
        : contributor.uint8Array,
    );
    result = {
      ...defaults,
      contribution: "uint8array",
      persistDurationMS: Date.now() - beforePersist,
    };
    await ee?.emit("afterPersistContributionFile", result);
    return result;
  }
  if (c.isContentSupplier(contributor)) {
    const file = await Deno.open(destFileName, { write: true, create: true });
    await contributor.content(file);
    file.close();
    result = {
      ...defaults,
      contribution: "writer",
      persistDurationMS: Date.now() - beforePersist,
    };
    await ee?.emit("afterPersistContributionFile", result);
    return result;
  }
  const syncResult = persistContributionFileSync(
    contributor,
    destFileName,
    options,
  );
  if (syncResult) return syncResult;
  if (options?.unhandled) {
    const recursed = await persistContributionFile(
      options?.unhandled,
      destFileName,
      {
        ...options,
        unhandled: undefined,
      },
    );
    if (recursed && ee) {
      await ee.emit(
        "afterPersistContributionFile",
        {
          destFileName,
          context: options?.context,
          unhandled: true,
          contributor,
          contribution: recursed.contribution,
          persistDurationMS: Date.now() - beforePersist,
        },
      );
    }
    return recursed;
  }
  return false;
}

export function persistContributionFileSync<Context>(
  contributor: c.FlexibleContentSync | c.FlexibleContent | string,
  destFileName: govn.LocalFileSystemDestination,
  options?: PersistOptions<Context>,
): false | govn.FileSysPersistResult<Context> {
  const beforePersist = Date.now();
  const ee = options?.eventsEmitter;
  const defaults = {
    destFileName,
    contributor,
    context: options?.context,
  };
  let result: govn.FileSysPersistResult<Context>;
  if (options?.ensureDirSync) {
    options?.ensureDirSync(path.dirname(destFileName));
  }
  if (typeof contributor === "string") {
    Deno.writeTextFileSync(destFileName, contributor);
    result = {
      ...defaults,
      contribution: "string",
      persistDurationMS: Date.now() - beforePersist,
    };
    ee?.emitSync("afterPersistContributionFileSync", result);
    return result;
  }
  if (c.isTextSyncSupplier(contributor)) {
    Deno.writeTextFileSync(
      destFileName,
      typeof contributor.textSync === "string"
        ? contributor.textSync
        : contributor.textSync(...(options?.functionArgs || [])),
    );
    result = {
      ...defaults,
      contribution: "text",
      persistDurationMS: Date.now() - beforePersist,
    };
    ee?.emitSync("afterPersistContributionFileSync", result);
    return result;
  }
  if (c.isUint8ArraySyncSupplier(contributor)) {
    Deno.writeFileSync(
      destFileName,
      typeof contributor.uint8ArraySync === "function"
        ? contributor.uint8ArraySync(...(options?.functionArgs || []))
        : contributor.uint8ArraySync,
    );
    result = {
      ...defaults,
      contribution: "uint8array",
      persistDurationMS: Date.now() - beforePersist,
    };
    ee?.emitSync("afterPersistContributionFileSync", result);
    return result;
  }
  if (c.isContentSyncSupplier(contributor)) {
    const file = Deno.openSync(destFileName, { write: true, create: true });
    contributor.contentSync(file);
    file.close();
    result = {
      ...defaults,
      contribution: "writer",
      persistDurationMS: Date.now() - beforePersist,
    };
    ee?.emitSync("afterPersistContributionFileSync", result);
    return result;
  }
  if (options?.unhandledSync) {
    const recursed = persistContributionFileSync(
      options.unhandledSync,
      destFileName,
      {
        ...options,
        unhandledSync: undefined,
      },
    );
    if (recursed && ee) {
      ee.emitSync(
        "afterPersistContributionFileSync",
        {
          destFileName,
          context: options?.context,
          unhandled: true,
          contributor,
          contribution: recursed.contribution,
          persistDurationMS: Date.now() - beforePersist,
        },
      );
    }
    return recursed;
  }
  return false;
}

/**
 * persistResourceFile is used to store the output of a resource when the
 * resource and the file output have a 1:1 relationship (meaning the resource
 * is known). When the data being written is not tied 1:1 to a resource, then
 * persistContributionFile or persistContributionFileSync are more useful.
 * @param resource The resource providing the contribution
 * @param contributor The part of the source doing the contribution
 * @param destFileName The file to write
 * @param options Optional arguments
 * @returns
 */
export async function persistResourceFile<
  Resource,
  Context extends coll.ResourceSupplier<Resource>,
>(
  resource: Resource,
  contributor: c.FlexibleContent | c.FlexibleContentSync | string,
  destFileName: govn.LocalFileSystemDestination,
  options?: PersistOptions<Context>,
): Promise<false | govn.FileSysPersistResult<Context>> {
  let pcfPO = options;
  if (pcfPO) {
    if (
      pcfPO.context && typeof pcfPO.context === "object" &&
      !("resource" in pcfPO.context)
    ) {
      pcfPO = {
        ...pcfPO,
        context: { ...(pcfPO.context as Context), resource },
      };
    } else {
      pcfPO = { ...pcfPO };
      // deno-lint-ignore no-explicit-any
      (pcfPO as any).context = { resource } as PersistOptions<Context>;
    }
  }
  const result = await persistContributionFile<Context>(
    contributor,
    destFileName,
    pcfPO ?? ({ context: { resource } } as PersistOptions<Context>),
  );

  // if a resource implements LocalFileSystemDestsSupplier it means that it
  // would like to track its locally generated files; if the interface is not
  // implemented, no tracking occurs but the event emitter would still fire.
  // If the resource handles persistedLocalFileSysDest event then it's
  // responsible for calling proper eventsEmitter.afterPersistResourceFile or
  // other events that would be otherwise automatically called.
  if (result && isLocalFileSystemDestsListener(resource)) {
    resource.persistedLocalFileSysDest({
      persistedLocalFileSysResult: result,
      persistedLocalFileSysDest: destFileName,
      resource,
    }, options?.eventsEmitter);
  } else if (result) {
    options?.eventsEmitter?.emit("afterPersistResourceFile", resource, result);
  }
  return result;
}
