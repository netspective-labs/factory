import * as base64 from "https://deno.land/std@0.147.0/encoding/base64.ts";

export const testDynamicCSS = (className: string) => `
.${className} {
    color: #303030;
    word-wrap: break-word
}
`;

export const dataURI = (css: string) => {
  return `data:text/css;base64,${base64.encode(css)}`;
};

export const styleTag = (className: string) => {
  // deno-fmt-ignore
  return `
      <!-- styles for .${className} are in the data URI generated from ${import.meta.url} -->
      <style>@import url("${dataURI(testDynamicCSS(className))}");</style>`;
};

// the default, either a string or a function returning a string, is what's emitted as *.auto.css
export default testDynamicCSS;

// If this file is "executed" it will emit the primary CSS to STDOUT so that it
// can be stored into a file by the caller
if (import.meta.main) {
  console.log(testDynamicCSS("md"));
}
