import { base64 } from "./deps.ts";
import { CSS } from "../design-system/universal/client-cargo/style/markdown.css.ts";

export const dataURI = (css: string) => {
  return `data:text/css;base64,${base64.encode(css)}`;
};

export const styleTag = (className: string) => {
  // deno-fmt-ignore
  return `
      <!-- styles for .${className} are in the data URI generated from ${import.meta.url} -->
      <style>@import url("${dataURI(CSS(className))}");</style>`;
};

export default styleTag;

// If this file is "executed" it will emit the primary CSS to STDOUT so that it
// can be stored into a file by the caller
if (import.meta.main) {
  console.log(CSS("md"));
}
