import * as h from "./mod.ts";

export interface MutationResult<Value> {
  original: Value | MutationResult<Value>;
  mutated: Value;
  reasons?: string[];
}

export type PotentiallyMutated<Value> = Value | MutationResult<Value>;

export function isMutationResult<Value>(
  o: unknown,
): o is MutationResult<Value> {
  if (o && typeof o === "object" && "mutated" in o) return true;
  return false;
}

export interface EnvVarValueMutator {
  (name: string, value: string): PotentiallyMutated<string>;
}

export function sensitiveEnvVarValueMutator(
  options?: {
    readonly mutate?: (
      value: PotentiallyMutated<string>,
      reason: string,
      suggested: (
        value: PotentiallyMutated<string>,
        reason: string,
      ) => PotentiallyMutated<string>,
    ) => PotentiallyMutated<string>;
    readonly nameRegExps?: (suggested: RegExp[]) => RegExp[];
    readonly valueRegExps?: (suggested: RegExp[]) => RegExp[];
    readonly override?: (
      name: string,
      value: string,
    ) => EnvVarValueMutator | undefined;
  },
): EnvVarValueMutator {
  const typicalNameRegExps: RegExp[] = [
    /(password|pass|passwd|secret|sensitive|api_key)/i,
  ];
  const typicalValueRegExps: RegExp[] = [];

  const nameRegExps: RegExp[] = options?.nameRegExps
    ? options?.nameRegExps(typicalNameRegExps)
    : typicalNameRegExps;
  const valueRegExps: RegExp[] = options?.valueRegExps
    ? options?.valueRegExps(typicalValueRegExps)
    : typicalValueRegExps;

  const override = options?.override;

  const typicalMutate =
    ((value: PotentiallyMutated<string>, reason: string) => {
      const target = typeof value === "string" ? value : value.mutated;
      const reasons = typeof value === "string"
        ? [reason]
        : (value.reasons ? [...value.reasons, reason] : [reason]);
      if (target && target.length > 0) {
        const mutated = "*".repeat(target.length);
        return { original: value, mutated, reasons };
      }
      return value;
    });

  return (name, value) => {
    let result: PotentiallyMutated<string> = value;
    if (override) {
      const handled = override(name, value);
      if (handled) return handled(name, value);
    }
    for (const nre of nameRegExps) {
      if (name.match(nre)) {
        const reason = `name matched ${nre}`;
        result = options?.mutate
          ? options?.mutate(result, reason, typicalMutate)
          : typicalMutate(result, reason);
      }
    }
    for (const vre of valueRegExps) {
      if (value.match(vre)) {
        const reason = `value matched ${vre}`;
        result = options?.mutate
          ? options?.mutate(result, reason, typicalMutate)
          : typicalMutate(result, reason);
      }
    }
    return result;
  };
}

/**
 * Produces the list of environment variables suitable for including in
 * health.json. This is different from Deno.env.toObject() because it does not
 * include all environments, it filters out potentially "sensitive" env var
 * values based on env var name conventions (see typicalNameRegExps above).
 * @param options
 * @returns
 */
export function envHealthCheck(
  options?: {
    readonly mutate?: (
      name: string,
      value: string,
    ) => PotentiallyMutated<string>;
    readonly filter?: (name: string, value: string) => boolean;
    readonly component?: (
      suggested: h.HealthyServiceHealthComponentStatus,
      mutatedVars: ({ name: string } & MutationResult<string>)[],
    ) => h.HealthyServiceHealthComponentStatus;
  },
): h.HealthyServiceHealthComponentStatus {
  const env = Deno.env.toObject();
  const mutatedVars: ({ name: string } & MutationResult<string>)[] = [];
  const filteredVars: string[] = [];
  const filter = options?.filter ?? (() => true);
  const mutate = options?.mutate;
  for (const envVar of Object.entries(env)) {
    const [name, value] = envVar;
    const retain = filter(name, value);
    if (!retain) {
      filteredVars.push(name);
      continue;
    }

    if (mutate) {
      const mutated = mutate(name, value);
      if (typeof mutated === "object") {
        env[name] = mutated.mutated;
        mutatedVars.push({ name, ...mutated });
      }
    }
  }
  const links: Record<string, string> = {};
  filteredVars.forEach((v) => {
    delete env[v];
    links[v] = "filtered";
  });
  for (const mv of mutatedVars) {
    links[mv.name] = `mutated (${
      mv.reasons ? mv.reasons.join(", ") : "not sure why"
    })`;
  }

  const result = h.healthyComponent({
    componentId: "Deno.env",
    componentType: "system",
    time: new Date(),
    observedValue: env,
    links,
  });
  return options?.component ? options.component(result, mutatedVars) : result;
}
