"use strict";

/**
 * Create a dynamic SLDS assets supplier so that whatever need at runtime can be
 * kept as portable as possible.
 * @param {(relURL) => string} iconLocResolver given a relative icon URL, create absolute path to icon
 * @returns
 */
function lightningDSAssets(iconLocResolver) {
  return {
    lightingIconURL: (identity) => {
      const collection = typeof identity === "string" ? "utility" : identity.collection;
      const name = typeof identity === "string" ? identity : identity.name;
      return iconLocResolver(`/${collection}-sprite/svg/symbols.svg#${name}`);
    }
  }
}

/**
 * lightningDSLayout provides convenience functions which uses "origin" data stored in
 * <html> data attributes and layout context in <body> data attributes to
 * compute a variety of layout properties specific to the active page such as:
 *   - computing URLs of the current page and relatives, accounting pretty URLs
 *   - computing location of assets in module, design-system, and universal scopes
 *   - handling operational context (lifecycle) custom events
 * @param {*} prepareLayoutCtx results of rfOriginContext(), rfLayoutContext() and other options
 * @returns layout convenience functions for the current page (operates as a "class" with "this" so don't try to use spreads on the result);
 *          init() should be called when it's ready for use
 */
function lightningDSLayout(prepareLayoutCtx) {
  return rfUniversalLayout({
    ...prepareLayoutCtx,
    enhanceResult: (layoutResult) => {
      layoutResult.assets.ldsIcons = (relURL) => `${layoutResult.assets.dsAssetsBaseAbsURL()}/image/slds-icons${relURL}`;
      const lightningAssetsSupplier = lightningDSAssets(layoutResult.assets.ldsIcons);
      layoutResult.lightingIconURL = lightningAssetsSupplier.lightingIconURL;
    },
    autoInitProvisionCtx: {
      afterInit: (clientLayout) => {
        if (typeof lightningActivatePage == 'function') {
          lightningActivatePage(clientLayout, lightningActivateAllPageItems);
          if (prepareLayoutCtx.diagnose) console.log("lightningActivatePage called for", clientLayout);
        } else {
          console.error('lightningActivatePage(clientLayout) not available');
        }
      }
    }
  });
}

const assignlightningIconSvgUseBase = (svgUses, lightningAssetsSupplier) => {
  const fixIconsRef = (use, refAttrName) => {
    const href = use.getAttribute(refAttrName);
    if (href) {
      const matches = href.match(
        /^\/assets\/icons\/(.*?)-sprite\/svg\/symbols.svg\#(.*?)$/i,
      );
      if (matches) {
        use.setAttribute(
          refAttrName,
          lightningAssetsSupplier.lightingIconURL({
            collection: matches[1],
            name: matches[2],
          }),
        );
      }
    }
  };

  svgUses.forEach((use) => {
    fixIconsRef(use, "href");
    fixIconsRef(use, "xlink:href");
  });
};

const lightningToggleIsOpen = (element) =>
  element.classList.toggle("slds-is-open");
const lightningToggleParentIsOpen = (element) =>
  lightningToggleIsOpen(element.parentNode);

/**
 * [Dropdown Menus](https://www.lightningdesignsystem.com/components/menus/)
 */
const lightningDropdownButtons = document.querySelectorAll(
  ".slds-dropdown-trigger_click > .slds-button",
);

const lightningDropdownButtonsActivate = (
  buttons = Array.from(lightningDropdownButtons),
) => {
  buttons.forEach((button) =>
    button.addEventListener(
      "click",
      (event) => lightningToggleParentIsOpen(event.currentTarget),
      false,
    )
  );
};

/**
 * [Tabs](https://www.lightningdesignsystem.com/components/tabs/)
 */
const lightningTabs = (variant) =>
  document.querySelectorAll(
    `.slds-tabs_${variant} [role=tablist] [role=tab]`,
  );
const lightningTabActiveReset = (tab) =>
  Array.from(tab.parentNode.parentNode.querySelectorAll("li"))
    .forEach((element) => element.classList.remove("slds-active"));
const lightningTabActiveSet = (tab) =>
  tab.parentNode.classList.add("slds-active");
const lightningTabPanelsReset = (tab) =>
  Array.from(
    tab.parentNode.parentNode.parentNode.querySelectorAll('[role="tabpanel"]'),
  )
    .forEach((tabpanel) => {
      tabpanel.classList.remove("slds-show");
      tabpanel.classList.remove("slds-hide");
      tabpanel.classList.add("slds-hide");
    });
const lightningTabPanelShow = (tab) => {
  const tabpanel = document.getElementById(tab.getAttribute("aria-controls"));
  tabpanel.classList.remove("slds-show");
  tabpanel.classList.remove("slds-hide");
  tabpanel.classList.add("slds-show");
};

const defaultLightningTabs = lightningTabs("default");
const scopedLightningTabs = lightningTabs("scoped");

const assignLightningTabEvents = (event) => {
  lightningTabActiveReset(event.currentTarget);
  lightningTabActiveSet(event.currentTarget);
  lightningTabPanelsReset(event.currentTarget);
  lightningTabPanelShow(event.currentTarget);
};

const lightningTabsActivate = (
  tabs = [
    ...Array.from(defaultLightningTabs),
    ...Array.from(scopedLightningTabs),
  ],
) => {
  tabs.forEach((tab) => {
    console.dir(tab);
    tab.addEventListener("click", assignLightningTabEvents, false);
  });
};


/**
 * [ActivityTimeline](https://www.lightningdesignsystem.com/components/activity-timeline/)
 */
const activityTimelineRowButtons = () =>
  document.querySelectorAll(
    `button.slds-button`,
  );

const activityTimelineRowClick = (element) =>
  element.parentNode.parentNode.classList.toggle("slds-is-open");
const activityTimelineRowParentClick = (element) =>
  activityTimelineRowClick(element.parentNode);

const activityTimelineActivate = (
  buttons = Array.from(activityTimelineRowButtons()),
) => {
  buttons.forEach((btn) => {
    btn.addEventListener("click", (event) => activityTimelineRowParentClick(event.currentTarget), false);
  });
};

/**
 * [TreeGrid](https://www.lightningdesignsystem.com/components/tree-grid/)
 */
const lightningTreeGridRowButtons = () =>
  document.querySelectorAll(
    `table.slds-table_tree > tbody > tr > th > button.slds-button`,
  );

const lightningTreeGridRowClick = (event) => {
  const findChildren = function (tr) {
    const children = [];
    const targetDepth = tr.getAttribute("aria-level");
    let sibling = tr.nextElementSibling;
    while (sibling) {
      const siblingDepth = sibling.getAttribute("aria-level");
      if (siblingDepth > targetDepth) {
        children.push(sibling);
        sibling = sibling.nextElementSibling;
      } else {
        break;
      }
    }
    return children;
  };

  const tr = event.target.closest("tr");
  let children = findChildren(tr);

  // remove already collapsed nodes so that we don't make them visible
  const subnodes = children.filter((c) =>
    c.getAttribute("aria-expanded") == "false"
  );
  subnodes.forEach((subnode) => {
    const subnodeChildren = findChildren(subnode);
    children = children.filter((el) => !subnodeChildren.includes(el));
  });

  if (tr.getAttribute("aria-expanded") == "true") {
    tr.setAttribute("aria-expanded", "false");
    children.forEach((c) => c.style.display = "none");
  } else {
    tr.setAttribute("aria-expanded", "true");
    children.forEach((c) => c.style.display = "");
  }
};

const lightningTreeGridsActivate = (
  buttons = Array.from(lightningTreeGridRowButtons()),
  click = true,
) => {
  buttons.forEach((btn) => {
    btn.addEventListener("click", lightningTreeGridRowClick, false);
    if (click) btn.click();
  });
};

/**
 * [Trees](https://www.lightningdesignsystem.com/components/trees/)
 */
const lightningTreesButtons = () =>
  document.querySelectorAll(
    `.slds-tree > li > div > .slds-button`
  );

const lightningTreeItemClick = (item) => {
  const li = item.closest("li");
  const ae = li.getAttribute("aria-expanded");
  li.setAttribute("aria-expanded", !ae || ae == "false" ? "true" : "false");
};

const lightningTreeButtonClick = (event) => {
  lightningTreeItemClick(event.target);
};

const lightningTreesActivate = (
  buttons = Array.from(lightningTreesButtons()),
  click = true,
) => {
  buttons.forEach((btn) => {
    console.log(btn);
    btn.addEventListener("click", lightningTreeButtonClick, false);
    if (click) btn.click();
  });
};

const lightningElemDirectives = (directives) => {
  for (const directive of directives) {
    const selected = directive.select();
    if (selected && selected.length > 0) {
      directive.apply(selected);
    }
  }
}

const lightningActivateAllPageItems = {
  activateDropDownButtons: true,
  activateTabs: true,
  activateActivityTimeline: true,
  activateTreeGrids: true,
  activateTrees: true,
  activateIconSvgUse: true,
  activateDirectives: [{
    select: () => document.querySelectorAll(".md > table"),
    apply: (selected) => {
      for (const table of selected) {
        table.classList.add('slds-table', 'slds-table_cell-buffer', 'slds-table_bordered');
        for (const thead of table.querySelectorAll('thead')) {
          thead.classList.add('slds-thead')
        }
        for (const tbody of table.querySelectorAll('tbody')) {
          tbody.classList.add('slds-tbody')
        }
        for (const cell of table.querySelectorAll('th,td')) {
          cell.classList.add('slds-cell-wrap');
        }
      }
    }
  }]
};

/**
 * lightningActivatePage is the "entry point" that is usually called in
 * <body onload=""> if Lightning Design System interactivity is desired.
 * When the page is activated, a cargo object that contains the "client
 * cargo" part of build process may be supplied. The client cargo is
 * useful for carrying build-time properties, such as page routes, to the
 * runtime client.
 * @param lightningAssetsSupplier object that contains lightingIconURL method
 * @returns nothing
 */
const lightningActivatePage = (
  lightningAssetsSupplier,
  options = lightningActivateAllPageItems,
) => {
  if (options.activateDropDownButtons) lightningDropdownButtonsActivate();
  if (options.activateTabs) lightningTabsActivate();
  if (options.activateTrees) lightningTreesActivate();
  if (options.activateTreeGrids) lightningTreeGridsActivate();
  if (options.activateDirectives) lightningElemDirectives(options.activateDirectives);
  if (options.activateActivityTimeline) activityTimelineActivate();

  // Replace instances like <use href="..."> with proper location of assets:
  //   <svg class="slds-button__icon slds-button__icon_hint slds-button__icon_small" aria-hidden="true">
  //      <use href="/assets/icons/utility-sprite/svg/symbols.svg#chevrondown"></use>
  //   </svg>
  // This allows us to copy/paste content from the SLDS documentation and automatically correct it at runtime
  if (options.activateIconSvgUse) {
    assignlightningIconSvgUseBase(
      document.querySelectorAll("svg > use"),
      lightningAssetsSupplier,
    );
  }

  /**
   * Any element can define a regular HTML class="Y" but also optionally
   * specifiy a 'data-print-class="X"' attribute. If defined, data-print-class
   * that "X" should be the class name for printing. We hook into before/after
   * print events to dynamically change the class before/after printing.
   */
  window.addEventListener("beforeprint", () => {
    for (const elem of document.querySelectorAll(`[data-print-class]`)) {
      // save existing class name so we can replace it after printing complete
      elem.dataset.beforePrintClass = elem.className;
      elem.className = elem.dataset.printClass;
    }
  });
  window.addEventListener("afterprint", () => {
    for (const elem of document.querySelectorAll(`[data-print-class]`)) {
      // if we saved the class name before printing, restore it after printing
      if (elem.dataset.beforePrintClass) {
        elem.className = elem.dataset.beforePrintClass;
      }
    }
  });

  if (typeof stickyFooter === 'function') {
    stickyFooter();
    if (StickyFooterMutationObserver) {
      stickyFooterObserver.observe(stickyFooterTarget, stickyFooterConfig);
    } else {
      //old IE
      setInterval(stickyFooter, 500);
    }
  }
};
