// Governance: only put modules in deps.ts that will be used across multiple resources
// Dependencies required during engineering/testing only (not in production)
export * as testingAsserts from "https://deno.land/std@0.147.0/testing/asserts.ts";
