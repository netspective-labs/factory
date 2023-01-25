export interface LightningTile {
  readonly title: string;
  readonly href?: string;
}

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const renderedTile = (tile: LightningTile) => `
<article class="slds-tile">
    <h2 class="slds-tile__title" title="${tile.title}"><a href="${tile.href}/">${tile.title}</a></h2>
    <div class="slds-tile__detail">
        <!-- <p>{{description}}</p> -->
        <ul class="slds-list_horizontal slds-has-dividers_right slds-m-top_xx-small">
            <li class="slds-item">000001296</li>
            <li class="slds-item">Published</li>
            <li class="slds-item">How to Guide</li>
        </ul>
        <p>Last Modified: 1/14/16</p>
        <ul class="slds-list_horizontal slds-m-top_xx-small">
            <li class="slds-m-right_small">
                <button class="slds-button slds-button_icon slds-button_icon-border slds-button_icon-x-small"
                    aria-pressed="false">
                    <svg class="slds-button__icon" aria-hidden="true">
                        <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#like"></use>
                    </svg>
                    <span class="slds-assistive-text">Upvote</span>
                </button>
                <span class="slds-align-middle">1320</span>
            </li>
            <li>
                <button class="slds-button slds-button_icon slds-button_icon-border slds-button_icon-x-small"
                    aria-pressed="false">
                    <svg class="slds-button__icon" aria-hidden="true">
                        <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#dislike"></use>
                    </svg>
                    <span class="slds-assistive-text">Downvote</span>
                </button>
                <span class="slds-align-middle">362</span>
            </li>
        </ul>
    </div>
</article>`
