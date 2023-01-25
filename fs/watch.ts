import * as events from "https://deno.land/x/eventemitter@1.2.4/mod.ts";

export interface FsWatchEvent {
  readonly path: string;
  readonly fsEventIndex: number;
  readonly pathIndex: number;
  readonly fsEvent: Deno.FsEvent;
  readonly watcher: Deno.FsWatcher;
}

export class WatchableFileSysEventEmitter extends events.EventEmitter<{
  create(event: FsWatchEvent): Promise<void>;
  modify(event: FsWatchEvent): Promise<void>;
  remove(event: FsWatchEvent): Promise<void>;
  impacted(event: FsWatchEvent): Promise<void>;
}> {}

export interface WatchableFileSysPath {
  readonly identity?: string;
  readonly path: string;
  readonly trigger: (
    event: Deno.FsEvent,
    watcher: Deno.FsWatcher,
  ) => Promise<number>;
  readonly onEvent: (event: FsWatchEvent) => Promise<void>;
}

export function typicalWatchableFS(
  absPath: string,
  wfsEE: WatchableFileSysEventEmitter,
  options?: Partial<Omit<WatchableFileSysPath, "path">>,
): WatchableFileSysPath {
  let fsEventIndex = 0;
  let pathIndex = 0;
  const result: WatchableFileSysPath = {
    path: absPath,
    identity: options?.identity,
    trigger: async (fsEvent, watcher) => {
      fsEventIndex++;

      for (const path of fsEvent.paths) {
        if (path.startsWith(absPath)) {
          await result.onEvent({
            path,
            fsEventIndex,
            pathIndex,
            fsEvent,
            watcher,
          });
          pathIndex++;
        }
      }

      return fsEvent.paths.length;
    },
    onEvent: options?.onEvent ? options?.onEvent : async (event) => {
      const fse = event.fsEvent;
      switch (fse.kind) {
        case "create":
          await wfsEE.emit("impacted", event);
          await wfsEE.emit("create", event);
          break;

        case "modify":
          await wfsEE.emit("impacted", event);
          await wfsEE.emit("modify", event);
          break;

        case "remove":
          await wfsEE.emit("impacted", event);
          await wfsEE.emit("remove", event);
          break;
      }
    },
  };
  return result;
}
