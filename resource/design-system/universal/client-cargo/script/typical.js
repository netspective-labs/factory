"use strict";

/*
 * rfDesignSystemCtx, rfAcquireContextFromUrl, rfOriginContext, and  rfUniversalLayout
 * family of functions bring Resource Factory ("rf") server side context into the user
 * agent (browser, mobile, etc.). Context is primarily shared from the server to the
 * client through data-rf-* attributes in <html> tag. We use <html> data-rf-* attributes
 * because <html> is the earliest DOM object to be initialized so the server context is
 * made available early in the cycle for anyone who needs it.
 *
 * The easiest way to use the RF server/client context integration is to do the following:
 *     const clientLayout = rfUniversalLayout();
 *
 * Once the above is called you have full access server-side knowledge in the client.
 * You can run clientLayout.inspect.* methods in browser console to see what's there.
 */

function rfDesignSystemCtx(dataSrcElem = document.documentElement, attrPrefix = "data-rf-") {
  return JSON.parse(dataSrcElem.getAttribute(`${attrPrefix}origin-design-system`) ?? `{ "warning": "<html ${attrPrefix}origin-design-system> missing" }`);
}

async function rfAcquireContextFromUrl(url, defaultCtx) {
  try {
    if (url.endsWith(".json") || url.endsWith(".js") || url.endsWith(".mjs")) {
      let acquiredCtx;
      let isAcquired = false;
      let isAcquiredFromJS = false;
      let isAcquiredFromModule = false;
      if (url.endsWith(".mjs")) {
        // this will only work if running in a <script type="module"> context
        // so watch for exceptions
        acquiredCtx = await import(url);
        isAcquired = true;
        isAcquiredFromJS = true;
        isAcquiredFromModule = true;
      } else {
        const resp = await fetch(url);
        if (resp.ok) {
          if (url.endsWith(".json")) {
            // merge the existing OC with the fetched JSON result
            acquiredCtx = await resp.json();
            isAcquired = true;
          } else {
            // merge the existing OC with the JS code fetched evaluated in current context
            // TODO: is this is a security hole? will CORS pick up properly?
            acquiredCtx = eval(await resp.text());
            isAcquired = true;
            isAcquiredFromJS = true;
          }
        } else {
          defaultCtx.isAcquiredFromURL = false;
          defaultCtx.acquireFromUrlError = { issue: "fetch error", httpStatus: resp.status, httpStatusText: resp.statusText };
        }
      }
      if (isAcquired && typeof acquiredCtx === "object") {
        return { ...defaultCtx, ...acquiredCtx, isAcquiredFromURL: true, isAcquiredFromJS, isAcquiredFromModule };
      } else if (!defaultCtx.acquireFromUrlError) {
        defaultCtx.isAcquiredFromURL = false;
        defaultCtx.acquireFromUrlError = { issue: "fetched the asset but it did not resolve to an object", acquiredCtx };
      }
    } else {
      defaultCtx.acquireFromUrlError = { issue: "must be either .json, .mjs or .js endpoint" };
    }
  } catch (exception) {
    defaultCtx.isAcquiredFromURL = false;
    defaultCtx.acquireFromUrlError = { issue: "exception", exception };
  }
  return defaultCtx;
}

/**
 * Resource factory pages should provide "origination context" in data attributes
 * of the root <html> element. The following should be available:
 *   frontmatter: data-rf-origin-frontmatter='{JSON}'
 *   activeRoute: data-rf-origin-nav-active-route='{governance/route.ts::Route JSON}'
 *   designSystem: data-rf-origin-design-system="{string}" (like { identity: "LightningDS", layout: { name, symbol, src }})
 *   operationalCtx: data-rf-operational-ctx="{JSON}" (like '{"acquireFromURL":"/operational-context.json","assetsBaseURL":"/operational-context"}')
 * @param {HTMLElement} dataSrcElem which contains the data attributes
 * @param {string} attrPrefix the prefix to use to access the attributes (defaults to "data-rf-")
 * @returns object with attributes extracted from dataSrcElem, does not use "this" so should be safe to spread into other objects
 */
function rfOriginContext(dataSrcElem = document.documentElement, attrPrefix = "data-rf-") {
  const originCtx = {
    frontmatter: JSON.parse(dataSrcElem.getAttribute(`${attrPrefix}origin-frontmatter`) ?? `{ "warning": "<html ${attrPrefix}origin-frontmatter> missing" }`),
    activeRoute: JSON.parse(dataSrcElem.getAttribute(`${attrPrefix}origin-nav-active-route`) ?? `{ "warning": "<html ${attrPrefix}origin-nav-active-route> missing" }`),
    operationalCtx: JSON.parse(dataSrcElem.getAttribute(`${attrPrefix}operational-ctx`) ?? `{ "warning": "<html ${attrPrefix}operational-ctx> missing" }`),
    designSystem: rfDesignSystemCtx(dataSrcElem, attrPrefix),
    init: async (onInitialized, _provisionCtx) => {
      // don't initialize more than once
      if (originCtx.operationalCtx.isInitialized) return;

      // in case we're running in a dynamic (server) context, we might want to get
      // the operational context dynamically so let's grab it asynchronously
      const acquireOcFromURL = originCtx.operationalCtx.acquireFromURL;
      if (acquireOcFromURL) {
        originCtx.operationalCtx = await rfAcquireContextFromUrl(acquireOcFromURL, originCtx.operationalCtx);
      }
      originCtx.operationalCtx.isInitialized = true;
      if (onInitialized) onInitialized();

      // encourage chaining
      return originCtx;
    }
  };

  return originCtx;
}

/**
 * Send a message to notify all listeners that a server resource impact has occurred;
 * typically this is a message sent by the server to browsers to let them know that
 * the content they're showing might have been modified on the server and gives them
 * the opportunity to refresh or do some other actions.
 * @param {{ nature: "fs-resource-modified", fsAbsPathAndFileNameImpacted: "/abs/file/name.ext" }} impact
 * @param {*} prepareLayoutCtx the same configuration sent to rfUniversalLayout()
 */
function rfDispatchServerResourceImpact(impact, prepareLayoutCtx) {
  const {
    customEventNamingStrategy = (eventName) => `rfUniversalLayout.${eventName}`,
    serverResourceImpact = {
      customEventName: undefined, // use default customEventNamingStrategy("serverResourceImpact")
      fsResourceModifiedNature: "fs-resource-modified"
    }
  } = (prepareLayoutCtx ?? {});
  const { diagnose = false } = (impact ?? {});
  const serverResourceImpactEventName = serverResourceImpact.customEventName ?? customEventNamingStrategy("serverResourceImpact");

  // this event is usually observed by rfUniversalLayout().init() and calls rfUniversalLayout().onServerResourceImpact
  window.dispatchEvent(new CustomEvent(serverResourceImpactEventName, {
    detail: impact
  }));

  if (diagnose) {
    console.log(`rfDispatchServerResourceImpact(${JSON.stringify(impact)}, ${JSON.stringify(prepareLayoutCtx)})`);
  }
}

/**
 * rfLayout provides convenience functions which uses "origin" data stored in
 * <html> data attributes and layout context in <body> data attributes to
 * compute a variety of layout properties specific to the active page such as:
 *   - computing URLs of the current page and relatives, accounting pretty URLs
 *   - computing location of assets in module, design-system, and universal scopes
 *   - handling operational context (lifecycle) custom events
 *
 * NOTE: once an instance is created you can use the following in browser Console:
 *       - clientLayout.inspect.eventsAvailable()             to see what events are available
 *       - clientLayout.inspect.assets("/myasset", "mybrand") to see what asset locators are available
 *
 * @param {*} prepareLayoutCtx results of rfOriginContext(), rfLayoutContext() and other options
 * @returns layout convenience functions for the current page (operates as a "class" with "this" so don't try to use spreads on the result);
 *          init() should be called when it's ready for use
 */
function rfUniversalLayout(prepareLayoutCtx) {
  const {
    originCtx = rfOriginContext(document.documentElement, "data-rf-"),
    customEventNamingStrategy = (eventName) => `rfUniversalLayout.${eventName}`,
    autoInitAfterDOMContentLoaded = true,
    autoInitProvisionCtx = undefined,
    diagnose = false,
    enhanceResult = undefined,
    serverResourceImpact = {
      customEventName: undefined, // use default customEventNamingStrategy("lifecycle.serverResourceImpact")
      fsResourceModifiedNature: "fs-resource-modified"
    }
  } = (prepareLayoutCtx ?? {});

  // don't use originCtx.operationalCtx in a spread operation, always access it
  // as originCtx.operationalCtx because it can change during the lifecycle
  const { activeRoute, frontmatter, designSystem } = originCtx;

  let { moduleAssetsBaseAbsURL, dsAssetsBaseAbsURL, universalAssetsBaseAbsURL } = designSystem;
  if (moduleAssetsBaseAbsURL.endsWith("/")) moduleAssetsBaseAbsURL = moduleAssetsBaseAbsURL.slice(0, -1);
  if (dsAssetsBaseAbsURL.endsWith("/")) dsAssetsBaseAbsURL = dsAssetsBaseAbsURL.slice(0, -1);
  if (universalAssetsBaseAbsURL.endsWith("/")) universalAssetsBaseAbsURL = universalAssetsBaseAbsURL.slice(0, -1);
  const serverResourceImpactEventName = serverResourceImpact.customEventName ?? customEventNamingStrategy("serverResourceImpact");

  const layoutResult = {
    isInitialized: false, // will be set to true after init()
    originCtx,
    designSystem,
    frontmatter, // for convenience
    route: activeRoute, // for convenience
    init(provisionCtx) {
      if (this.isInitialized) return;

      originCtx.init(() => {
        if (originCtx.operationalCtx.init && typeof originCtx.operationalCtx.init === "function") {
          // in case the OC needs to be initialized separately, init it with our
          // instance information because we're almost ready. Don't assume success
          // or failure, set its own variables and call events asynchronously
          // (add observers if required).
          originCtx.operationalCtx.init(this, provisionCtx);
        } else {
          window.addEventListener(serverResourceImpactEventName, (event) => {
            if (event.detail) {
              // event.detail is the impact (like { nature: "", ... })
              this.onServerResourceImpact(event.detail);
            }
          });
          if (provisionCtx.diagnose) {
            console.log(`No originCtx.operationalCtx.init() method found, called window.addEventListener(${serverResourceImpactEventName})`);
          }
        }

        window.dispatchEvent(new CustomEvent(provisionCtx.notifyInitEventName ?? customEventNamingStrategy("init"), {
          detail: { layoutResult, provisionCtx, prepareLayoutCtx }
        }));

        this.isInitialized = true;
        if (provisionCtx.afterInit && typeof provisionCtx.afterInit == "function") {
          provisionCtx.afterInit(this);
        }

        if (provisionCtx.diagnose) {
          console.log(`rfLayout().init(${JSON.stringify(provisionCtx)}) completed`);
        }
      }, provisionCtx);

      // encourage chaining so we can use `const clientLayout = rfLayout().init({ diagnose: true });`
      return this;
    },
    inspect: {
      // documentation of the events available
      eventsAvailable: () => {
        console.log(`%c${customEventNamingStrategy("init")}%c`, "color:blue", "color:#999999", "will be called with { detail: { layoutResult, provisionCtx, prepareLayoutCtx } } after rfUniversalLayout().init() is called.");
        console.log(`%c${serverResourceImpactEventName}%c`, "color:blue", "color:#999999", `is observed for { detail: { nature: '${serverResourceImpact.fsResourceModifiedNature}' } }.`);
      },
      // documentation of the assets locations available
      assets: (simulate = "", brand = "common") => {
        for (const entry of Object.entries(layoutResult.assets)) {
          const [key, value] = entry;
          if (typeof value === "function") {
            console.log(`%c${key}("%c${simulate}%c", "%c${brand}%c")%c`, "color:blue", "color:green", "color:blue", "color:green", "color:blue", "color:#999999", eval(`layoutResult.assets.${key}(simulate, brand)`))
          }
        }
      }
    },
    urlRelToSelf(relURL) {
      // account for pretty URL -- TODO: account for originCtx.designSystem.isPrettyURL, right now it's just assumed to be true
      return ((location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`) + (relURL || '')).replace(/\/\/+/g, "/")
    },
    selfURL(relURL) {
      // TODO: account for originCtx.designSystem.isPrettyURL, right now it's just assumed to be true
      return relURL.startsWith('./') ? this.urlRelToSelf(relURL.substring(1)) : (relURL.startsWith('../') ? this.urlRelToSelf(relURL) : relURL)
    },
    assets: {
      assetsBaseAbsURL() { return moduleAssetsBaseAbsURL; },
      dsAssetsBaseAbsURL() { return dsAssetsBaseAbsURL; },
      universalAssetsBaseAbsURL() { return universalAssetsBaseAbsURL; },
      operationalCtxAssetsBaseURL() { return originCtx.operationalCtx.assetsBaseAbsURL; },
      image(relURL) { return `${this.assetsBaseAbsURL()}${relURL}`; },
      favIcon(relURL) { return `${this.assetsBaseAbsURL()}${relURL}`; },
      script(relURL) { return `${this.assetsBaseAbsURL()}${relURL}`; },
      stylesheet(relURL) { return `${this.assetsBaseAbsURL()}${relURL}`; },
      component(relURL) { return `${this.assetsBaseAbsURL()}${relURL}`; },
      model(relURL) { return `${this.assetsBaseAbsURL()}${relURL}`; },
      dsImage(relURL) { return `${this.dsAssetsBaseAbsURL()}/image${relURL}`; },
      dsScript(relURL) { return `${this.dsAssetsBaseAbsURL()}/script${relURL}`; },
      dsStylesheet(relURL) { return `${this.dsAssetsBaseAbsURL()}/style${relURL}`; },
      dsComponent(relURL) { return `${this.dsAssetsBaseAbsURL()}/component${relURL}`; },
      dsModel(relURL) { return `${this.dsAssetsBaseAbsURL()}/model${relURL}`; },
      uImage(relURL) { return `${this.universalAssetsBaseAbsURL()}/image${relURL}`; },
      uScript(relURL) { return `${this.universalAssetsBaseAbsURL()}/script${relURL}`; },
      uStylesheet(relURL) { return `${this.universalAssetsBaseAbsURL()}/style${relURL}`; },
      uComponent(relURL) { return `${this.universalAssetsBaseAbsURL()}/component${relURL}`; },
      uModel(relURL) { return `${this.universalAssetsBaseAbsURL()}/model${relURL}`; },
      brandImage(relURL, brand = "common") { return this.image(`/brand/${brand}${relURL}`); },
      brandScript(relURL, brand = "common") { return this.script(`/brand/${brand}${relURL}`); },
      brandStylesheet(relURL, brand = "common") { return this.stylesheet(`/brand/${brand}${relURL}`); },
      brandComponent(relURL, brand = "common") { return this.component(`/brand/${brand}${relURL}`); },
      brandModel(relURL, brand = "common") { return this.model(`/brand/${brand}${relURL}`); },
      brandFavIcon(relURL, brand = "common") { return this.favIcon(`/brand/${brand}${relURL}`); },
      operationalCtx(relURL) { return `${this.operationalCtxAssetsBaseURL()}${relURL}`; },
    },
    navigation: {
      location: (unit) => {
        const loc = unit.qualifiedPath === "/index" ? "/" : unit.qualifiedPath;
        return loc.endsWith("/index")
          ? loc.endsWith("/") ? `${loc}..` : `${loc}/..`
          : (loc.endsWith("/") ? loc : `${loc}/`);
      }
    },
    location(relURL) { return `${activeRoute?.terminal?.qualifiedPath}${relURL}` },
    navigate(absURL) { window.location = absURL; },
    resolvePrettyUrlHref: (path) => {
      if (window.location.pathname.endsWith('/')) return path; // we're a pretty URL, no change
      if (path.startsWith('/')) return path;                   // absolute path, no change
      if (path.startsWith('../')) return path.substr(3);       // relative path but we're not using pretty URL so strip first unit
      return path;                                             // not sure, leave it alone
    },
    onServerResourceImpact(impact) {
      const { nature, fsAbsPathAndFileNameImpacted, diagnose } = (impact ?? { nature: "not-supplied" })
      if (nature && nature == serverResourceImpact.fsResourceModifiedNature && fsAbsPathAndFileNameImpacted) {
        const activePageFileSysPath = activeRoute?.terminal?.fileSysPath;
        if (activePageFileSysPath == fsAbsPathAndFileNameImpacted) {
          // in case we have a parent that cares about our impact (rfExplorer frameset needs this)
          if (window.parent && window.parent.onServerResourceImpact) {
            // if we are running in an rfExplorer context and the parent onServerResourceImpact handled
            // the event by returning true we don't take any further action; if the result is
            // false then we do our normal activity
            if (window.parent.onServerResourceImpact(impact, {
              action: 'reload',
              fsAbsPathAndFileNameImpacted,
              activeRouteTerminal: activeRoute?.terminal
            })) return;
          }
          location.reload();
        } else {
          // in case we have a parent that cares about our impact (rfExplorer frameset needs this)
          if (window.parent && window.parent.onServerResourceImpact) {
            window.parent.onServerResourceImpact(impact, { action: 'none', reason: 'active-route-not-impacted', fsAbsPathAndFileNameImpacted, activeRouteTerminal: activeRoute?.terminal });
          }
          if (diagnose) {
            console.log(`rfLayout().onServerResourceImpact(${nature}) called but this resource was not impacted:`, fsAbsPathAndFileNameImpacted, activeRoute?.terminal);
          }
        }
      } else {
        // in case we have a parent that cares about our impact (rfExplorer frameset needs this)
        if (window.parent && window.parent.onServerResourceImpact) {
          window.parent.onServerResourceImpact(impact, { action: 'none', reason: 'unable-to-handle' });
        }
        if (diagnose) {
          console.log("rfLayout().onServerResourceImpact() called but this function was unable to handle the event", impact, this);
        }
      }
    },
  }

  if (enhanceResult) {
    enhanceResult(layoutResult);
  }

  if (autoInitAfterDOMContentLoaded) {
    if (document.readyState !== 'loading') {
      if (diagnose) {
        console.log(`rfLayout() autoInitAfterDOMContentLoaded called immediately, document is ready`);
      }
      layoutResult.init({ ...autoInitProvisionCtx, diagnose, execNature: "immediate" });
    } else {
      if (diagnose) {
        console.log(`rfLayout() autoInitAfterDOMContentLoaded setup to be called after DOMContentLoaded, document not ready yet`);
      }
      // the document is being loaded so wait until it's done
      document.addEventListener('DOMContentLoaded', function () {
        layoutResult.init({ ...autoInitProvisionCtx, diagnose, execNature: "addEventListener" });
      });
    }
  }

  return layoutResult;
}

const MINUTE = 60,
  HOUR = MINUTE * 60,
  DAY = HOUR * 24,
  WEEK = DAY * 7,
  MONTH = DAY * 30,
  YEAR = DAY * 365

function getTimeAgo(date) {
  const secondsAgo = Math.round((+new Date() - date) / 1000)
  let divisor = null
  let unit = null

  if (secondsAgo < MINUTE) {
    return secondsAgo + " seconds ago"
  } else if (secondsAgo < HOUR) {
    [divisor, unit] = [MINUTE, 'minute']
  } else if (secondsAgo < DAY) {
    [divisor, unit] = [HOUR, 'hour']
  } else if (secondsAgo < WEEK) {
    [divisor, unit] = [DAY, 'day']
  } else if (secondsAgo < MONTH) {
    [divisor, unit] = [WEEK, 'week']
  } else if (secondsAgo < YEAR) {
    [divisor, unit] = [MONTH, 'month']
  } else if (secondsAgo > YEAR) {
    [divisor, unit] = [YEAR, 'year']
  }

  const count = Math.floor(secondsAgo / divisor)
  return `${count} ${unit}${(count > 1) ? 's' : ''} ago`
}

/**
 * Create a custom element which will take any date and show long ago it was.
 * Usage in HTML:
 *     <span is="time-ago" date="valid Date string"/>
 * `date` is a Javascript Date string that will be passed into new Date(text)
 */
customElements.define('time-ago',
  class TimeAgoSpanElement extends HTMLSpanElement {
    static get observedAttributes() { return ['date']; }
    connectedCallback() { this.innerHTML = getTimeAgo(new Date(this.getAttribute('date'))); }
  },
  { extends: 'span' }
);

function getWordCount(rootElement) {
  let docContent = rootElement.textContent;

  // Parse out unwanted whitespace so the split is accurate
  // ref: https://github.com/microsoft/vscode-wordcount/blob/main/extension.ts
  docContent = docContent.replace(/(< ([^>]+)<)/g, '').replace(/\s+/g, ' ');
  docContent = docContent.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  let wordCount = 0;
  if (docContent != "") {
    wordCount = docContent.split(" ").length;
  }
  return wordCount;
}

/**
 * Create a custom element which will take any element ID and show how many words are in there.
 * Usage in HTML:
 *     <span is="word-count" element-id="ELEMENT_ID"/>
 * `element-id` is a DOM element identifier like <div id="ELEMENT_ID">
 */
customElements.define('word-count',
  class WordCountElement extends HTMLSpanElement {
    static get observedAttributes() { return ['element-id']; }
    connectedCallback() {
      window.addEventListener("load", () => {
        this.innerHTML = getWordCount(document.getElementById("content"));
      });
    }
  },
  { extends: 'span' }
);