import { testingAsserts as ta } from "./deps-test.ts";
import * as govn from "./governance.ts";
import * as r from "./route.ts";
import * as fsr from "./fs-route.ts";
import * as mod from "./route-tree.ts";

const root1: govn.RouteUnit = {
  unit: "home",
  label: "Home",
};

const root2: govn.RouteUnit = {
  unit: "root2",
  label: "Root 2",
};

const module1: govn.RouteUnit = {
  unit: "module1",
  label: "Module 1",
};

const m1Component1: govn.RouteUnit = {
  unit: "component1",
  label: "Module 1 Component 1",
  targetableID: "module1Component1ID",
};

const module2: govn.RouteUnit = {
  unit: "module2",
  label: "Module 2",
};

const m2Component1: govn.RouteUnit = {
  unit: "component1",
  label: "Module 2 Component 1",
  targetableID: "module1Component1ID", // should be seen as a duplicate in test
  aliases: ["../", { routeIdOrPath: "../../", label: "alias label" }],
};

const m2Component1Service1: govn.RouteUnit = {
  unit: "service1",
  label: "Module 2 Component 1 Service 1",
};

const homeRoute: govn.RouteUnits = { units: [root1] };
const root2Route: govn.RouteUnits = { units: [root2] };
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

Deno.test(`tree nodes`, () => {
  const rf = new r.TypicalRouteFactory(
    r.defaultRouteLocationResolver(),
    fsr.defaultRouteWorkspaceEditorResolver(() => undefined),
  );
  const tree = new mod.TypicalRouteTree(rf);
  tree.consumeRoute(rf.route(homeRoute));
  tree.consumeRoute(rf.route(root2Route));
  tree.consumeRoute(rf.route(module1Route));
  tree.consumeRoute(rf.route(m1Component1Route));
  const finalNode = tree.consumeRoute(rf.route(m2Component1Service1Route));
  tree.consumeAliases();

  const nodes = Array.from(tree.filterNodes(() => true));
  ta.assertEquals(tree.items.length, 2);
  ta.assertEquals(nodes.length, 7);
  ta.assertEquals(
    nodes.map((n) => [
      n.qualifiedPath,
      n.level,
      r.isRedirectUrlSupplier(n)
        ? n.redirect
        : (r.isRedirectNodeSupplier(n) ? n.redirect.qualifiedPath : undefined),
    ]),
    [
      ["/home", 0, "/home/module2/component1"],
      ["/root2", 0, undefined],
      ["/home/module1", 1, undefined],
      ["/home/module2", 1, "/home/module2/component1"],
      ["/home/module1/component1", 2, undefined],
      ["/home/module2/component1", 2, undefined],
      ["/home/module2/component1/service1", 3, undefined],
    ],
  );
  ta.assertEquals(finalNode?.parent?.qualifiedPath, "/home/module2/component1");
  ta.assertEquals(
    finalNode?.ancestors.map((
      n,
    ) => [
      n.qualifiedPath,
      n.level,
      r.isRedirectUrlSupplier(n)
        ? n.redirect
        : (r.isRedirectNodeSupplier(n) ? n.redirect.qualifiedPath : undefined),
    ]),
    [
      ["/home/module2/component1", 2, undefined],
      ["/home/module2", 1, "/home/module2/component1"],
      ["/home", 0, "/home/module2/component1"],
    ],
  );
  ta.assertEquals(
    Array.from(tree.targetableRouteNodes.values()).flatMap(
      (n) => [n.qualifiedPath, n.targetableID],
    ),
    ["/home/module1/component1", "module1Component1ID"],
  );
  ta.assertEquals(
    Array.from(tree.duplicateTargetableNodeIDs.values()).flatMap(
      (dupes) => dupes.map((n) => `${n.qualifiedPath}: ${n.targetableID}`),
    ),
    [
      "/home/module1/component1: module1Component1ID",
      "/home/module2/component1: module1Component1ID",
    ],
  );
  ta.assertEquals(
    Array.from(tree.redirects).map((node) => node.qualifiedPath),
    [
      "/home/module2",
      "/home",
    ],
  );
});

Deno.test(`tree nodes selector`, () => {
  const rf = new r.TypicalRouteFactory(
    r.defaultRouteLocationResolver(),
    fsr.defaultRouteWorkspaceEditorResolver(() => undefined),
  );
  const tree = new mod.TypicalRouteTree(rf);
  const homeNode = tree.consumeRoute(rf.route(homeRoute));
  tree.consumeRoute(rf.route(root2Route));
  tree.consumeRoute(rf.route(module1Route));
  const m1c1Node = tree.consumeRoute(rf.route(m1Component1Route));
  const terminal = tree.consumeRoute(rf.route(m2Component1Service1Route));

  ta.assert(terminal);
  ta.assertEquals(terminal.select(".")?.unit, "service1");
  ta.assertEquals(terminal.select("./")?.unit, "service1");
  ta.assertEquals(terminal.select("..")?.unit, "component1");
  ta.assertEquals(terminal.select("../")?.unit, "component1");
  ta.assertEquals(terminal.select("../..")?.unit, "module2");
  ta.assertEquals(terminal.select("../..")?.unit, "module2");
  ta.assertEquals(terminal.select("../../..")?.unit, "home");
  ta.assertEquals(terminal.select("../../../../.."), undefined);
  ta.assertEquals(terminal.select("bad"), undefined);
  ta.assertEquals(terminal.select("./bad"), undefined);
  ta.assertEquals(terminal.select("../bad"), undefined);

  ta.assert(homeNode);
  ta.assertEquals(homeNode.qualifiedPath, "/home");
  ta.assertEquals(
    // module2 is a sibling of module1 so this select should fail
    homeNode.select("module1")?.unit,
    "module1",
  );
  ta.assertEquals(
    // module2 is a sibling of module1 so this select should fail
    homeNode.select("module1/component1")?.unit,
    "component1",
  );

  ta.assert(m1c1Node);
  ta.assertEquals(m1c1Node.qualifiedPath, "/home/module1/component1");
  ta.assertEquals(
    // module2 is a sibling of module1 so this select should fail
    m1c1Node.select("../module2/component1/service1")?.unit,
    undefined,
  );
  ta.assertEquals(
    // module2 is a sibling of module1 so this select should succeed
    m1c1Node.select("../../module2/component1/service1")?.qualifiedPath,
    terminal.qualifiedPath,
  );
});
