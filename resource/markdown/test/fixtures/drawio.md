---
route:
  unit: drawio
  label: Embed VS Code Editable Draw.io
diagrams: 
  - diagrams-net
---

Embed a draw.io diagram using VS Code `*.drawio.svg` editable SVG approach.

- The diagram below is just a regular HTML `<img>` tag which references
  `/roadmap.drawio.svg` but the `roadmap.drawio.svg` file embeds the actual
  draw.io diagram into the SVG.
- When the VS Code draw.io diagram editor plugin is used to edit the
  `roadmap.drawio.svg` file in VS Code it's "live editable" but the plugin saves
  both the SVG and the editable diagram together. This means graphical instant
  editing in VS Code but natural web availability as SVG without any
  export/embed requirements.

![](/roadmap.drawio.svg)

[Open SVG directly](/roadmap.drawio.svg)

## Embed VS Code Editable Draw.io

As stated in the
[VS Code Draw.io Integration](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio)
documentation you can directly edit and save `.drawio.svg` and `.drawio.png`
files.

- These files are perfectly valid `svg/png-images` that contain an _embedded_
  Draw.io diagram.
- Whenever you edit such a file using VS Code, the `svg/png` part of that file
  is kept up to date (_it automatically converts the diagram XML to SVG/PNG_).
- The logo of this extension in VS Code is such a `.drawio.png` file that has
  been created with the extension itself.

![](https://github.com/hediet/vscode-drawio/raw/HEAD/docs/demo.gif)

## Other embedding approaches

**Interactive SVG**

<object type="image/svg+xml" data="/initiatives/strategy.drawio.svg" width="680px"></object>

**Custom Diagrams.net Markdown Directive**

The `:::diagrams-net-viewer` directive wraps the `<diagrams-net-viewer>` web
component (demo'd below) and is currently very simple but uses native Draw.io
functionality instead of SVG.

:::diagrams-net-viewer{drawio-url="/initiatives/strategy.drawio.svg"} Fallback
:::

**Custom Diagrams.net Web Component**

The current web component is currently very simple but uses native Draw.io
functionality instead of SVG. This means we can enhance it further if more
advanced functionality is desired.

<diagrams-net-viewer drawio-url="/initiatives/strategy.drawio.svg"></diagrams-net-viewer>
