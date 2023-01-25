/**
 * flexible-args.js.ts is a Typescript-friendly Deno-style strategy of bringing
 * in selective server-side Typescript functions and modules into client-side
 * browser and other user agent Javascript. flexible-args.ts can work in any
 * Typescript runtime and flexible-args.js.ts allows the same for browsers.
 *
 * REMINDER: flexible-args.auto.js must exist in order for flexible-args.js.ts to
 *           be bundled by Taskfile.ts. If it doesn't exist just create a empty file named
 *           flexible-args.auto.js.
 */

export * from "./inspect-http-headers.js";
