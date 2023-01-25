# Path-based micro packaging and bundling

Instead of NodeJS-style "projects" we want all our packaging to be path-based.
Meaning any or every _path_ ("route") is a _micro_ project. This allows us to
mix and match HTML, Javascript, CSS, and web-based assets across properties and
user agents with ease.

## How micro-packaging and bundling works

1. Decide what you'd like the _target_ to be (the _intention_). For example,
   Javascript, CSS and even HTML may be _targets_. Once you decide the target
   you _must create an empty file_ for that target with `.auto.` modifier
   convention (`*.auto.js`, `*.auto.mjs`, `.auto.css`, etc.).
   - We drive the process using the target intention because the intended target
     (such as `x.y.min.js`) is what will be referenced in HTML or other user
     agents. By forcing developers and designers to know their intended target
     and driving the process from there we'll ensure more consistency.
   - The creation of this file is the _target intention_ and becomes the
     instruction to the bundler. For example, in Linux `touch x.auto.js` is
     sufficient to tell the bundler about the file's existence (the content of
     the file is not relevant as the bundler will create the file).
   - The intended target can be placed anywhere and is not limited to specific
     directory or broader conventions (other than `*.auto.*`, but that's
     configurable).
   - The `.auto.` modifier is a signal to developers and deployers that this an
     _auto-generated_ asset and should not be edited. `.auto.*` assets should be
     committed to Git as part of the repo.
   - If the file is not created, there is no _intention_ and therefore the
     bundler will not prepare it. Typical names for the target intention
     include:
     - `deps.auto.js` - result of Deno.emit() packaged as ESM
     - `deps.auto.cjs` - result of Deno.emit() packaged as classic IIFE
     - `deps.auto.mjs` - synonym for `deps.auto.js`, result of Deno.emit()
       packaged as ESM
     - `deps.auto.css` - result of execution of the CSS twin as text
     - `path.auto.js` - result of Deno.emit() packaged as ESM
     - The name of the file (`deps.*`) is by convention but can be anything the
       user desires, but the extension (`*.js`) and _modifiers_ (`*.auto`) are
       crucial bundler packaging signals.

- You can also have other modifiers beside `*.auto`:
  - `deps.auto.min.js` or `deps.auto.min.css` - tells the bundler to minify

2. For each target intention (`*.auto.*` file) you create the _twin_ for target
   with `*.ts` extension that will _originate_/_produce_ ("bundle" or "package")
   the target. *. Regardless of the intention and its modifier, the twin is
   always a `.js.ts` or `.css.ts` Typescript file without modifiers.
   - The target intention asset's modifiers like `.auto.` or `.auto.min` are
     merely bundler instructions and do not influence the name of the
     originator/producer twin. The twin is the _source_ and the target is the
     _destination_. The _destination_ is auto-generated from the _source_.

## Auto bundling for sandbox development

During development, our sandbox publication server automatically does on-demand
bundling of intention targets. For example, if during development a `*.auto.js`
asset is requested by the web server, its twin will be checked and the target
may be regenerated if the twin is newer.

## Bundler Tasks for CI/CD

CLI and CI/DI callable _tasks_ are available in `Taskfile.ts`:

`discover-bundleable` is a dry-run and reports all `.auto.{js,cjs,mjs,css}`
target _intentions_ with `.{js,cjs,mjs,css}.ts` _twins_. No changes to any files
will be made. Run it like this:

```bash
❯ path-task discover-bundleable
```

You will see output like this for any modules that it can bundle:

```bash
lib/package/test/deps.auto.cjs (classic, not minified) may be bundled from lib/package/test/deps.js.ts
lib/package/test/deps.auto.js (module, not minified) may be bundled from lib/package/test/deps.js.ts
lib/package/test/deps.auto.min.js (module, minified) may be bundled from lib/package/test/deps.js.ts
lib/package/test/deps.auto.mjs (module, not minified) may be bundled from lib/package/test/deps.js.ts
lib/package/test/deps.auto.css (not minified) may be bundled from lib/package/test/deps.css.ts
```

```bash
❯ path-task bundle-all
```

`bundle-all` genenerates all `.auto.{js,cjs,mjs,css}` target asset _intentions_
with their `.{js,css}.ts` _twin_ counterparts. At the end of this task all
`.auto.{js,cjs,mjs,css}` will be updated to their latest content and is safe to
run during CI/CD or any other build process.

For each intented target you will see either something like this, which means
that there's no twin so no action was taken:

```bash
core/design-system/lightning/client-cargo/script/lightning.js does not have a Typescript twin
lib/presentation/dom/markdown-it.js does not have a Typescript twin
```

Or `bundle-all` may produces messages like the following, which mean that a twin
was found and the intention was fulfilled:

```bash
lib/package/test/deps.auto.cjs generated from lib/package/test/deps.js.ts
lib/package/test/deps.auto.js generated from lib/package/test/deps.js.ts
lib/package/test/deps.auto.min.js generated from lib/package/test/deps.js.ts
lib/package/test/deps.auto.mjs generated from lib/package/test/deps.js.ts
lib/package/test/deps.auto.css generated from lib/package/test/deps.css.ts
```

You should also run the `path-task lint-bundleable` task routinely, it will give
you a list of all `*.css` and `*.js` files that do not have `*.{css,js}.ts`
twins. This is called the _lint_ task because it's best for `*.css` and `*.js`
user agent assets to be Typescript-generated whenever possible.

```bash
❯ path-task lint-bundleable
```

## Remote Packages (proxies)

Full `*.zip`, `*.tar.gz` and other packages can also be downloaded. Explanation
TBD.

## Examples

TBD
