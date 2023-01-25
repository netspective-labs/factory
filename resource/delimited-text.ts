import { fs } from "./deps.ts";
import * as safety from "../safety/mod.ts";
import * as c from "./content/mod.ts";
import * as coll from "./collection/mod.ts";
import * as r from "../route/mod.ts";
import * as p from "./persist/mod.ts";

export interface DelimitedTextSupplier<State> {
  readonly isDelimitedTextSupplier: true;
  readonly header?: string | ((rc: State) => string[]);
  readonly rows:
    | string[]
    | ((rc: State) => Iterable<string[]>);
}

export const isDelimitedTextSupplier = safety.typeGuard<
  DelimitedTextSupplier<unknown>
>(
  "isDelimitedTextSupplier",
  "rows",
);

export interface DelimitedTextResource<State>
  extends DelimitedTextSupplier<State>, c.TextResource {
}

export const isDelimitedTextResource = safety.typeGuard<
  DelimitedTextResource<unknown>
>(
  "nature",
  "text",
  "textSync",
  "isDelimitedTextSupplier",
  "rows",
);

export interface DelimitedTextProducerArguments<State> {
  readonly destRootPath: string;
  readonly state: State;
  readonly nature: c.MediaTypeNature<c.TextResource>;
  readonly namingStrategy: p.LocalFileSystemNamingStrategy<
    r.RouteSupplier<r.RouteNode>
  >;
  readonly rowRenderer: (row: string[], state: State) => string;
  readonly headerRenderer?: (header: string[], state: State) => string;
  readonly rowsDelim: string;
  readonly eventsEmitter?: p.FileSysPersistenceEventsEmitter;
}

export function delimitedTextProducer<State>(
  {
    destRootPath,
    state,
    nature,
    namingStrategy: ns,
    rowRenderer,
    headerRenderer,
    rowsDelim,
    eventsEmitter,
  }: DelimitedTextProducerArguments<State>,
  // deno-lint-ignore no-explicit-any
): coll.ResourceRefinery<any> {
  return async (resource) => {
    let csvResource: DelimitedTextResource<State> | undefined;
    if (isDelimitedTextResource(resource)) {
      csvResource = resource;
    } else if (isDelimitedTextSupplier(resource)) {
      let rowsText: string[];
      if (typeof resource.rows === "function") {
        rowsText = [];
        const rows = resource.rows(state);
        for (const row of rows) {
          rowsText.push(rowRenderer(row, state));
        }
      } else {
        rowsText = Array.from(resource.rows);
      }
      if (headerRenderer && resource.header) {
        if (typeof resource.header === "string") {
          rowsText.unshift(resource.header);
        } else {
          rowsText.unshift(headerRenderer(resource.header(state), state));
        }
      }
      const text = rowsText.join(rowsDelim);
      csvResource = {
        ...resource,
        nature,
        text,
        textSync: text,
      };
    }
    if (csvResource) {
      await p.persistResourceFile(
        csvResource,
        csvResource,
        ns(
          csvResource as unknown as r.RouteSupplier<r.RouteNode>,
          destRootPath,
        ),
        {
          ensureDirSync: fs.ensureDirSync,
          functionArgs: [state],
          eventsEmitter,
        },
      );
      return csvResource;
    }
    return resource; // we cannot handle this type of rendering target, no change to resource
  };
}

export const csvMediaTypeNature: c.MediaTypeNature<
  DelimitedTextResource<unknown>
> = {
  mediaType: "text/csv",
  // deno-lint-ignore no-explicit-any
  guard: (o: unknown): o is DelimitedTextResource<any> => {
    if (
      c.isNatureSupplier(o) && c.isMediaTypeNature(o.nature) &&
      o.nature.mediaType === csvMediaTypeNature.mediaType &&
      isDelimitedTextSupplier(o)
    ) {
      return true;
    }
    return false;
  },
};

export const csvContentNature:
  & c.MediaTypeNature<DelimitedTextResource<unknown>>
  & c.TextSuppliersFactory
  & p.FileSysPersistenceSupplier<DelimitedTextResource<unknown>> = {
    mediaType: csvMediaTypeNature.mediaType,
    guard: csvMediaTypeNature.guard,
    prepareText: c.prepareText,
    persistFileSysRefinery: (
      rootPath,
      namingStrategy,
      eventsEmitter,
      ...functionArgs
    ) => {
      return async (resource) => {
        if (c.isTextSupplier(resource)) {
          await p.persistResourceFile(
            resource,
            resource,
            namingStrategy(
              resource as unknown as r.RouteSupplier<r.RouteNode>,
              rootPath,
            ),
            { ensureDirSync: fs.ensureDirSync, eventsEmitter, functionArgs },
          );
        }
        return resource;
      };
    },
    persistFileSys: async (
      resource,
      rootPath,
      namingStrategy,
      eventsEmitter,
      ...functionArgs
    ) => {
      if (c.isTextSupplier(resource)) {
        await p.persistResourceFile(
          resource,
          resource,
          namingStrategy(
            resource as unknown as r.RouteSupplier<r.RouteNode>,
            rootPath,
          ),
          { ensureDirSync: fs.ensureDirSync, eventsEmitter, functionArgs },
        );
      }
    },
  };

export function csvProducer<State>(
  destRootPath: string,
  state: State,
  eventsEmitter?: p.FileSysPersistenceEventsEmitter,
): coll.ResourceRefinery<DelimitedTextResource<State>> {
  return delimitedTextProducer({
    destRootPath,
    state,
    nature: csvMediaTypeNature,
    namingStrategy: p.routePersistForceExtnNamingStrategy(".csv"),
    rowRenderer: () => "",
    headerRenderer: () => "",
    rowsDelim: "\n",
    eventsEmitter,
  });
}
