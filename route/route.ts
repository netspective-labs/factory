import * as safety from "../safety/mod.ts";
import * as e from "../module/mod.ts";
import * as ws from "../workspace/mod.ts";
import * as fm from "../text/frontmatter.ts";
import * as govn from "./governance.ts";

export const [isRouteUnit, isRouteUnitsArray] = safety.typeGuards<
  govn.RouteUnit,
  govn.RouteUnit[]
>("unit", "label");

export const isRootRouteUnit = safety.typeGuard<govn.RootRouteUnit>(
  "isRootUnit",
  "unit",
  "label",
);

export const [isRouteNode, isRouteNodesArray] = safety
  .typeGuards<govn.RouteNode, govn.RouteNode[]>(
    "unit",
    "label",
    "level",
    "qualifiedPath",
  );

export const isParsedRouteConsumer = safety.typeGuard<govn.ParsedRouteConsumer>(
  "consumeParsedRoute",
);

export const isRedirectSupplier = safety.typeGuard<govn.RedirectSupplier>(
  "redirect",
);

export function isRedirectUrlSupplier(
  o: unknown,
): o is govn.RedirectUrlSupplier {
  return isRedirectSupplier(o) && typeof o.redirect === "string";
}

export function isRedirectNodeSupplier(
  o: unknown,
): o is govn.RedirectNodeSupplier {
  return isRedirectSupplier(o) && isRouteNode(o.redirect);
}

export function isRouteUnits<Unit extends govn.RouteUnit>(
  o: unknown,
): o is govn.RouteUnits<Unit> {
  const isType = safety.typeGuard<govn.RouteUnits>("units");
  if (isType(o) && (isRouteUnitsArray(o.units))) {
    return true;
  }
  return false;
}

export function isRoute<Unit extends govn.RouteNode>(
  o: unknown,
): o is govn.Route<Unit> {
  const isType = safety.typeGuard<govn.Route>("units");
  if (isType(o) && (isRouteNodesArray(o.units))) {
    return true;
  }
  return false;
}

export function isRouteUnitsSupplier(o: unknown): o is govn.RouteUnitsSupplier {
  const isType = safety.typeGuard<govn.RouteUnitsSupplier>("route");
  if (isType(o) && isRouteUnitsArray(o.route?.units)) {
    return true;
  }
  return false;
}

export function isParsedRouteSupplier(
  o: unknown,
): o is govn.ParsedRouteSupplier {
  // be liberal with routes coming from parsed sources like YAML/frontmatter
  // so that the parsed route consumers can make decisions about final values
  const isType = safety.typeGuard<govn.ParsedRouteSupplier>("route");
  return isType(o);
}

export function isRouteSupplier(
  o: unknown,
): o is govn.RouteSupplier {
  const isType = safety.typeGuard<govn.RouteSupplier>("route");
  if (isType(o) && isRouteNodesArray(o.route.units)) {
    return true;
  }
  return false;
}

export function routeModuleOrigin(
  moduleImportMetaURL: string,
  label: string,
): govn.ModuleRouteOrigin {
  return {
    isRouteOrigin: true,
    moduleImportMetaURL,
    label,
  };
}

export const isModuleRouteOrigin = safety.typeGuard<govn.ModuleRouteOrigin>(
  "isRouteOrigin",
  "moduleImportMetaURL",
  "label",
);

export function routeNodeLocation(
  ru: govn.RouteNode,
  options?: govn.RouteLocationOptions,
): govn.RouteLocation {
  const dest = ru.qualifiedPath;
  if (options) {
    if (options.routeLocation) {
      return options.routeLocation(ru, options.base);
    }
    if (options.routeURL) {
      const url = options.routeURL(ru, options.base);
      return url.toString();
    }
    if (options.base) {
      return `${options.base}${dest}`;
    }
  }
  return `${dest}`;
}

/**
 * Clone properties from parsed into dest if the property in parsed does not
 * already exist in dest.
 * @param parsed The parsed (source) route unit
 * @param dest The destination route unit
 * @returns The destination route unit
 */
export const inheritParsedProperties = (
  parsed: govn.RouteUnit,
  dest: govn.RouteUnit,
  exclude: string[],
): govn.RouteUnit => {
  if (typeof parsed === "object") {
    const source = parsed as unknown as Record<string, unknown>;
    const merged = dest as unknown as Record<string, unknown>;
    for (const prop in source) {
      if (!(prop in merged) && !(exclude.find((p) => p == prop))) {
        merged[prop] = e.deepClone(source[prop]);
      }
    }
    return merged as unknown as govn.RouteUnit;
  }
  return dest;
};

export function consumeParsedRoute(
  src: govn.ParsedRouteSupplier<govn.RouteUnit> | fm.UntypedFrontmatter,
  dest: govn.Route | govn.RouteSupplier,
) {
  const destUnits = isRouteSupplier(dest) ? dest.route.units : dest.units;
  if (typeof src?.route === "object") {
    const parsed = src.route as unknown as govn.RouteUnit;
    if (destUnits.length > 0) {
      const activeUnitIndex = destUnits.length - 1;
      const destUnit = destUnits[activeUnitIndex];
      if (parsed.unit) {
        // deno-lint-ignore no-explicit-any
        (destUnit.unit as any) = parsed.unit;
        if (activeUnitIndex > 0) {
          const parentUnit = destUnits[activeUnitIndex - 1];
          // deno-lint-ignore no-explicit-any
          (destUnit.qualifiedPath as any) = parentUnit.qualifiedPath + "/" +
            destUnit.unit;
        } else {
          // deno-lint-ignore no-explicit-any
          (destUnit.qualifiedPath as any) = "/" + destUnit.unit;
        }
      }
      const parsedUntyped = src.route as Record<string, unknown>;
      if (parsedUntyped.alias || parsedUntyped.aliases) {
        // these are more convenient than using routeAliases.target
        const mergeAlias = (alias: Record<string, string>) => {
          let aliases = destUnit.aliases;
          if (!aliases) {
            aliases = [];
            // deno-lint-ignore no-explicit-any
            (destUnit.aliases as any) = aliases;
          }
          if (typeof alias === "string") {
            aliases.push(alias);
          } else {
            if (typeof alias === "object") {
              const routeIdOrPath = alias.path || alias.routeIdOrPath;
              if (routeIdOrPath && typeof routeIdOrPath === "string") {
                const spec: govn.RouteAlias = { routeIdOrPath, ...alias };
                // deno-lint-ignore no-explicit-any
                delete (spec as any).path;
                aliases.push(spec);
              }
            }
          }
        };
        if (parsedUntyped.alias) {
          mergeAlias(parsedUntyped.alias as unknown as Record<string, string>);
        } else if (
          parsedUntyped.aliases && Array.isArray(parsedUntyped.aliases)
        ) {
          const aliases = parsedUntyped.aliases as unknown as Record<
            string,
            string
          >[];
          for (const alias of aliases) {
            mergeAlias(alias);
          }
        }
      }
      // deno-lint-ignore no-explicit-any
      if (parsed.label) (destUnit as any).label = parsed.label;
      inheritParsedProperties(parsed, destUnit, ["alias", "aliases"]);
    }
  }
  return src;
}

export const emptyRoute: govn.Route = {
  units: [],
  consumeParsedRoute: (pr) => pr,
  inRoute: () => undefined,
  parent: undefined,
};

export const emptyRouteSupplier: govn.RouteSupplier = {
  route: emptyRoute,
};

/**
 * Convert relative path to absolute
 * @param base the path that `relative` is relative to
 * @param relative the path relative to `base` (can be ./, ../.., etc.)
 * @returns
 */
export function absolutePath(base: string, relative: string) {
  const stack = base.split("/");
  const parts = relative.split("/");
  stack.pop(); // remove current file name (or empty string)
  // (omit if "base" is the current folder without trailing slash)
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] == ".") {
      continue;
    }
    if (parts[i] == "..") {
      stack.pop();
    } else {
      stack.push(parts[i]);
    }
  }
  return stack.join("/");
}

/**
 * Convert relative path to absolute
 * @param base the path that `relative` is relative to
 * @param relative the path relative to `base` (can be ./, ../.., etc.)
 * @returns
 */
export function resolveRouteUnit(
  relative: string,
  currentUnitIndex: number,
  route: govn.Route,
  noMatch?: (endIndex: number, parseError?: boolean) => govn.RouteUnit,
): govn.RouteUnit | undefined {
  let unitIndex = currentUnitIndex;
  const parts = relative.split("/");
  // (omit if "base" is the current folder without trailing slash)
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] == "." || parts[i] == "") {
      continue;
    }
    if (parts[i] == "..") {
      unitIndex--;
    } else {
      return noMatch ? noMatch(unitIndex, true) : undefined;
    }
  }
  if (unitIndex >= 0 && unitIndex < route.units.length) {
    return route.units[unitIndex];
  }
  return noMatch ? noMatch(unitIndex) : undefined;
}

export function defaultRouteLocationResolver(
  resolverOptions?: {
    readonly defaultOptions?: govn.RouteLocationOptions;
    readonly enhance?: (
      suggested: govn.RouteLocation,
      node: govn.RouteNode,
      options?: govn.RouteLocationOptions,
    ) => govn.RouteLocation;
  },
): govn.RouteLocationResolver {
  const enhance = resolverOptions?.enhance;
  return enhance
    ? ((node, options) => {
      // first run the default behavior
      const result = routeNodeLocation(
        node,
        options || resolverOptions?.defaultOptions,
      );
      // now wrap the customization
      return enhance(result, node, options || resolverOptions?.defaultOptions);
    })
    : routeNodeLocation;
}

export class TypicalRouteFactory implements govn.RouteFactory {
  constructor(
    readonly routeLocationResolver: govn.RouteLocationResolver,
    readonly routeWSEditorResolver?: govn.RouteWorkspaceEditorResolver<
      ws.WorkspaceEditorTarget
    >,
  ) {
  }
  /**
   * Return a units array and accessor suitable for preparing routes. This
   * method may be overridden to replace accessor or otherwise modify the route
   * units.
   * @param rus The instance to extract the units array and accessor from
   * @returns The units array and accessor which route constructor can use
   */
  routeUnits(
    rs: govn.RouteUnit | govn.RouteUnits | govn.RouteUnitsSupplier,
  ): [units: govn.RouteUnit[], accessor: (index: number) => govn.RouteUnit] {
    const units = isRouteUnitsSupplier(rs)
      ? rs.route.units
      : (isRouteUnits(rs) ? rs.units : [rs]);
    const accessor: (index: number) => govn.RouteUnit = (index) => {
      return units[index];
    };
    return [units, accessor];
  }

  route(
    rs: govn.RouteUnit | govn.RouteUnits | govn.RouteUnitsSupplier,
  ): govn.Route {
    const [units, accessor] = this.routeUnits(rs);
    const hierUnits: govn.RouteNode[] = [];
    const terminalIndex = units.length - 1;
    const parentIndex = terminalIndex - 1;
    let qualifiedPath = "";
    for (let i = 0; i < units.length; i++) {
      const component = accessor(i);
      qualifiedPath += "/" + component.unit;
      const node: govn.RouteNode = {
        level: i,
        qualifiedPath,
        resolve: (relative) => resolveRouteUnit(relative, i, result),
        location: (options) => this.routeLocationResolver(node, options),
        isIntermediate: i < terminalIndex,
        inRoute: (route) => route.inRoute(node) ? true : false,
        ...component,
      };
      hierUnits.push(node);
    }
    const parent = parentIndex >= 0
      ? this.route({ units: hierUnits.slice(0, parentIndex) })
      : undefined;
    const result: govn.Route = {
      units: hierUnits,
      consumeParsedRoute: (pr) => consumeParsedRoute(pr, result),
      terminal: hierUnits.length > 0 ? hierUnits[terminalIndex] : undefined,
      inRoute: (unit) => {
        return hierUnits.find((u) => u.qualifiedPath == unit.qualifiedPath);
      },
      parent,
    };
    return result;
  }

  childRoute(
    child: govn.RouteUnit,
    rs:
      | govn.Route
      | govn.RouteSupplier,
    replaceTerminal?: boolean,
  ): govn.Route {
    const rh = isRouteSupplier(rs) ? rs.route : rs;
    const hierUnits = [...rh.units];
    let terminalIndex = -1;
    let qualifiedPath = "";
    if (replaceTerminal) {
      if (hierUnits.length > 1) {
        const grandparent = hierUnits[hierUnits.length - 2];
        terminalIndex = hierUnits.length - 1;
        qualifiedPath = grandparent.qualifiedPath;
        hierUnits[hierUnits.length - 2] = {
          ...grandparent,
          isIntermediate: true,
        };
      } else {
        terminalIndex = 0;
      }
    } else {
      if (hierUnits.length > 0) {
        const parent = hierUnits[hierUnits.length - 1];
        terminalIndex = hierUnits.length;
        qualifiedPath = parent.qualifiedPath;
        hierUnits[hierUnits.length - 1] = {
          ...parent,
          isIntermediate: true,
        };
      } else {
        terminalIndex = 0;
      }
    }
    qualifiedPath += "/" + child.unit;
    const node: govn.RouteNode = {
      level: terminalIndex,
      qualifiedPath,
      resolve: (relative) => resolveRouteUnit(relative, terminalIndex, result),
      location: (options) => this.routeLocationResolver(node, options),
      isIntermediate: false,
      inRoute: (route) => route.inRoute(node) ? true : false,
      ...child,
    };
    hierUnits[terminalIndex] = node;
    const parent = terminalIndex - 1 >= 0
      ? this.route({ units: hierUnits.slice(0, terminalIndex - 1) })
      : undefined;
    const result: govn.Route = {
      units: hierUnits,
      consumeParsedRoute: (pr) => consumeParsedRoute(pr, result),
      terminal: hierUnits.length > 0 ? hierUnits[terminalIndex] : undefined,
      inRoute: (unit) => {
        return hierUnits.find((u) => u.qualifiedPath == unit.qualifiedPath);
      },
      parent,
    };
    return result;
  }
}
