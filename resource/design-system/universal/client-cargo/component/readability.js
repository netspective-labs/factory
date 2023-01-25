class ReadabilityComponent extends HTMLElement {
    static originUrlAttrName = "origin-url";
    static registerResultHookAttrName = "register-result-hook";
    static get observedAttributes() {
        return [ReadabilityComponent.originUrlAttrName, ReadabilityComponent.registerResultHookAttrName]
    }

    constructor() {
        // Always call super() first, this is required by the spec.
        super();
    }

    connectedCallback() {
        $script(
            "https://raw.githack.com/mozilla/readability/0.4.1/Readability.js",
            () => {
                const originURL = this.getAttribute(ReadabilityComponent.originUrlAttrName);
                if (originURL) {
                    fetch(originURL, { redirect: "follow" }).then(
                        (response) => {
                            console.dir(response);
                            if (response.status == 200) {
                                response.text().then((html) => {
                                    this.innerHTML = html;                        // convert what was fetched into a DOM root
                                    const result = new Readability(this).parse(); // Readability script will mutate the DOM set above
                                    const registerResultHook = this.getAttribute(ReadabilityComponent.registerResultHookAttrName);
                                    if (registerResultHook) {
                                        try {
                                            const hook = eval(registerResultHook);
                                            if (typeof hook === "function") {
                                                hook(result, originURL, this);
                                            } else {
                                                console.error(`[ReadabilityComponent] hook provided by attribute "${ReadabilityComponent.registerResultHookAttrName}" is not a function: ${hook}`);
                                            }
                                        } catch (err) {
                                            console.error(`[ReadabilityComponent] attribute "${ReadabilityComponent.registerResultHookAttrName}" failed to provide hook (JS eval error): ${err}`);
                                        }
                                    }
                                });
                            } else {
                                this.innerHTML = `Error fetching <a href="${originURL}">${originURL}</a>: response.status = ${response.status} in ReadabilityComponent`;
                            }
                        },
                    ).catch((error) => {
                        this.innerHTML = `Error fetching ${originURL}: ${error} in ReadabilityComponent`;
                    });
                } else {
                    this.innerHTML = `originURL (attribute "${ReadabilityComponent.originUrlAttrName}") not supplied for ReadabilityComponent`;
                }
            }
        );
    }
}

customElements.define('mozilla-readable', ReadabilityComponent);
