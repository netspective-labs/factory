// IMPORTANT: this script should be included as a module, before clientLayout.init() is called;
// =========
// hook into the rfUniversalLayout init so that when it's ready we can grab
// experimental server (dev mode) functionality.

window.addEventListener("rfUniversalLayout.init", (event) => {
    if (event.detail) {
        const { layoutResult: clientLayout, prepareLayoutCtx } = event.detail;
        const serverJsURL = clientLayout.assets.operationalCtx("/server.auto.mjs");
        if (prepareLayoutCtx.diagnose) console.log("locating server.auto.mjs:", serverJsURL);
        if (serverJsURL) {
            import(serverJsURL).then((module) => {
                if (prepareLayoutCtx.diagnose) console.log("imported", serverJsURL);
                if (module.default && typeof module.default === "function") {
                    module.default(event.detail);
                } else {
                    console.error(serverJsURL, "has no default function to execute");
                }
            }).catch((ctx) => {
                if (prepareLayoutCtx.diagnose) console.log("unable to import", serverJsURL, ctx);
            });
        }
    }
})
