# Custom Element (CE) Guidelines

* Try to eliminate dependencies between blocks or between CEs - even if it means little code duplication
  * CEs may depend on other blocks and blocks may wrap other blocks but keep dependenices to Javascript functions calls
  * Don't use inheritance for dependencies, use functional composition
* Make sure all CEs can operate using "naked DOM" JavaScript functions using "blocks" (see Block Protocol)
* CEs should be wrapping blocks using JavaScript functions so that all functionality can be used with or without CEs
* CEs are for non-programmers to use in their HTML or Markdown content, blocks are for programmers who want more functionality

## Editing in VS Code and compiling through Deno.emit

For now, the TS to JS compile is done using `bundle-js.ts` in `lib/package` but I've had to create workarounds for `document`, `HTMLElement` and similar browser-only objects using `any` typing (not a good idea long term). We need to figure out the right mix of the following:

```ts
/// <reference lib="dom" />
```

```json
{
  "compilerOptions": {
    "lib": [ "dom", "deno.ns"]
  }
}
```

See:

* https://deno.land/manual/typescript/configuration#targeting-deno-and-the-browser
* https://github.com/denoland/deno/issues/6422
