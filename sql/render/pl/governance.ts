import * as safety from "../../../safety/mod.ts";
import * as tmpl from "../template/mod.ts";
import * as ax from "../../../axiom/mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;
export type ANONYMOUS = "ANONYMOUS";

export interface RoutineBody<
  BodyIdentity extends string,
  Context extends tmpl.SqlEmitContext,
> extends tmpl.SqlTextSupplier<Context> {
  readonly identity?: BodyIdentity;
  readonly isValid: boolean;
  readonly content: tmpl.SqlTextSupplier<Context>;
}

export interface RoutineDefinition<
  RoutineName extends string,
  Context extends tmpl.SqlEmitContext,
> extends tmpl.SqlTextSupplier<Context> {
  readonly isValid: boolean;
  readonly body: RoutineBody<RoutineName, Context>;
}

export interface AnonymousRoutineDefn<
  Context extends tmpl.SqlEmitContext,
> extends RoutineDefinition<ANONYMOUS, Context> {
  readonly isAnonymousRoutine: boolean;
  readonly isValid: boolean;
  readonly body: RoutineBody<ANONYMOUS, Context>;
}

export interface NamedRoutineDefn<
  RoutineName extends string,
  ArgAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
> extends RoutineDefinition<RoutineName, Context> {
  readonly routineName: RoutineName;
  readonly isValid: boolean;
  readonly body: RoutineBody<RoutineName, Context>;
  readonly argsDefn: ArgAxioms;
  readonly isIdempotent: boolean;
}

export function isAnonymousRoutineDefn<
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is AnonymousRoutineDefn<Context> {
  const isViewDefn = safety.typeGuard<
    AnonymousRoutineDefn<Context>
  >(
    "isAnonymousRoutine",
    "body",
    "SQL",
  );
  return isViewDefn(o);
}

export function isRoutineDefinition<
  RoutineName extends string,
  ArgAxioms extends Record<string, ax.Axiom<Any>>,
  Context extends tmpl.SqlEmitContext,
>(
  o: unknown,
): o is NamedRoutineDefn<RoutineName, ArgAxioms, Context> {
  const isViewDefn = safety.typeGuard<
    NamedRoutineDefn<RoutineName, ArgAxioms, Context>
  >(
    "routineName",
    "body",
    "SQL",
  );
  return isViewDefn(o);
}
