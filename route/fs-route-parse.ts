import { path } from "./deps.ts";
import * as h from "../text/human.ts";

/**
 * This is a "lightweight" file system route parser designed for us by either
 * the user agent (browser/client) or the server. Perform careful testing to
 * make sure it doesn't have any server-side dependencies.
 */

export type FileExtnModifiers = string[];

export interface ParsedFileSysRoute {
  readonly parsedPath: path.ParsedPath;
  readonly modifiers?: FileExtnModifiers;
  readonly modifiersText?: string;
  readonly routeUnit: { readonly unit: string; readonly label: string };
}

export interface FileSysRouteParser {
  (
    fileSysPath: string | ParsedFileSysRoute,
    commonAncestor: string,
  ): ParsedFileSysRoute;
}

/**
 * Parses a file system path and returns the unit and label as the name of the
 * file. If there are any extra extensions in the file they are returned as
 * "modifiers".
 * @param fsp
 * @returns
 */
export const typicalFileSysRouteParser: FileSysRouteParser = (fsp) => {
  let parsedPath: path.ParsedPath;
  let modifiers: string[] | undefined;
  if (typeof fsp === "string") {
    parsedPath = path.parse(fsp);
    if (parsedPath.name.indexOf(".") > 0) {
      modifiers = [];
      let ppn = parsedPath.name;
      let modifier = path.extname(ppn);
      while (modifier && modifier.length > 0) {
        modifiers.push(modifier);
        ppn = ppn.substring(0, ppn.length - modifier.length);
        modifier = path.extname(ppn);
      }
      parsedPath.name = ppn;
    }
    return {
      parsedPath,
      modifiers,
      modifiersText: modifiers ? modifiers.join("") : undefined,
      routeUnit: { unit: parsedPath.name, label: parsedPath.name },
    };
  }
  return fsp; // no transformation
};

/**
 * Parses a file system path and returns the unit as the name of the file and
 * the label as a human-friendly version of the file name.
 * @param fsp
 * @returns
 */
export const humanFriendlyFileSysRouteParser: FileSysRouteParser = (
  fsp,
  ca,
) => {
  const typical = typicalFileSysRouteParser(fsp, ca);
  return {
    parsedPath: typical.parsedPath,
    modifiers: typical.modifiers,
    routeUnit: {
      ...typical.routeUnit,
      label: h.humanFriendlyPhrase(typical.parsedPath.name),
    },
  };
};
