export function markdownItTransformer() {
    return {
        dependencies: undefined,
        acquireDependencies: async (transformer) => {
            const { default: markdownIt } = await import("https://jspm.dev/markdown-it@12.2.0");
            return { markdownIt, plugins: await transformer.plugins() };
        },
        construct: async (transformer) => {
            if (!transformer.dependencies) {
                transformer.dependencies = await transformer.acquireDependencies(transformer);
            }
            const markdownIt = transformer.dependencies.markdownIt({
                html: true,
                linkify: true,
                typographer: true,
            });
            transformer.customize(markdownIt, transformer);
            return markdownIt; // for chaining
        },
        customize: (markdownIt, transformer) => {
            const plugins = transformer.dependencies.plugins;
            markdownIt.use(plugins.footnote);
            return transformer; // for chaining
        },
        unindentWhitespace: (text, removeInitialNewLine = true) => {
            const whitespace = text.match(/^[ \t]*(?=\S)/gm);
            const indentCount = whitespace ? whitespace.reduce((r, a) => Math.min(r, a.length), Infinity) : 0;
            const regex = new RegExp(`^[ \\t]{${indentCount}}`, "gm");
            const result = text.replace(regex, "");
            return removeInitialNewLine ? result.replace(/^\n/, "") : result;
        },
        plugins: async () => {
            const { default: footnote } = await import("https://jspm.dev/markdown-it-footnote@3.0.3");
            return {
                footnote,
                adjustHeadingLevel: (md, options) => {
                    function getHeadingLevel(tagName) {
                        if (tagName[0].toLowerCase() === 'h') {
                            tagName = tagName.slice(1);
                        }

                        return parseInt(tagName, 10);
                    }

                    const firstLevel = options.firstLevel;

                    if (typeof firstLevel === 'string') {
                        firstLevel = getHeadingLevel(firstLevel);
                    }

                    if (!firstLevel || isNaN(firstLevel)) {
                        return;
                    }

                    const levelOffset = firstLevel - 1;
                    if (levelOffset < 1 || levelOffset > 6) {
                        return;
                    }

                    md.core.ruler.push("adjust-heading-levels", function (state) {
                        const tokens = state.tokens
                        for (let i = 0; i < tokens.length; i++) {
                            if (tokens[i].type !== "heading_close") {
                                continue
                            }

                            const headingOpen = tokens[i - 2];
                            // var heading_content = tokens[i - 1];
                            const headingClose = tokens[i];

                            // we could go deeper with <div role="heading" aria-level="7">
                            // see http://w3c.github.io/aria/aria/aria.html#aria-level
                            // but clamping to a depth of 6 should suffice for now
                            const currentLevel = getHeadingLevel(headingOpen.tag);
                            const tagName = 'h' + Math.min(currentLevel + levelOffset, 6);

                            headingOpen.tag = tagName;
                            headingClose.tag = tagName;
                        }
                    });
                },
            }
        },
    };
}

/**
 * Given a set of markdown text acquisition and rendering strategies as async
 * generators, transform markdown text into HTML and call handlers.
 * @param {{markdownText: (mdit) => string, renderHTML: (html, mdit) => void}} strategies
 * @param {*} options result of transformMarkdownItOptions
 */
export async function renderMarkdown(strategies, mditt = markdownItTransformer()) {
    const markdownIt = await mditt.construct(mditt);
    for await (const strategy of strategies(mditt)) {
        // we use await on markdownText() since it could be fetched or not
        // immediately available
        const markdown = mditt.unindentWhitespace(await strategy.markdownText(mditt));

        // renderHTML may be async, but we don't need to await it since we do
        // not care about the result
        strategy.renderHTML(markdownIt.render(markdown), mditt);
    }
}

/**
 * importMarkdownContent fetches markdown from a source, and
 * @param {string | URL | Request} input URL to acquire HTML from
 * @param {(foreignDoc) => []} select use the parsed HTML foreignDoc to select which nodes you want to acquire
 * @param {(importedNode, input, html) => void} inject the given, already document-adopted node anywhere you'd like
 */
export function importMarkdownContent(input, select, inject) {
    fetch(input).then(resp => {
        resp.text().then(html => {
            const parser = new DOMParser();
            const foreignDoc = parser.parseFromString(html, "text/html");
            const selected = select(foreignDoc);
            if (Array.isArray(selected)) {
                for (const s of selected) {
                    const importedNode = document.adoptNode(s);
                    inject(importedNode, input, html);
                }
            } else if (selected) {
                const importedNode = document.adoptNode(selected);
                inject(importedNode, input, html);
            }
        });
    });
}

/**
 * Given a list of {markdownText, renderHTML}[] functions in srcElements array, transform markdown text into HTML
 * and replace those elements with a new <div>. For each element, allow
 * finalization to be called in case the new elements should trigger some events.
 * @param {HTMLElement[]} srcElems an array of HTML document nodes whose body has the markdown or data-transformable-src="http://xyz.md"
 * @param {(newElem, oldElem) => void} finalizeElemFn optional function to be called for each transformed element
 */
export async function transformMarkdownElemsCustom(srcElems, finalizeElemFn, mditt = markdownItTransformer()) {
    await renderMarkdown(function* () {
        for (const elem of srcElems) {
            yield {
                markdownText: async () => {
                    // found data-transformable-src="http://xyz.md", fetch the markdown from a URL
                    if (elem.dataset.transformableSrc) {
                        const response = await fetch(elem.dataset.transformableSrc);
                        if (!response.ok) {
                            return `Error fetching ${elem.dataset.transformableSrc}: ${response.status}`;
                        }
                        return await response.text();
                    } else {
                        // no data-transformable-src="http://xyz.md", assume it's in the body
                        return elem.innerText;
                    }
                },
                // deno-lint-ignore require-await
                renderHTML: async (html) => {
                    try {
                        const formatted = document.createElement("div");
                        formatted.innerHTML = html;
                        elem.parentElement.replaceChild(formatted, elem);
                        if (finalizeElemFn) finalizeElemFn(formatted, elem);
                    } catch (error) {
                        console.error("Undiagnosable error in renderHTML()", error);
                    }
                },
            }
        }
    }, mditt)
}

/**
 * Run document.querySelectorAll(`[data-transformable="markdown"]`) to find all
 * <pre> or other element marked as "transformable", render the markdown's HTML
 * and replace the existing the existing element with the newly formatted elem.
 * For each element that's formatted, dispatch an event for others to handle.
 */
export async function transformMarkdownElems(firstHeadingLevel = 2) {
    const mdittDefaults = markdownItTransformer();
    await transformMarkdownElemsCustom(
        document.querySelectorAll(`[data-transformable="markdown"]`),
        (mdHtmlElem, mdSrcElem) => {
            mdHtmlElem.dataset.transformedFrom = "markdown";
            if (mdSrcElem.className) mdHtmlElem.className = mdSrcElem.className;
            document.dispatchEvent(new CustomEvent("transformed-markdown", {
                detail: { mdHtmlElem, mdSrcElem }
            }));
        }, {
        ...mdittDefaults,
        customize: (markdownIt, transformer) => {
            mdittDefaults.customize(markdownIt, transformer);
            markdownIt.use(transformer.dependencies.plugins.adjustHeadingLevel, { firstLevel: firstHeadingLevel });
        }
    })
}

