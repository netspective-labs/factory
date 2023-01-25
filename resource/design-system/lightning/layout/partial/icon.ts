import * as ldsGovn from "../../governance.ts";

export type IconName = string;
export type IconCollectionName = string;
export type IconIdentity = string | {
  readonly collection: IconCollectionName;
  readonly name: IconName;
};

export function iconAssistiveText(identity: IconIdentity): string {
  return typeof identity === "string" ? identity : identity.name;
}

export function renderedIcon(
  layout: ldsGovn.LightningLayout,
  identity: IconIdentity,
  css = "slds-icon_small",
): string {
  const collection = typeof identity === "string"
    ? "utility"
    : identity.collection;
  const name = typeof identity === "string" ? identity : identity.name;
  const sprite = layout.contentStrategy.assets.ldsIcons(
    `/${collection}-sprite/svg/symbols.svg#${name}`,
  );
  // deno-fmt-ignore
  return `<svg class="slds-icon ${css}" aria-hidden="true"><use href="${sprite}"></use></svg>`
}

export function renderedButtonIcon(
  layout: ldsGovn.LightningLayout,
  identity: IconIdentity,
): string {
  const collection = typeof identity === "string"
    ? "utility"
    : identity.collection;
  const name = typeof identity === "string" ? identity : identity.name;
  const sprite = layout.contentStrategy.assets.ldsIcons(
    `/${collection}-sprite/svg/symbols.svg#${name}`,
  );
  // deno-fmt-ignore
  return `<svg class="slds-button__icon slds-button__icon_hint slds-button__icon_small" aria-hidden="true"><use href="${sprite}"></use></svg>`
}

export function renderedIconContainer(
  layout: ldsGovn.LightningLayout,
  identity: IconIdentity,
  css?: string,
): string {
  const collection = typeof identity === "string"
    ? "utility"
    : identity.collection;
  const name = typeof identity === "string" ? identity : identity.name;
  // deno-fmt-ignore
  return `<span class="slds-icon_container slds-icon-${collection}-${name}">${ renderedIcon(layout, identity, css) }</span>`
}
