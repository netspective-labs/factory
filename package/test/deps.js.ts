/**
 * deps.js.ts is a Typescript-friendly Deno-style strategy of bringing in
 * selective server-side Typescript functions and modules into client-side
 * browser and other user agent Javascript.
 *
 * deps.js.ts should be Deno bundled into deps.auto.js assuming that
 * deps.auto.js exists as a "twin". The existence of the deps.auto.js
 * (even an empty one) is a signal to the bundler to generate the *.auto.js file.
 * HTML and client-side source pulls in *.auto.js but since it's generated from
 * this file we know it will be correct.
 *
 * REMINDER: deps.auto.js must exist in order for deps.js.ts to be bundled.
 *           if it doesn't exist just create a empty file named deps.auto.js.
 */

export * from "https://deno.land/x/eventemitter@1.2.4/mod.ts";

export * from "../../text/human.ts";
export * from "../../text/whitespace.ts";
export * from "../../conf/flexible-args.ts";
export * from "../../text/detect-route.ts";
export * from "../../service-bus/governance.ts";
export * from "../../service-bus/core/mod.ts";
export * from "../../presentation/dom/markdown-it.js";
