import * as safety from "../../safety/mod.ts";
import * as govn from "./governance.ts";

export const isForeignCodeIdentitySupplier = safety.typeGuard<
  govn.ForeignCodeIdentitySupplier
>("foreignCodeIdentity");

export const isForeignCodeExecutArgsSupplier = safety.typeGuard<
  govn.ForeignCodeExecutArgsSupplier
>("foreignCodeExecArgs");

export const isForeignCodeSupplier = safety.typeGuard<govn.ForeignCodeSupplier>(
  "foreignCodeLanguage",
  "foreignCode",
);

export const isForeignJsTsModuleSupplier = safety.typeGuard<
  govn.ForeignJsTsModuleSupplier
>("foreignModule");
