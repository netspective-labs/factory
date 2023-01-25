---
title: Proxied Content (PCII Variables)
---

Markdown can _infuse_ (include) and _interpolate_ variables from almost any
source using the `pcii` directive. `PCII` is an abbreviation for _Proxied
Content Infuse_ and _Interpolate_.

You can put PCII Typescript files with name `*.pcii.ts` anywhere in `content`
directory and they will get picked up.

In Markdown, the call pattern looks like this:

    :pcii[symbol]                                 find first instance of symbol in any module
    :pcii[symbol]{post-process="markdown"}        replace symbol contents but post-process as markdown
    :pcii[symbol]{module="module.pcii.ts"}        if module.ts is unique across all folders
    :pcii[symbol]{module="path/module.pcii.ts"}   if module.ts is found in multiple paths

where `symbol` is the name of an _**exported**_ variable or function in
`path/path/module.ts`. This directive is called `PCII` because _content_ is
_proxied_ (delegated from somewhere else), is _infused_ (included) into the
current text stream, and is (optionally) _interpolated_ dynamically if the
symbol is a function.

NOTE: Files named `*.pcii.ts` will have smart tokens available at build time but
not at runtime (in browser client). Files named `*.client.pcii.ts` will also be
compiled and bundled into Javascript so they will be available at both build
time and runtime (in the browser client).

Live examples (check out the Markdown, variables declared in
`./synthetic.client.pcii.ts`):

- First value of simple symbol `var1` in any module is **:pcii[var1]**
- First value of complex symbol `calc1` in any module is **:pcii[calc1]**
- First value of execution of `func1` in any module is
  **:pcii[func1]{param1="from markdown!"}**
- Value of symbol `var1` in first module found called `synthetic.pcii.ts` is
  **:pcii[var1]{module="synthetic.client.pcii.ts"}**
- Value of symbol `var1` in first module found that ends with
  `./synthetic.client.pcii.ts` is
  **:pcii[var1]{module="./synthetic.client.pcii.ts"}**

Here's the same content as above, except coming from a complex multi-line
variable: :pcii[var2MarkdownPP]{post-process="markdown"}

See the [client-side JS file too](/synthetic.js) generated from
`./synthetic.client.pcii.ts`. `/synthetic.js` can be used safely in any runtime
HTML.

<mark>If you want more flexibility in using variables (like creating arbitrarily
complex dynamic Markdown) see [Dynamic Markdown](../dynamic/) example.</mark>
