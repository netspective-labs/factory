// TODO: convert to Typescript using fetch

/**
 * Web browser pages do not have access to their own HTTP headers. This function
 * allows a tiny HEAD based network call to be made to acquire HTTP headers for
 * any URL but defaults to the current location; once the headers are acquired,
 * convenient functional handling of the entire object or handling of specific
 * header properties is available.
 * @param {*} options
 */
export function inspectUrlHttpHeaders(options = {
    inspectURL: null, // default is current page/location
    onHeaders: null,  // (headers, url) => void,
    onHeader: null,   // { "header": (value, key, alias, url) => void, "header2": [found: (value, key, alias, url) => void, notFound: (key, alias, url) => void] }
}) {
    function parseHttpHeaders(httpHeaders) {
        return httpHeaders.split("\r\n")
            .map(x => x.split(/: */, 2))
            .filter(x => x[0])
            .reduce((ac, x) => {
                const headerNameAsIs = x[0];
                const headerNameCamelCase = headerNameAsIs.toLowerCase().replace(/([-_][a-z])/g, group =>
                    group.toUpperCase()
                        .replace('-', '')
                        .replace('_', '')
                );
                const headerValueAsIs = x[1];
                let headerValue = undefined;
                try {
                    headerValue = JSON.parse(headerValueAsIs);
                } catch {
                    headerValue = headerValueAsIs;
                }
                ac[headerNameAsIs] = headerValue;
                ac[headerNameCamelCase] = headerValue;
                ac.__headerNameAliases[headerNameCamelCase] = headerNameAsIs;
                ac.__headerNameAliases[headerNameAsIs] = headerNameCamelCase;
                return ac;
            }, { __headerNameAliases: {} });
    }

    const inspectURL = options?.inspectURL || location;
    const xhr = new XMLHttpRequest();
    xhr.open("HEAD", inspectURL);
    xhr.onload = function () {
        const headers = parseHttpHeaders(xhr.getAllResponseHeaders());
        if (options?.onHeaders && typeof options.onHeaders === "function") options.onHeaders(headers, inspectURL);
        if (options?.onHeader) {
            if (typeof options.onHeader !== "object") {
                console.error(`[inspectUrlHttpHeaders] options.onHeader is expected to be an object`);
                return;
            }
            for (const key in options.onHeader) {
                const alias = headers.__headerNameAliases[key];
                const handlers = options.onHeader[key];
                const foundHeaderFn = Array.isArray(handlers) ? handlers[0] : handlers;
                const notFoundHeaderFn = Array.isArray(handlers) ? handlers[1] : undefined;
                if (!(key in headers)) {
                    if (typeof notFoundHeaderFn === "function") {
                        notFoundHeaderFn(key, alias, inspectURL);
                    } else if (notFoundHeaderFn) {
                        console.error(`[inspectUrlHttpHeaders] onHeader "${key}" notFoundHeaderFn is not a function`);
                    }
                } else {
                    const value = headers[key];
                    if (typeof foundHeaderFn === "function") {
                        foundHeaderFn(value, key, alias, inspectURL);
                    } else {
                        console.error(`[inspectUrlHttpHeaders] onHeader "${key}" foundHeaderFn is not a function`);
                    }
                }
            }
        }
    }
    xhr.send();
}
