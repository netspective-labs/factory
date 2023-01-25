export interface SyntheticType {
  readonly one: string;
}

// the line below has a TypeScript typing error but, because deno_emit 0.3.0
// not do any type-checking there will be no issue
const syntheticType: BadTypeNameShouldNotBeFound = {
  one: "one",
};

// the line below has a Javascript error and deno_emit 0.3.0 will throw an error
// that we can catch as an exception
console.log("test transpiled code", syntheticType;
