/*!
 * [Sticky Footer 2.3](https://github.com/coreysyms/foundationStickyFooter)
 * Copyright 2013 Corey Snyder.
 */

const StickyFooterMutationObserver = (function () {
    const prefixes = ["WebKit", "Moz", "O", "Ms", ""];
    for (let i = 0; i < prefixes.length; i++) {
        if (prefixes[i] + "StickyFooterMutationObserver" in window) {
            return window[prefixes[i] + "StickyFooterMutationObserver"];
        }
    }
    return false;
}());

//check for changes to the DOM
const stickyFooterTarget = document.body;
let stickyFooterObserver;
const stickyFooterConfig = {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true,
};

if (StickyFooterMutationObserver) {
    // create an observer instance
    stickyFooterObserver = new StickyFooterMutationObserver(() => { stickyFooter() });
}

//check for resize event
window.onresize = function () {
    stickyFooter();
};

//lets get the marginTop for the <footer>
function stickyFooterGetCSS(element, property) {
    const elem = document.getElementsByTagName(element)[0];
    let css = null;

    if (elem.currentStyle) {
        css = elem.currentStyle[property];
    } else if (window.getComputedStyle) {
        css = document.defaultView.getComputedStyle(elem, null)
            .getPropertyValue(property);
    }

    return css;
}

function stickyFooter() {
    if (StickyFooterMutationObserver) {
        stickyFooterObserver.disconnect();
    }
    document.body.setAttribute("style", "height:auto");

    //only get the last footer
    const footer = document.getElementsByTagName("footer")[document.getElementsByTagName("footer").length - 1];
    if (footer.getAttribute("style") !== null) {
        footer.removeAttribute("style");
    }

    if (window.innerHeight != document.body.offsetHeight) {
        const offset = window.innerHeight - document.body.offsetHeight;
        let current = stickyFooterGetCSS("footer", "margin-top");

        if (isNaN(parseInt(current)) === true) {
            footer.setAttribute("style", "margin-top:0px;");
            current = 0;
        } else {
            current = parseInt(current);
        }

        if (current + offset > parseInt(stickyFooterGetCSS("footer", "margin-top"))) {
            footer.setAttribute(
                "style",
                "margin-top:" + (current + offset) + "px;display:block;",
            );
        }
    }

    document.body.setAttribute("style", "height:100%");

    //reconnect
    if (StickyFooterMutationObserver) {
        stickyFooterObserver.observe(stickyFooterTarget, stickyFooterConfig);
    }
}

/*
! end sticky footer
*/
