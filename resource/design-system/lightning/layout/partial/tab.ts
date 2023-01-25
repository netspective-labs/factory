import * as ldsGovn from "../../governance.ts";
import * as icon from "./icon.ts";

export type TabTitleLink = string;
export type TabTitle = string;
export type TabBody = string;
export type TabIdentifier = string;
export type TabStyle = string;

export interface Tab {
  readonly title: TabTitle;
  readonly icon?: icon.IconIdentity;
  readonly href?: TabTitleLink;
  readonly body?: TabBody;
  readonly id?: TabIdentifier;
  readonly style?: TabStyle;
}

export function renderedTab(
  _layout: ldsGovn.LightningLayout,
  Tab: Tab,
): string {
  // deno-fmt-ignore
  return `
    ${Tab.body ? `<div id="${Tab.id}" class="slds-tabs_default__content knowledge-center-user-tab-content ${Tab.style}" role="tabpanel" aria-labelledby="tab-default-1__item">
  ${Tab.body}</div>` : ''}
    `
}
