import * as c from "../../content/mod.ts";
import * as mdr from "../mod.ts";

export type CustomElementMarkdownDirective =
  & c.DirectiveExpectation<
    mdr.MarkdownClientCustomElementDirective,
    void
  >
  & mdr.MarkdownClientCustomElementDirective;

// Markdown Web Component Directives are handled at client time so won't be
// "encountered" on the server side so this is an empty function for now.
// TODO: we might want to track these in the future for diagnostics, though.
const encountered = () => {};

export const agGridCE: CustomElementMarkdownDirective = {
  identity: "ag-grid",
  present: "inline",
  name: "ag-grid",
  tag: "ag-grid",
  allowedAttrs: ["configHref", "domLayout"],
  encountered,
};

export const apacheEChartsCE: CustomElementMarkdownDirective = {
  identity: "apache-echarts",
  present: "inline",
  name: "apache-echarts",
  tag: "apache-echarts",
  allowedAttrs: ["configHref"],
  encountered,
};

export const chartJsCE: CustomElementMarkdownDirective = {
  identity: "chart-js",
  present: "inline",
  name: "chart-js",
  tag: "chart-js",
  allowedAttrs: ["configHref"],
  encountered,
};

export const krokiCE: CustomElementMarkdownDirective = {
  identity: "kroki-diagram",
  present: "block",
  name: "kroki-diagram",
  tag: "kroki-diagram",
  allowedAttrs: ["type", "host", "output", "diagnose"],
  encountered,
};

export const markmapCE: CustomElementMarkdownDirective = {
  identity: "markmap",
  present: "block",
  name: "markmap",
  tag: "markmap-diagram",
  allowedAttrs: ["diagnose"],
  encountered,
};

export const diagramsNetViewerCE: CustomElementMarkdownDirective = {
  identity: "diagrams-net-viewer",
  present: "block",
  name: "diagrams-net-viewer",
  tag: "diagrams-net-viewer",
  allowedAttrs: ["diagnose", "drawio-url", "diagram-title", "width", "height"],
  encountered,
};

export const timeAgoCE: CustomElementMarkdownDirective = {
  identity: "time-ago",
  present: "inline",
  name: "time-ago",
  tag: "time-ago",
  allowedAttrs: ["date"],
  encountered,
};

export const mozillaReadabilityCE: CustomElementMarkdownDirective = {
  identity: "mozilla-readable",
  present: "inline",
  name: "mozilla-readable",
  tag: "mozilla-readable",
  allowedAttrs: ["originUrl", "registerResultHook"],
  encountered,
};

export const allCustomElements: CustomElementMarkdownDirective[] = [
  agGridCE,
  apacheEChartsCE,
  chartJsCE,
  krokiCE,
  markmapCE,
  timeAgoCE,
  diagramsNetViewerCE,
  mozillaReadabilityCE,
];

export default allCustomElements;
