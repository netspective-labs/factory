class AgGridComponent extends HTMLElement {
    static configHrefAttrName = "config-href";
    static configEvalJsAttrName = "config-eval-js";
    static registerGridHookAttrName = "register-grid-hook";
    static domLayoutAttrName = "dom-layout";
    static get observedAttributes() {
        return [AgGridComponent.configHrefAttrName, AgGridComponent.configEvalJsAttrName, AgGridComponent.registerGridHookAttrName, AgGridComponent.domLayoutAttrName]
    }

    constructor() {
        // Always call super() first, this is required by the spec.
        super();
    }

    connectedCallback() {
        $script(
            "https://unpkg.com/ag-grid-community/dist/ag-grid-community.min.js",
            () => {
                const domLayout = this.getAttribute(AgGridComponent.domLayoutAttrName) || "autoHeight";
                const configure = (inherit) => {
                    const config = {
                        domLayout,
                        rowSelection: "single",
                        ...inherit.gridDefn, // either from innerHTML or API, everything overrides the defaults
                        onGridReady: (event) => event.columnApi.autoSizeAllColumns(),
                        components: {
                            // see https://www.ag-grid.com/javascript-grid/components/
                            // if any cell has this as a renderer, it becomes a "navigation cell"
                            navigationCellRenderer: (params) => {
                                if ("navigation" in params.data) {
                                    return `<a href="${params.data.navigation.url}">${params.value}</a>`;
                                }
                                return params.value;
                            },
                            hideZerosRenderer: (params) => {
                                return typeof params.value === "number"
                                    ? (params.value == 0 ? "" : params.value)
                                    : params.value;
                            },
                            ...inherit.components,
                        },
                    };
                    const grid = new agGrid.Grid(this, config);
                    const registerGridHook = this.getAttribute(AgGridComponent.registerGridHookAttrName);
                    if (registerGridHook) {
                        try {
                            const hook = eval(registerGridHook);
                            if (typeof hook === "function") {
                                hook(grid, config, this);
                            } else {
                                console.error(`[AgGridComponent] hook provided by attribute "${AgGridComponent.registerGridHookAttrName}" is not a function: ${hook}`);
                            }
                        } catch (err) {
                            console.error(`[AgGridComponent] attribute "${AgGridComponent.registerGridHookAttrName}" failed to provide hook: ${err}`);
                        }
                    }
                };

                const configURL = this.getAttribute(AgGridComponent.configHrefAttrName);
                if (configURL) {
                    fetch(configURL).then(
                        (response) => {
                            if (response.status == 200) {
                                response.json().then((gridDefn) => { configure({ gridDefn }); });
                            } else {
                                this.innerHTML = `Error loading <a href="${configURL}">${configURL}</a>: response.status = ${response.status} in AgGridComponent`;
                            }
                        },
                    ).catch((error) => {
                        this.innerHTML = `Error loading ${configURL}: ${error} in AgGridComponent`;
                    });
                } else {
                    const configEvalJS = this.getAttribute(AgGridComponent.configEvalJsAttrName);
                    if (configEvalJS) {
                        try {
                            const data = eval(configEvalJS);
                            configure(data);
                        } catch (err) {
                            this.innerHTML = `configEvalJS (attribute "${AgGridComponent.configEvalJsAttrName}") supplied for AgGridComponent, eval failed: ${err}`;
                        }
                    } else {
                        try {
                            const data = JSON.parse(this.innerText);
                            this.innerText = ''; // if we get to here, the data is valid JSON so AgGrid will initialize
                            configure(data);
                        } catch (err) {
                            this.innerHTML = `configURL (attribute "${AgGridComponent.configHrefAttrName}") not supplied for AgGridComponent, tried to use this.innerText as JSON but failed: ${err}`;
                        }
                    }
                }
            }
        );
    }
}

customElements.define('ag-grid', AgGridComponent);
