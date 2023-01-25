import { testingAsserts as ta } from "./deps-test.ts";
import { log, path } from "./deps.ts";
import { CachedExtensions } from "../module/mod.ts";
import * as fsr from "./fs-route-parse.ts";
import * as fm from "../text/frontmatter.ts";
import * as govn from "./governance.ts";
import * as mod from "./mod.ts";

type ComparableRoute = Omit<govn.RouteNode, "resolve" | "location" | "inRoute">;

const testPath = path.relative(
  Deno.cwd(),
  path.dirname(import.meta.url).substring("file://".length),
);

const routeFactory = new mod.TypicalRouteFactory(
  mod.defaultRouteLocationResolver(),
  mod.defaultRouteWorkspaceEditorResolver(() => undefined),
);

const root1: govn.RouteUnit = {
  unit: "home",
  label: "Home",
};

const module1: govn.RouteUnit = {
  unit: "module1",
  label: "Module 1",
};

const m1Component1: govn.RouteUnit = {
  unit: "component1",
  label: "Module 1 Component 1",
};

const module2: govn.RouteUnit = {
  unit: "module2",
  label: "Module 2",
};

const m2Component1: govn.RouteUnit = {
  unit: "component1",
  label: "Module 2 Component 1",
};

const m2Component1Service1: govn.RouteUnit = {
  unit: "service1",
  label: "Module 2 Component 1 Service 1",
};

const homeRoute: govn.RouteUnits = { units: [root1] };
const module1Route: govn.RouteUnits = { units: [root1, module1] };
const m1Component1Route: govn.RouteUnits = {
  units: [root1, module1, m1Component1],
};
const m2Component1Service1Route: govn.RouteUnits = {
  units: [
    root1,
    module2,
    m2Component1,
    m2Component1Service1,
  ],
};

export function assertable(route: govn.Route) {
  for (const unit of route.units) {
    // deno-lint-ignore no-explicit-any
    const unitUntyped = unit as any;
    delete unitUntyped.resolve; // this is a function and hard to compare
    delete unitUntyped.resolveRoute; // this is a function and hard to compare
    delete unitUntyped.location; // this is a function and hard to compare
    delete unitUntyped.inRoute; // this is a function and hard to compare
  }
  return route;
}

Deno.test(`typical file sys route parser`, () => {
  const complexPath =
    "/some/long-ugly/file_sys_path/module-2_Component--_  1,=service_2.md";
  const typicalUnit = fsr.typicalFileSysRouteParser(
    complexPath,
    "/some/long-ugly",
  );
  ta.assertEquals(typicalUnit, {
    parsedPath: {
      root: "/",
      dir: "/some/long-ugly/file_sys_path",
      base: "module-2_Component--_  1,=service_2.md",
      ext: ".md",
      name: "module-2_Component--_  1,=service_2",
    },
    routeUnit: {
      unit: "module-2_Component--_  1,=service_2",
      label: "module-2_Component--_  1,=service_2",
    },
    modifiers: undefined,
    modifiersText: undefined,
  });
});

Deno.test(`typical file sys route parser with modifiers`, () => {
  const complexPath = "/some/long/file_sys_path/index.html.md.ts";
  const typicalUnit = fsr.typicalFileSysRouteParser(
    complexPath,
    "/some/long-ugly",
  );
  ta.assertEquals(typicalUnit, {
    parsedPath: {
      root: "/",
      base: "index.html.md.ts",
      dir: "/some/long/file_sys_path",
      ext: ".ts",
      name: "index",
    },
    routeUnit: {
      unit: "index",
      label: "index",
    },
    modifiers: [".md", ".html"],
    modifiersText: ".md.html",
  });
});

Deno.test(`human friendly file sys route parser`, () => {
  const uglyPath =
    "/some/long-ugly/file_sys_path/module-2_Component--_  1,=service_2.md";
  const friendlyUnit = fsr.humanFriendlyFileSysRouteParser(
    uglyPath,
    "/some/long-ugly",
  );
  ta.assertEquals(friendlyUnit, {
    parsedPath: {
      root: "/",
      dir: "/some/long-ugly/file_sys_path",
      base: "module-2_Component--_  1,=service_2.md",
      ext: ".md",
      name: "module-2_Component--_  1,=service_2",
    },
    routeUnit: {
      unit: "module-2_Component--_  1,=service_2",
      label: "Module 2 Component 1 Service 2",
    },
    modifiers: undefined,
  });
});

Deno.test(`root route with replacement`, () => {
  const route = assertable(routeFactory.route(homeRoute));
  ta.assertEquals<ComparableRoute[]>(
    route.units,
    [{
      level: 0,
      qualifiedPath: "/home",
      unit: "home",
      label: "Home",
      isIntermediate: false,
    }],
  );

  ta.assert(mod.isParsedRouteConsumer(route));
  const replaceRS: govn.ParsedRouteSupplier = {
    route: {
      unit: "new",
      label: "New Unit",
    },
  };
  route.consumeParsedRoute(replaceRS);
  ta.assertEquals<ComparableRoute[]>(route.units, [{
    level: 0,
    qualifiedPath: "/new",
    unit: "new",
    label: "New Unit",
    isIntermediate: false,
  }]);
});

Deno.test(`first level route`, () => {
  const route = assertable(routeFactory.route(module1Route));
  ta.assertEquals(route.units[0].isIntermediate, true);
  ta.assertEquals<ComparableRoute>(route.units[1], {
    level: 1,
    qualifiedPath: "/home/module1",
    unit: "module1",
    label: "Module 1",
    isIntermediate: false,
  });
});

Deno.test(`second level route`, () => {
  const route = assertable(routeFactory.route(m1Component1Route));
  ta.assertEquals(route.units[0].isIntermediate, true);
  ta.assertEquals(route.units[1].isIntermediate, true);
  ta.assertEquals<ComparableRoute>(route.units[2], {
    level: 2,
    qualifiedPath: "/home/module1/component1",
    unit: "component1",
    label: "Module 1 Component 1",
    isIntermediate: false,
  });
});

Deno.test(`create child routes`, () => {
  const parentRoute = assertable(routeFactory.route(m1Component1Route));
  const replaceTerminal: govn.RouteUnit = {
    unit: "replacedChild",
    label: "Replace Child",
  };
  const route1 = assertable(
    routeFactory.childRoute(replaceTerminal, parentRoute, true),
  );
  ta.assertEquals(route1.units.length, 3);
  ta.assertEquals(route1.units[0].isIntermediate, true);
  ta.assertEquals(route1.units[1].isIntermediate, true);
  ta.assertEquals<ComparableRoute>(route1.units[2], {
    level: 2,
    qualifiedPath: "/home/module1/replacedChild",
    unit: "replacedChild",
    label: "Replace Child",
    isIntermediate: false,
  });
  const emptyRoute1 = assertable(
    routeFactory.childRoute(replaceTerminal, mod.emptyRouteSupplier, true),
  );
  ta.assertEquals(emptyRoute1.units.length, 1);
  ta.assertEquals<ComparableRoute>(emptyRoute1.units[0], {
    level: 0,
    qualifiedPath: "/replacedChild",
    unit: "replacedChild",
    label: "Replace Child",
    isIntermediate: false,
  });

  const newChild: govn.RouteUnit = {
    unit: "newChild",
    label: "New Child",
  };
  const route2 = assertable(routeFactory.childRoute(newChild, parentRoute));
  ta.assertEquals(route2.units.length, 4);
  ta.assertEquals(route2.units[0].isIntermediate, true);
  ta.assertEquals(route2.units[1].isIntermediate, true);
  ta.assertEquals(route2.units[2].isIntermediate, true);
  ta.assertEquals<ComparableRoute>(route2.units[3], {
    level: 3,
    qualifiedPath: "/home/module1/component1/newChild",
    unit: "newChild",
    label: "New Child",
    isIntermediate: false,
  });
  const emptyRoute2 = assertable(
    routeFactory.childRoute(newChild, mod.emptyRouteSupplier),
  );
  ta.assertEquals(emptyRoute2.units.length, 1);
  ta.assertEquals<ComparableRoute>(emptyRoute2.units[0], {
    level: 0,
    qualifiedPath: "/newChild",
    unit: "newChild",
    label: "New Child",
    isIntermediate: false,
  });
});

Deno.test(`third level route with replacement`, () => {
  const route = assertable(routeFactory.route(m2Component1Service1Route));
  ta.assertEquals(route.units[0].isIntermediate, true);
  ta.assertEquals(route.units[1].isIntermediate, true);
  ta.assertEquals(route.units[2].isIntermediate, true);
  ta.assertEquals<ComparableRoute>(route.units[3], {
    level: 3,
    qualifiedPath: "/home/module2/component1/service1",
    unit: "service1",
    label: "Module 2 Component 1 Service 1",
    isIntermediate: false,
  });

  ta.assert(mod.isParsedRouteConsumer(route));
  const replaceRS: govn.ParsedRouteSupplier = {
    route: {
      unit: "newService1",
      label: "New Module 2 Component 1 Service 1",
      aliases: ["../", { routeIdOrPath: "../../", label: "alias label" }],
    },
  };
  route.consumeParsedRoute(replaceRS);
  ta.assertEquals<ComparableRoute>(route.units[3], {
    level: 3,
    qualifiedPath: "/home/module2/component1/newService1",
    unit: "newService1",
    label: "New Module 2 Component 1 Service 1",
    isIntermediate: false,
    aliases: [
      "../",
      {
        label: "alias label",
        routeIdOrPath: "../../",
      },
    ],
  });
});

Deno.test(`third level route with replacement and aliases`, () => {
  const route = assertable(routeFactory.route(m2Component1Service1Route));
  ta.assertEquals(route.units[0].isIntermediate, true);
  ta.assertEquals(route.units[1].isIntermediate, true);
  ta.assertEquals(route.units[2].isIntermediate, true);
  ta.assertEquals<ComparableRoute>(route.units[3], {
    level: 3,
    qualifiedPath: "/home/module2/component1/service1",
    unit: "service1",
    label: "Module 2 Component 1 Service 1",
    isIntermediate: false,
  });

  ta.assert(mod.isParsedRouteConsumer(route));
  const replaceRS: fm.UntypedFrontmatter = {
    route: {
      unit: "newService1",
      label: "New Module 2 Component 1 Service 1",
      alias: "../",
    },
  };
  route.consumeParsedRoute(replaceRS);
  ta.assertEquals<ComparableRoute>(route.units[3], {
    level: 3,
    qualifiedPath: "/home/module2/component1/newService1",
    unit: "newService1",
    label: "New Module 2 Component 1 Service 1",
    isIntermediate: false,
    aliases: ["../"],
  });

  const route2 = assertable(routeFactory.route(m2Component1Service1Route));
  const replaceRS2: fm.UntypedFrontmatter = {
    route: {
      unit: "newService1",
      label: "New Module 2 Component 1 Service 1",
      alias: {
        path: "../",
        label: "Netspective",
      },
    },
  };
  route2.consumeParsedRoute(replaceRS2);
  ta.assertEquals<ComparableRoute>(route2.units[3], {
    level: 3,
    qualifiedPath: "/home/module2/component1/newService1",
    unit: "newService1",
    label: "New Module 2 Component 1 Service 1",
    isIntermediate: false,
    aliases: [{
      label: "Netspective",
      routeIdOrPath: "../",
    }],
  });

  const route3 = assertable(routeFactory.route(m2Component1Service1Route));
  const replaceRS3: fm.UntypedFrontmatter = {
    route: {
      unit: "newService1",
      label: "New Module 2 Component 1 Service 1",
      aliases: [
        "../",
        {
          path: "../../",
          label: "Netspective",
        },
      ],
    },
  };
  route3.consumeParsedRoute(replaceRS3);
  ta.assertEquals<ComparableRoute>(route3.units[3], {
    level: 3,
    qualifiedPath: "/home/module2/component1/newService1",
    unit: "newService1",
    label: "New Module 2 Component 1 Service 1",
    isIntermediate: false,
    aliases: [
      "../",
      {
        label: "Netspective",
        routeIdOrPath: "../../",
      },
    ],
  });
});

Deno.test(`hierarchical route resolution`, () => {
  const route = routeFactory.route(m2Component1Service1Route);
  ta.assert(route.terminal);
  ta.assertEquals(
    route.terminal.qualifiedPath,
    "/home/module2/component1/service1",
  );
  ta.assertEquals(route.terminal.resolve(".")?.unit, "service1");
  ta.assertEquals(route.terminal.resolve("./")?.unit, "service1");
  ta.assertEquals(route.terminal.resolve("..")?.unit, "component1");
  ta.assertEquals(route.terminal.resolve("../")?.unit, "component1");
  ta.assertEquals(route.terminal.resolve("../..")?.unit, "module2");
  ta.assertEquals(route.terminal.resolve("../../..")?.unit, "home");
  ta.assertEquals(route.terminal.resolve("../../../../"), undefined);
  ta.assertEquals(route.terminal.resolve("bad"), undefined);
  ta.assertEquals(route.terminal.resolve("./bad"), undefined);
  ta.assertEquals(route.terminal.resolve("../bad"), undefined);
});

Deno.test(`route locations`, () => {
  const route = routeFactory.route(m2Component1Service1Route);
  ta.assert(route.terminal);
  ta.assertEquals(
    route.terminal.location(),
    "/home/module2/component1/service1",
  );
  ta.assertEquals(
    route.terminal.location({ base: "/base" }),
    "/base/home/module2/component1/service1",
  );
});

Deno.test(`FileSysRoutes`, async () => {
  const em = new CachedExtensions();
  const fsRouteFactory = new mod.FileSysRouteFactory(
    mod.defaultRouteLocationResolver(),
    mod.defaultRouteWorkspaceEditorResolver(() => undefined),
  );
  const base = path.resolve(testPath, "route_test", "content");
  const index = await fsRouteFactory.fsRoute(
    path.resolve(base, "index.md"),
    base,
    {
      fsRouteFactory,
      routeParser: fsr.humanFriendlyFileSysRouteParser,
      extensionsManager: em,
      log: log.getLogger(),
    },
  );
  ta.assertEquals(index.units.length, 1);
  ta.assertEquals(index.terminal?.unit, "index");
  ta.assertEquals(index.terminal?.qualifiedPath, "/index");
  ta.assertEquals(index.terminal?.label, "Index");
  ta.assertEquals(index.terminal?.location(), "/index");

  const test = await fsRouteFactory.fsRoute(
    path.resolve(base, "test.md"),
    base,
    {
      fsRouteFactory,
      routeParser: fsr.humanFriendlyFileSysRouteParser,
      extensionsManager: em,
      log: log.getLogger(),
    },
  );
  ta.assertEquals(test.units.length, 1);
  ta.assertEquals(test.terminal?.unit, "test");
  ta.assertEquals(test.terminal?.qualifiedPath, "/test");
  ta.assertEquals(test.terminal?.label, "Test");
  ta.assertEquals(test.terminal?.location(), "/test");
});
