/**
 * service-bus_test.js.ts is a Typescript-friendly Deno-style strategy of bringing
 * in selective server-side Typescript functions and modules into client-side
 * browser and other user agent Javascript. flexible-args.ts can work in any
 * Typescript runtime and service-bus_test.js.ts allows the same for browsers.
 *
 * REMINDER: service-bus_test.auto.js must exist in order for service-bus_test.js.ts to
 *           be bundled by Taskfile.ts. If it doesn't exist just create a empty file named
 *           service-bus_test.auto.js.
 */

// export * as fingerprintJS from "https://openfpcdn.io/fingerprintjs/v3.3.3/esm.min.js";
// export * as ghTimeCE from "https://unpkg.com/@github/time-elements@3.1.2/dist/index.js?module";

export * from "../../presentation/custom-element/badge/mod.ts";
export * from "../../conf/flexible-args.ts";
export * from "../core/mod.ts";
export * from "../service/ping.ts";
export * from "../service/binary-state.ts";
