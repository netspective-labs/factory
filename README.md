# Netspective Labs Factory

[![codecov](https://codecov.io/gh/netspective-labs/factory/branch/main/graph/badge.svg?token=JK8J14Y5YY)](https://codecov.io/gh/netspective-labs/factory)

_The Factory_ is a utility library for rendering Markdown, HTML, type-safe SQL,
or other assets that could comprise static sites or engineering artifacts.

Sub-modules in this library (e.g. `cache`, `sql`, `git`, etc.) should generally
be independent of each other as well, keeping dependencies to a minimum.

Member libraries of _The Factory_ should eliminate dependencies by writing
minimal, testable, helpers without unnecessarily relying on 3rd party libraries.
For simple to medium complexity requirements, it's better to write our own (well
tested) code instead of relying on 3rd parties. For high complexity code or
widely used dependencies with many contributors it's great to use 3rd party
libraries.

Resource Factory's design goals include:

- Information Architecture (IA) driven artifacts which are tightly governed.
- Zero-compromise performance by implementing all dynamic functionality in V8
  through Deno and obviating the need for slow template processing outside of
  V8. The only "templating language" needed on the server side should be modern
  string template literals in TypesScript/Javascript. On the client side we
  encourage use of Web Components and vanilla JS focused on _native HTML_.
- Type-safety from source to destination, including type-safe templates.
- Source/_origination_ flexibility plus _destination_ abstraction.
- Aribtrary rendering strategy to support structured generation of any type of
  products or assets but with batteries-included HTML Design System rendering
  that enforces brand discipline across all generated assets.
- Batteries-included structural routing for type-safe references to generated
  assets.
- Specialized for large number of generated assets with special capabilities
  such as partial site generation (_site fragments_) when most of a target does
  not change often but portions change more frequently.
- Async execution for high performance.
- Support for _Incremental Static Regeneration_, _Distributed Persistent
  Rendering_ and _stale-while-revalidate_.

Resource Factory's purpose is to take raw materials called _resources_ from file
systems, databases, or other sources and create _finished products_ such as
HTML, SQL, or arbitrary artifact. The _products_ can be persisted to file
systems or other destinations or futher processed by other systems.

Resource Factory works with reasonable type-safety using three key concepts:

```
 Sources             Acquired data          Mutatable resources         Terminal resources
┌──────────────┐    ┌───────────────┐ 1:1  ┌──────────────────┐  1:1   ┌──────────────────┐
│ File Systems ├───►│  Origination  ├─────►│    Refinement    ├───────►│       Render     │
│ Databases    │    │ ("factories") │ 1:n  │  ("middleware")  │  1:n   │   ("renderers")  │
│ URLs         │    └───────────────┘   ┌─►└──────┬───────┬───┘  n:n   └─────────┬────────┘
│ ...          │            ▲           │         │       │            Immutable │ Design Systems,
└──────────────┘            │           └─────────┘       │           Refineries │ Persisters, etc.
                            │            recursive        │                      │
                            │            middleware       │                      │ Destinations
                            └─────────────────────────────┘              ┌───────▼──────┐
                             recursive originators                       │ File Systems │
                             can "fan out" additional                    │ ...          │
                             resources in middleware                     └──────────────┘
```

- **Origination**. _Factory_ objects, called **originators**, supply _resource
  constructors_ (known as _instantiators_ since they create Javascript object
  instances). A resource could be any structured or unstructured data coming
  from any arbitrary source. The factory terminology matches the GoF creational
  pattern that uses factory methods to handle construction of the resources
  which will be _refined_ and _produced_ in the following steps.
  - `FileSysGlobsOriginator` is a built-in Resource Factory originator which
    creates resource constructors for files in the local file system.
  - Other originators could pull resources from databases, fetch from URLs, or
    any arbitrary sources.
  - Proxying / caching is built-in so that expensive origination can be locally
    cached as JSON (file system) or other "proxies" (e.g. Redis).
- **Refinement**. _Transformation_ objects, called **middleware** or
  **refineries**, supply _resource mutators_. Middleware operates in a pipeline
  and can mutate resources as many times as required to reach a _terminal
  state_.
  - Middleware refineries:
    - Use _resource constructors_ created by originators to construct instances.
    - Perform transformations to further _refine_ or mutate resource instances.
    - Produce additional factories to "fan out" and recursively produce more
      resources which can then be refined.
- **Finished Product**. _Refined instances_ whose mutations have reached their
  _terminal resource stage_ are fed to **Renderers**. _Renderers_ use one or
  more _render strategies_ to take a terminal resource and product a _rendered_
  resource. Rendered resources can then be persisted to a file system or any
  arbitrary destination.

## SSG Caveats

This framework is not about the ease of local edits of a rendering strategy such
as an HTML design system ("DS") but enfocing consistency to a specific chosen
rendering strategy. Because Resource Factory is geared not for small sites but
large publications, type-safety, observability, performance, and enforcement of
design patterns is the main concern.

Flexibility from an engineering perspective is important but flexiblity of
changes to any single resource is not a goal. For example, some static site
generators (SSGs) allow easy changes to HTML output on a per-page basis but if
Resource Factory is used as an SSG we would be more focused on enforcing HTML
pages to adhere to a design system, not optimize for making local changes.

We do not want to encourage the use of anything other than HTML, Web Components,
JavaScript (with strong type-safety using Typescript or other governance tools).
This means staying away from all templating tools and using plain Typescript and
JavaScript is best.

Instead of building templates in custom languages, we'll just rely on Javascript
and `v8`.

## Contributing

PRs are welcome. If you're making changes directly (without a PR), after
updating and before pushing code, tag the release:

```bash
# <git commit ...>
git-chglog --output CHANGELOG.md
git commit -m "auto generate content" CHANGELOG.md
git-semtag final && git push
# or git-semtag final -v "vN.N.N" && git push
```

## Unit Testing

Assuming you're using `direnv`, add this to `.envrc` or set the variables some
other way:

```bash
# .envrc configuration for unit testing
export RF_SQL_SHELL_OSQUERYI_LOCATION="/usr/bin/osqueryi"
export TESTVALID_PKC_PGUSER=gitlab_pkc_read_only
export TESTVALID_PKC_PGPASSWORD=*****
export GLTEST_PGUSER=gitlab_pkc_read_only
export GLTEST_PGPASSWORD==*****
```

Then:

```bash
direnv allow
deno test -A --unstable
```
