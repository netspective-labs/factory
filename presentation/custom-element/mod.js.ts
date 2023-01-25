/**
 * index.js.ts is a Typescript-friendly Deno-style strategy of bringing in
 * selective server-side Typescript functions and modules into client-side
 * browser and other user agent Javascript. *.js.ts can work in any
 * Typescript runtime and its *.auto.js "twin" allows the same for browsers.
 *
 * REMINDER: index.auto.js must exist in order for index.js.ts to be bundled by
 *           Taskfile.ts. If it doesn't exist just create a empty file named
 *           index.js.ts.
 */

export * from "./badge/mod.ts";
export * from "./pattern/mod.ts";
