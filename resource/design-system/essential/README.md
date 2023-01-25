# Lightning Design System (R<sup>2</sup>) Rendering Strategy

## Guidance

- Eliminate abstractions and implicit functionality in favor of explicit. This
  is especially important for JS, CSS, and other bundling so that developers
  know exactly what code is coming from which source.
- Whenever possible, allow static HTML to be as interactive as generated HTML.
  For example:
  - When implementing base (in location, etc.) pass it through with client cargo
    and use HTML
    [base](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base)
    element so that pure HTML will work, too.
