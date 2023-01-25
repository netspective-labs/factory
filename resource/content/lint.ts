import * as safety from "../../safety/mod.ts";
import * as govn from "./governance.ts";

export const isLintable = safety.typeGuard<govn.Lintable>(
  "lint",
);
