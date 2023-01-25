---
title: Organize with tags and hashtags
folksonomy:
  - untyped-tag-1
  - [untyped-tag-2-value, Untyped Tag 2 Label (No Namespace)]
  - [untyped-tag-3-value, Untyped Tag 3 Label, ut3namespace]
  - term: untyped-tag-4-value
    label: Untyped Tag 4 Label
    namespace: ut4namespace
taxonomy:
  - typed-tag-1
  - [typed-tag-2-value, "Typed Tag 2 Label"]
  - [typed-tag-3-value, "Typed Tag 3 Label", t3namespace]
  - term: typed-tag-4-value
    label: typed Tag 4 Label
    namespace: t4namespace
visual-cues:
  syntax-highlight: highlight.js
---

This is a #hashtag to reference tags in content.

You can use `folksonomy` tags for untyped, unchecked, arbitrary tags.

If you have a simple tag use one of these methods:

```yaml
folksonomy: untyped-tag-1
folksonomy: "Untyped Tag"
folksonomy:
  - untyped-tag-1
  - untyped-tag-2
folksonomy: [untyped-tag-1, untyped-tag-2]
folksonomy: ["Untyped Tag", "Untyped Tag 2"]
```

If you want your tag to have a label use the array or object format (`scopes` or _namespaces_ are optional):

```yaml
folksonomy:
  - [untyped-tag-2-value, Untyped Tag 2 Label (No Namespace)]
  - [untyped-tag-3-value, Untyped Tag 3 Label, namespace]
  - tag: untyped-tag-4-value
    label: Untyped Tag 4 Label
    namespace: namespace
```

You can use `taxonomy` tags for typed, checked, tags. Taxonomies can be unlimited depth (hierarchical namespaces) but must be pre-defined in `pubctl.ts` because they are _typed_.