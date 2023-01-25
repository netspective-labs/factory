import * as k from "../../../../../knowledge/mod.ts";
import * as ldsGovn from "../../governance.ts";

export const frontmatterTagsPartial: ldsGovn.LightningPartial = (layout) => {
  const tm = layout.contentStrategy.termsManager;
  if (!tm) {
    return "<!-- no layout.contentStrategy.termsManager in frontmatterTagsPartial -->";
  }

  const badge = (term: k.Term) => {
    const ns = tm.termNamespace(term);
    // deno-fmt-ignore (because we don't want ${...} wrapped)
    return ns
      ? `<span class="slds-badge slds-badge_lightest"><em>${ns}</em>&nbsp;${tm.termLabel(term)}</span>`
      : `<span class="slds-badge slds-badge_lightest">${tm.termLabel(term)}</span>`;
  };

  const badges = (terms: k.Term | k.Term[]) => {
    // check for array first since a term can also be an array
    return Array.isArray(terms)
      ? terms.map((term) => badge(term!)).join(" ")
      : badge(terms);
  };

  return `${
    layout?.frontmatter?.folksonomy &&
      tm.isFolksonomy(layout.frontmatter.folksonomy)
      ? badges(layout.frontmatter.folksonomy)
      : "<!-- no folksonomy in frontmatter -->"
  }
  ${
    layout?.frontmatter?.taxonomy && tm.isTaxonomy(layout.frontmatter.taxonomy)
      ? badges(layout.frontmatter.taxonomy)
      : "<!-- no taxonomy in frontmatter -->"
  }`;
};
