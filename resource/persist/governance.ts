import { events } from "../deps.ts";
import * as c from "../content/mod.ts";
import * as coll from "../collection/mod.ts";
import * as route from "../../route/mod.ts";

export type LocalFileSystemDestinationRootPath = string;
export type LocalFileSystemDestination = string;

export interface LocalFileSystemNamingStrategy<Resource> {
  (product: Resource, destPath: string): LocalFileSystemDestination;
}

export interface FileSysPersistenceNamingStrategySupplier {
  readonly persistFileSysNamingStrategy: LocalFileSystemNamingStrategy<
    route.RouteSupplier
  >;
}

export interface FileSysPersistResult<Context = unknown> {
  readonly destFileName: string;
  readonly contributor: c.FlexibleContent | c.FlexibleContentSync | string;
  readonly contribution:
    | "string"
    | "text"
    | "uint8array"
    | "writer";
  readonly persistDurationMS: number;
  readonly unhandled?: boolean;
  readonly context?: Context;
}

export interface LocalFileSystemPersistDestSupplier<Context> {
  readonly persistedLocalFileSysResult: FileSysPersistResult<Context>;
  readonly persistedLocalFileSysDest: LocalFileSystemDestination;
}

/**
 * Resources can implement this interface if they would like to be notified when
 * their content is being written to a local file system. If the resource handles
 * persistedLocalFileSysDest event then it's responsible for calling proper
 * eventsEmitter.afterPersistResourceFile or other events that would be otherwise
 * automatically called.
 */
export interface LocalFileSystemDestsListener<Context> {
  readonly persistedLocalFileSysDest: (
    lfsds:
      & LocalFileSystemPersistDestSupplier<Context>
      & coll.ResourceSupplier<unknown>,
    eventsEmitter?: FileSysPersistenceEventsEmitter,
  ) => FileSysPersistResult<Context>;
}

export class FileSysPersistenceEventsEmitter extends events.EventEmitter<{
  afterPersistContributionFile(fspr: FileSysPersistResult): void;
  afterPersistContributionFileSync(fspr: FileSysPersistResult): void;
  afterPersistResourceFile<Resource>(
    resource: Resource,
    fspr: FileSysPersistResult,
  ): void;
}> {}

export interface FileSysPersistenceSupplier<Resource> {
  readonly persistFileSysRefinery: (
    rootPath: LocalFileSystemDestinationRootPath,
    namingStrategy: LocalFileSystemNamingStrategy<route.RouteSupplier>,
    fspEE?: FileSysPersistenceEventsEmitter,
    ...functionArgs: unknown[]
  ) => coll.ResourceRefinery<Resource>;
  readonly persistFileSys: (
    resource: Resource,
    rootPath: LocalFileSystemDestinationRootPath,
    namingStrategy: LocalFileSystemNamingStrategy<route.RouteSupplier>,
    fspEE?: FileSysPersistenceEventsEmitter,
    ...functionArgs: unknown[]
  ) => Promise<void>;
}
