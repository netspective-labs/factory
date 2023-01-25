# Lightning Design System (R<sup>2</sup>) Rendering Strategy

## Guidance

- Eliminate abstractions and implicit functionality in favor of explicit. This
  is especially important for JS, CSS, and other bundling so that developers
  know exactly what code is coming from which source.
- Whenever possible, allow static HTML to be as interactive as generated HTML.
  For example:
  - When implementing base (in location, etc.) pass it through with client cargo
    and use HTML [base](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base)
    element so that pure HTML will work, too.

## Maintenance

- Use `just maintain` for regular maintenance of dependencies

## References

- [Lightning Design System Starter Kit](https://github.com/salesforce-ux/design-system-starter-kit)
- [LWC datatable experiences](https://github.com/reiniergs/datatable-planet)

## TODOs

- Add `bundle` target to Justfile to do minification, merging JS, CSS, etc.
- Refactor common non-LDS-specific partials into base Design System.
- Integrate [UFO](https://github.com/unjs/ufo) _URL utils for humans_ into
  design system infrastructure so that client-side JS can utilize proper URL
  functionality.
- Implement [OpenGraph](https://ogp.me/) in base Design System (not LDS).
- Add `Partial<govn.RenderContextSupplier<HtmlLayoutRenderContext>>` to
  HtmlLayout so that pages, partials, etc. can easily see which _environment_
  (_context_) like production, sandbox, devl, test, etc. they are running in.
- Add analytics, linting, and other related functionality directly into DS so
  configuration can be done through _publication profiles_.
  - _Client observability_ should be enabled via Google Analytics, etc. and
    should be type-safe per engine (e.g. GA, Plausible, etc.)
  - _Build observability_ should be enabled at server side and granularity
    controlled by context (such as dev/sandbox/production).
- Use Data URIs whenever possible, integrating Base64 objects into Deno JS/TS.
  Consider images like `/images/logo-icon-101x101.png` as Data URIs instead of
  separate image files. Do the same for all small, seldom-changing assets.
- SLDS and all design systems should have their own extension implementations.
  This way they can incorporate CSS, JS, images, etc. as type-safe instances. We
  need to see how we can incorporate the entire design system as URL accessible
  so that sites do not need to have their own local assets.
- Generate sitemap.xml at any level.
- Checkout [Octopus](https://octopus.do/sitemap/resource/generator) to generate
  visual sitemap with meta tags using our sitemap xml.
- Check out [rasterizer](https://rasterizer.io/) to see the kinds of images we
  can generate from data. We can create a new render strategy that can take
  arbitrary data and generate images like Twitter Cards, etc.
- Check out [Analysis of Feed URLs](https://blog.jim-nielsen.com/2021/feed-urls/) 
  to allow different kinds of feed configurations.

## Documentation TODOs

- [Modular code with Nunjucks and Eleventy](https://www.webstoemp.com/blog/modular-code-nunjucks-eleventy/)
  is a good approach to use to explain the differences with R2. R2 focuses on
  performance and pure-TypeScript experience and encourages using web components
  for extensibility interactivity rather than custom templates.
  - R2 supports client cargo which means build-time context can be passed into
    runtime whenever desired
