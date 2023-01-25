import { fs } from "../deps.ts";
import * as c from "../content/mod.ts";
import * as r from "../../route/mod.ts";
import * as p from "../persist/mod.ts";

export const htmlContentNature:
  & c.MediaTypeNature<c.HtmlResource>
  & c.HtmlSuppliersFactory
  & p.FileSysPersistenceSupplier<c.HtmlResource> = {
    mediaType: c.htmlMediaTypeNature.mediaType,
    guard: c.htmlMediaTypeNature.guard,
    prepareHTML: c.prepareHTML,
    persistFileSysRefinery: (
      rootPath,
      namingStrategy,
      eventsEmitter,
      ...functionArgs
    ) => {
      return async (resource) => {
        if (c.isHtmlSupplier(resource)) {
          await p.persistResourceFile(
            resource,
            resource.html,
            namingStrategy(
              resource as unknown as r.RouteSupplier<r.RouteNode>,
              rootPath,
            ),
            {
              ensureDirSync: fs.ensureDirSync,
              functionArgs,
              eventsEmitter,
            },
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
      if (c.isHtmlSupplier(resource)) {
        await p.persistResourceFile(
          resource,
          resource.html,
          namingStrategy(
            resource as unknown as r.RouteSupplier<r.RouteNode>,
            rootPath,
          ),
          { ensureDirSync: fs.ensureDirSync, functionArgs, eventsEmitter },
        );
      }
    },
  };
