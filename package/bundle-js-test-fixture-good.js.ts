import * as dep from "./bundle-js-test-fixture-good-dep.ts";

export interface SyntheticType {
  readonly one: string;
}

const syntheticType: SyntheticType = {
  one: "one",
};

console.log("test transpiled code", syntheticType, dep.isFromDep);
