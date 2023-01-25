import * as ldsGovn from "../../governance.ts";
import * as icon from "./icon.ts";

export type TimelineActivitySubjectLink = string;
export type TimelineActivitySubject = string;
export type TimelineActivityElaboration = string;

export interface TimelineActivity {
  readonly subject: TimelineActivitySubject;
  readonly date: string;
  readonly selectable?: boolean;
  readonly icon: icon.IconIdentity;
  readonly itemIdentifier?: string;
  readonly href?: TimelineActivitySubjectLink;
  readonly elaboration?: TimelineActivityElaboration;
  readonly participants: {
    readonly label: string;
    readonly activity: string;
    readonly href?: string;
    readonly others?: { label: string; href: string }[];
  };
}

export function renderedTimelineActivity(
  layout: ldsGovn.LightningLayout,
  ta: TimelineActivity,
): string {
  // deno-fmt-ignore
  return `<div class="slds-timeline__item_expandable slds-timeline__item_task">
    <span class="slds-assistive-text">task</span>
    <div class="slds-media">
      <div class="slds-media__figure">
        <button class="slds-button slds-button_icon" title="Toggle details for ${ta.subject}" aria-controls="${Date.parse(ta.date)/1000}-expanded" aria-expanded="true">
          <svg class="slds-button__icon slds-timeline__details-action-icon" aria-hidden="true">
            <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#switch"></use>
          </svg>
          <span class="slds-assistive-text">Toggle details for ${ta.subject}</span>
        </button>
        <div class="slds-icon_container slds-icon-standard-task slds-timeline__icon" title="${icon.iconAssistiveText(ta.icon)}">
          ${icon.renderedIcon(layout, ta.icon, 'slds-icon_small')}
        </div>
      </div>
      <div class="slds-media__body">
        <div class="slds-grid slds-grid_align-spread slds-timeline__trigger">
          <div class="slds-grid slds-grid_vertical-align-center slds-truncate_container_75 slds-no-space">
            ${ta.selectable ? `<div class="slds-checkbox">
              <input type="checkbox" name="options" id="checkbox-unique-id-18" value="checkbox-unique-id-18" />
              <label class="slds-checkbox__label" for="checkbox-unique-id-18">
                <span class="slds-checkbox_faux"></span>
                <span class="slds-form-element__label slds-assistive-text">Mark ${ta.subject} complete</span>
              </label>
            </div>` : ''}
            <h3 class="slds-truncate" title="${ta.subject}">
              <a href="${ta.href}">
                <strong>${ta.subject}</strong>
              </a>
            </h3>
          </div>
          <div class="slds-timeline__actions slds-timeline__actions_inline">
            <p class="slds-timeline__date">${ta.date}</p>
          </div>
        </div>
        ${ta.participants ? `<p class="slds-m-horizontal_xx-small">
            <a href="${ta.participants.href || '#'}">${ta.participants.label}</a> ${ta.participants.activity}
            ${ta.participants.others ? ta.participants.others.map(o => `<a href="${o.href || '#'}">${o.label}</a>`) : ''}
        </p>` : ''}
        ${ta.elaboration ? `<article
            class="slds-box slds-timeline__item_details slds-theme_shade slds-m-top_x-small slds-m-horizontal_xx-small slds-p-around_medium"
            id="${Date.parse(ta.date)/1000}-expanded" aria-hidden="false">
            ${ta.elaboration}
        </article>`: ''}
      </div>
    </div>
  </div>`
}
