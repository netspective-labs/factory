class EventEmitter {
    _events_ = new Map();
    on(event, listener) {
        if (!this._events_.has(event)) this._events_.set(event, new Set());
        this._events_.get(event).add(listener);
        return this;
    }
    once(event, listener) {
        const l = listener;
        l.__once__ = true;
        return this.on(event, l);
    }
    off(event, listener) {
        if ((event === undefined || event === null) && listener) throw new Error("Why is there a listener defined here?");
        else if ((event === undefined || event === null) && !listener) this._events_.clear();
        else if (event && !listener) this._events_.delete(event);
        else if (event && listener && this._events_.has(event)) {
            const _ = this._events_.get(event);
            _.delete(listener);
            if (_.size === 0) this._events_.delete(event);
        } else ;
        return this;
    }
    emitSync(event, ...args) {
        if (!this._events_.has(event)) return this;
        const _ = this._events_.get(event);
        for (let [, listener] of _.entries()){
            const r = listener(...args);
            if (r instanceof Promise) r.catch(console.error);
            if (listener.__once__) {
                delete listener.__once__;
                _.delete(listener);
            }
        }
        if (_.size === 0) this._events_.delete(event);
        return this;
    }
    async emit(event, ...args) {
        if (!this._events_.has(event)) return this;
        const _ = this._events_.get(event);
        for (let [, listener] of _.entries()){
            try {
                await listener(...args);
                if (listener.__once__) {
                    delete listener.__once__;
                    _.delete(listener);
                }
            } catch (error) {
                console.error(error);
            }
        }
        if (_.size === 0) this._events_.delete(event);
        return this;
    }
    queue(event, ...args) {
        (async ()=>await this.emit(event, ...args))().catch(console.error);
        return this;
    }
    pull(event, timeout) {
        return new Promise(async (resolve, reject)=>{
            let timeoutId;
            let listener = (...args)=>{
                if (timeoutId !== null) clearTimeout(timeoutId);
                resolve(args);
            };
            timeoutId = typeof timeout !== "number" ? null : setTimeout(()=>(this.off(event, listener), reject(new Error("Timed out!"))));
            this.once(event, listener);
        });
    }
    clone(cloneListeners = true) {
        const emitter = new EventEmitter();
        if (cloneListeners) {
            for (const [key, set] of this._events_)emitter._events_.set(key, new Set([
                ...set
            ]));
        }
        return emitter;
    }
}
export { EventEmitter as EventEmitter };
function humanFriendlyBytes(bytes, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) {
        return bytes + " B";
    }
    const units = si ? [
        "kB",
        "MB",
        "GB",
        "TB",
        "PB",
        "EB",
        "ZB",
        "YB"
    ] : [
        "KiB",
        "MiB",
        "GiB",
        "TiB",
        "PiB",
        "EiB",
        "ZiB",
        "YiB"
    ];
    let u = -1;
    const r = 10 ** dp;
    do {
        bytes /= thresh;
        ++u;
    }while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1)
    return bytes.toFixed(dp) + " " + units[u];
}
function humanFriendlyPhrase(text) {
    return text.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s\s+/g, " ").replace(/(^\w{1})|(\s+\w{1})/g, (letter)=>letter.toUpperCase());
}
const humanPath = (original, maxLength = 50, formatBasename)=>{
    const tokens = original.split("/");
    const basename = tokens[tokens.length - 1];
    tokens.splice(0, 1);
    tokens.splice(tokens.length - 1, 1);
    if (original.length < maxLength) {
        return (tokens.length > 0 ? tokens.join("/") + "/" : "") + (formatBasename ? formatBasename(basename) : basename);
    }
    const remLen = maxLength - basename.length - 4;
    if (remLen > 0) {
        const path = tokens.join("/");
        const lenA = Math.ceil(remLen / 2);
        const lenB = Math.floor(remLen / 2);
        const pathA = path.substring(0, lenA);
        const pathB = path.substring(path.length - lenB);
        return pathA + "..." + pathB + "/" + (formatBasename ? formatBasename(basename) : basename);
    }
    return formatBasename ? formatBasename(basename) : basename;
};
export { humanFriendlyBytes as humanFriendlyBytes };
export { humanFriendlyPhrase as humanFriendlyPhrase };
export { humanPath as humanPath };
function minWhitespaceIndent(text) {
    const match = text.match(/^[ \t]*(?=\S)/gm);
    return match ? match.reduce((r, a)=>Math.min(r, a.length), Infinity) : 0;
}
function unindentWhitespace(text, removeInitialNewLine = true) {
    const indent = minWhitespaceIndent(text);
    const regex = new RegExp(`^[ \\t]{${indent}}`, "gm");
    const result = text.replace(regex, "");
    return removeInitialNewLine ? result.replace(/^\n/, "") : result;
}
function singleLineTrim(text) {
    return text.replace(/(\r\n|\n|\r)/gm, "").replace(/\s+(?=(?:[^\'"]*[\'"][^\'"]*[\'"])*[^\'"]*$)/g, " ").trim();
}
function whitespaceSensitiveTemplateLiteralSupplier(literals, suppliedExprs, options) {
    const { unindent =true , removeInitialNewLine =true  } = options ?? {};
    let literalSupplier = (index)=>literals[index];
    if (unindent) {
        if (typeof unindent === "boolean") {
            let originalText = "";
            for(let i = 0; i < suppliedExprs.length; i++){
                originalText += literals[i] + `\${expr${i}}`;
            }
            originalText += literals[literals.length - 1];
            const match = originalText.match(/^[ \t]*(?=\S)/gm);
            const minWhitespaceIndent = match ? match.reduce((r, a)=>Math.min(r, a.length), Infinity) : 0;
            if (minWhitespaceIndent > 0) {
                const unindentRegExp = new RegExp(`^[ \\t]{${minWhitespaceIndent}}`, "gm");
                literalSupplier = (index)=>{
                    let text = literals[index];
                    if (index == 0 && removeInitialNewLine) {
                        text = text.replace(/^\n/, "");
                    }
                    return text.replace(unindentRegExp, "");
                };
            }
        } else {
            literalSupplier = (index)=>{
                let text = literals[index];
                if (index == 0 && removeInitialNewLine) {
                    text = text.replace(/^\n/, "");
                }
                return text.replace(unindent, "");
            };
        }
    }
    return literalSupplier;
}
export { minWhitespaceIndent as minWhitespaceIndent };
export { unindentWhitespace as unindentWhitespace };
export { singleLineTrim as singleLineTrim };
export { whitespaceSensitiveTemplateLiteralSupplier as whitespaceSensitiveTemplateLiteralSupplier };
const jsTokenEvalRE = /^[a-zA-Z0-9_]+$/;
function jsTokenEvalResult(identity, discover, isTokenValid, onInvalidToken, onFailedDiscovery) {
    let result;
    if (identity.match(jsTokenEvalRE)) {
        try {
            if (Array.isArray(discover)) {
                for (const te of discover){
                    result = te(identity);
                    if (result) break;
                }
            } else {
                result = discover(identity);
            }
            if (result && isTokenValid) result = isTokenValid(result, identity);
        } catch (error) {
            result = onFailedDiscovery?.(error, identity);
        }
    } else {
        result = onInvalidToken?.(identity);
    }
    return result;
}
const jsTokenEvalResults = {};
function cacheableJsTokenEvalResult(name, discover = eval, onInvalidToken, onFailedDiscovery) {
    if (name in jsTokenEvalResults) return jsTokenEvalResults[name];
    return jsTokenEvalResult(name, discover, (value, name)=>{
        jsTokenEvalResults[name] = value;
        return value;
    }, onInvalidToken, onFailedDiscovery);
}
function* walkHooks(targets, hookNameSuppliers, discover, prepareWalkEntry) {
    const suppliers = Array.isArray(hookNameSuppliers) ? hookNameSuppliers : [
        hookNameSuppliers
    ];
    for (const target of targets){
        for (const hookNameSupplier of suppliers){
            const hookName = hookNameSupplier(target);
            if (hookName) {
                const hookDiscovered = jsTokenEvalResult(hookName, discover, (value)=>value, (name)=>{
                    console.log(`[discoverDomElemHook] '${name}' is not a token in current scope for`, target);
                    return undefined;
                });
                let hookExecArgs = {
                    target,
                    hookDiscovered,
                    hookName,
                    hookNameSupplier
                };
                if (prepareWalkEntry) {
                    const prepared = prepareWalkEntry(hookExecArgs);
                    if (!prepared) continue;
                    hookExecArgs = prepared;
                }
                const hookExecResult = hookDiscovered && typeof hookDiscovered === "function" ? hookDiscovered(hookExecArgs) : undefined;
                yield hookExecResult ?? hookExecArgs;
            }
        }
    }
}
function flexibleArgs(argsSupplier, rulesSupplier) {
    const rules = rulesSupplier ? typeof rulesSupplier === "function" ? rulesSupplier(argsSupplier) : rulesSupplier : undefined;
    const defaultArgsSupplier = rules?.defaultArgs ?? {};
    const defaultArgs = typeof defaultArgsSupplier === "function" ? defaultArgsSupplier(argsSupplier, rules) : defaultArgsSupplier;
    let args = typeof argsSupplier === "function" ? argsSupplier(defaultArgs, rules) : argsSupplier ? {
        ...defaultArgs,
        ...argsSupplier
    } : defaultArgs;
    if (rules?.argsGuard) {
        if (!rules?.argsGuard.guard(args)) {
            args = rules.argsGuard.onFailure(args, rules);
        }
    }
    let result = {
        args,
        rules
    };
    if (rules?.finalizeResult) {
        result = rules.finalizeResult(result);
    }
    return result;
}
function governedArgs(argsSupplier, rulesSupplier) {
    const result = flexibleArgs(argsSupplier, rulesSupplier);
    return result;
}
export { jsTokenEvalResult as jsTokenEvalResult };
export { cacheableJsTokenEvalResult as cacheableJsTokenEvalResult };
export { walkHooks as walkHooks };
export { flexibleArgs as flexibleArgs };
export { governedArgs as governedArgs };
const posixPathRE = /^((\/?)(?:[^\/]*\/)*)((\.{1,2}|[^\/]+?|)(\.[^.\/]*|))[\/]*$/;
function detectFileSysStyleRoute(text) {
    const components = posixPathRE.exec(text)?.slice(1);
    if (!components || components.length !== 5) return undefined;
    const modifiers = [];
    const parsedPath = {
        root: components[1],
        dir: components[0].slice(0, -1),
        base: components[2],
        ext: components[4],
        name: components[3],
        modifiers
    };
    const modifierIndex = parsedPath.name.lastIndexOf(".");
    if (modifierIndex > 0) {
        let ppn = parsedPath.name;
        let modifier = ppn.substring(modifierIndex);
        while(modifier && modifier.length > 0){
            modifiers.push(modifier);
            ppn = ppn.substring(0, ppn.length - modifier.length);
            const modifierIndex1 = ppn.lastIndexOf(".");
            modifier = modifierIndex1 > 0 ? ppn.substring(modifierIndex1) : undefined;
        }
        parsedPath.name = ppn;
    }
    return parsedPath;
}
export { detectFileSysStyleRoute as detectFileSysStyleRoute };
function typeGuard(...requireKeysInSingleT) {
    return (o)=>{
        if (o && typeof o === "object") {
            return !requireKeysInSingleT.find((p)=>!(p in o));
        }
        return false;
    };
}
const isIdentifiablePayload = typeGuard("payloadIdentity");
const ValidatedPayload = typeGuard("isValidatedPayload", "isValidPayload");
function isEventSourceService(o) {
    const isType = typeGuard("isEventSourcePayload", "prepareEventSourcePayload");
    return isType(o);
}
function isFetchService(o) {
    const isType = typeGuard("fetch", "prepareFetchContext", "prepareFetchPayload", "prepareFetch", "prepareFetchResponsePayload");
    return isType(o);
}
function isWebSocketSendService(o) {
    const isType = typeGuard("webSocketSend", "prepareWebSocketSendPayload", "prepareWebSocketSend");
    return isType(o);
}
function isWebSocketReceiveService(o) {
    const isType = typeGuard("isWebSocketReceivePayload", "prepareWebSocketReceivePayload");
    return isType(o);
}
export { isIdentifiablePayload as isIdentifiablePayload };
export { ValidatedPayload as ValidatedPayload };
export { isEventSourceService as isEventSourceService };
export { isFetchService as isFetchService };
export { isWebSocketSendService as isWebSocketSendService };
export { isWebSocketReceiveService as isWebSocketReceiveService };
function typicalConnectionValidator(pingURL) {
    return {
        validationEndpointURL: pingURL,
        validate: ()=>{
            return fetch(pingURL, {
                method: "HEAD"
            });
        }
    };
}
var ReconnectionState;
(function(ReconnectionState) {
    ReconnectionState["IDLE"] = "idle";
    ReconnectionState["TRYING"] = "trying";
    ReconnectionState["COMPLETED"] = "completed";
    ReconnectionState["ABORTED"] = "aborted";
})(ReconnectionState || (ReconnectionState = {}));
class ReconnectionStrategy {
    maxAttempts;
    intervalMillecs;
    onStateChange;
    #state = ReconnectionState.IDLE;
    #attempt = 0;
    constructor(options){
        this.maxAttempts = options?.maxAttempts ?? 15;
        this.intervalMillecs = options?.intervalMillecs ?? 1000;
        this.onStateChange = options?.onStateChange;
    }
    get isTrying() {
        return this.#state == ReconnectionState.TRYING;
    }
    get isAborted() {
        return this.#state == ReconnectionState.ABORTED;
    }
    get attempt() {
        return this.#attempt;
    }
    get state() {
        return this.#state;
    }
    set state(value) {
        const previousStatus = this.#state;
        this.#state = value;
        this.onStateChange?.(this.#state, previousStatus, this);
    }
    reconnect() {
        this.#attempt++;
        if (this.#attempt > this.maxAttempts) {
            this.completed(ReconnectionState.ABORTED);
        } else {
            this.state = ReconnectionState.TRYING;
        }
        return this;
    }
    completed(status = ReconnectionState.COMPLETED) {
        this.state = status;
        return this;
    }
}
export { typicalConnectionValidator as typicalConnectionValidator };
export { ReconnectionState as ReconnectionState };
export { ReconnectionStrategy as ReconnectionStrategy };
const isEventSourceConnectionHealthy = typeGuard("isHealthy", "connEstablishedOn");
const isEventSourceConnectionUnhealthy = typeGuard("isHealthy", "connFailedOn");
const isEventSourceReconnecting = typeGuard("isHealthy", "connFailedOn", "reconnectStrategy");
const isEventSourceError = typeGuard("isEventSourceError", "errorEvent");
const isEventSourceEndpointUnavailable = typeGuard("isEndpointUnavailable", "endpointURL");
class EventSourceTunnel {
    esURL;
    esEndpointValidator;
    observerUniversalScopeID = "universal";
    eventSourceFactory;
    onConnStateChange;
    onReconnStateChange;
    #connectionState = {
        isConnectionState: true
    };
    #reconnStrategy;
    constructor(init){
        this.esURL = init.esURL;
        this.esEndpointValidator = init.esEndpointValidator;
        this.eventSourceFactory = init.eventSourceFactory;
        this.onConnStateChange = init.options?.onConnStateChange;
        this.onReconnStateChange = init.options?.onReconnStateChange;
    }
    isReconnecting() {
        return this.#reconnStrategy ? this.#reconnStrategy : false;
    }
    isReconnectAborted() {
        return this.#reconnStrategy && this.#reconnStrategy.isAborted ? true : false;
    }
    connected(es, connState) {
        if (this.#reconnStrategy) this.#reconnStrategy.completed();
        this.eventSourceFactory.connected?.(es);
        this.connectionState = connState;
        this.#reconnStrategy = undefined;
    }
    prepareReconnect(connState) {
        this.#reconnStrategy = this.#reconnStrategy ?? new ReconnectionStrategy({
            onStateChange: this.onReconnStateChange ? (active, previous, rs)=>{
                this.onReconnStateChange?.(active, previous, rs, this);
            } : undefined
        });
        connState = {
            ...connState,
            reconnectStrategy: this.#reconnStrategy
        };
        this.connectionState = connState;
        return this.#reconnStrategy.reconnect();
    }
    init() {
        if (this.isReconnectAborted()) return;
        this.esEndpointValidator.validate(this.#reconnStrategy).then((resp)=>{
            if (resp.ok) {
                const eventSource = this.eventSourceFactory.construct(this.esURL);
                const coercedES = eventSource;
                coercedES.onopen = ()=>{
                    this.connected(eventSource, {
                        isConnectionState: true,
                        isHealthy: true,
                        connEstablishedOn: new Date(),
                        endpointURL: this.esURL,
                        pingURL: this.esEndpointValidator.validationEndpointURL.toString()
                    });
                };
                coercedES.onerror = (event)=>{
                    coercedES.close();
                    const connState = {
                        isConnectionState: true,
                        isHealthy: false,
                        connFailedOn: new Date(),
                        isEventSourceError: true,
                        errorEvent: event
                    };
                    const reconnectStrategy = this.prepareReconnect(connState);
                    setTimeout(()=>this.init(), reconnectStrategy.intervalMillecs);
                };
            } else {
                const connState = {
                    isConnectionState: true,
                    isHealthy: false,
                    connFailedOn: new Date(),
                    isEndpointUnavailable: true,
                    endpointURL: this.esURL,
                    pingURL: this.esEndpointValidator.validationEndpointURL.toString(),
                    httpStatus: resp.status,
                    httpStatusText: resp.statusText
                };
                const reconnectStrategy = this.prepareReconnect(connState);
                setTimeout(()=>this.init(), reconnectStrategy.intervalMillecs);
            }
        }).catch((connectionError)=>{
            const connState = {
                isConnectionState: true,
                isHealthy: false,
                connFailedOn: new Date(),
                pingURL: this.esEndpointValidator.validationEndpointURL.toString(),
                connectionError,
                isEndpointUnavailable: true,
                endpointURL: this.esURL
            };
            const reconnectStrategy = this.prepareReconnect(connState);
            setTimeout(()=>this.init(), reconnectStrategy.intervalMillecs);
        });
        return this;
    }
    get connectionState() {
        return this.#connectionState;
    }
    set connectionState(value) {
        const previousConnState = this.#connectionState;
        this.#connectionState = value;
        this.onConnStateChange?.(this.#connectionState, previousConnState, this);
    }
}
function eventSourceConnNarrative(tunnel) {
    const sseState = tunnel.connectionState;
    const reconn = tunnel.isReconnecting();
    let reconnected = false;
    if (reconn) {
        switch(reconn.state){
            case ReconnectionState.TRYING:
                return {
                    summary: `reconnecting ${reconn.attempt}/${reconn.maxAttempts}`,
                    color: "orange",
                    isHealthy: false,
                    summaryHint: `Trying to reconnect to ${tunnel.esURL} (ES), reconnecting every ${reconn.intervalMillecs} milliseconds`
                };
            case ReconnectionState.ABORTED:
                return {
                    summary: `ABORTED`,
                    color: "red",
                    isHealthy: false,
                    summaryHint: `Unable to reconnect to ${tunnel.esURL} (ES) after ${reconn.maxAttempts} attempts, giving up`
                };
            case ReconnectionState.COMPLETED:
                reconnected = true;
                break;
        }
    }
    if (isEventSourceConnectionHealthy(sseState)) {
        return {
            summary: reconnected ? "reconnected" : "connected",
            color: "green",
            isHealthy: true,
            summaryHint: `Connection to ${sseState.endpointURL} (ES) verified using ${sseState.pingURL} on ${sseState.connEstablishedOn}`
        };
    }
    let summary = "unknown";
    let color = "purple";
    let summaryHint = `the EventSource tunnel is not healthy, but not sure why`;
    if (isEventSourceConnectionUnhealthy(sseState)) {
        if (isEventSourceEndpointUnavailable(sseState)) {
            summary = "ES unavailable";
            summaryHint = `${sseState.endpointURL} (ES) not available`;
            if (sseState.httpStatus) {
                summary = `ES unavailable (${sseState.httpStatus})`;
                summaryHint += ` (HTTP status: ${sseState.httpStatus}, ${sseState.httpStatusText})`;
                color = "red";
            }
        } else {
            if (isEventSourceError(sseState)) {
                summary = "error";
                summaryHint = JSON.stringify(sseState.errorEvent);
                color = "red";
            }
        }
    }
    return {
        isHealthy: false,
        summary,
        summaryHint,
        color
    };
}
export { isEventSourceConnectionHealthy as isEventSourceConnectionHealthy };
export { isEventSourceConnectionUnhealthy as isEventSourceConnectionUnhealthy };
export { isEventSourceReconnecting as isEventSourceReconnecting };
export { isEventSourceError as isEventSourceError };
export { isEventSourceEndpointUnavailable as isEventSourceEndpointUnavailable };
export { EventSourceTunnel as EventSourceTunnel };
export { eventSourceConnNarrative as eventSourceConnNarrative };
function serviceBusArguments(options) {
    const universalScopeID = "universal";
    return {
        eventNameStrategy: {
            universalScopeID,
            fetch: (payload)=>{
                const identity = typeof payload === "string" ? payload : payload.payloadIdentity;
                const payloadSpecificName = `fetch-${identity}`;
                const universalName = `fetch`;
                return {
                    payloadSpecificName,
                    universalName,
                    selectedName: identity == universalScopeID ? universalName : payloadSpecificName
                };
            },
            fetchResponse: (payload)=>{
                const identity = typeof payload === "string" ? payload : payload.payloadIdentity;
                const payloadSpecificName = `fetch-response-${identity}`;
                const universalName = `fetch-response`;
                return {
                    payloadSpecificName,
                    universalName,
                    selectedName: identity == universalScopeID ? universalName : payloadSpecificName
                };
            },
            fetchError: (payload)=>{
                const identity = typeof payload === "string" ? payload : payload.payloadIdentity;
                const payloadSpecificName = `fetch-error-${identity}`;
                const universalName = `fetch-error`;
                return {
                    payloadSpecificName,
                    universalName,
                    selectedName: identity == universalScopeID ? universalName : payloadSpecificName
                };
            },
            eventSource: (payload)=>{
                const identity = typeof payload === "string" ? payload : payload.payloadIdentity;
                const payloadSpecificName = `event-source-${identity}`;
                const universalName = `event-source`;
                return {
                    payloadSpecificName,
                    universalName,
                    selectedName: identity == universalScopeID ? universalName : payloadSpecificName
                };
            },
            eventSourceError: (payload)=>{
                const identity = typeof payload === "string" ? payload : payload.payloadIdentity;
                const payloadSpecificName = `event-source-error-${identity}`;
                const universalName = `event-source-error`;
                return {
                    payloadSpecificName,
                    universalName,
                    selectedName: identity == universalScopeID ? universalName : payloadSpecificName
                };
            },
            eventSourceInvalidPayload: ()=>{
                const universalName = `event-source-invalid-payload`;
                return {
                    payloadSpecificName: undefined,
                    universalName,
                    selectedName: universalName
                };
            },
            webSocket: (payload)=>{
                const identity = typeof payload === "string" ? payload : payload.payloadIdentity;
                const payloadSpecificName = `web-socket-${identity}`;
                const universalName = `web-socket`;
                return {
                    payloadSpecificName,
                    universalName,
                    selectedName: identity == universalScopeID ? universalName : payloadSpecificName
                };
            },
            webSocketError: (payload)=>{
                const identity = typeof payload === "string" ? payload : payload.payloadIdentity;
                const payloadSpecificName = `web-socket-error-${identity}`;
                const universalName = `web-socket-error`;
                return {
                    payloadSpecificName,
                    universalName,
                    selectedName: identity == universalScopeID ? universalName : payloadSpecificName
                };
            },
            webSocketInvalidPayload: ()=>{
                const universalName = `web-socket-invalid-payload`;
                return {
                    payloadSpecificName: undefined,
                    universalName,
                    selectedName: universalName
                };
            }
        },
        ...options
    };
}
class ServiceBus extends EventTarget {
    esTunnels;
    wsTunnels;
    eventListenersLog;
    constructor(args){
        super();
        this.args = args;
        this.esTunnels = [];
        this.wsTunnels = [];
        this.eventListenersLog = [];
        if (args.esTunnels) this.registerEventSourceTunnels(args.esTunnels);
        if (args.wsTunnels) this.registerWebSocketTunnels(args.wsTunnels);
    }
    registerEventSourceTunnels(ests) {
        for (const tunnel of ests((event)=>{
            const eventSrcPayload = JSON.parse(event.data);
            const esDetail = {
                event,
                eventSrcPayload
            };
            this.dispatchNamingStrategyEvent(eventSrcPayload, isIdentifiablePayload(eventSrcPayload) ? this.args.eventNameStrategy.eventSource : this.args.eventNameStrategy.eventSourceInvalidPayload, esDetail);
        })){
            this.esTunnels.push(tunnel);
        }
    }
    registerWebSocketTunnels(ests) {
        for (const tunnel of ests((event)=>{
            if (typeof event.data === "string") {
                const payload = JSON.parse(event.data);
                const wsDetail = {
                    event,
                    payload,
                    webSocketStrategy: this
                };
                this.dispatchNamingStrategyEvent(payload, isIdentifiablePayload(payload) ? this.args.eventNameStrategy.webSocket : this.args.eventNameStrategy.webSocketInvalidPayload, wsDetail);
            } else {
                const payload1 = event.data;
                if (isIdentifiablePayload(payload1)) {
                    const wsDetail1 = {
                        event,
                        payload: payload1,
                        webSocketStrategy: this
                    };
                    this.dispatchNamingStrategyEvent(payload1, this.args.eventNameStrategy.webSocket, wsDetail1);
                } else {
                    this.dispatchNamingStrategyEvent(event.data, this.args.eventNameStrategy.webSocketInvalidPayload, {
                        event,
                        webSocketStrategy: this
                    });
                }
            }
        })){
            this.wsTunnels.push(tunnel);
        }
    }
    dispatchNamingStrategyEvent(id, strategy, detail) {
        const names = strategy(id);
        if (names.payloadSpecificName) {
            this.dispatchEvent(new CustomEvent(names.payloadSpecificName, {
                detail
            }));
        }
        this.dispatchEvent(new CustomEvent(names.universalName, {
            detail
        }));
    }
    addEventListener(type, listener, options) {
        super.addEventListener(type, listener, options);
        this.eventListenersLog.push({
            name: type,
            hook: listener
        });
    }
    observeUnsolicitedPayload(observer, payloadIdSupplier) {
        this.observeEventSource((payload)=>{
            observer(payload, this);
        }, payloadIdSupplier);
        this.observeWebSocketReceiveEvent((payload)=>{
            observer(payload, this);
        }, payloadIdSupplier);
    }
    observeReceivedPayload(observer, payloadIdSupplier) {
        this.observeEventSource((payload)=>{
            observer(payload, this);
        }, payloadIdSupplier);
        this.observeWebSocketReceiveEvent((payload)=>{
            observer(payload, this);
        }, payloadIdSupplier);
        this.observeFetchEventResponse((_fetched, received)=>{
            observer(received, this);
        }, payloadIdSupplier);
    }
    observeSolicitedPayload(observer, payloadIdSupplier) {
        this.observeFetchEventResponse((payload, responsePayload, ctx)=>{
            observer(payload, responsePayload, ctx, this);
        }, payloadIdSupplier);
    }
    fetch(uase, suggestedCtx) {
        const transactionID = "TODO:UUIDv5?";
        const clientProvenance = "ServiceBus.fetch";
        const ctx = {
            ...suggestedCtx,
            transactionID,
            clientProvenance
        };
        const fetchPayload = uase.prepareFetchPayload(ctx, this);
        const fetchInit = uase.prepareFetch(this.args.fetchBaseURL, fetchPayload, ctx, this);
        const fetchDetail = {
            ...fetchInit,
            fetchPayload,
            context: ctx,
            fetchStrategy: this
        };
        this.dispatchNamingStrategyEvent(fetchPayload, this.args.eventNameStrategy.fetch, fetchDetail);
        fetch(fetchInit.endpoint, fetchInit.requestInit).then((resp)=>{
            if (resp.ok) {
                resp.json().then((fetchRespRawJSON)=>{
                    const fetchRespPayload = uase.prepareFetchResponsePayload(fetchPayload, fetchRespRawJSON, ctx, this);
                    const fetchRespDetail = {
                        fetchPayload,
                        fetchRespPayload,
                        context: ctx,
                        fetchStrategy: this
                    };
                    this.dispatchNamingStrategyEvent(fetchPayload, this.args.eventNameStrategy.fetchResponse, fetchRespDetail);
                });
            } else {
                const fetchErrorDetail = {
                    ...fetchInit,
                    fetchPayload,
                    context: ctx,
                    error: new Error(`${fetchInit.endpoint} invalid HTTP status ${resp.status} (${resp.statusText})`),
                    fetchStrategy: this
                };
                this.dispatchNamingStrategyEvent(fetchPayload, this.args.eventNameStrategy.fetchError, fetchErrorDetail);
            }
        }).catch((error)=>{
            const fetchErrorDetail = {
                ...fetchInit,
                fetchPayload,
                context: ctx,
                error,
                fetchStrategy: this
            };
            this.dispatchNamingStrategyEvent(fetchPayload, this.args.eventNameStrategy.fetchError, fetchErrorDetail);
            console.error(`${fetchInit.endpoint} POST error`, error, fetchInit);
        });
    }
    observeFetchEvent(observer, payloadIdSupplier) {
        const payloadID = payloadIdSupplier ? typeof payloadIdSupplier === "string" ? payloadIdSupplier : payloadIdSupplier.payloadIdentity : this.args.eventNameStrategy.universalScopeID;
        const names = this.args.eventNameStrategy.fetch(payloadID);
        this.addEventListener(names.selectedName, (event)=>{
            const typedCustomEvent = event;
            const { fetchPayload , requestInit , context , fetchStrategy  } = typedCustomEvent.detail;
            observer(fetchPayload, requestInit, context, fetchStrategy);
        });
    }
    observeFetchEventResponse(observer, payloadIdSupplier) {
        const payloadID = payloadIdSupplier ? typeof payloadIdSupplier === "string" ? payloadIdSupplier : payloadIdSupplier.payloadIdentity : this.args.eventNameStrategy.universalScopeID;
        const names = this.args.eventNameStrategy.fetchResponse(payloadID);
        this.addEventListener(names.selectedName, (event)=>{
            const typedCustomEvent = event;
            const { fetchPayload , fetchRespPayload , context , fetchStrategy  } = typedCustomEvent.detail;
            observer(fetchRespPayload, fetchPayload, context, fetchStrategy);
        });
    }
    observeFetchEventError(observer, payloadIdSupplier) {
        const payloadID = payloadIdSupplier ? typeof payloadIdSupplier === "string" ? payloadIdSupplier : payloadIdSupplier.payloadIdentity : this.args.eventNameStrategy.universalScopeID;
        const names = this.args.eventNameStrategy.fetchError(payloadID);
        this.addEventListener(names.selectedName, (event)=>{
            const typedCustomEvent = event;
            const { fetchPayload , error , requestInit , context , fetchStrategy  } = typedCustomEvent.detail;
            observer(error, requestInit, fetchPayload, context, fetchStrategy);
        });
    }
    observeEventSource(observer, payloadIdSupplier) {
        const payloadID = payloadIdSupplier ? typeof payloadIdSupplier === "string" ? payloadIdSupplier : payloadIdSupplier.payloadIdentity : this.args.eventNameStrategy.universalScopeID;
        const names = this.args.eventNameStrategy.eventSource(payloadID);
        this.addEventListener(names.selectedName, (event)=>{
            const typedCustomEvent = event;
            let { eventSrcPayload  } = typedCustomEvent.detail;
            if (isEventSourceService(payloadIdSupplier)) {
                if (payloadIdSupplier.isEventSourcePayload(eventSrcPayload)) {
                    eventSrcPayload = payloadIdSupplier.prepareEventSourcePayload(eventSrcPayload);
                    eventSrcPayload.isValidatedPayload = true;
                }
            }
            observer(eventSrcPayload, this);
        });
    }
    observeEventSourceError(observer, payloadIdSupplier) {
        const payloadID = payloadIdSupplier ? typeof payloadIdSupplier === "string" ? payloadIdSupplier : payloadIdSupplier.payloadIdentity : this.args.eventNameStrategy.universalScopeID;
        const names = this.args.eventNameStrategy.eventSourceError(payloadID);
        this.addEventListener(names.selectedName, (event)=>{
            const typedCustomEvent = event;
            const { eventSrcPayload , error  } = typedCustomEvent.detail;
            observer(error, eventSrcPayload, this);
        });
    }
    webSocketSend(context, wss) {
        for (const ws of this.wsTunnels){
            ws.activeSocket?.send(wss.prepareWebSocketSend(wss.prepareWebSocketSendPayload(context, this), this));
        }
    }
    prepareWebSocketReceivePayload(webSocketReceiveRaw) {
        if (typeof webSocketReceiveRaw !== "string") {
            throw Error(`webSocketReceiveRaw must be text; TODO: allow binary?`);
        }
        return JSON.parse(webSocketReceiveRaw);
    }
    observeWebSocketSendEvent(observer, payloadIdSupplier) {
        const payloadID = payloadIdSupplier ? typeof payloadIdSupplier === "string" ? payloadIdSupplier : payloadIdSupplier.payloadIdentity : this.args.eventNameStrategy.universalScopeID;
        const names = this.args.eventNameStrategy.webSocket(payloadID);
        this.addEventListener(names.selectedName, (event)=>{
            const typedCustomEvent = event;
            const { context , payload , webSocketStrategy  } = typedCustomEvent.detail;
            observer(payload, context, webSocketStrategy);
        });
    }
    observeWebSocketReceiveEvent(observer, payloadIdSupplier) {
        const payloadID = payloadIdSupplier ? typeof payloadIdSupplier === "string" ? payloadIdSupplier : payloadIdSupplier.payloadIdentity : this.args.eventNameStrategy.universalScopeID;
        const names = this.args.eventNameStrategy.webSocket(payloadID);
        this.addEventListener(names.selectedName, (event)=>{
            const typedCustomEvent = event;
            let { payload  } = typedCustomEvent.detail;
            if (isEventSourceService(payloadIdSupplier)) {
                if (payloadIdSupplier.isEventSourcePayload(payload)) {
                    payload = payloadIdSupplier.prepareEventSourcePayload(payload);
                    payload.isValidatedPayload = true;
                }
            }
            observer(payload, this);
        });
    }
    observeWebSocketErrorEvent(observer, payloadIdSupplier) {
        const payloadID = payloadIdSupplier ? typeof payloadIdSupplier === "string" ? payloadIdSupplier : payloadIdSupplier.payloadIdentity : this.args.eventNameStrategy.universalScopeID;
        const names = this.args.eventNameStrategy.webSocketError(payloadID);
        this.addEventListener(names.selectedName, (event)=>{
            const typedCustomEvent = event;
            const { error  } = typedCustomEvent.detail;
            observer(error, undefined, this);
        });
    }
    args;
}
export { serviceBusArguments as serviceBusArguments };
export { ServiceBus as ServiceBus };
const isWebSocketConnectionHealthy = typeGuard("isHealthy", "connEstablishedOn");
const isWebSocketConnectionUnhealthy = typeGuard("isHealthy", "connFailedOn");
const isWebSocketReconnecting = typeGuard("isHealthy", "connFailedOn", "reconnectStrategy");
const isWebSocketErrorEventSupplier = typeGuard("isEventSourceError", "errorEvent");
const isWebSocketCloseEventSupplier = typeGuard("isCloseEvent", "closeEvent");
const isWebSocketEndpointUnavailable = typeGuard("isEndpointUnavailable", "endpointURL");
class WebSocketTunnel {
    wsURL;
    wsEndpointValidator;
    observerUniversalScopeID = "universal";
    webSocketFactory;
    onConnStateChange;
    onReconnStateChange;
    allowClose;
    #activeSocket;
    #connectionState = {
        isConnectionState: true
    };
    #reconnStrategy;
    constructor(init){
        this.wsURL = init.wsURL;
        this.wsEndpointValidator = init.wsEndpointValidator;
        this.webSocketFactory = init.webSocketFactory;
        this.onConnStateChange = init.options?.onConnStateChange;
        this.onReconnStateChange = init.options?.onReconnStateChange;
        this.allowClose = init.options?.allowClose;
    }
    isReconnecting() {
        return this.#reconnStrategy ? this.#reconnStrategy : false;
    }
    isReconnectAborted() {
        return this.#reconnStrategy && this.#reconnStrategy.isAborted ? true : false;
    }
    connected(ws, connState) {
        if (this.#reconnStrategy) this.#reconnStrategy.completed();
        this.webSocketFactory.connected?.(ws);
        this.connectionState = connState;
        this.#reconnStrategy = undefined;
    }
    prepareReconnect(connState) {
        this.#reconnStrategy = this.#reconnStrategy ?? new ReconnectionStrategy({
            onStateChange: this.onReconnStateChange ? (active, previous, rs)=>{
                this.onReconnStateChange?.(active, previous, rs, this);
            } : undefined
        });
        connState = {
            ...connState,
            reconnectStrategy: this.#reconnStrategy
        };
        this.connectionState = connState;
        return this.#reconnStrategy.reconnect();
    }
    init() {
        if (this.isReconnectAborted()) return;
        this.wsEndpointValidator.validate(this.#reconnStrategy).then((resp)=>{
            if (resp.ok) {
                if (this.#activeSocket) this.#activeSocket.close();
                this.#activeSocket = undefined;
                const ws = this.#activeSocket = this.webSocketFactory.construct(this.wsURL);
                ws.onopen = ()=>{
                    this.connected(ws, {
                        isConnectionState: true,
                        isHealthy: true,
                        connEstablishedOn: new Date(),
                        endpointURL: this.wsURL,
                        pingURL: this.wsEndpointValidator.validationEndpointURL.toString()
                    });
                };
                ws.onclose = (event)=>{
                    const allowClose = this.allowClose?.(event, this) ?? false;
                    if (!allowClose) {
                        const connState = {
                            isConnectionState: true,
                            isHealthy: false,
                            connFailedOn: new Date(),
                            isCloseEvent: true,
                            closeEvent: event
                        };
                        const reconnectStrategy = this.prepareReconnect(connState);
                        setTimeout(()=>this.init(), reconnectStrategy.intervalMillecs);
                    }
                };
                ws.onerror = (event)=>{
                    ws.close();
                    const connState = {
                        isConnectionState: true,
                        isHealthy: false,
                        connFailedOn: new Date(),
                        isEventSourceError: true,
                        errorEvent: event
                    };
                    const reconnectStrategy = this.prepareReconnect(connState);
                    setTimeout(()=>this.init(), reconnectStrategy.intervalMillecs);
                };
            } else {
                const connState = {
                    isConnectionState: true,
                    isHealthy: false,
                    connFailedOn: new Date(),
                    isEndpointUnavailable: true,
                    endpointURL: this.wsURL,
                    pingURL: this.wsEndpointValidator.validationEndpointURL.toString(),
                    httpStatus: resp.status,
                    httpStatusText: resp.statusText
                };
                const reconnectStrategy = this.prepareReconnect(connState);
                setTimeout(()=>this.init(), reconnectStrategy.intervalMillecs);
            }
        }).catch((connectionError)=>{
            const connState = {
                isConnectionState: true,
                isHealthy: false,
                connFailedOn: new Date(),
                pingURL: this.wsEndpointValidator.validationEndpointURL.toString(),
                connectionError,
                isEndpointUnavailable: true,
                endpointURL: this.wsURL
            };
            const reconnectStrategy = this.prepareReconnect(connState);
            setTimeout(()=>this.init(), reconnectStrategy.intervalMillecs);
        });
        return this;
    }
    get activeSocket() {
        return this.#activeSocket;
    }
    get connectionState() {
        return this.#connectionState;
    }
    set connectionState(value) {
        const previousConnState = this.#connectionState;
        this.#connectionState = value;
        this.onConnStateChange?.(this.#connectionState, previousConnState, this);
    }
}
function webSocketConnNarrative(tunnel, reconn) {
    const ws = tunnel.connectionState;
    if (!reconn && isWebSocketReconnecting(ws)) {
        reconn = ws.reconnectStrategy;
    }
    let reconnected = false;
    if (reconn) {
        switch(reconn.state){
            case ReconnectionState.TRYING:
                return {
                    summary: `reconnecting ${reconn.attempt}/${reconn.maxAttempts}`,
                    color: "orange",
                    isHealthy: false,
                    summaryHint: `Trying to reconnect to ${tunnel.wsURL} (WS), reconnecting every ${reconn.intervalMillecs} milliseconds`
                };
            case ReconnectionState.ABORTED:
                return {
                    summary: `failed`,
                    color: "red",
                    isHealthy: false,
                    summaryHint: `Unable to reconnect to ${tunnel.wsURL} (WS) after ${reconn.maxAttempts} attempts, giving up`
                };
            case ReconnectionState.COMPLETED:
                reconnected = true;
                break;
        }
    }
    if (isWebSocketConnectionHealthy(ws)) {
        return {
            summary: reconnected ? "reconnected" : "connected",
            color: "green",
            isHealthy: true,
            summaryHint: `Connection to ${ws.endpointURL} (WS) verified using ${ws.pingURL} on ${ws.connEstablishedOn}`
        };
    }
    let summary = "unknown";
    let color = "purple";
    let summaryHint = `the WebSocket tunnel is not healthy, but not sure why`;
    if (isWebSocketConnectionUnhealthy(ws)) {
        if (isWebSocketEndpointUnavailable(ws)) {
            summary = "WS unavailable";
            summaryHint = `${ws.endpointURL} not available`;
            if (ws.httpStatus) {
                summary = `WS unavailable (${ws.httpStatus})`;
                summaryHint += ` (HTTP status: ${ws.httpStatus}, ${ws.httpStatusText})`;
                color = "red";
            }
        } else {
            if (isWebSocketErrorEventSupplier(ws)) {
                summary = "error";
                summaryHint = JSON.stringify(ws.errorEvent);
                color = "red";
            }
        }
    }
    return {
        isHealthy: false,
        summary,
        summaryHint,
        color
    };
}
export { isWebSocketConnectionHealthy as isWebSocketConnectionHealthy };
export { isWebSocketConnectionUnhealthy as isWebSocketConnectionUnhealthy };
export { isWebSocketReconnecting as isWebSocketReconnecting };
export { isWebSocketErrorEventSupplier as isWebSocketErrorEventSupplier };
export { isWebSocketCloseEventSupplier as isWebSocketCloseEventSupplier };
export { isWebSocketEndpointUnavailable as isWebSocketEndpointUnavailable };
export { WebSocketTunnel as WebSocketTunnel };
export { webSocketConnNarrative as webSocketConnNarrative };
function markdownItTransformer() {
    return {
        dependencies: undefined,
        acquireDependencies: async (transformer)=>{
            const { default: markdownIt  } = await import("https://jspm.dev/markdown-it@12.2.0");
            return {
                markdownIt,
                plugins: await transformer.plugins()
            };
        },
        construct: async (transformer)=>{
            if (!transformer.dependencies) {
                transformer.dependencies = await transformer.acquireDependencies(transformer);
            }
            const markdownIt = transformer.dependencies.markdownIt({
                html: true,
                linkify: true,
                typographer: true
            });
            transformer.customize(markdownIt, transformer);
            return markdownIt;
        },
        customize: (markdownIt, transformer)=>{
            const plugins = transformer.dependencies.plugins;
            markdownIt.use(plugins.footnote);
            return transformer;
        },
        unindentWhitespace: (text, removeInitialNewLine = true)=>{
            const whitespace = text.match(/^[ \t]*(?=\S)/gm);
            const indentCount = whitespace ? whitespace.reduce((r, a)=>Math.min(r, a.length), Infinity) : 0;
            const regex = new RegExp(`^[ \\t]{${indentCount}}`, "gm");
            const result = text.replace(regex, "");
            return removeInitialNewLine ? result.replace(/^\n/, "") : result;
        },
        plugins: async ()=>{
            const { default: footnote  } = await import("https://jspm.dev/markdown-it-footnote@3.0.3");
            return {
                footnote,
                adjustHeadingLevel: (md, options)=>{
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
                    md.core.ruler.push("adjust-heading-levels", function(state) {
                        const tokens = state.tokens;
                        for(let i = 0; i < tokens.length; i++){
                            if (tokens[i].type !== "heading_close") {
                                continue;
                            }
                            const headingOpen = tokens[i - 2];
                            const headingClose = tokens[i];
                            const currentLevel = getHeadingLevel(headingOpen.tag);
                            const tagName = 'h' + Math.min(currentLevel + levelOffset, 6);
                            headingOpen.tag = tagName;
                            headingClose.tag = tagName;
                        }
                    });
                }
            };
        }
    };
}
async function renderMarkdown(strategies, mditt = markdownItTransformer()) {
    const markdownIt = await mditt.construct(mditt);
    for await (const strategy of strategies(mditt)){
        const markdown = mditt.unindentWhitespace(await strategy.markdownText(mditt));
        strategy.renderHTML(markdownIt.render(markdown), mditt);
    }
}
function importMarkdownContent(input, select, inject) {
    fetch(input).then((resp)=>{
        resp.text().then((html)=>{
            const parser = new DOMParser();
            const foreignDoc = parser.parseFromString(html, "text/html");
            const selected = select(foreignDoc);
            if (Array.isArray(selected)) {
                for (const s of selected){
                    const importedNode = document.adoptNode(s);
                    inject(importedNode, input, html);
                }
            } else if (selected) {
                const importedNode1 = document.adoptNode(selected);
                inject(importedNode1, input, html);
            }
        });
    });
}
async function transformMarkdownElemsCustom(srcElems, finalizeElemFn, mditt = markdownItTransformer()) {
    await renderMarkdown(function*() {
        for (const elem of srcElems){
            yield {
                markdownText: async ()=>{
                    if (elem.dataset.transformableSrc) {
                        const response = await fetch(elem.dataset.transformableSrc);
                        if (!response.ok) {
                            return `Error fetching ${elem.dataset.transformableSrc}: ${response.status}`;
                        }
                        return await response.text();
                    } else {
                        return elem.innerText;
                    }
                },
                renderHTML: async (html)=>{
                    try {
                        const formatted = document.createElement("div");
                        formatted.innerHTML = html;
                        elem.parentElement.replaceChild(formatted, elem);
                        if (finalizeElemFn) finalizeElemFn(formatted, elem);
                    } catch (error) {
                        console.error("Undiagnosable error in renderHTML()", error);
                    }
                }
            };
        }
    }, mditt);
}
async function transformMarkdownElems(firstHeadingLevel = 2) {
    const mdittDefaults = markdownItTransformer();
    await transformMarkdownElemsCustom(document.querySelectorAll(`[data-transformable="markdown"]`), (mdHtmlElem, mdSrcElem)=>{
        mdHtmlElem.dataset.transformedFrom = "markdown";
        if (mdSrcElem.className) mdHtmlElem.className = mdSrcElem.className;
        document.dispatchEvent(new CustomEvent("transformed-markdown", {
            detail: {
                mdHtmlElem,
                mdSrcElem
            }
        }));
    }, {
        ...mdittDefaults,
        customize: (markdownIt, transformer)=>{
            mdittDefaults.customize(markdownIt, transformer);
            markdownIt.use(transformer.dependencies.plugins.adjustHeadingLevel, {
                firstLevel: firstHeadingLevel
            });
        }
    });
}
export { markdownItTransformer as markdownItTransformer };
export { renderMarkdown as renderMarkdown };
export { importMarkdownContent as importMarkdownContent };
export { transformMarkdownElemsCustom as transformMarkdownElemsCustom };
export { transformMarkdownElems as transformMarkdownElems };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9paGFjazI3MTIvZXZlbnRlbWl0dGVyLzEuMi40L21vZC50cyIsImZpbGU6Ly8vaG9tZS9zbnNoYWgvd29ya3NwYWNlcy9naXRodWIuY29tL3Jlc0ZhY3RvcnkvZmFjdG9yeS9saWIvdGV4dC9odW1hbi50cyIsImZpbGU6Ly8vaG9tZS9zbnNoYWgvd29ya3NwYWNlcy9naXRodWIuY29tL3Jlc0ZhY3RvcnkvZmFjdG9yeS9saWIvdGV4dC93aGl0ZXNwYWNlLnRzIiwiZmlsZTovLy9ob21lL3Nuc2hhaC93b3Jrc3BhY2VzL2dpdGh1Yi5jb20vcmVzRmFjdG9yeS9mYWN0b3J5L2xpYi9jb25mL2ZsZXhpYmxlLWFyZ3MudHMiLCJmaWxlOi8vL2hvbWUvc25zaGFoL3dvcmtzcGFjZXMvZ2l0aHViLmNvbS9yZXNGYWN0b3J5L2ZhY3RvcnkvbGliL3RleHQvZGV0ZWN0LXJvdXRlLnRzIiwiZmlsZTovLy9ob21lL3Nuc2hhaC93b3Jrc3BhY2VzL2dpdGh1Yi5jb20vcmVzRmFjdG9yeS9mYWN0b3J5L2xpYi9zYWZldHkvbW9kLnRzIiwiZmlsZTovLy9ob21lL3Nuc2hhaC93b3Jrc3BhY2VzL2dpdGh1Yi5jb20vcmVzRmFjdG9yeS9mYWN0b3J5L2xpYi9zZXJ2aWNlLWJ1cy9nb3Zlcm5hbmNlLnRzIiwiZmlsZTovLy9ob21lL3Nuc2hhaC93b3Jrc3BhY2VzL2dpdGh1Yi5jb20vcmVzRmFjdG9yeS9mYWN0b3J5L2xpYi9zZXJ2aWNlLWJ1cy9jb3JlL2Nvbm5lY3Rpb24udHMiLCJmaWxlOi8vL2hvbWUvc25zaGFoL3dvcmtzcGFjZXMvZ2l0aHViLmNvbS9yZXNGYWN0b3J5L2ZhY3RvcnkvbGliL3NlcnZpY2UtYnVzL2NvcmUvZXZlbnQtc291cmNlLnRzIiwiZmlsZTovLy9ob21lL3Nuc2hhaC93b3Jrc3BhY2VzL2dpdGh1Yi5jb20vcmVzRmFjdG9yeS9mYWN0b3J5L2xpYi9zZXJ2aWNlLWJ1cy9jb3JlL3NlcnZpY2UtYnVzLnRzIiwiZmlsZTovLy9ob21lL3Nuc2hhaC93b3Jrc3BhY2VzL2dpdGh1Yi5jb20vcmVzRmFjdG9yeS9mYWN0b3J5L2xpYi9zZXJ2aWNlLWJ1cy9jb3JlL3dzLnRzIiwiZmlsZTovLy9ob21lL3Nuc2hhaC93b3Jrc3BhY2VzL2dpdGh1Yi5jb20vcmVzRmFjdG9yeS9mYWN0b3J5L2xpYi9wcmVzZW50YXRpb24vZG9tL21hcmtkb3duLWl0LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuLyoqIFRoZSBjYWxsYmFjayB0eXBlLiAqL1xudHlwZSBDYWxsYmFjayA9ICguLi5hcmdzOiBhbnlbXSkgPT4gYW55IHwgUHJvbWlzZTxhbnk+O1xuXG4vKiogQSBsaXN0ZW5lciB0eXBlLiAqL1xudHlwZSBMaXN0ZW5lciA9IENhbGxiYWNrICYgeyBfX29uY2VfXz86IHRydWU7IH07XG5cbi8qKiBUaGUgbmFtZSBvZiBhbiBldmVudC4gKi9cbnR5cGUgRXZlbnROYW1lID0gc3RyaW5nIHwgbnVtYmVyO1xuXG50eXBlIEV2ZW50c1R5cGUgPVxuXHQmIHsgW2tleTogc3RyaW5nXTogQ2FsbGJhY2s7IH1cblx0JiB7IFtrZXk6IG51bWJlcl06IENhbGxiYWNrOyB9XG5cdDtcblxuLyoqXG4gKiBUaGUgZXZlbnQgZW1pdHRlci5cbiAqL1xuZXhwb3J0IGNsYXNzIEV2ZW50RW1pdHRlciA8RSBleHRlbmRzIEV2ZW50c1R5cGUgPSB7IH0+XG57XG5cdFxuXHQvKipcblx0ICogVGhpcyBpcyB3aGVyZSB0aGUgZXZlbnRzIGFuZCBsaXN0ZW5lcnMgYXJlIHN0b3JlZC5cblx0ICovXG5cdHByaXZhdGUgX2V2ZW50c186IE1hcDxrZXlvZiBFLCBTZXQ8TGlzdGVuZXI+PiA9IG5ldyBNYXAoKTtcblx0XG5cdC8qKlxuXHQgKiBMaXN0ZW4gZm9yIGEgdHlwZWQgZXZlbnQuXG5cdCAqIEBwYXJhbSBldmVudCBUaGUgdHlwZWQgZXZlbnQgbmFtZSB0byBsaXN0ZW4gZm9yLlxuXHQgKiBAcGFyYW0gbGlzdGVuZXIgVGhlIHR5cGVkIGxpc3RlbmVyIGZ1bmN0aW9uLlxuXHQgKi9cblx0cHVibGljIG9uIDxLIGV4dGVuZHMga2V5b2YgRT4gKGV2ZW50OiBLLCBsaXN0ZW5lcjogRVtLXSk6IHRoaXM7XG5cdFxuXHQvKipcblx0ICogTGlzdGVuIGZvciBhbiBldmVudC5cblx0ICogQHBhcmFtIGV2ZW50IFRoZSBldmVudCBuYW1lIHRvIGxpc3RlbiBmb3IuXG5cdCAqIEBwYXJhbSBsaXN0ZW5lciBUaGUgbGlzdGVuZXIgZnVuY3Rpb24uXG5cdCAqL1xuXHRwdWJsaWMgb24gKGV2ZW50OiBFdmVudE5hbWUsIGxpc3RlbmVyOiBDYWxsYmFjayk6IHRoaXNcblx0e1xuXHRcdGlmICghdGhpcy5fZXZlbnRzXy5oYXMoZXZlbnQpKSB0aGlzLl9ldmVudHNfLnNldChldmVudCwgbmV3IFNldCgpKTtcblx0XHR0aGlzLl9ldmVudHNfLmdldChldmVudCkhLmFkZChsaXN0ZW5lcik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBMaXN0ZW4gZm9yIGEgdHlwZWQgZXZlbnQgb25jZS5cblx0ICogQHBhcmFtIGV2ZW50IFRoZSB0eXBlZCBldmVudCBuYW1lIHRvIGxpc3RlbiBmb3IuXG5cdCAqIEBwYXJhbSBsaXN0ZW5lciBUaGUgdHlwZWQgbGlzdGVuZXIgZnVuY3Rpb24uXG5cdCAqL1xuXHRwdWJsaWMgb25jZSA8SyBleHRlbmRzIGtleW9mIEU+IChldmVudDogSywgbGlzdGVuZXI6IEVbS10pOiB0aGlzO1xuXHRcblx0LyoqXG5cdCAqIExpc3RlbiBmb3IgYW4gZXZlbnQgb25jZS5cblx0ICogQHBhcmFtIGV2ZW50IFRoZSBldmVudCBuYW1lIHRvIGxpc3RlbiBmb3IuXG5cdCAqIEBwYXJhbSBsaXN0ZW5lciBUaGUgbGlzdGVuZXIgZnVuY3Rpb24uXG5cdCAqL1xuXHRwdWJsaWMgb25jZSAoZXZlbnQ6IEV2ZW50TmFtZSwgbGlzdGVuZXI6IENhbGxiYWNrKTogdGhpc1xuXHR7XG5cdFx0Y29uc3QgbDogTGlzdGVuZXIgPSBsaXN0ZW5lcjtcblx0XHRsLl9fb25jZV9fID0gdHJ1ZTtcblx0XHRyZXR1cm4gdGhpcy5vbihldmVudCwgbCBhcyBhbnkpO1xuXHR9XG5cdFxuXHQvKipcblx0ICogUmVtb3ZlIGEgc3BlY2lmaWMgbGlzdGVuZXIgaW4gdGhlIGV2ZW50IGVtaXR0ZXIgb24gYSBzcGVjaWZpY1xuXHQgKiB0eXBlZCBldmVudC5cblx0ICogQHBhcmFtIGV2ZW50IFRoZSB0eXBlZCBldmVudCBuYW1lLlxuXHQgKiBAcGFyYW0gbGlzdGVuZXIgVGhlIHR5cGVkIGV2ZW50IGxpc3RlbmVyIGZ1bmN0aW9uLlxuXHQgKi9cblx0cHVibGljIG9mZiA8SyBleHRlbmRzIGtleW9mIEU+IChldmVudDogSywgbGlzdGVuZXI6IEVbS10pOiB0aGlzO1xuXHRcblx0LyoqXG5cdCAqIFJlbW92ZSBhbGwgbGlzdGVuZXJzIG9uIGEgc3BlY2lmaWMgdHlwZWQgZXZlbnQuXG5cdCAqIEBwYXJhbSBldmVudCBUaGUgdHlwZWQgZXZlbnQgbmFtZS5cblx0ICovXG5cdHB1YmxpYyBvZmYgPEsgZXh0ZW5kcyBrZXlvZiBFPiAoZXZlbnQ6IEspOiB0aGlzO1xuXHRcblx0LyoqXG5cdCAqIFJlbW92ZSBhbGwgZXZlbnRzIGZyb20gdGhlIGV2ZW50IGxpc3RlbmVyLlxuXHQgKi9cblx0cHVibGljIG9mZiAoKTogdGhpcztcblx0XG5cdC8qKlxuXHQgKiBSZW1vdmUgYSBzcGVjaWZpYyBsaXN0ZW5lciBvbiBhIHNwZWNpZmljIGV2ZW50IGlmIGJvdGggYGV2ZW50YFxuXHQgKiBhbmQgYGxpc3RlbmVyYCBpcyBkZWZpbmVkLCBvciByZW1vdmUgYWxsIGxpc3RlbmVycyBvbiBhXG5cdCAqIHNwZWNpZmljIGV2ZW50IGlmIG9ubHkgYGV2ZW50YCBpcyBkZWZpbmVkLCBvciBsYXN0bHkgcmVtb3ZlXG5cdCAqIGFsbCBsaXN0ZW5lcnMgb24gZXZlcnkgZXZlbnQgaWYgYGV2ZW50YCBpcyBub3QgZGVmaW5lZC5cblx0ICogQHBhcmFtIGV2ZW50IFRoZSBldmVudCBuYW1lLlxuXHQgKiBAcGFyYW0gbGlzdGVuZXIgVGhlIGV2ZW50IGxpc3RlbmVyIGZ1bmN0aW9uLlxuXHQgKi9cblx0cHVibGljIG9mZiAoZXZlbnQ/OiBFdmVudE5hbWUsIGxpc3RlbmVyPzogQ2FsbGJhY2spOiB0aGlzXG5cdHtcblx0XHRpZiAoKGV2ZW50ID09PSB1bmRlZmluZWQgfHwgZXZlbnQgPT09IG51bGwpICYmIGxpc3RlbmVyKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiV2h5IGlzIHRoZXJlIGEgbGlzdGVuZXLCoGRlZmluZWQgaGVyZT9cIik7XG5cdFx0ZWxzZSBpZiAoKGV2ZW50ID09PSB1bmRlZmluZWQgfHwgZXZlbnQgPT09IG51bGwpICYmICFsaXN0ZW5lcilcblx0XHRcdHRoaXMuX2V2ZW50c18uY2xlYXIoKTtcblx0XHRlbHNlIGlmIChldmVudCAmJiAhbGlzdGVuZXIpXG5cdFx0XHR0aGlzLl9ldmVudHNfLmRlbGV0ZShldmVudCk7XG5cdFx0ZWxzZSBpZiAoZXZlbnQgJiYgbGlzdGVuZXIgJiYgdGhpcy5fZXZlbnRzXy5oYXMoZXZlbnQpKVxuXHRcdHtcblx0XHRcdGNvbnN0IF8gPSB0aGlzLl9ldmVudHNfLmdldChldmVudCkhO1xuXHRcdFx0Xy5kZWxldGUobGlzdGVuZXIpO1xuXHRcdFx0aWYgKF8uc2l6ZSA9PT0gMCkgdGhpcy5fZXZlbnRzXy5kZWxldGUoZXZlbnQpO1xuXHRcdH0gZWxzZTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXHRcblx0LyoqXG5cdCAqIEVtaXQgYSB0eXBlZCBldmVudCB3aXRob3V0IHdhaXRpbmcgZm9yIGVhY2ggbGlzdGVuZXIgdG9cblx0ICogcmV0dXJuLlxuXHQgKiBAcGFyYW0gZXZlbnQgVGhlIHR5cGVkIGV2ZW50IG5hbWUgdG8gZW1pdC5cblx0ICogQHBhcmFtIGFyZ3MgVGhlIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSB0eXBlZCBsaXN0ZW5lcnMuXG5cdCAqL1xuXHRwdWJsaWMgZW1pdFN5bmMgPEsgZXh0ZW5kcyBrZXlvZiBFPiAoZXZlbnQ6IEssIC4uLmFyZ3M6IFBhcmFtZXRlcnM8RVtLXT4pOiB0aGlzO1xuXHRcblx0LyoqXG5cdCAqIEVtaXQgYW4gZXZlbnQgd2l0aG91dCB3YWl0aW5nIGZvciBlYWNoIGxpc3RlbmVyIHRvIHJldHVybi5cblx0ICogQHBhcmFtIGV2ZW50IFRoZSBldmVudCBuYW1lIHRvIGVtaXQuXG5cdCAqIEBwYXJhbSBhcmdzIFRoZSBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgbGlzdGVuZXJzLlxuXHQgKi9cblx0cHVibGljIGVtaXRTeW5jIChldmVudDogRXZlbnROYW1lLCAuLi5hcmdzOiBQYXJhbWV0ZXJzPENhbGxiYWNrPik6IHRoaXNcblx0e1xuXHRcdGlmICghdGhpcy5fZXZlbnRzXy5oYXMoZXZlbnQpKSByZXR1cm4gdGhpcztcblx0XHRjb25zdCBfID0gdGhpcy5fZXZlbnRzXy5nZXQoZXZlbnQpITtcblx0XHRmb3IgKGxldCBbLCBsaXN0ZW5lciBdIG9mIF8uZW50cmllcygpKVxuXHRcdHtcblx0XHRcdGNvbnN0IHIgPSBsaXN0ZW5lciguLi5hcmdzKTtcblx0XHRcdGlmIChyIGluc3RhbmNlb2YgUHJvbWlzZSkgci5jYXRjaChjb25zb2xlLmVycm9yKTtcblx0XHRcdGlmIChsaXN0ZW5lci5fX29uY2VfXylcblx0XHRcdHtcblx0XHRcdFx0ZGVsZXRlIGxpc3RlbmVyLl9fb25jZV9fO1xuXHRcdFx0XHRfLmRlbGV0ZShsaXN0ZW5lcik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChfLnNpemUgPT09IDApIHRoaXMuX2V2ZW50c18uZGVsZXRlKGV2ZW50KTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXHRcblx0LyoqXG5cdCAqIEVtaXQgYSB0eXBlZCBldmVudCBhbmQgd2FpdCBmb3IgZWFjaCB0eXBlZCBsaXN0ZW5lciB0byByZXR1cm4uXG5cdCAqIEBwYXJhbSBldmVudCBUaGUgdHlwZWQgZXZlbnQgbmFtZSB0byBlbWl0LlxuXHQgKiBAcGFyYW0gYXJncyBUaGUgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIHR5cGVkIGxpc3RlbmVycy5cblx0ICovXG5cdHB1YmxpYyBhc3luYyBlbWl0IDxLIGV4dGVuZHMga2V5b2YgRT4gKGV2ZW50OiBLLCAuLi5hcmdzOiBQYXJhbWV0ZXJzPEVbS10+KTogUHJvbWlzZTx0aGlzPjtcblx0XG5cdC8qKlxuXHQgKiBFbWl0IGFuIGV2ZW50IGFuZCB3YWl0IGZvciBlYWNoIGxpc3RlbmVyIHRvIHJldHVybi5cblx0ICogQHBhcmFtIGV2ZW50IFRoZSBldmVudCBuYW1lIHRvIGVtaXQuXG5cdCAqIEBwYXJhbSBhcmdzIFRoZSBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgbGlzdGVuZXJzLlxuXHQgKi9cblx0cHVibGljIGFzeW5jIGVtaXQgKGV2ZW50OiBFdmVudE5hbWUsIC4uLmFyZ3M6IFBhcmFtZXRlcnM8Q2FsbGJhY2s+KTogUHJvbWlzZTx0aGlzPlxuXHR7XG5cdFx0aWYgKCF0aGlzLl9ldmVudHNfLmhhcyhldmVudCkpIHJldHVybiB0aGlzO1xuXHRcdGNvbnN0IF8gPSB0aGlzLl9ldmVudHNfLmdldChldmVudCkhO1xuXHRcdGZvciAobGV0IFssIGxpc3RlbmVyIF0gb2YgXy5lbnRyaWVzKCkpXG5cdFx0e1xuXHRcdFx0dHJ5XG5cdFx0XHR7XG5cdFx0XHRcdGF3YWl0IGxpc3RlbmVyKC4uLmFyZ3MpO1xuXHRcdFx0XHRpZiAobGlzdGVuZXIuX19vbmNlX18pXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRkZWxldGUgbGlzdGVuZXIuX19vbmNlX187XG5cdFx0XHRcdFx0Xy5kZWxldGUobGlzdGVuZXIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGNhdGNoIChlcnJvcilcblx0XHRcdHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcihlcnJvcik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChfLnNpemUgPT09IDApIHRoaXMuX2V2ZW50c18uZGVsZXRlKGV2ZW50KTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXHRcblx0LyoqXG5cdCAqIFRoZSBzYW1lIGFzIGVtaXRTeW5jLCBidXQgd2FpdCBmb3IgZWFjaCB0eXBlZCBsaXN0ZW5lciB0b1xuXHQgKiByZXR1cm4gYmVmb3JlIGNhbGxpbmcgdGhlIG5leHQgdHlwZWQgbGlzdGVuZXIuXG5cdCAqIEBwYXJhbSBldmVudCBUaGUgdHlwZWQgZXZlbnQgbmFtZS5cblx0ICogQHBhcmFtIGFyZ3MgVGhlIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSB0eXBlZCBsaXN0ZW5lcnMuXG5cdCAqL1xuXHRwdWJsaWMgcXVldWUgPEsgZXh0ZW5kcyBrZXlvZiBFPiAoZXZlbnQ6IEssIC4uLmFyZ3M6IFBhcmFtZXRlcnM8RVtLXT4pOiB0aGlzO1xuXHRcblx0LyoqXG5cdCAqIFRoZSBzYW1lIGFzIGVtaXRTeW5jLCBidXQgd2FpdCBmb3IgZWFjaCBsaXN0ZW5lciB0byByZXR1cm5cblx0ICogYmVmb3JlIGNhbGxpbmcgdGhlIG5leHQgbGlzdGVuZXIuXG5cdCAqIEBwYXJhbSBldmVudCBUaGUgZXZlbnQgbmFtZS5cblx0ICogQHBhcmFtIGFyZ3MgVGhlIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSBsaXN0ZW5lcnMuXG5cdCAqL1xuXHRwdWJsaWMgcXVldWUgKGV2ZW50OiBFdmVudE5hbWUsIC4uLmFyZ3M6IFBhcmFtZXRlcnM8Q2FsbGJhY2s+KTogdGhpc1xuXHR7XG5cdFx0KGFzeW5jICgpID0+IGF3YWl0IHRoaXMuZW1pdChldmVudCwgLi4uYXJncyBhcyBhbnkpKSgpLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cdFxuXHQvKipcblx0ICogV2FpdCBmb3IgYSB0eXBlZCBldmVudCB0byBiZSBlbWl0dGVkIGFuZCByZXR1cm4gdGhlIGFyZ3VtZW50cy5cblx0ICogQHBhcmFtIGV2ZW50IFRoZSB0eXBlZCBldmVudCBuYW1lIHRvIHdhaXQgZm9yLlxuXHQgKiBAcGFyYW0gdGltZW91dCBBbiBvcHRpb25hbCBhbW91bnQgb2YgbWlsbGlzZWNvbmRzIHRvIHdhaXRcblx0ICogYmVmb3JlIHRocm93aW5nLlxuXHQgKi9cblx0cHVibGljIHB1bGwgPEsgZXh0ZW5kcyBrZXlvZiBFPiAoZXZlbnQ6IEssIHRpbWVvdXQ/OiBudW1iZXIpOiBQcm9taXNlPFBhcmFtZXRlcnM8RVtLXT4+O1xuXHQvKipcblx0ICogV2FpdCBmb3IgYW4gZXZlbnQgdG8gYmUgZW1pdHRlZCBhbmQgcmV0dXJuIHRoZSBhcmd1bWVudHMuXG5cdCAqIEBwYXJhbSBldmVudCBUaGUgZXZlbnQgbmFtZSB0byB3YWl0IGZvci5cblx0ICogQHBhcmFtIHRpbWVvdXQgQW4gb3B0aW9uYWwgYW1vdW50IG9mIG1pbGxpc2Vjb25kcyB0byB3YWl0XG5cdCAqIGJlZm9yZSB0aHJvd2luZy5cblx0ICovXG5cdHB1YmxpYyBwdWxsIChldmVudDogRXZlbnROYW1lLCB0aW1lb3V0PzogbnVtYmVyKTogUHJvbWlzZTxQYXJhbWV0ZXJzPENhbGxiYWNrPj5cblx0e1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRsZXQgdGltZW91dElkOiBudW1iZXLCoHzCoG51bGxcblx0XHRcdFxuXHRcdFx0bGV0IGxpc3RlbmVyID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB7XG5cdFx0XHRcdGlmICh0aW1lb3V0SWQgIT09IG51bGwpIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuXHRcdFx0XHRyZXNvbHZlKGFyZ3MpO1xuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0dGltZW91dElkID0gdHlwZW9mIHRpbWVvdXQgIT09IFwibnVtYmVyXCJcblx0XHRcdFx0PyBudWxsXG5cdFx0XHRcdDogc2V0VGltZW91dCgoKSA9PiAodGhpcy5vZmYoZXZlbnQsIGxpc3RlbmVyIGFzIGFueSksIHJlamVjdChcblx0XHRcdFx0XHRuZXcgRXJyb3IoXCJUaW1lZCBvdXQhXCIpXG5cdFx0XHRcdCkpKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5vbmNlKGV2ZW50LCBsaXN0ZW5lciBhcyBhbnkpO1xuXHRcdH0pO1xuXHR9XG5cdFxuXHQvKipcblx0ICogQ2xvbmUgKnRoaXMqIGV2ZW50IGVtaXR0ZXIuXG5cdCAqIEBwYXJhbSBjbG9uZUxpc3RlbmVycyBBbHNvIGNvcHkgbGlzdGVuZXJzIHRvIHRoZSBuZXcgZW1pdHRlci4gKGRlZmF1bHRzIHRvIHRydWUpXG5cdCAqL1xuXHRwdWJsaWMgY2xvbmUgKGNsb25lTGlzdGVuZXJzID0gdHJ1ZSk6IEV2ZW50RW1pdHRlcjxFPiB7XG5cdFx0Y29uc3QgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuXHRcdGlmIChjbG9uZUxpc3RlbmVycykge1xuXHRcdFx0Zm9yIChjb25zdCBba2V5LCBzZXRdIG9mIHRoaXMuX2V2ZW50c18pIGVtaXR0ZXIuX2V2ZW50c18uc2V0KGtleSwgbmV3IFNldChbLi4uc2V0XSkpO1xuXHRcdH1cblx0XHRyZXR1cm4gZW1pdHRlcjtcblx0fVxuXHRcbn1cblxuZXhwb3J0IGRlZmF1bHQgRXZlbnRFbWl0dGVyO1xuIiwiLyoqXG4gKiBGb3JtYXQgYnl0ZXMgYXMgaHVtYW4tcmVhZGFibGUgdGV4dC5cbiAqXG4gKiBAcGFyYW0gYnl0ZXMgTnVtYmVyIG9mIGJ5dGVzLlxuICogQHBhcmFtIHNpIFRydWUgdG8gdXNlIG1ldHJpYyAoU0kpIHVuaXRzLCBha2EgcG93ZXJzIG9mIDEwMDAuIEZhbHNlIHRvIHVzZVxuICogICAgICAgICAgIGJpbmFyeSAoSUVDKSwgYWthIHBvd2VycyBvZiAxMDI0LlxuICogQHBhcmFtIGRwIE51bWJlciBvZiBkZWNpbWFsIHBsYWNlcyB0byBkaXNwbGF5LlxuICpcbiAqIEByZXR1cm4gRm9ybWF0dGVkIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGh1bWFuRnJpZW5kbHlCeXRlcyhieXRlczogbnVtYmVyLCBzaSA9IGZhbHNlLCBkcCA9IDEpIHtcbiAgY29uc3QgdGhyZXNoID0gc2kgPyAxMDAwIDogMTAyNDtcblxuICBpZiAoTWF0aC5hYnMoYnl0ZXMpIDwgdGhyZXNoKSB7XG4gICAgcmV0dXJuIGJ5dGVzICsgXCIgQlwiO1xuICB9XG5cbiAgY29uc3QgdW5pdHMgPSBzaVxuICAgID8gW1wia0JcIiwgXCJNQlwiLCBcIkdCXCIsIFwiVEJcIiwgXCJQQlwiLCBcIkVCXCIsIFwiWkJcIiwgXCJZQlwiXVxuICAgIDogW1wiS2lCXCIsIFwiTWlCXCIsIFwiR2lCXCIsIFwiVGlCXCIsIFwiUGlCXCIsIFwiRWlCXCIsIFwiWmlCXCIsIFwiWWlCXCJdO1xuICBsZXQgdSA9IC0xO1xuICBjb25zdCByID0gMTAgKiogZHA7XG5cbiAgZG8ge1xuICAgIGJ5dGVzIC89IHRocmVzaDtcbiAgICArK3U7XG4gIH0gd2hpbGUgKFxuICAgIE1hdGgucm91bmQoTWF0aC5hYnMoYnl0ZXMpICogcikgLyByID49IHRocmVzaCAmJiB1IDwgdW5pdHMubGVuZ3RoIC0gMVxuICApO1xuXG4gIHJldHVybiBieXRlcy50b0ZpeGVkKGRwKSArIFwiIFwiICsgdW5pdHNbdV07XG59XG5cbi8qKlxuICogUmVwbGFjZSBhbGwgc3BlY2lhbCBjaGFyYWN0ZXJzIChub24tbGV0dGVycy9udW1iZXJzKSB3aXRoIHNwYWNlIGFuZFxuICogY2FwaXRhbGl6ZSB0aGUgZmlyc3QgY2hhcmFjdGVyIG9mIGVhY2ggd29yZC5cbiAqIEBwYXJhbSB0ZXh0IHN0cmluZyB3aXRoIHNwZWNpYWwgY2hhcmFjdGVycyAobGlrZSBhIGZpbGVuYW1lIG9yIHNsdWcpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBodW1hbkZyaWVuZGx5UGhyYXNlKHRleHQ6IHN0cmluZykge1xuICAvLyBmaXJzdCByZXBsYWNlIGFsbCBzcGVjaWFsIGNoYXJhY3RlcnMgd2l0aCBzcGFjZSB0aGVuIHJlbW92ZSBtdWx0aXBsZSBzcGFjZXNcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvW15hLXpBLVowLTkgXS9nLCBcIiBcIikucmVwbGFjZSgvXFxzXFxzKy9nLCBcIiBcIikucmVwbGFjZShcbiAgICAvLyBeXFx3ezF9IG1hdGNoZXMgdGhlIGZpcnN0IGxldHRlciBvZiB0aGUgd29yZC5cbiAgICAvLyAgIF4gbWF0Y2hlcyB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJpbmcuXG4gICAgLy8gICBcXHcgbWF0Y2hlcyBhbnkgd29yZCBjaGFyYWN0ZXIuXG4gICAgLy8gICB7MX0gdGFrZXMgb25seSB0aGUgZmlyc3QgY2hhcmFjdGVyLlxuICAgIC8vIHwgd29ya3MgbGlrZSB0aGUgYm9vbGVhbiBPUi4gSXQgbWF0Y2hlcyB0aGUgZXhwcmVzc2lvbiBhZnRlciBhbmQgYmVmb3JlIHRoZSB8LlxuICAgIC8vIFxccysgbWF0Y2hlcyBhbnkgYW1vdW50IG9mIHdoaXRlc3BhY2UgYmV0d2VlbiB0aGUgd29yZHMuXG4gICAgLyheXFx3ezF9KXwoXFxzK1xcd3sxfSkvZyxcbiAgICAobGV0dGVyKSA9PiBsZXR0ZXIudG9VcHBlckNhc2UoKSxcbiAgKTtcbn1cblxuLyoqXG4gKiBodW1hblBhdGggc2hvcnRlbnMgYSBwb3RlbnRpYWxseSBsb25nIHNsYXNoLWRlbGltaXRlZCBwYXRoIGludG8gYSBzaG9ydCBvbmVcbiAqIGJ5IGtlZXBpbmcgYXMgbXVjaCBvZiB0aGUgc3RhcnRpbmcgYW5kIGVuZGluZyBwYXRocyAod2hpY2ggYXJlIGltcG9ydGFudFxuICogZm9yIGh1bWFucykuXG4gKiBAcGFyYW0gb3JpZ2luYWwgdGhlIHRleHQgd2Ugd2FudCB0byBodW1hbml6ZVxuICogQHBhcmFtIG1heExlbmd0aCB0aGUgbnVtYmVyIG9mIGNoYXJhY3RlcnMgdG8ga2VlcCBhdCBzdGFydCArIGVuZFxuICogQHBhcmFtIGZvcm1hdEJhc2VuYW1lIGFuIG9wdGlvbmFsIGZ1bmN0aW9uIHdoaWNoIHNob3VsZCBiZSBjYWxsZWQgdG8gZm9ybWF0IHRoZSBiYXNlbmFtZVxuICogQHJldHVybnMgdGhlIHN0cmluZyBzaG9ydGVuZWQgdG8gbWF4TGVuZ3RoIGFuZCBmb3JtYXR0ZWQgd2l0aFxuICovXG5leHBvcnQgY29uc3QgaHVtYW5QYXRoID0gKFxuICBvcmlnaW5hbDogc3RyaW5nLFxuICBtYXhMZW5ndGggPSA1MCxcbiAgZm9ybWF0QmFzZW5hbWU/OiAoYmFzZW5hbWU6IHN0cmluZykgPT4gc3RyaW5nLFxuKSA9PiB7XG4gIGNvbnN0IHRva2VucyA9IG9yaWdpbmFsLnNwbGl0KFwiL1wiKTtcbiAgY29uc3QgYmFzZW5hbWUgPSB0b2tlbnNbdG9rZW5zLmxlbmd0aCAtIDFdO1xuXG4gIC8vcmVtb3ZlIGZpcnN0IGFuZCBsYXN0IGVsZW1lbnRzIGZyb20gdGhlIGFycmF5XG4gIHRva2Vucy5zcGxpY2UoMCwgMSk7XG4gIHRva2Vucy5zcGxpY2UodG9rZW5zLmxlbmd0aCAtIDEsIDEpO1xuXG4gIGlmIChvcmlnaW5hbC5sZW5ndGggPCBtYXhMZW5ndGgpIHtcbiAgICByZXR1cm4gKHRva2Vucy5sZW5ndGggPiAwID8gKHRva2Vucy5qb2luKFwiL1wiKSArIFwiL1wiKSA6IFwiXCIpICtcbiAgICAgIChmb3JtYXRCYXNlbmFtZSA/IGZvcm1hdEJhc2VuYW1lKGJhc2VuYW1lKSA6IGJhc2VuYW1lKTtcbiAgfVxuXG4gIC8vcmVtb3ZlIHRoZSBjdXJyZW50IGxlbnRoIGFuZCBhbHNvIHNwYWNlIGZvciAzIGRvdHMgYW5kIHNsYXNoXG4gIGNvbnN0IHJlbUxlbiA9IG1heExlbmd0aCAtIGJhc2VuYW1lLmxlbmd0aCAtIDQ7XG4gIGlmIChyZW1MZW4gPiAwKSB7XG4gICAgLy9yZWNyZWF0ZSBvdXIgcGF0aFxuICAgIGNvbnN0IHBhdGggPSB0b2tlbnMuam9pbihcIi9cIik7XG4gICAgLy9oYW5kbGUgdGhlIGNhc2Ugb2YgYW4gb2RkIGxlbmd0aFxuICAgIGNvbnN0IGxlbkEgPSBNYXRoLmNlaWwocmVtTGVuIC8gMik7XG4gICAgY29uc3QgbGVuQiA9IE1hdGguZmxvb3IocmVtTGVuIC8gMik7XG4gICAgLy9yZWJ1aWxkIHRoZSBwYXRoIGZyb20gYmVnaW5uaW5nIGFuZCBlbmRcbiAgICBjb25zdCBwYXRoQSA9IHBhdGguc3Vic3RyaW5nKDAsIGxlbkEpO1xuICAgIGNvbnN0IHBhdGhCID0gcGF0aC5zdWJzdHJpbmcocGF0aC5sZW5ndGggLSBsZW5CKTtcbiAgICByZXR1cm4gcGF0aEEgKyBcIi4uLlwiICsgcGF0aEIgKyBcIi9cIiArXG4gICAgICAoZm9ybWF0QmFzZW5hbWUgPyBmb3JtYXRCYXNlbmFtZShiYXNlbmFtZSkgOiBiYXNlbmFtZSk7XG4gIH1cbiAgcmV0dXJuIChmb3JtYXRCYXNlbmFtZSA/IGZvcm1hdEJhc2VuYW1lKGJhc2VuYW1lKSA6IGJhc2VuYW1lKTtcbn07XG4iLCJleHBvcnQgZnVuY3Rpb24gbWluV2hpdGVzcGFjZUluZGVudCh0ZXh0OiBzdHJpbmcpOiBudW1iZXIge1xuICBjb25zdCBtYXRjaCA9IHRleHQubWF0Y2goL15bIFxcdF0qKD89XFxTKS9nbSk7XG4gIHJldHVybiBtYXRjaCA/IG1hdGNoLnJlZHVjZSgociwgYSkgPT4gTWF0aC5taW4ociwgYS5sZW5ndGgpLCBJbmZpbml0eSkgOiAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdW5pbmRlbnRXaGl0ZXNwYWNlKFxuICB0ZXh0OiBzdHJpbmcsXG4gIHJlbW92ZUluaXRpYWxOZXdMaW5lID0gdHJ1ZSxcbik6IHN0cmluZyB7XG4gIGNvbnN0IGluZGVudCA9IG1pbldoaXRlc3BhY2VJbmRlbnQodGV4dCk7XG4gIGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChgXlsgXFxcXHRdeyR7aW5kZW50fX1gLCBcImdtXCIpO1xuICBjb25zdCByZXN1bHQgPSB0ZXh0LnJlcGxhY2UocmVnZXgsIFwiXCIpO1xuICByZXR1cm4gcmVtb3ZlSW5pdGlhbE5ld0xpbmUgPyByZXN1bHQucmVwbGFjZSgvXlxcbi8sIFwiXCIpIDogcmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2luZ2xlTGluZVRyaW0odGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvKFxcclxcbnxcXG58XFxyKS9nbSwgXCJcIilcbiAgICAucmVwbGFjZSgvXFxzKyg/PSg/OlteXFwnXCJdKltcXCdcIl1bXlxcJ1wiXSpbXFwnXCJdKSpbXlxcJ1wiXSokKS9nLCBcIiBcIilcbiAgICAudHJpbSgpO1xufVxuXG5leHBvcnQgdHlwZSBUZW1wbGF0ZUxpdGVyYWxJbmRleGVkVGV4dFN1cHBsaWVyID0gKGluZGV4OiBudW1iZXIpID0+IHN0cmluZztcblxuLyoqXG4gKiBTdHJpbmcgdGVtcGxhdGUgbGl0ZXJhbCB0YWcgdXRpbGl0eSB0aGF0IHdyYXBzIHRoZSBsaXRlcmFscyBhbmQgd2lsbFxuICogcmV0cmlldmUgbGl0ZXJhbHMgd2l0aCBzZW5zaXRpdml0eSB0byBpbmRlbnRlZCB3aGl0ZXNwYWNlLiBJZlxuICogQHBhcmFtIGxpdGVyYWxzIGxpdGVyYWxzIHN1cHBsaWVkIHRvIHRlbXBsYXRlIGxpdGVyYWwgc3RyaW5nIGZ1bmN0aW9uXG4gKiBAcGFyYW0gc3VwcGxpZWRFeHBycyBleHByZXNzaW9ucyBzdXBwbGllZCB0byB0ZW1wbGF0ZSBsaXRlcmFsIHN0cmluZyBmdW5jdGlvblxuICogQHBhcmFtIG9wdGlvbnMgd2hpdGVzcGFjZSBzZW5zaXRpdml0eSBvcHRpb25zXG4gKiBAcmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCB3cmFwIHRoZSBsaXRlcmFsIGFuZCByZXR1cm4gdW5pbmRlbnRlZCB0ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aGl0ZXNwYWNlU2Vuc2l0aXZlVGVtcGxhdGVMaXRlcmFsU3VwcGxpZXIoXG4gIGxpdGVyYWxzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSxcbiAgc3VwcGxpZWRFeHByczogdW5rbm93bltdLFxuICBvcHRpb25zPzoge1xuICAgIHJlYWRvbmx5IHVuaW5kZW50PzogYm9vbGVhbiB8IFJlZ0V4cDtcbiAgICByZWFkb25seSByZW1vdmVJbml0aWFsTmV3TGluZT86IGJvb2xlYW47XG4gIH0sXG4pOiBUZW1wbGF0ZUxpdGVyYWxJbmRleGVkVGV4dFN1cHBsaWVyIHtcbiAgY29uc3QgeyB1bmluZGVudCA9IHRydWUsIHJlbW92ZUluaXRpYWxOZXdMaW5lID0gdHJ1ZSB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgbGV0IGxpdGVyYWxTdXBwbGllciA9IChpbmRleDogbnVtYmVyKSA9PiBsaXRlcmFsc1tpbmRleF07XG4gIGlmICh1bmluZGVudCkge1xuICAgIGlmICh0eXBlb2YgdW5pbmRlbnQgPT09IFwiYm9vbGVhblwiKSB7XG4gICAgICAvLyB3ZSB3YW50IHRvIGF1dG8tZGV0ZWN0IGFuZCBidWlsZCBvdXIgcmVnRXhwIGZvciB1bmluZGVudGluZyBzbyBsZXQnc1xuICAgICAgLy8gYnVpbGQgYSBzYW1wbGUgb2Ygd2hhdCB0aGUgb3JpZ2luYWwgdGV4dCBtaWdodCBsb29rIGxpa2Ugc28gd2UgY2FuXG4gICAgICAvLyBjb21wdXRlIHRoZSBcIm1pbmltdW1cIiB3aGl0ZXNwYWNlIGluZGVudFxuICAgICAgbGV0IG9yaWdpbmFsVGV4dCA9IFwiXCI7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN1cHBsaWVkRXhwcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgb3JpZ2luYWxUZXh0ICs9IGxpdGVyYWxzW2ldICsgYFxcJHtleHByJHtpfX1gO1xuICAgICAgfVxuICAgICAgb3JpZ2luYWxUZXh0ICs9IGxpdGVyYWxzW2xpdGVyYWxzLmxlbmd0aCAtIDFdO1xuICAgICAgY29uc3QgbWF0Y2ggPSBvcmlnaW5hbFRleHQubWF0Y2goL15bIFxcdF0qKD89XFxTKS9nbSk7XG4gICAgICBjb25zdCBtaW5XaGl0ZXNwYWNlSW5kZW50ID0gbWF0Y2hcbiAgICAgICAgPyBtYXRjaC5yZWR1Y2UoKHIsIGEpID0+IE1hdGgubWluKHIsIGEubGVuZ3RoKSwgSW5maW5pdHkpXG4gICAgICAgIDogMDtcbiAgICAgIGlmIChtaW5XaGl0ZXNwYWNlSW5kZW50ID4gMCkge1xuICAgICAgICBjb25zdCB1bmluZGVudFJlZ0V4cCA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgYF5bIFxcXFx0XXske21pbldoaXRlc3BhY2VJbmRlbnR9fWAsXG4gICAgICAgICAgXCJnbVwiLFxuICAgICAgICApO1xuICAgICAgICBsaXRlcmFsU3VwcGxpZXIgPSAoaW5kZXg6IG51bWJlcikgPT4ge1xuICAgICAgICAgIGxldCB0ZXh0ID0gbGl0ZXJhbHNbaW5kZXhdO1xuICAgICAgICAgIGlmIChpbmRleCA9PSAwICYmIHJlbW92ZUluaXRpYWxOZXdMaW5lKSB7XG4gICAgICAgICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9eXFxuLywgXCJcIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2UodW5pbmRlbnRSZWdFeHAhLCBcIlwiKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbGl0ZXJhbFN1cHBsaWVyID0gKGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgICAgbGV0IHRleHQgPSBsaXRlcmFsc1tpbmRleF07XG4gICAgICAgIGlmIChpbmRleCA9PSAwICYmIHJlbW92ZUluaXRpYWxOZXdMaW5lKSB7XG4gICAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZSgvXlxcbi8sIFwiXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2UodW5pbmRlbnQsIFwiXCIpO1xuICAgICAgfTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGxpdGVyYWxTdXBwbGllcjtcbn1cbiIsImNvbnN0IGpzVG9rZW5FdmFsUkUgPSAvXlthLXpBLVowLTlfXSskLztcblxuZXhwb3J0IGludGVyZmFjZSBUb2tlbkV4cGxvcmVyPFRva2VuPiB7XG4gIChuYW1lOiBzdHJpbmcpOiBUb2tlbiB8IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBqc1Rva2VuRXZhbFJlc3VsdCBmaW5kcyBmdW5jdGlvbnMsIGNsYXNzZXMsIG9yIG90aGVyIHNpbmdsZSB3b3JkICh0b2tlbilcbiAqIFwiaG9va3NcIi4gQWxsb3dzIGRlZmluaW5nIFwiaG9vayBmdW5jdGlvbnNcIiBsaWtlIDxodG1sIGxhbmc9XCJlblwiIFhZWi1hcmdzLXN1cHBsaWVyPVwieHl6QXJnc0hvb2tcIj5cbiAqIGluIERPTSBlbGVtZW50cyBvbiB0aGUgY2xpZW50IHNpZGUgb3IgZW52aXJvbm1lbnQgdmFyaWFibGVzIGhvb2tzLCBmZWF0dXJlXG4gKiBmbGFncyBob29rcywgYW5kIENMSSBhcmd1bWVudHMgaG9va3Mgb24gdGhlIHNlcnZlciBzaWRlLiBHaXZlbiBvbmUgb3IgbW9yZVxuICogXCJleHBsb3JlclwiIGZ1bmN0aW9ucyAod2hpY2ggY2FuIGJlIGFzIHNpbXBsZSBhcyBhbiBldmFsIG9yIG1vcmUgY29tcGxleCBxdWVyeVxuICogZnVuY3Rpb25zKSwgbG9vayBmb3IgaWRlbnRpdHkgYW5kLCBpZiB0aGUgaWRlbnRpdHkgKFwiWFlaLWFyZ3Mtc3VwcGxpZXJcIilcbiAqIHJlZmVyZW5jZXMgYSBKYXZhc2NyaXB0IGZ1bmN0aW9uIHJldHVybiBpdCBhcyBhIEphdmFzY3JpcHQgZnVuY3Rpb24gaW5zdGFuY2VcbiAqIHJlYWR5IHRvIGJlIGV2YWx1YXRlZC4gSWRlbnRpdHkgaXMgZW5mb3JjZWQgdG8gYmUgYSBKYXZhc2NyaXB0IHRva2VuIHBhdHRlcm5cbiAqIGZvciBzZWN1cml0eSBwdXJwb3Nlczogc2luY2UgdGhlIHRva2VuIGlzIGxpa2VseSB0byBiZSBiZSBldmFsdWF0ZWQgYnkgdGhlXG4gKiBkaXNjb3ZlcnkgZnVuY3Rpb25zIHVzaW5nIFwiZXZhbChpZGVudGl0eSlcIiB3ZSBkbyBub3QgYWxsb3cgYXJiaXRyYXJ5IGlkZW50aXR5XG4gKiB2YWx1ZXMuXG4gKiBAcGFyYW0gaWRlbnRpdHkgd2hhdCB5b3UncmUgbG9va2luZyBmb3IgKGUuZy4gYSBjbGFzcyBuYW1lLCBmdW5jdGlvbiBuYW1lLCBlbnYgdmFyIG5hbWUsIGV0Yy4pO1xuICogQHBhcmFtIGRpc2NvdmVyIGhvdyB0byBldmFsdWF0ZSBmb3IgZGlzY292ZXJ5IG9mIHRva2VuIHdpdGggJ25hbWUnICh1c3VhbGx5IGp1c3QgJ2V2YWwnIGZ1bmN0aW9uIHNjb3BlZCBieSBjYWxsZXIpXG4gKiBAcGFyYW0gaXNUb2tlblZhbGlkIHdpbGwgYmUgY2FsbGVkIGlmIGEgdG9rZW4gaXMgZm91bmQsIHlvdSBjYW4gdHJhbnNmb3JtIGl0IG9yIGVtaXQgYW4gZXZlbnRcbiAqIEBwYXJhbSBvbkludmFsaWRUb2tlbiBpZiB0aGUgZ2l2ZW4gdGV4dCBpcyBub3QgYSBzaW5nbGUgd29yZCwgY2FsbCB0aGlzIGZ1bmN0aW9uIGFuZCByZXR1cm4gaXRzIHJlc3VsdFxuICogQHBhcmFtIG9uRmFpbGVkRGlzY292ZXJ5IGluIGNhc2UgdGhlIGV2YWwgcmVzdWx0ZWQgaW4gYW4gZXhjZXB0aW9uLCBjYWxsIHRoaXMgZnVuY3Rpb24gYW5kIHJldHVybiBpdHMgcmVzdWx0XG4gKiBAcmV0dXJucyB0aGUgcmVzdWx0IG9mIGV2YWwobmFtZSkgb3IsIGlmIHRoZXJlJ3MgYW4gZXJyb3IgdGhlIHJlc3VsdCBvZiB0aGUgZXJyb3IgY2FsbGJhY2tzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqc1Rva2VuRXZhbFJlc3VsdDxUb2tlbj4oXG4gIGlkZW50aXR5OiBzdHJpbmcsXG4gIGRpc2NvdmVyOiBUb2tlbkV4cGxvcmVyPFRva2VuPiB8IFRva2VuRXhwbG9yZXI8VG9rZW4+W10sXG4gIGlzVG9rZW5WYWxpZD86ICh2YWx1ZTogdW5rbm93biwgbmFtZTogc3RyaW5nKSA9PiBUb2tlbiB8IHVuZGVmaW5lZCxcbiAgb25JbnZhbGlkVG9rZW4/OiAobmFtZTogc3RyaW5nKSA9PiBUb2tlbiB8IHVuZGVmaW5lZCxcbiAgb25GYWlsZWREaXNjb3Zlcnk/OiAoZXJyb3I6IEVycm9yLCBuYW1lOiBzdHJpbmcpID0+IFRva2VuIHwgdW5kZWZpbmVkLFxuKSB7XG4gIGxldCByZXN1bHQ6IFRva2VuIHwgdW5kZWZpbmVkO1xuICBpZiAoaWRlbnRpdHkubWF0Y2goanNUb2tlbkV2YWxSRSkpIHtcbiAgICAvLyBwcm9jZWVkIG9ubHkgaWYgdGhlIG5hbWUgaXMgYSBzaW5nbGUgd29yZCBzdHJpbmdcbiAgICB0cnkge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGlzY292ZXIpKSB7XG4gICAgICAgIGZvciAoY29uc3QgdGUgb2YgZGlzY292ZXIpIHtcbiAgICAgICAgICAvLyBmaW5kIGZpcnN0IG1hdGNoaW5nIGNhbmRpZGF0ZSBhbmQgY29udGludWUgdG8gdmFsaWRpdHkgY2hlY2tcbiAgICAgICAgICByZXN1bHQgPSB0ZShpZGVudGl0eSk7XG4gICAgICAgICAgaWYgKHJlc3VsdCkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IGRpc2NvdmVyKGlkZW50aXR5KTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgJiYgaXNUb2tlblZhbGlkKSByZXN1bHQgPSBpc1Rva2VuVmFsaWQocmVzdWx0LCBpZGVudGl0eSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJlc3VsdCA9IG9uRmFpbGVkRGlzY292ZXJ5Py4oZXJyb3IsIGlkZW50aXR5KTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmVzdWx0ID0gb25JbnZhbGlkVG9rZW4/LihpZGVudGl0eSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuY29uc3QganNUb2tlbkV2YWxSZXN1bHRzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9OyAvLyBzZXJ2ZXMgYXMgYSBjYWNoZSwgc3BlZWQgdXAgbGF0ZXIgbG9va3Vwc1xuXG5leHBvcnQgZnVuY3Rpb24gY2FjaGVhYmxlSnNUb2tlbkV2YWxSZXN1bHQ8VG9rZW4+KFxuICBuYW1lOiBzdHJpbmcsXG4gIGRpc2NvdmVyID0gZXZhbCxcbiAgb25JbnZhbGlkVG9rZW4/OiAobmFtZTogc3RyaW5nKSA9PiBUb2tlbiB8IHVuZGVmaW5lZCxcbiAgb25GYWlsZWREaXNjb3Zlcnk/OiAoZXJyb3I6IEVycm9yLCBuYW1lOiBzdHJpbmcpID0+IFRva2VuIHwgdW5kZWZpbmVkLFxuKSB7XG4gIGlmIChuYW1lIGluIGpzVG9rZW5FdmFsUmVzdWx0cykgcmV0dXJuIGpzVG9rZW5FdmFsUmVzdWx0c1tuYW1lXTtcbiAgcmV0dXJuIGpzVG9rZW5FdmFsUmVzdWx0KFxuICAgIG5hbWUsXG4gICAgZGlzY292ZXIsXG4gICAgKHZhbHVlLCBuYW1lKSA9PiB7XG4gICAgICBqc1Rva2VuRXZhbFJlc3VsdHNbbmFtZV0gPSB2YWx1ZTtcbiAgICAgIHJldHVybiB2YWx1ZTsgLy8gYmUgc3VyZSB0byB2YWx1ZSwgdGhpcyBpcyB3aGF0J3MgcmV0dXJuZWQgYXMganNUb2tlbkV2YWxSZXN1bHQgcmVzdWx0XG4gICAgfSxcbiAgICBvbkludmFsaWRUb2tlbixcbiAgICBvbkZhaWxlZERpc2NvdmVyeSxcbiAgKTtcbn1cblxuLy8gd2UgZGVmaW5lIEhUTUxFbGVtZW50IGFzIGEgZ2VuZXJpYyBhcmd1bWVudCBiZWNhdXNlIERPTSBpcyBub3Qga25vd24gaW4gVHlwZXNjcmlwdFxuZXhwb3J0IGludGVyZmFjZSBXYWxrSG9va05hbWVTdXBwbGllcjxIb29rVGFyZ2V0PiB7XG4gIChlbGVtZW50OiBIb29rVGFyZ2V0KTogc3RyaW5nIHwgdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEhvb2tXYWxrRW50cnk8SG9va1RhcmdldCwgSG9vaz4ge1xuICByZWFkb25seSB0YXJnZXQ6IEhvb2tUYXJnZXQ7XG4gIHJlYWRvbmx5IGhvb2tEaXNjb3ZlcmVkPzogSG9vaztcbiAgcmVhZG9ubHkgaG9va05hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgaG9va05hbWVTdXBwbGllcjogV2Fsa0hvb2tOYW1lU3VwcGxpZXI8SG9va1RhcmdldD47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogd2Fsa0hvb2tzPEhvb2tUYXJnZXQsIEhvb2s+KFxuICB0YXJnZXRzOiBJdGVyYWJsZTxIb29rVGFyZ2V0PixcbiAgaG9va05hbWVTdXBwbGllcnM6IEl0ZXJhYmxlPFdhbGtIb29rTmFtZVN1cHBsaWVyPEhvb2tUYXJnZXQ+PixcbiAgZGlzY292ZXI6IFRva2VuRXhwbG9yZXI8SG9vaz4gfCBUb2tlbkV4cGxvcmVyPEhvb2s+W10sXG4gIHByZXBhcmVXYWxrRW50cnk/OiAoXG4gICAgc3VnZ2VzdGVkOiBIb29rV2Fsa0VudHJ5PEhvb2tUYXJnZXQsIEhvb2s+LFxuICApID0+IEhvb2tXYWxrRW50cnk8SG9va1RhcmdldCwgSG9vaz4gfCB1bmRlZmluZWQsXG4pOiBHZW5lcmF0b3I8SG9va1dhbGtFbnRyeTxIb29rVGFyZ2V0LCBIb29rPj4ge1xuICBjb25zdCBzdXBwbGllcnMgPSBBcnJheS5pc0FycmF5KGhvb2tOYW1lU3VwcGxpZXJzKVxuICAgID8gaG9va05hbWVTdXBwbGllcnNcbiAgICA6IFtob29rTmFtZVN1cHBsaWVyc107XG4gIGZvciAoY29uc3QgdGFyZ2V0IG9mIHRhcmdldHMpIHtcbiAgICBmb3IgKGNvbnN0IGhvb2tOYW1lU3VwcGxpZXIgb2Ygc3VwcGxpZXJzKSB7XG4gICAgICBjb25zdCBob29rTmFtZSA9IGhvb2tOYW1lU3VwcGxpZXIodGFyZ2V0KTtcbiAgICAgIGlmIChob29rTmFtZSkge1xuICAgICAgICBjb25zdCBob29rRGlzY292ZXJlZCA9IGpzVG9rZW5FdmFsUmVzdWx0PEhvb2s+KFxuICAgICAgICAgIGhvb2tOYW1lLFxuICAgICAgICAgIGRpc2NvdmVyLFxuICAgICAgICAgICh2YWx1ZSkgPT4gdmFsdWUgYXMgSG9vaywgLy8gVE9ETzogbmVlZCB2YWxpZGF0aW9uXG4gICAgICAgICAgKG5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBgW2Rpc2NvdmVyRG9tRWxlbUhvb2tdICcke25hbWV9JyBpcyBub3QgYSB0b2tlbiBpbiBjdXJyZW50IHNjb3BlIGZvcmAsXG4gICAgICAgICAgICAgIHRhcmdldCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgIH0sXG4gICAgICAgICk7XG4gICAgICAgIGxldCBob29rRXhlY0FyZ3M6IEhvb2tXYWxrRW50cnk8SG9va1RhcmdldCwgSG9vaz4gPSB7XG4gICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgIGhvb2tEaXNjb3ZlcmVkLFxuICAgICAgICAgIGhvb2tOYW1lLFxuICAgICAgICAgIGhvb2tOYW1lU3VwcGxpZXIsXG4gICAgICAgIH07XG4gICAgICAgIGlmIChwcmVwYXJlV2Fsa0VudHJ5KSB7XG4gICAgICAgICAgY29uc3QgcHJlcGFyZWQgPSBwcmVwYXJlV2Fsa0VudHJ5KGhvb2tFeGVjQXJncyk7XG4gICAgICAgICAgaWYgKCFwcmVwYXJlZCkgY29udGludWU7IC8vIGZpbHRlcmVkLCBkb24ndCB5aWVsZFxuICAgICAgICAgIGhvb2tFeGVjQXJncyA9IHByZXBhcmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vIHJ1biB0aGUgaG9vayB3aGljaCByZWNlaXZlcyB0aGUgZGlzY292ZXJ5IHBhcmFtZXRlcnMgYW5kIGlzIGV4cGVjdGVkXG4gICAgICAgIC8vIHRvIHJldHVybiB0aGUgcGFyYW1ldGVycyBwbHVzIHdoYXRldmVyIGlzIGV4cGVjdGVkIGJ5IHRoZSBkaXNjb3ZlckRvbUVsZW1Ib29rc1xuICAgICAgICAvLyBjYWxsZXI7IGlmIGl0IHJldHVybnMgdW5kZWZpbmVkLCB0aGUgZGVmYXVsdCBob29rRXhlY0FyZ3MgKyBob29rRXhlY1Jlc3VsdFxuICAgICAgICAvLyBpcyByZXR1cm5lZFxuICAgICAgICBjb25zdCBob29rRXhlY1Jlc3VsdCA9XG4gICAgICAgICAgaG9va0Rpc2NvdmVyZWQgJiYgdHlwZW9mIGhvb2tEaXNjb3ZlcmVkID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICAgID8gaG9va0Rpc2NvdmVyZWQoaG9va0V4ZWNBcmdzKVxuICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG5cbiAgICAgICAgLy8geWllbGQgZnJvbSBhbnkgc3VwcGxpZXIgZm91bmRcbiAgICAgICAgeWllbGQgaG9va0V4ZWNSZXN1bHQgPz8gaG9va0V4ZWNBcmdzO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vLyBkZW5vLWxpbnQtaWdub3JlIG5vLWVtcHR5LWludGVyZmFjZVxuZXhwb3J0IGludGVyZmFjZSBGbGV4aWJsZUFyZ3VtZW50cyB7XG59XG5cbmV4cG9ydCB0eXBlIEFyZ3VtZW50c1N1cHBsaWVyPFxuICBBcmd1bWVudHMgZXh0ZW5kcyBGbGV4aWJsZUFyZ3VtZW50cyxcbj4gPVxuICB8IFBhcnRpYWw8QXJndW1lbnRzPlxuICB8ICgoXG4gICAgZGVmYXVsdEFyZ3M/OiBBcmd1bWVudHMsXG4gICAgcnVsZXM/OiBGbGV4aWJsZUFyZ3NSdWxlczxBcmd1bWVudHM+LFxuICApID0+IFBhcnRpYWw8QXJndW1lbnRzPik7XG5cbmV4cG9ydCB0eXBlIERlZmF1bHRBcmd1bWVudHNTdXBwbGllcjxcbiAgQXJndW1lbnRzIGV4dGVuZHMgRmxleGlibGVBcmd1bWVudHMsXG4+ID1cbiAgfCBBcmd1bWVudHNcbiAgfCAoKFxuICAgIGFyZ3M/OiBBcmd1bWVudHNTdXBwbGllcjxBcmd1bWVudHM+LFxuICAgIHJ1bGVzPzogRmxleGlibGVBcmdzUnVsZXM8QXJndW1lbnRzPixcbiAgKSA9PiBBcmd1bWVudHMpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEZsZXhpYmxlQXJnc0d1YXJkPFxuICBBcmd1bWVudHMgZXh0ZW5kcyBGbGV4aWJsZUFyZ3VtZW50cyxcbiAgUnVsZXMgZXh0ZW5kcyBGbGV4aWJsZUFyZ3NSdWxlczxBcmd1bWVudHM+LFxuPiB7XG4gIHJlYWRvbmx5IGd1YXJkOiAobzogdW5rbm93bikgPT4gbyBpcyBBcmd1bWVudHM7XG4gIHJlYWRvbmx5IG9uRmFpbHVyZTogKGFyZ3M6IEFyZ3VtZW50cywgcnVsZXM/OiBSdWxlcykgPT4gQXJndW1lbnRzO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZsZXhpYmxlQXJnc1J1bGVzPFxuICBBcmd1bWVudHMgZXh0ZW5kcyBGbGV4aWJsZUFyZ3VtZW50cyxcbj4ge1xuICAvKipcbiAgICogZGVmYXVsdEFyZ3MgY2FuIGNvbWUgZnJvbSBhbnl3aGVyZSAoZXZlbiBcImhvb2tzXCIpLiBJbiBtb3N0IGNhc2VzIHRoZXkgYXJlXG4gICAqIGp1c3QgYSBzY2FsYXIgb2JqZWN0IGJ1dCB0aGV5IGNvdWxkIGJlIHNvdXJjZWQgZnJvbSBhbnl3aGVyZS4gRm9yIGV4YW1wbGUsXG4gICAqIHlvdSBjb3VsZCB1c2UganNUb2tlbkV2YWxSZXN1bHQgdG8gZHluYW1pY2FsbHkgZXZhbHVhdGUgYSB0b2tlbiBvciByZWFkXG4gICAqIHRoZSBhcmd1bWVudHMgZnJvbSBhIGZlYXR1cmUgZmxhZyBzeXN0ZW0gbGlrZSBVbmxlYXNoLCBlbnZpcm9ubWVudFxuICAgKiB2YXJpYWJsZXMsIG9yIGV2ZW4gdGhlIENMSSB0aHJvdWdoIEZsZXhpYmxlIEFyZ3VtZW50cyBBZGFwdGVycyAoRkFBcykuXG4gICAqL1xuICByZWFkb25seSBkZWZhdWx0QXJncz86IERlZmF1bHRBcmd1bWVudHNTdXBwbGllcjxBcmd1bWVudHM+O1xuXG4gIC8qKlxuICAgKiBhcmdzR3VhcmQgZ2l2ZXMgeW91ciBjb2RlIHRoZSBvcHBvcnR1bml0eSB0byB2YWxpZGF0ZSB0aGUgQXJndW1lbnRzIGFmdGVyXG4gICAqIGZpbmFsaXphdGlvbi4gSW4gY2FzZSB0aGUgZ3VhcmQgZmFpbHMsIG9uRmFpbHVyZSB3aWxsIGJlIGNhbGxlZCBhbGxvd2luZ1xuICAgKiB5b3UgdG8gcmV0dXJuIGEgZGlmZmVyZW50IHNldCBvZiByZXN1bHRzIGZyb20gYSBcImJhY2t1cFwiIHNvdXJjZS5cbiAgICovXG4gIHJlYWRvbmx5IGFyZ3NHdWFyZD86IEZsZXhpYmxlQXJnc0d1YXJkPFxuICAgIEFyZ3VtZW50cyxcbiAgICBGbGV4aWJsZUFyZ3NSdWxlczxBcmd1bWVudHM+XG4gID47XG5cbiAgLyoqXG4gICAqIGZpbmFsaXplQXJncyBhbGxvd3MgeW91ciBjb2RlIHRvIHNlZSB3aGF0J3MgYmVlbiBjb25zdHJ1Y3RlZCB3aXRoIGFsbCB0aGVcbiAgICogcnVsZXMgYW5kIGdpdmVzIG9uZSBsYXN0IG9wcG9ydHVuaXR5IHRvIHJldHVybiBkaWZmZXJlbnQgcmVzdWx0cy5cbiAgICovXG4gIHJlYWRvbmx5IGZpbmFsaXplUmVzdWx0PzogKFxuICAgIHN1Z2dlc3RlZDogRmxleGlibGVBcmdzUmVzdWx0PEFyZ3VtZW50cywgRmxleGlibGVBcmdzUnVsZXM8QXJndW1lbnRzPj4sXG4gICkgPT4gRmxleGlibGVBcmdzUmVzdWx0PFxuICAgIEFyZ3VtZW50cyxcbiAgICBGbGV4aWJsZUFyZ3NSdWxlczxBcmd1bWVudHM+XG4gID47XG59XG5cbmV4cG9ydCB0eXBlIEZsZXhpYmxlQXJnc1J1bGVzU3VwcGxpZXI8XG4gIEFyZ3VtZW50cyBleHRlbmRzIEZsZXhpYmxlQXJndW1lbnRzLFxuICBSdWxlcyBleHRlbmRzIEZsZXhpYmxlQXJnc1J1bGVzPEFyZ3VtZW50cz4sXG4+ID1cbiAgfCBGbGV4aWJsZUFyZ3NSdWxlczxBcmd1bWVudHM+XG4gIHwgKChhcmdzPzogQXJndW1lbnRzU3VwcGxpZXI8QXJndW1lbnRzPikgPT4gUnVsZXMpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEZsZXhpYmxlQXJnc1Jlc3VsdDxcbiAgQXJndW1lbnRzIGV4dGVuZHMgRmxleGlibGVBcmd1bWVudHMsXG4gIFJ1bGVzIGV4dGVuZHMgRmxleGlibGVBcmdzUnVsZXM8QXJndW1lbnRzPixcbj4ge1xuICByZWFkb25seSBhcmdzOiBBcmd1bWVudHM7XG4gIHJlYWRvbmx5IHJ1bGVzPzogUnVsZXM7XG59XG5cbi8qKlxuICogRmxleGlibHkgY3JlYXRlIGFuIG9iamVjdCBmcm9tIGFuIGFyZ3VtZW50cyBzdXBwbGllciBhbmQgYSBzZXQgb2YgcnVsZXMuXG4gKiBUaGlzIGlzIG91ciBzdGFuZGFyZCBhcHByb2FjaCB0byBjb25zdHJ1Y3Rpbmcgb2JqZWN0cyBhbmQgaG9va3M7XG4gKiBhcmdzU3VwcGxpZXIgaXMgdGhlIHByaW1hcnkgb2JqZWN0IGluc3RhbmNlIGFuZCBzaG91bGQgY29udGFpbiB0aGVcbiAqIGNhbm9uaWNhbCBwcm9wZXJ0aWVzLiBXaGVuIGNlcnRhaW4gcHJvcGVydGllcyBzaG91bGQgYWx3YXlzIGJlIHByZXNlbnQsIHRoZXlcbiAqIGNhbiBiZSBzdXBwbGllZCBpbiBydWxlcy5kZWZhdWx0QXJncy5cbiAqIEBwYXJhbSBhcmdzU3VwcGxpZXJcbiAqIEBwYXJhbSBydWxlc1N1cHBsaWVyXG4gKiBAcmV0dXJuc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZmxleGlibGVBcmdzPFxuICBBcmd1bWVudHMgZXh0ZW5kcyBGbGV4aWJsZUFyZ3VtZW50cyxcbj4oXG4gIGFyZ3NTdXBwbGllcjogQXJndW1lbnRzU3VwcGxpZXI8QXJndW1lbnRzPixcbiAgcnVsZXNTdXBwbGllcj86IEZsZXhpYmxlQXJnc1J1bGVzU3VwcGxpZXI8XG4gICAgQXJndW1lbnRzLFxuICAgIEZsZXhpYmxlQXJnc1J1bGVzPEFyZ3VtZW50cz5cbiAgPixcbik6IEZsZXhpYmxlQXJnc1Jlc3VsdDxcbiAgQXJndW1lbnRzLFxuICBGbGV4aWJsZUFyZ3NSdWxlczxBcmd1bWVudHM+XG4+IHtcbiAgLy8gcnVsZXMgY2FuIGNvbWUgZnJvbSBhbnl3aGVyZSAoZXZlbiBcImhvb2tzXCIpLiBJbiBtb3N0IGNhc2VzIHJ1bGVzIGFyZVxuICAvLyBqdXN0IGEgc2NhbGFyIG9iamVjdCB3aXRoIHNpbXBsZSBwcm9wZXJ0aWVzIGJ1dCB0aGV5IGNvdWxkIGJlIHNvdXJjZWRcbiAgLy8gZnJvbSBhbnl3aGVyZS4gRm9yIGV4YW1wbGUsIHlvdSBjb3VsZCB1c2UganNUb2tlbkV2YWxSZXN1bHQgdG9cbiAgLy8gZHluYW1pY2FsbHkgZXZhbHVhdGUgYSB0b2tlbiBvciByZWFkIHRoZSBydWxlcyBmcm9tIERPTSBlbGVtZW50IGhvb2tzIGlmXG4gIC8vIHJ1bm5pbmcgaW4gYSBicm93c2VyIG9yIHRocm91Z2ggZW52aXJvbm1lbnQgdmFyaWFibGVzIGlmIHJ1bm5pbmcgb24gdGhlXG4gIC8vIHNlcnZlci4gVGhlc2UgXCJob29rc1wiIGFyZSBjYWxsZWQgRmxleGlibGUgQXJndW1lbnRzIFJ1bGVzIEFkYXB0ZXJzIChGQVJBcykuXG4gIGNvbnN0IHJ1bGVzID0gcnVsZXNTdXBwbGllclxuICAgID8gKHR5cGVvZiBydWxlc1N1cHBsaWVyID09PSBcImZ1bmN0aW9uXCJcbiAgICAgID8gcnVsZXNTdXBwbGllcihhcmdzU3VwcGxpZXIpXG4gICAgICA6IHJ1bGVzU3VwcGxpZXIpXG4gICAgOiB1bmRlZmluZWQ7XG5cbiAgLy8gaWYgd2UgaGF2ZSBhIGRlZmF1bHRBcmdzIHJ1bGUsIHVzZSBpdDsgaWYgZGVmYXVsdEFyZ3MgaXMgYSBmdW5jdGlvbixcbiAgLy8gZXZhbHVhdGUgaXQgYW5kIGFzc3VtZSB0aGF0IHRob3NlIGFyZSB0aGUgYWN0dWFsIGRlZmF1bHQgYXJndW1lbnRzLlxuICAvLyBiZWNhdXNlIHRoZSByZXN1bHRpbmcgYXJncyBmcm9tIHRoaXMgZnVuY3Rpb24gY2FuIG5ldmVyIGJlIHVuZGVmaW5lIG9yXG4gIC8vIG51bGwgd2UgZGVmYXVsdCB0byBhbiBlbXB0eSBvYmplY3QgdG8gc3RhcnQgd2l0aC5cbiAgY29uc3QgZGVmYXVsdEFyZ3NTdXBwbGllciA9IHJ1bGVzPy5kZWZhdWx0QXJncyA/PyB7fTtcbiAgY29uc3QgZGVmYXVsdEFyZ3MgPSB0eXBlb2YgZGVmYXVsdEFyZ3NTdXBwbGllciA9PT0gXCJmdW5jdGlvblwiXG4gICAgPyBkZWZhdWx0QXJnc1N1cHBsaWVyKGFyZ3NTdXBwbGllciwgcnVsZXMpXG4gICAgOiBkZWZhdWx0QXJnc1N1cHBsaWVyO1xuXG4gIC8vIG5vdyB0aGF0IHdlIGhhdmUgb3VyIHJ1bGVzIGFuZCBkZWZhdWx0IGFyZ3VtZW50cyBzZXR1cCB0aGUgY2Fub25pY2FsXG4gIC8vIGFyZ3VtZW50cyBpbnN0YW5jZS4gSWYgdGhlIGFyZ3NTdXBwbGllciBpcyBhIGZ1bmN0aW9uLCBldmFsdWF0ZSBpdCBhbmRcbiAgLy8gdXNlIGl0IGFzIHRoZSBzdGFydGluZyBwb2ludC4gSWYgYXJnc1N1cHBsaWVyIGlzIGEgZnVuY3Rpb24sIGl0IG1lYW5zXG4gIC8vIHRoYXQgaXQgbWlnaHQgYmUgYSBcImhvb2tcIiBvciBvdGhlciBkeW5hbWljYWxseSBzb3VyY2VkIGNvbnRlbnQuIElmXG4gIC8vIGFyZ3NTdXBwbGllciBpcyBhIGZ1bmN0aW9uLCBpdCB3aWxsIGJlIGdpdmVuIHRoZSBkZWZhdWx0QXJncyBhcyBpdHNcbiAgLy8gZmlyc3QgcGFyYW1ldGVyIGlzIHRoZSByZXNwb25zaWJpbGl0eSBvZiB0aGUgYXJnc1N1cHBsaWVyIGZ1bmN0aW9uIHRvXG4gIC8vIHVzZSBzcHJlYWQgb3BlcmF0b3JzIHRvIFwidXNlXCIgdGhlIGRlZmF1bHRzIGJlZm9yZSByZXR1cm5pbmcgYmVjYXVzZSB0aGVcbiAgLy8gYXJnc1N1cHBsaWVyIGZ1bmN0aW9uIGlzIHJlc3BvbnNpYmxlIGZvciBpbmhlcml0aW5nIHRoZSBkZWZhdWx0IGFyZ3MuXG4gIC8vIElmIGFyZ3NTdXBwbGllciBpcyBhbiBvYmplY3QgaW5zdGFuY2UsIGRlZmF1bHRBcmdzIHdpbGwgYXV0b21hdGljYWxseVxuICAvLyBiZSBpbmhlcml0ZWQuXG4gIGxldCBhcmdzID0gdHlwZW9mIGFyZ3NTdXBwbGllciA9PT0gXCJmdW5jdGlvblwiXG4gICAgPyBhcmdzU3VwcGxpZXIoZGVmYXVsdEFyZ3MsIHJ1bGVzKVxuICAgIDogKGFyZ3NTdXBwbGllciA/IHsgLi4uZGVmYXVsdEFyZ3MsIC4uLmFyZ3NTdXBwbGllciB9IDogZGVmYXVsdEFyZ3MpO1xuXG4gIGlmIChydWxlcz8uYXJnc0d1YXJkKSB7XG4gICAgaWYgKCFydWxlcz8uYXJnc0d1YXJkLmd1YXJkKGFyZ3MpKSB7XG4gICAgICBhcmdzID0gcnVsZXMuYXJnc0d1YXJkLm9uRmFpbHVyZShhcmdzLCBydWxlcyk7XG4gICAgfVxuICB9XG5cbiAgbGV0IHJlc3VsdDogRmxleGlibGVBcmdzUmVzdWx0PFxuICAgIEFyZ3VtZW50cyxcbiAgICBGbGV4aWJsZUFyZ3NSdWxlczxBcmd1bWVudHM+XG4gID4gPSB7IGFyZ3MsIHJ1bGVzIH07XG5cbiAgaWYgKHJ1bGVzPy5maW5hbGl6ZVJlc3VsdCkge1xuICAgIHJlc3VsdCA9IHJ1bGVzLmZpbmFsaXplUmVzdWx0KHJlc3VsdCk7XG4gIH1cblxuICAvLyBUT0RPOiBhZGQgZXZlbnQgZW1pdHRlciB0byBydWxlcyBhbmQgYWxsb3cgXCJwdWJsaXNoXCIgb2YgYXJndW1lbnRzXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnb3Zlcm5lZEFyZ3M8XG4gIEFyZ3VtZW50cyBleHRlbmRzIEZsZXhpYmxlQXJndW1lbnRzLFxuPihcbiAgYXJnc1N1cHBsaWVyOiBBcmd1bWVudHNTdXBwbGllcjxBcmd1bWVudHM+LFxuICBydWxlc1N1cHBsaWVyPzogRmxleGlibGVBcmdzUnVsZXNTdXBwbGllcjxcbiAgICBBcmd1bWVudHMsXG4gICAgRmxleGlibGVBcmdzUnVsZXM8QXJndW1lbnRzPlxuICA+LFxuKSB7XG4gIGNvbnN0IHJlc3VsdCA9IGZsZXhpYmxlQXJncyhhcmdzU3VwcGxpZXIsIHJ1bGVzU3VwcGxpZXIpO1xuICAvLyBUT0RPOiBhZGQgaHR0cHM6Ly9hanYuanMub3JnLyBzY2hlbWEgdmFsaWRhdGlvblxuICByZXR1cm4gcmVzdWx0O1xufVxuIiwiY29uc3QgcG9zaXhQYXRoUkUgPVxuICAvXigoXFwvPykoPzpbXlxcL10qXFwvKSopKChcXC57MSwyfXxbXlxcL10rP3wpKFxcLlteLlxcL10qfCkpW1xcL10qJC87XG5cbi8qKlxuICogR2l2ZW4gUE9TSVgtc3R5bGUgcGF0aCBzZWUgaWYgaXQncyBhIGZpbGUtc3lzIHN0eWxlIHJvdXRlLiBUaGlzIGZ1bmN0aW9uIGlzXG4gKiB1c2VmdWwgaW4gYnJvd3NlcnMgdG8gZGV0ZWN0IGEgc2VydmVyIHJvdXRlIGJhc2VkIG9uIGRvY3VtZW50LmxvY2F0aW9uLlxuICogRm9yIGV4YW1wbGUsIGlmIHlvdSBoYXZlIGEgbmF2aWdhdGlvbiB1dGlsaXR5IHRoYXQgbmVlZHMgdG8gc2V0IHRoZSBhY3RpdmVcbiAqIHBhdGggeW91IGNvdWxkIHJ1biB0aGlzIGZ1bmN0aW9uIHRvIGdldCB0aGUgY29tcG9uZW50IHBhcnRzIChzdWNoIGFzIG5hbWUsXG4gKiBkaXJlY3RvcnksIG1vZGlmaWVycywgZXRjLikgYW5kIGZpbmQgdGhlIGFjdGl2ZSBwYWdlLiBJZiB0aGVyZSBhcmUgYW55IGV4dHJhXG4gKiBleHRlbnNpb25zIGluIHRoZSBmaWxlIHRoZXkgYXJlIHJldHVybmVkIGFzXCJtb2RpZmllcnNcIi5cbiAqIEBwYXJhbSB0ZXh0IHRoZSBzdHJpbmcgdG8gZGV0ZWN0IGFuZCBzZWUgaWYgaXQncyBQT1NJWC1zdHlsZSBwYXRoXG4gKiByZXR1cm5zIHVuZGVmaW5lZCBpZiBpdCBkb2Vzbid0IG1hdGNoIGEgcGF0aCBvciBjb21wb25lbnRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGV0ZWN0RmlsZVN5c1N0eWxlUm91dGUodGV4dDogc3RyaW5nKSB7XG4gIGNvbnN0IGNvbXBvbmVudHMgPSBwb3NpeFBhdGhSRS5leGVjKHRleHQpPy5zbGljZSgxKTtcbiAgaWYgKCFjb21wb25lbnRzIHx8IGNvbXBvbmVudHMubGVuZ3RoICE9PSA1KSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gIGNvbnN0IG1vZGlmaWVyczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgcGFyc2VkUGF0aCA9IHtcbiAgICByb290OiBjb21wb25lbnRzWzFdLFxuICAgIGRpcjogY29tcG9uZW50c1swXS5zbGljZSgwLCAtMSksXG4gICAgYmFzZTogY29tcG9uZW50c1syXSxcbiAgICBleHQ6IGNvbXBvbmVudHNbNF0sXG4gICAgbmFtZTogY29tcG9uZW50c1szXSxcbiAgICBtb2RpZmllcnMsXG4gIH07XG5cbiAgY29uc3QgbW9kaWZpZXJJbmRleCA9IHBhcnNlZFBhdGgubmFtZS5sYXN0SW5kZXhPZihcIi5cIik7XG4gIGlmIChtb2RpZmllckluZGV4ID4gMCkge1xuICAgIGxldCBwcG4gPSBwYXJzZWRQYXRoLm5hbWU7XG4gICAgbGV0IG1vZGlmaWVyOiBzdHJpbmcgfCB1bmRlZmluZWQgPSBwcG4uc3Vic3RyaW5nKG1vZGlmaWVySW5kZXgpO1xuICAgIHdoaWxlIChtb2RpZmllciAmJiBtb2RpZmllci5sZW5ndGggPiAwKSB7XG4gICAgICBtb2RpZmllcnMucHVzaChtb2RpZmllcik7XG4gICAgICBwcG4gPSBwcG4uc3Vic3RyaW5nKDAsIHBwbi5sZW5ndGggLSBtb2RpZmllci5sZW5ndGgpO1xuXG4gICAgICBjb25zdCBtb2RpZmllckluZGV4ID0gcHBuLmxhc3RJbmRleE9mKFwiLlwiKTtcbiAgICAgIG1vZGlmaWVyID0gbW9kaWZpZXJJbmRleCA+IDAgPyBwcG4uc3Vic3RyaW5nKG1vZGlmaWVySW5kZXgpIDogdW5kZWZpbmVkO1xuICAgIH1cbiAgICBwYXJzZWRQYXRoLm5hbWUgPSBwcG47XG4gIH1cblxuICByZXR1cm4gcGFyc2VkUGF0aDtcbn1cbiIsImV4cG9ydCBpbnRlcmZhY2UgVHlwZUd1YXJkPFQ+IHtcbiAgKG86IHVua25vd24pOiBvIGlzIFQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZUd1YXJkQ3VzdG9tPFgsIFQgZXh0ZW5kcyBYPiB7XG4gIChvOiBYKTogbyBpcyBUO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHlwZUd1YXJkPFQsIEsgZXh0ZW5kcyBrZXlvZiBUID0ga2V5b2YgVD4oXG4gIC4uLnJlcXVpcmVLZXlzSW5TaW5nbGVUOiBLW10gLy8gPSBbLi4ua2V5b2YgVF0gVE9ETzogZGVmYXVsdCB0aGlzIHRvIGFsbCByZXF1aXJlZCBrZXlzXG4pOiBUeXBlR3VhcmQ8VD4ge1xuICByZXR1cm4gKG86IHVua25vd24pOiBvIGlzIFQgPT4ge1xuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBvYmplY3QgcGFzc2VkIGlzIGEgcmVhbCBvYmplY3QgYW5kIGhhcyBhbGwgcmVxdWlyZWQgcHJvcHNcbiAgICBpZiAobyAmJiB0eXBlb2YgbyA9PT0gXCJvYmplY3RcIikge1xuICAgICAgcmV0dXJuICFyZXF1aXJlS2V5c0luU2luZ2xlVC5maW5kKChwKSA9PiAhKHAgaW4gbykpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdWJUeXBlR3VhcmQ8XG4gIFR5cGUsXG4gIFN1YlR5cGUsXG4gIEsgZXh0ZW5kcyBrZXlvZiBTdWJUeXBlID0ga2V5b2YgU3ViVHlwZSxcbj4oYmFzZTogVHlwZUd1YXJkPFR5cGU+LCAuLi5yZXF1aXJlS2V5c0luU2luZ2xlVDogS1tdKTogVHlwZUd1YXJkPFN1YlR5cGU+IHtcbiAgcmV0dXJuIChvOiB1bmtub3duKTogbyBpcyBTdWJUeXBlID0+IHtcbiAgICBpZiAoYmFzZShvKSkge1xuICAgICAgLy8gTWFrZSBzdXJlIHRoYXQgdGhlIG9iamVjdCBwYXNzZWQgaXMgYSByZWFsIG9iamVjdCBhbmQgaGFzIGFsbCByZXF1aXJlZCBwcm9wc1xuICAgICAgaWYgKG8gJiYgdHlwZW9mIG8gPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgcmV0dXJuICFyZXF1aXJlS2V5c0luU2luZ2xlVC5maW5kKChwKSA9PiAhKHAgaW4gbykpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtdWx0aXBsZVR5cGVzR3VhcmQ8XG4gIEFnZ3JlZ2F0ZVR5cGUsXG4gIFJldHVyblR5cGUsXG4gIEsgZXh0ZW5kcyBrZXlvZiBBZ2dyZWdhdGVUeXBlID0ga2V5b2YgQWdncmVnYXRlVHlwZSxcbj4oXG4gIGd1YXJkczogVHlwZUd1YXJkPHVua25vd24+W10sXG4gIC4uLnJlcXVpcmVLZXlzSW5TaW5nbGVUOiBLW11cbik6IFR5cGVHdWFyZDxSZXR1cm5UeXBlPiB7XG4gIHJldHVybiAobzogdW5rbm93bik6IG8gaXMgUmV0dXJuVHlwZSA9PiB7XG4gICAgZm9yIChjb25zdCBndWFyZCBvZiBndWFyZHMpIHtcbiAgICAgIGlmICghZ3VhcmQobykpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKG8gJiYgdHlwZW9mIG8gPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIHJldHVybiAhcmVxdWlyZUtleXNJblNpbmdsZVQuZmluZCgocCkgPT4gIShwIGluIG8pKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHlwZUd1YXJkQ3VzdG9tPFgsIFQgZXh0ZW5kcyBYLCBLIGV4dGVuZHMga2V5b2YgVCA9IGtleW9mIFQ+KFxuICAuLi5yZXF1aXJlS2V5c0luU2luZ2xlVDogS1tdIC8vID0gWy4uLmtleW9mIFRdIFRPRE86IGRlZmF1bHQgdGhpcyB0byBhbGwgcmVxdWlyZWQga2V5c1xuKTogVHlwZUd1YXJkQ3VzdG9tPFgsIFQ+IHtcbiAgcmV0dXJuIChvOiBYKTogbyBpcyBUID0+IHtcbiAgICAvLyBNYWtlIHN1cmUgdGhhdCB0aGUgb2JqZWN0IHBhc3NlZCBpcyBhIHJlYWwgb2JqZWN0IGFuZCBoYXMgYWxsIHJlcXVpcmVkIHByb3BzXG4gICAgcmV0dXJuIG8gJiYgdHlwZW9mIG8gPT09IFwib2JqZWN0XCIgJiZcbiAgICAgICFyZXF1aXJlS2V5c0luU2luZ2xlVC5maW5kKChwKSA9PiAhKHAgaW4gbykpO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHlwZUd1YXJkQXJyYXlPZjxcbiAgVCxcbiAgQXJyYXlUIGV4dGVuZHMgVFtdLFxuICBLIGV4dGVuZHMga2V5b2YgVCA9IGtleW9mIFQsXG4+KFxuICAuLi5yZXF1aXJlS2V5c0luU2luZ2xlVDogS1tdIC8vID0gWy4uLmtleW9mIFRdIFRPRE86IGRlZmF1bHQgdGhpcyB0byBhbGwgcmVxdWlyZWQga2V5c1xuKTogVHlwZUd1YXJkPEFycmF5VD4ge1xuICBjb25zdCBndWFyZCA9IHR5cGVHdWFyZDxUPiguLi5yZXF1aXJlS2V5c0luU2luZ2xlVCk7XG4gIHJldHVybiAobzogdW5rbm93bik6IG8gaXMgQXJyYXlUID0+IHtcbiAgICBpZiAobyAmJiBBcnJheS5pc0FycmF5KG8pKSB7XG4gICAgICByZXR1cm4gIW8uZmluZCgoaSkgPT4gIWd1YXJkKGkpKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHlwZUd1YXJkczxcbiAgU2luZ2xlVCxcbiAgTXVsdGlwbGVUIGV4dGVuZHMgU2luZ2xlVFtdLFxuICBLIGV4dGVuZHMga2V5b2YgU2luZ2xlVCA9IGtleW9mIFNpbmdsZVQsXG4+KFxuICAuLi5yZXF1aXJlS2V5c0luU2luZ2xlVDogS1tdXG4pOiBbVHlwZUd1YXJkPFNpbmdsZVQ+LCBUeXBlR3VhcmQ8TXVsdGlwbGVUPl0ge1xuICByZXR1cm4gW1xuICAgIHR5cGVHdWFyZDxTaW5nbGVUPiguLi5yZXF1aXJlS2V5c0luU2luZ2xlVCksXG4gICAgdHlwZUd1YXJkQXJyYXlPZjxTaW5nbGVULCBNdWx0aXBsZVQ+KC4uLnJlcXVpcmVLZXlzSW5TaW5nbGVUKSxcbiAgXTtcbn1cblxuZXhwb3J0IHR5cGUgUmVxdWlyZUF0TGVhc3RPbmU8VCwgS2V5cyBleHRlbmRzIGtleW9mIFQgPSBrZXlvZiBUPiA9XG4gICYgUGljazxULCBFeGNsdWRlPGtleW9mIFQsIEtleXM+PlxuICAmIHtcbiAgICBbSyBpbiBLZXlzXS0/OiBSZXF1aXJlZDxQaWNrPFQsIEs+PiAmIFBhcnRpYWw8UGljazxULCBFeGNsdWRlPEtleXMsIEs+Pj47XG4gIH1bS2V5c107XG5cbmV4cG9ydCB0eXBlIFJlcXVpcmVPbmx5T25lPFQsIEtleXMgZXh0ZW5kcyBrZXlvZiBUID0ga2V5b2YgVD4gPVxuICAmIFBpY2s8VCwgRXhjbHVkZTxrZXlvZiBULCBLZXlzPj5cbiAgJiB7XG4gICAgW0sgaW4gS2V5c10tPzpcbiAgICAgICYgUmVxdWlyZWQ8UGljazxULCBLPj5cbiAgICAgICYgUGFydGlhbDxSZWNvcmQ8RXhjbHVkZTxLZXlzLCBLPiwgdW5kZWZpbmVkPj47XG4gIH1bS2V5c107XG5cbmV4cG9ydCB0eXBlIFdyaXRlYWJsZTxUPiA9IHsgLXJlYWRvbmx5IFtQIGluIGtleW9mIFRdOiBUW1BdIH07XG5cbmV4cG9ydCB0eXBlIERlZXBXcml0ZWFibGU8VD4gPSB7XG4gIC1yZWFkb25seSBbUCBpbiBrZXlvZiBUXTogRGVlcFdyaXRlYWJsZTxUW1BdPjtcbn07XG4iLCJpbXBvcnQgKiBhcyBzYWZldHkgZnJvbSBcIi4uL3NhZmV0eS9tb2QudHNcIjtcblxuZXhwb3J0IHR5cGUgUGF5bG9hZElkZW50aXR5ID0gc3RyaW5nO1xuZXhwb3J0IHR5cGUgU2VydmljZUlkZW50aXR5ID0gc3RyaW5nO1xuXG5leHBvcnQgaW50ZXJmYWNlIElkZW50aWZpYWJsZVBheWxvYWQge1xuICByZWFkb25seSBwYXlsb2FkSWRlbnRpdHk6IFBheWxvYWRJZGVudGl0eTsgLy8gdXNlIGJ5IG9ic2VydmVyc1xufVxuXG5leHBvcnQgY29uc3QgaXNJZGVudGlmaWFibGVQYXlsb2FkID0gc2FmZXR5LnR5cGVHdWFyZDxJZGVudGlmaWFibGVQYXlsb2FkPihcbiAgXCJwYXlsb2FkSWRlbnRpdHlcIixcbik7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTXV0YXRhYmxlVmFsaWRhdGVkUGF5bG9hZCB7XG4gIGlzVmFsaWRhdGVkUGF5bG9hZDogdHJ1ZTtcbiAgaXNWYWxpZFBheWxvYWQ6IGJvb2xlYW47XG59XG5cbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tZW1wdHktaW50ZXJmYWNlXG5leHBvcnQgaW50ZXJmYWNlIFZhbGlkYXRlZFBheWxvYWQgZXh0ZW5kcyBSZWFkb25seTxNdXRhdGFibGVWYWxpZGF0ZWRQYXlsb2FkPiB7XG59XG5cbmV4cG9ydCBjb25zdCBWYWxpZGF0ZWRQYXlsb2FkID0gc2FmZXR5LnR5cGVHdWFyZDxWYWxpZGF0ZWRQYXlsb2FkPihcbiAgXCJpc1ZhbGlkYXRlZFBheWxvYWRcIixcbiAgXCJpc1ZhbGlkUGF5bG9hZFwiLFxuKTtcblxuZXhwb3J0IGludGVyZmFjZSBQYXlsb2FkU2VydmljZSB7XG4gIHJlYWRvbmx5IHNlcnZpY2VJZGVudGl0eTogU2VydmljZUlkZW50aXR5O1xuICByZWFkb25seSBwYXlsb2FkSWRlbnRpdHk6IFBheWxvYWRJZGVudGl0eTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFcnJvclN1cHBsaWVyIHtcbiAgcmVhZG9ubHkgZXJyb3I6IEVycm9yO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFVuc29saWNpdGVkUGF5bG9hZE9ic2VydmVyPFxuICBQYXlsb2FkIGV4dGVuZHMgVmFsaWRhdGVkUGF5bG9hZCxcbj4ge1xuICAocDogUGF5bG9hZCwgdXBzOiBVbnNvbGljaXRlZFBheWxvYWRTdHJhdGVneSk6IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVW5zb2xpY2l0ZWRQYXlsb2FkU3RyYXRlZ3kge1xuICByZWFkb25seSBvYnNlcnZlVW5zb2xpY2l0ZWRQYXlsb2FkOiA8XG4gICAgUGF5bG9hZCBleHRlbmRzIFZhbGlkYXRlZFBheWxvYWQsXG4gID4oXG4gICAgb2JzZXJ2ZXI6IFVuc29saWNpdGVkUGF5bG9hZE9ic2VydmVyPFBheWxvYWQ+LFxuICAgIHBheWxvYWRJRD86IFBheWxvYWRJZGVudGl0eSB8IFBheWxvYWRTZXJ2aWNlLFxuICApID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVjZWl2ZWRQYXlsb2FkT2JzZXJ2ZXI8XG4gIFBheWxvYWQgZXh0ZW5kcyBWYWxpZGF0ZWRQYXlsb2FkLFxuPiB7XG4gIChwOiBQYXlsb2FkLCB1cHM6IFJlY2VpdmVkUGF5bG9hZFN0cmF0ZWd5KTogdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWNlaXZlZFBheWxvYWRTdHJhdGVneSB7XG4gIHJlYWRvbmx5IG9ic2VydmVSZWNlaXZlZFBheWxvYWQ6IDxcbiAgICBQYXlsb2FkIGV4dGVuZHMgVmFsaWRhdGVkUGF5bG9hZCxcbiAgPihcbiAgICBvYnNlcnZlcjogUmVjZWl2ZWRQYXlsb2FkT2JzZXJ2ZXI8UGF5bG9hZD4sXG4gICAgcGF5bG9hZElEPzogUGF5bG9hZElkZW50aXR5IHwgUGF5bG9hZFNlcnZpY2UsXG4gICkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTb2xpY2l0ZWRQYXlsb2FkT2JzZXJ2ZXI8XG4gIFNvbGljaXRlZFBheWxvYWQgZXh0ZW5kcyBJZGVudGlmaWFibGVQYXlsb2FkLFxuICBTb2xpY2l0ZWRSZXNwb25zZVBheWxvYWQgZXh0ZW5kcyBWYWxpZGF0ZWRQYXlsb2FkLFxuICBDb250ZXh0LFxuPiB7XG4gIChcbiAgICBzcnA6IFNvbGljaXRlZFJlc3BvbnNlUGF5bG9hZCxcbiAgICBzcDogU29saWNpdGVkUGF5bG9hZCxcbiAgICBjdHg6IENvbnRleHQsXG4gICAgc3BzOiBTb2xpY2l0ZWRQYXlsb2FkU3RyYXRlZ3ksXG4gICk6IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU29saWNpdGVkUGF5bG9hZFN0cmF0ZWd5IHtcbiAgcmVhZG9ubHkgb2JzZXJ2ZVNvbGljaXRlZFBheWxvYWQ6IDxcbiAgICBTb2xpY2l0ZWRQYXlsb2FkIGV4dGVuZHMgSWRlbnRpZmlhYmxlUGF5bG9hZCxcbiAgICBTb2xpY2l0ZWRSZXNwb25zZVBheWxvYWQgZXh0ZW5kcyBWYWxpZGF0ZWRQYXlsb2FkLFxuICAgIENvbnRleHQsXG4gID4oXG4gICAgb2JzZXJ2ZXI6IFNvbGljaXRlZFBheWxvYWRPYnNlcnZlcjxcbiAgICAgIFNvbGljaXRlZFBheWxvYWQsXG4gICAgICBTb2xpY2l0ZWRSZXNwb25zZVBheWxvYWQsXG4gICAgICBDb250ZXh0XG4gICAgPixcbiAgICBwYXlsb2FkSUQ/OiBQYXlsb2FkSWRlbnRpdHkgfCBQYXlsb2FkU2VydmljZSxcbiAgKSA9PiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50U291cmNlU3RyYXRlZ3kge1xuICByZWFkb25seSBvYnNlcnZlRXZlbnRTb3VyY2U6IDxcbiAgICBFdmVudFNvdXJjZVBheWxvYWQgZXh0ZW5kcyBWYWxpZGF0ZWRQYXlsb2FkLFxuICA+KFxuICAgIG9ic2VydmVyOiBFdmVudFNvdXJjZU9ic2VydmVyPEV2ZW50U291cmNlUGF5bG9hZD4sXG4gICAgcGF5bG9hZElEPzogUGF5bG9hZElkZW50aXR5LFxuICApID0+IHZvaWQ7XG4gIHJlYWRvbmx5IG9ic2VydmVFdmVudFNvdXJjZUVycm9yOiA8XG4gICAgRXZlbnRTb3VyY2VQYXlsb2FkIGV4dGVuZHMgSWRlbnRpZmlhYmxlUGF5bG9hZCxcbiAgPihcbiAgICBvYnNlcnZlcjogRXZlbnRTb3VyY2VFcnJvck9ic2VydmVyPEV2ZW50U291cmNlUGF5bG9hZD4sXG4gICAgcGF5bG9hZElEPzogUGF5bG9hZElkZW50aXR5IHwgUGF5bG9hZFNlcnZpY2UsXG4gICkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFdmVudFNvdXJjZVNlcnZpY2U8XG4gIEV2ZW50U291cmNlUGF5bG9hZCBleHRlbmRzIFZhbGlkYXRlZFBheWxvYWQsXG4+IGV4dGVuZHMgUGF5bG9hZFNlcnZpY2Uge1xuICByZWFkb25seSBpc0V2ZW50U291cmNlUGF5bG9hZDogKFxuICAgIHJhd0pTT046IHVua25vd24sXG4gICkgPT4gcmF3SlNPTiBpcyBFdmVudFNvdXJjZVBheWxvYWQ7XG4gIHJlYWRvbmx5IHByZXBhcmVFdmVudFNvdXJjZVBheWxvYWQ6IChyYXdKU09OOiB1bmtub3duKSA9PiBFdmVudFNvdXJjZVBheWxvYWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0V2ZW50U291cmNlU2VydmljZTxcbiAgRXZlbnRTb3VyY2VQYXlsb2FkIGV4dGVuZHMgVmFsaWRhdGVkUGF5bG9hZCxcbj4obzogdW5rbm93bik6IG8gaXMgRXZlbnRTb3VyY2VTZXJ2aWNlPEV2ZW50U291cmNlUGF5bG9hZD4ge1xuICBjb25zdCBpc1R5cGUgPSBzYWZldHkudHlwZUd1YXJkPEV2ZW50U291cmNlU2VydmljZTxFdmVudFNvdXJjZVBheWxvYWQ+PihcbiAgICBcImlzRXZlbnRTb3VyY2VQYXlsb2FkXCIsXG4gICAgXCJwcmVwYXJlRXZlbnRTb3VyY2VQYXlsb2FkXCIsXG4gICk7XG4gIHJldHVybiBpc1R5cGUobyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRTb3VyY2VPYnNlcnZlcjxcbiAgRXZlbnRTb3VyY2VQYXlsb2FkIGV4dGVuZHMgVmFsaWRhdGVkUGF5bG9hZCxcbj4ge1xuICAoZXNwOiBFdmVudFNvdXJjZVBheWxvYWQsIGVzczogRXZlbnRTb3VyY2VTdHJhdGVneSk6IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRTb3VyY2VFcnJvck9ic2VydmVyPFxuICBFdmVudFNvdXJjZVBheWxvYWQgZXh0ZW5kcyBJZGVudGlmaWFibGVQYXlsb2FkLFxuPiB7XG4gIChcbiAgICBlcnJvcjogRXJyb3IsXG4gICAgZXNwOiBFdmVudFNvdXJjZVBheWxvYWQsXG4gICAgZXNzOiBFdmVudFNvdXJjZVN0cmF0ZWd5LFxuICApOiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZldGNoT2JzZXJ2ZXI8XG4gIEZldGNoUGF5bG9hZCBleHRlbmRzIElkZW50aWZpYWJsZVBheWxvYWQsXG4gIENvbnRleHQsXG4+IHtcbiAgKFxuICAgIGZwOiBGZXRjaFBheWxvYWQsXG4gICAgcmk6IFJlcXVlc3RJbml0LFxuICAgIGN0eDogQ29udGV4dCxcbiAgICBmczogRmV0Y2hTdHJhdGVneSxcbiAgKTogdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGZXRjaFJlc3BvbnNlT2JzZXJ2ZXI8XG4gIEZldGNoUGF5bG9hZCBleHRlbmRzIElkZW50aWZpYWJsZVBheWxvYWQsXG4gIEZldGNoUmVzcFBheWxvYWQgZXh0ZW5kcyBWYWxpZGF0ZWRQYXlsb2FkLFxuICBDb250ZXh0LFxuPiB7XG4gIChcbiAgICBmcnA6IEZldGNoUmVzcFBheWxvYWQsXG4gICAgZnA6IEZldGNoUGF5bG9hZCxcbiAgICBjdHg6IENvbnRleHQsXG4gICAgZnM6IEZldGNoU3RyYXRlZ3ksXG4gICk6IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRmV0Y2hFcnJvck9ic2VydmVyPFxuICBGZXRjaFBheWxvYWQgZXh0ZW5kcyBJZGVudGlmaWFibGVQYXlsb2FkLFxuICBDb250ZXh0LFxuPiB7XG4gIChcbiAgICBlcnJvcjogRXJyb3IsXG4gICAgcmk6IFJlcXVlc3RJbml0LFxuICAgIGZwOiBGZXRjaFBheWxvYWQsXG4gICAgY3R4OiBDb250ZXh0LFxuICAgIGZzOiBGZXRjaFN0cmF0ZWd5LFxuICApOiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZldGNoU3RyYXRlZ3kge1xuICByZWFkb25seSBmZXRjaDogPFxuICAgIEZldGNoUGF5bG9hZCBleHRlbmRzIElkZW50aWZpYWJsZVBheWxvYWQsXG4gICAgRmV0Y2hSZXNwUGF5bG9hZCBleHRlbmRzIFZhbGlkYXRlZFBheWxvYWQsXG4gICAgQ29udGV4dCxcbiAgPihcbiAgICBzYmZlOiBGZXRjaFNlcnZpY2U8RmV0Y2hQYXlsb2FkLCBGZXRjaFJlc3BQYXlsb2FkLCBDb250ZXh0PixcbiAgICBjdHg6IENvbnRleHQsXG4gICkgPT4gdm9pZDtcbiAgcmVhZG9ubHkgb2JzZXJ2ZUZldGNoRXZlbnQ6IDxcbiAgICBGZXRjaFBheWxvYWQgZXh0ZW5kcyBJZGVudGlmaWFibGVQYXlsb2FkLFxuICAgIENvbnRleHQsXG4gID4oXG4gICAgb2JzZXJ2ZXI6IEZldGNoT2JzZXJ2ZXI8RmV0Y2hQYXlsb2FkLCBDb250ZXh0PixcbiAgICBwYXlsb2FkSUQ/OiBQYXlsb2FkSWRlbnRpdHkgfCBQYXlsb2FkU2VydmljZSxcbiAgKSA9PiB2b2lkO1xuICByZWFkb25seSBvYnNlcnZlRmV0Y2hFdmVudFJlc3BvbnNlOiA8XG4gICAgRmV0Y2hQYXlsb2FkIGV4dGVuZHMgSWRlbnRpZmlhYmxlUGF5bG9hZCxcbiAgICBGZXRjaFJlc3BQYXlsb2FkIGV4dGVuZHMgVmFsaWRhdGVkUGF5bG9hZCxcbiAgICBDb250ZXh0LFxuICA+KFxuICAgIG9ic2VydmVyOiBGZXRjaFJlc3BvbnNlT2JzZXJ2ZXI8XG4gICAgICBGZXRjaFBheWxvYWQsXG4gICAgICBGZXRjaFJlc3BQYXlsb2FkLFxuICAgICAgQ29udGV4dFxuICAgID4sXG4gICAgcGF5bG9hZElEPzogUGF5bG9hZElkZW50aXR5IHwgUGF5bG9hZFNlcnZpY2UsXG4gICkgPT4gdm9pZDtcbiAgcmVhZG9ubHkgb2JzZXJ2ZUZldGNoRXZlbnRFcnJvcjogPFxuICAgIEZldGNoUGF5bG9hZCBleHRlbmRzIElkZW50aWZpYWJsZVBheWxvYWQsXG4gICAgQ29udGV4dCxcbiAgPihcbiAgICBvYnNlcnZlcjogRmV0Y2hFcnJvck9ic2VydmVyPFxuICAgICAgRmV0Y2hQYXlsb2FkLFxuICAgICAgQ29udGV4dFxuICAgID4sXG4gICAgcGF5bG9hZElEPzogUGF5bG9hZElkZW50aXR5IHwgUGF5bG9hZFNlcnZpY2UsXG4gICkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGZXRjaEluaXQge1xuICByZWFkb25seSBlbmRwb2ludDogc3RyaW5nIHwgUmVxdWVzdCB8IFVSTDtcbiAgcmVhZG9ubHkgcmVxdWVzdEluaXQ6IFJlcXVlc3RJbml0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZldGNoU2VydmljZTxcbiAgRmV0Y2hQYXlsb2FkIGV4dGVuZHMgSWRlbnRpZmlhYmxlUGF5bG9hZCxcbiAgRmV0Y2hSZXNwUGF5bG9hZCBleHRlbmRzIFZhbGlkYXRlZFBheWxvYWQsXG4gIENvbnRleHQsXG4+IHtcbiAgcmVhZG9ubHkgZmV0Y2g6IChzYjogRmV0Y2hTdHJhdGVneSwgY3R4OiBDb250ZXh0KSA9PiB2b2lkO1xuICByZWFkb25seSBwcmVwYXJlRmV0Y2hDb250ZXh0OiAoY3R4OiBDb250ZXh0LCBzYjogRmV0Y2hTdHJhdGVneSkgPT4gQ29udGV4dDtcbiAgcmVhZG9ubHkgcHJlcGFyZUZldGNoUGF5bG9hZDogKFxuICAgIGN0eDogQ29udGV4dCxcbiAgICBmczogRmV0Y2hTdHJhdGVneSxcbiAgKSA9PiBGZXRjaFBheWxvYWQ7XG4gIHJlYWRvbmx5IHByZXBhcmVGZXRjaFJlc3BvbnNlUGF5bG9hZDogKFxuICAgIGZwOiBGZXRjaFBheWxvYWQsXG4gICAgZmV0Y2hSZXNwUmF3SlNPTjogdW5rbm93bixcbiAgICBjdHg6IENvbnRleHQsXG4gICAgZnM6IEZldGNoU3RyYXRlZ3ksXG4gICkgPT4gRmV0Y2hSZXNwUGF5bG9hZDtcbiAgcmVhZG9ubHkgcHJlcGFyZUZldGNoOiAoXG4gICAgYmFzZVVSTDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIHBheWxvYWQ6IEZldGNoUGF5bG9hZCxcbiAgICBjdHg6IENvbnRleHQsXG4gICAgZnM6IEZldGNoU3RyYXRlZ3ksXG4gICkgPT4gRmV0Y2hJbml0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNGZXRjaFNlcnZpY2U8XG4gIEZldGNoUGF5bG9hZCBleHRlbmRzIElkZW50aWZpYWJsZVBheWxvYWQsXG4gIEZldGNoUmVzcFBheWxvYWQgZXh0ZW5kcyBWYWxpZGF0ZWRQYXlsb2FkLFxuICBDb250ZXh0LFxuPihvOiB1bmtub3duKTogbyBpcyBGZXRjaFNlcnZpY2U8RmV0Y2hQYXlsb2FkLCBGZXRjaFJlc3BQYXlsb2FkLCBDb250ZXh0PiB7XG4gIGNvbnN0IGlzVHlwZSA9IHNhZmV0eS50eXBlR3VhcmQ8XG4gICAgRmV0Y2hTZXJ2aWNlPEZldGNoUGF5bG9hZCwgRmV0Y2hSZXNwUGF5bG9hZCwgQ29udGV4dD5cbiAgPihcbiAgICBcImZldGNoXCIsXG4gICAgXCJwcmVwYXJlRmV0Y2hDb250ZXh0XCIsXG4gICAgXCJwcmVwYXJlRmV0Y2hQYXlsb2FkXCIsXG4gICAgXCJwcmVwYXJlRmV0Y2hcIixcbiAgICBcInByZXBhcmVGZXRjaFJlc3BvbnNlUGF5bG9hZFwiLFxuICApO1xuICByZXR1cm4gaXNUeXBlKG8pO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdlYlNvY2tldFNlbmRPYnNlcnZlcjxcbiAgU2VuZFBheWxvYWQgZXh0ZW5kcyBJZGVudGlmaWFibGVQYXlsb2FkLFxuICBDb250ZXh0LFxuPiB7XG4gICh3c3A6IFNlbmRQYXlsb2FkLCBjdHg6IENvbnRleHQsIHdzczogV2ViU29ja2V0U3RyYXRlZ3kpOiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdlYlNvY2tldFJlY2VpdmVPYnNlcnZlcjxcbiAgUmVjZWl2ZVBheWxvYWQgZXh0ZW5kcyBWYWxpZGF0ZWRQYXlsb2FkLFxuPiB7XG4gIChwYXlsb2FkOiBSZWNlaXZlUGF5bG9hZCwgd3NzOiBXZWJTb2NrZXRTdHJhdGVneSk6IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2ViU29ja2V0RXJyb3JPYnNlcnZlcjxcbiAgV2ViU29ja2V0UGF5bG9hZCBleHRlbmRzIElkZW50aWZpYWJsZVBheWxvYWQsXG4+IHtcbiAgKFxuICAgIGVycm9yOiBFcnJvcixcbiAgICB3c3A6IFdlYlNvY2tldFBheWxvYWQgfCB1bmRlZmluZWQsXG4gICAgd3NzOiBXZWJTb2NrZXRTdHJhdGVneSxcbiAgKTogdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXZWJTb2NrZXRTdHJhdGVneSB7XG4gIHJlYWRvbmx5IHdlYlNvY2tldFNlbmQ6IDxTZW5kUGF5bG9hZCBleHRlbmRzIElkZW50aWZpYWJsZVBheWxvYWQsIENvbnRleHQ+KFxuICAgIGN0eDogQ29udGV4dCxcbiAgICB3c3M6IFdlYlNvY2tldFNlbmRTZXJ2aWNlPFNlbmRQYXlsb2FkPixcbiAgKSA9PiB2b2lkO1xuICByZWFkb25seSBwcmVwYXJlV2ViU29ja2V0UmVjZWl2ZVBheWxvYWQ6IDxSZWNlaXZlUGF5bG9hZD4oXG4gICAgd2ViU29ja2V0UmVjZWl2ZVJhdzogc3RyaW5nIHwgQXJyYXlCdWZmZXJMaWtlIHwgQmxvYiB8IEFycmF5QnVmZmVyVmlldyxcbiAgKSA9PiBSZWNlaXZlUGF5bG9hZDtcbiAgcmVhZG9ubHkgb2JzZXJ2ZVdlYlNvY2tldFNlbmRFdmVudDogPFxuICAgIFNlbmRQYXlsb2FkIGV4dGVuZHMgSWRlbnRpZmlhYmxlUGF5bG9hZCxcbiAgICBDb250ZXh0LFxuICA+KFxuICAgIG9ic2VydmVyOiBXZWJTb2NrZXRTZW5kT2JzZXJ2ZXI8U2VuZFBheWxvYWQsIENvbnRleHQ+LFxuICAgIHBheWxvYWRJRD86IFBheWxvYWRJZGVudGl0eSB8IFBheWxvYWRTZXJ2aWNlLFxuICApID0+IHZvaWQ7XG4gIHJlYWRvbmx5IG9ic2VydmVXZWJTb2NrZXRSZWNlaXZlRXZlbnQ6IDxcbiAgICBSZWNlaXZlUGF5bG9hZCBleHRlbmRzIFZhbGlkYXRlZFBheWxvYWQsXG4gID4oXG4gICAgb2JzZXJ2ZXI6IFdlYlNvY2tldFJlY2VpdmVPYnNlcnZlcjxSZWNlaXZlUGF5bG9hZD4sXG4gICAgcGF5bG9hZElEPzogUGF5bG9hZElkZW50aXR5IHwgUGF5bG9hZFNlcnZpY2UsXG4gICkgPT4gdm9pZDtcbiAgcmVhZG9ubHkgb2JzZXJ2ZVdlYlNvY2tldEVycm9yRXZlbnQ6IDxQYXlsb2FkIGV4dGVuZHMgSWRlbnRpZmlhYmxlUGF5bG9hZD4oXG4gICAgb2JzZXJ2ZXI6IFdlYlNvY2tldEVycm9yT2JzZXJ2ZXI8UGF5bG9hZD4sXG4gICAgcGF5bG9hZElEPzogUGF5bG9hZElkZW50aXR5IHwgUGF5bG9hZFNlcnZpY2UsXG4gICkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXZWJTb2NrZXRTZW5kU2VydmljZTxcbiAgU2VuZFBheWxvYWQgZXh0ZW5kcyBJZGVudGlmaWFibGVQYXlsb2FkLFxuPiBleHRlbmRzIFBheWxvYWRTZXJ2aWNlIHtcbiAgcmVhZG9ubHkgd2ViU29ja2V0U2VuZDogKHNiOiBXZWJTb2NrZXRTdHJhdGVneSkgPT4gdm9pZDtcbiAgcmVhZG9ubHkgcHJlcGFyZVdlYlNvY2tldFNlbmRQYXlsb2FkOiA8Q29udGV4dD4oXG4gICAgY3R4OiBDb250ZXh0LFxuICAgIHdzczogV2ViU29ja2V0U3RyYXRlZ3ksXG4gICkgPT4gU2VuZFBheWxvYWQ7XG4gIHJlYWRvbmx5IHByZXBhcmVXZWJTb2NrZXRTZW5kOiAoXG4gICAgcGF5bG9hZDogU2VuZFBheWxvYWQsXG4gICAgd3NzOiBXZWJTb2NrZXRTdHJhdGVneSxcbiAgKSA9PiBzdHJpbmcgfCBBcnJheUJ1ZmZlckxpa2UgfCBCbG9iIHwgQXJyYXlCdWZmZXJWaWV3O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXZWJTb2NrZXRTZW5kU2VydmljZTxcbiAgU2VuZFBheWxvYWQgZXh0ZW5kcyBJZGVudGlmaWFibGVQYXlsb2FkLFxuPihvOiB1bmtub3duKTogbyBpcyBXZWJTb2NrZXRTZW5kU2VydmljZTxTZW5kUGF5bG9hZD4ge1xuICBjb25zdCBpc1R5cGUgPSBzYWZldHkudHlwZUd1YXJkPFdlYlNvY2tldFNlbmRTZXJ2aWNlPFNlbmRQYXlsb2FkPj4oXG4gICAgXCJ3ZWJTb2NrZXRTZW5kXCIsXG4gICAgXCJwcmVwYXJlV2ViU29ja2V0U2VuZFBheWxvYWRcIixcbiAgICBcInByZXBhcmVXZWJTb2NrZXRTZW5kXCIsXG4gICk7XG4gIHJldHVybiBpc1R5cGUobyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2ViU29ja2V0UmVjZWl2ZVNlcnZpY2U8XG4gIFJlY2VpdmVQYXlsb2FkIGV4dGVuZHMgSWRlbnRpZmlhYmxlUGF5bG9hZCxcbj4gZXh0ZW5kcyBQYXlsb2FkU2VydmljZSB7XG4gIHJlYWRvbmx5IGlzV2ViU29ja2V0UmVjZWl2ZVBheWxvYWQ6IChcbiAgICByYXdKU09OOiB1bmtub3duLFxuICApID0+IHJhd0pTT04gaXMgUmVjZWl2ZVBheWxvYWQ7XG4gIHJlYWRvbmx5IHByZXBhcmVXZWJTb2NrZXRSZWNlaXZlUGF5bG9hZDogKHJhd0pTT046IHVua25vd24pID0+IFJlY2VpdmVQYXlsb2FkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXZWJTb2NrZXRSZWNlaXZlU2VydmljZTxcbiAgUmVjZWl2ZVBheWxvYWQgZXh0ZW5kcyBJZGVudGlmaWFibGVQYXlsb2FkLFxuPihvOiB1bmtub3duKTogbyBpcyBXZWJTb2NrZXRSZWNlaXZlU2VydmljZTxSZWNlaXZlUGF5bG9hZD4ge1xuICBjb25zdCBpc1R5cGUgPSBzYWZldHkudHlwZUd1YXJkPFdlYlNvY2tldFJlY2VpdmVTZXJ2aWNlPFJlY2VpdmVQYXlsb2FkPj4oXG4gICAgXCJpc1dlYlNvY2tldFJlY2VpdmVQYXlsb2FkXCIsXG4gICAgXCJwcmVwYXJlV2ViU29ja2V0UmVjZWl2ZVBheWxvYWRcIixcbiAgKTtcbiAgcmV0dXJuIGlzVHlwZShvKTtcbn1cbiIsImV4cG9ydCBpbnRlcmZhY2UgQ29ubmVjdGlvblZhbGlkYXRvciB7XG4gIHJlYWRvbmx5IHZhbGlkYXRpb25FbmRwb2ludFVSTDogc3RyaW5nIHwgVVJMIHwgUmVxdWVzdDtcbiAgcmVhZG9ubHkgdmFsaWRhdGU6IChycz86IFJlY29ubmVjdGlvblN0cmF0ZWd5KSA9PiBQcm9taXNlPFJlc3BvbnNlPjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR5cGljYWxDb25uZWN0aW9uVmFsaWRhdG9yKFxuICBwaW5nVVJMOiBzdHJpbmcgfCBVUkwgfCBSZXF1ZXN0LFxuKTogQ29ubmVjdGlvblZhbGlkYXRvciB7XG4gIHJldHVybiB7XG4gICAgdmFsaWRhdGlvbkVuZHBvaW50VVJMOiBwaW5nVVJMLFxuICAgIHZhbGlkYXRlOiAoKSA9PiB7XG4gICAgICByZXR1cm4gZmV0Y2gocGluZ1VSTCwgeyBtZXRob2Q6IFwiSEVBRFwiIH0pO1xuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVjb25uZWN0aW9uU3RhdGVDaGFuZ2VOb3RpZmljYXRpb24ge1xuICAoXG4gICAgYWN0aXZlOiBSZWNvbm5lY3Rpb25TdGF0ZSxcbiAgICBwcmV2aW91czogUmVjb25uZWN0aW9uU3RhdGUsXG4gICAgc3RhdGVneTogUmVjb25uZWN0aW9uU3RyYXRlZ3ksXG4gICk6IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVjb25uZWN0aW9uU3RyYXRlZ3lPcHRpb25zIHtcbiAgcmVhZG9ubHkgaW50ZXJ2YWxNaWxsZWNzPzogbnVtYmVyO1xuICByZWFkb25seSBtYXhBdHRlbXB0cz86IG51bWJlcjtcbiAgcmVhZG9ubHkgb25TdGF0ZUNoYW5nZT86IFJlY29ubmVjdGlvblN0YXRlQ2hhbmdlTm90aWZpY2F0aW9uO1xufVxuXG5leHBvcnQgZW51bSBSZWNvbm5lY3Rpb25TdGF0ZSB7XG4gIElETEUgPSBcImlkbGVcIixcbiAgVFJZSU5HID0gXCJ0cnlpbmdcIixcbiAgQ09NUExFVEVEID0gXCJjb21wbGV0ZWRcIixcbiAgQUJPUlRFRCA9IFwiYWJvcnRlZFwiLFxufVxuXG5leHBvcnQgY2xhc3MgUmVjb25uZWN0aW9uU3RyYXRlZ3kge1xuICByZWFkb25seSBtYXhBdHRlbXB0czogbnVtYmVyO1xuICByZWFkb25seSBpbnRlcnZhbE1pbGxlY3M6IG51bWJlcjtcbiAgcmVhZG9ubHkgb25TdGF0ZUNoYW5nZT86IFJlY29ubmVjdGlvblN0YXRlQ2hhbmdlTm90aWZpY2F0aW9uO1xuICAjc3RhdGU6IFJlY29ubmVjdGlvblN0YXRlID0gUmVjb25uZWN0aW9uU3RhdGUuSURMRTtcbiAgI2F0dGVtcHQgPSAwO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBSZWNvbm5lY3Rpb25TdHJhdGVneU9wdGlvbnMpIHtcbiAgICB0aGlzLm1heEF0dGVtcHRzID0gb3B0aW9ucz8ubWF4QXR0ZW1wdHMgPz8gMTU7XG4gICAgdGhpcy5pbnRlcnZhbE1pbGxlY3MgPSBvcHRpb25zPy5pbnRlcnZhbE1pbGxlY3MgPz8gMTAwMDtcbiAgICB0aGlzLm9uU3RhdGVDaGFuZ2UgPSBvcHRpb25zPy5vblN0YXRlQ2hhbmdlO1xuICB9XG5cbiAgZ2V0IGlzVHJ5aW5nKCkge1xuICAgIHJldHVybiB0aGlzLiNzdGF0ZSA9PSBSZWNvbm5lY3Rpb25TdGF0ZS5UUllJTkc7XG4gIH1cblxuICBnZXQgaXNBYm9ydGVkKCkge1xuICAgIHJldHVybiB0aGlzLiNzdGF0ZSA9PSBSZWNvbm5lY3Rpb25TdGF0ZS5BQk9SVEVEO1xuICB9XG5cbiAgZ2V0IGF0dGVtcHQoKSB7XG4gICAgcmV0dXJuIHRoaXMuI2F0dGVtcHQ7XG4gIH1cblxuICBnZXQgc3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuI3N0YXRlO1xuICB9XG5cbiAgc2V0IHN0YXRlKHZhbHVlKSB7XG4gICAgY29uc3QgcHJldmlvdXNTdGF0dXMgPSB0aGlzLiNzdGF0ZTtcbiAgICB0aGlzLiNzdGF0ZSA9IHZhbHVlO1xuICAgIHRoaXMub25TdGF0ZUNoYW5nZT8uKHRoaXMuI3N0YXRlLCBwcmV2aW91c1N0YXR1cywgdGhpcyk7XG4gIH1cblxuICByZWNvbm5lY3QoKSB7XG4gICAgdGhpcy4jYXR0ZW1wdCsrO1xuICAgIGlmICh0aGlzLiNhdHRlbXB0ID4gdGhpcy5tYXhBdHRlbXB0cykge1xuICAgICAgdGhpcy5jb21wbGV0ZWQoUmVjb25uZWN0aW9uU3RhdGUuQUJPUlRFRCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3RhdGUgPSBSZWNvbm5lY3Rpb25TdGF0ZS5UUllJTkc7XG4gICAgfVxuICAgIHJldHVybiB0aGlzOyAvLyByZXR1cm4gJ3RoaXMnIHRvIGVuY291cmFnZSBtZXRob2QgY2hhaW5pbmdcbiAgfVxuXG4gIGNvbXBsZXRlZChzdGF0dXMgPSBSZWNvbm5lY3Rpb25TdGF0ZS5DT01QTEVURUQpIHtcbiAgICB0aGlzLnN0YXRlID0gc3RhdHVzO1xuICAgIHJldHVybiB0aGlzOyAvLyByZXR1cm4gJ3RoaXMnIHRvIGVuY291cmFnZSBtZXRob2QgY2hhaW5pbmdcbiAgfVxufVxuIiwiaW1wb3J0ICogYXMgYyBmcm9tIFwiLi9jb25uZWN0aW9uLnRzXCI7XG5pbXBvcnQgKiBhcyBzYWZldHkgZnJvbSBcIi4uLy4uL3NhZmV0eS9tb2QudHNcIjtcblxuLy8gVXNpbmcgU2VydmVyIFNlbnQgRXZlbnRzIChTU0VzIG9yIFwiRXZlbnRTb3VyY2VcIikgb24gYW55dGhpbmcgYnV0IEhUVFAvMiBjb25uZWN0aW9ucyBpcyBub3QgcmVjb21tZW5kZWQuXG4vLyBTZWUgW0V2ZW50U291cmNlXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvRXZlbnRTb3VyY2UpIHdhcm5pbmcgc2VjdGlvbi5cbi8vIFNlZSBbRXZlbnRTb3VyY2U6IHdoeSBubyBtb3JlIHRoYW4gNiBjb25uZWN0aW9ucz9dKGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE2ODUyNjkwL3NzZWV2ZW50c291cmNlLXdoeS1uby1tb3JlLXRoYW4tNi1jb25uZWN0aW9ucykuXG5cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRTb3VyY2VDb25uZWN0aW9uU3RhdGUge1xuICByZWFkb25seSBpc0Nvbm5lY3Rpb25TdGF0ZTogdHJ1ZTtcbiAgcmVhZG9ubHkgaXNIZWFsdGh5PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFdmVudFNvdXJjZUNvbm5lY3Rpb25IZWFsdGh5XG4gIGV4dGVuZHMgRXZlbnRTb3VyY2VDb25uZWN0aW9uU3RhdGUge1xuICByZWFkb25seSBpc0hlYWx0aHk6IHRydWU7XG4gIHJlYWRvbmx5IGNvbm5Fc3RhYmxpc2hlZE9uOiBEYXRlO1xuICByZWFkb25seSBlbmRwb2ludFVSTDogc3RyaW5nO1xuICByZWFkb25seSBwaW5nVVJMOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBpc0V2ZW50U291cmNlQ29ubmVjdGlvbkhlYWx0aHkgPSBzYWZldHkudHlwZUd1YXJkPFxuICBFdmVudFNvdXJjZUNvbm5lY3Rpb25IZWFsdGh5XG4+KFwiaXNIZWFsdGh5XCIsIFwiY29ubkVzdGFibGlzaGVkT25cIik7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRTb3VyY2VDb25uZWN0aW9uVW5oZWFsdGh5XG4gIGV4dGVuZHMgRXZlbnRTb3VyY2VDb25uZWN0aW9uU3RhdGUge1xuICByZWFkb25seSBpc0hlYWx0aHk6IGZhbHNlO1xuICByZWFkb25seSBjb25uRmFpbGVkT246IERhdGU7XG4gIHJlYWRvbmx5IHJlY29ubmVjdFN0cmF0ZWd5PzogYy5SZWNvbm5lY3Rpb25TdHJhdGVneTtcbn1cblxuZXhwb3J0IGNvbnN0IGlzRXZlbnRTb3VyY2VDb25uZWN0aW9uVW5oZWFsdGh5ID0gc2FmZXR5LnR5cGVHdWFyZDxcbiAgRXZlbnRTb3VyY2VDb25uZWN0aW9uVW5oZWFsdGh5XG4+KFwiaXNIZWFsdGh5XCIsIFwiY29ubkZhaWxlZE9uXCIpO1xuXG5leHBvcnQgY29uc3QgaXNFdmVudFNvdXJjZVJlY29ubmVjdGluZyA9IHNhZmV0eS50eXBlR3VhcmQ8XG4gIEV2ZW50U291cmNlQ29ubmVjdGlvblVuaGVhbHRoeVxuPihcImlzSGVhbHRoeVwiLCBcImNvbm5GYWlsZWRPblwiLCBcInJlY29ubmVjdFN0cmF0ZWd5XCIpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50U291cmNlRXJyb3IgZXh0ZW5kcyBFdmVudFNvdXJjZUNvbm5lY3Rpb25VbmhlYWx0aHkge1xuICByZWFkb25seSBpc0V2ZW50U291cmNlRXJyb3I6IHRydWU7XG4gIHJlYWRvbmx5IGVycm9yRXZlbnQ6IEV2ZW50O1xufVxuXG5leHBvcnQgY29uc3QgaXNFdmVudFNvdXJjZUVycm9yID0gc2FmZXR5LnR5cGVHdWFyZDxcbiAgRXZlbnRTb3VyY2VFcnJvclxuPihcImlzRXZlbnRTb3VyY2VFcnJvclwiLCBcImVycm9yRXZlbnRcIik7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRTb3VyY2VFbmRwb2ludFVuYXZhaWxhYmxlIHtcbiAgcmVhZG9ubHkgaXNFbmRwb2ludFVuYXZhaWxhYmxlOiB0cnVlO1xuICByZWFkb25seSBlbmRwb2ludFVSTDogc3RyaW5nO1xuICByZWFkb25seSBwaW5nVVJMOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGh0dHBTdGF0dXM/OiBudW1iZXI7XG4gIHJlYWRvbmx5IGh0dHBTdGF0dXNUZXh0Pzogc3RyaW5nO1xuICByZWFkb25seSBjb25uZWN0aW9uRXJyb3I/OiBFcnJvcjtcbn1cblxuZXhwb3J0IGNvbnN0IGlzRXZlbnRTb3VyY2VFbmRwb2ludFVuYXZhaWxhYmxlID0gc2FmZXR5LnR5cGVHdWFyZDxcbiAgRXZlbnRTb3VyY2VFbmRwb2ludFVuYXZhaWxhYmxlXG4+KFwiaXNFbmRwb2ludFVuYXZhaWxhYmxlXCIsIFwiZW5kcG9pbnRVUkxcIik7XG5cbi8qKlxuICogRXZlbnRTb3VyY2VGYWN0b3J5IHdpbGwgYmUgY2FsbGVkIHVwb24gZWFjaCBjb25uZWN0aW9uIG9mIEVTLiBJdCdzIGltcG9ydGFudFxuICogdGhhdCB0aGlzIGZhY3Rvcnkgc2V0dXAgdGhlIGZ1bGwgRXZlbnRTb3VyY2UsIGluY2x1ZGluZyBhbnkgb25tZXNzYWdlIG9yXG4gKiBldmVudCBsaXN0ZW5lcnMgYmVjYXVzZSByZWNvbm5lY3Rpb25zIHdpbGwgY2xvc2UgcHJldmlvdXMgRVNzIGFuZCByZWNyZWF0ZVxuICogdGhlIEV2ZW50U291cmNlIGV2ZXJ5IHRpbWUgYSBjb25uZWN0aW9uIGlzIFwiYnJva2VuXCIuXG4gKlxuICogV2UncmUgdXNpbmcgYSBnZW5lcmljIEV2ZW50U291cmNlIGJlY2F1c2Ugd2UgYnVpbGQgaW4gRGVubyBidXQgRGVubyBkb2Vzbid0XG4gKiBrbm93IHdoYXQgYW4gRXZlbnRTb3VyY2UgaXMgKGl0J3Mga25vd24gaW4gYnJvd3NlcnMpLiBUaGlzIGRpZCBub3Qgd29yazpcbiAqICAgICAvLy8gPHJlZmVyZW5jZSBsaWI9XCJkb21cIiAvPlxuICogbm90ZTogPHJlZmVyZW5jZSBsaWI9XCJkb21cIiAvPiB3b3JrcyBpbiBWUyBDb2RlIGJ1dCBjcmVhdGVkIERlbm8uZW1pdCgpIGFuZFxuICogJ3BhdGgtdGFzayBidW5kbGUtYWxsJyBlcnJvcnMuXG4gKiBUT0RPOiBmaWd1cmUgb3V0IGhvdyB0byBub3QgdXNlIEV2ZW50U291cmNlIGdlbmVyaWMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRTb3VyY2VGYWN0b3J5PEV2ZW50U291cmNlPiB7XG4gIGNvbnN0cnVjdDogKGVzVVJMOiBzdHJpbmcpID0+IEV2ZW50U291cmNlO1xuICBjb25uZWN0ZWQ/OiAoZXM6IEV2ZW50U291cmNlKSA9PiB2b2lkO1xufVxuXG5pbnRlcmZhY2UgQ29ubmVjdGlvblN0YXRlQ2hhbmdlTm90aWZpY2F0aW9uIHtcbiAgKFxuICAgIGFjdGl2ZTogRXZlbnRTb3VyY2VDb25uZWN0aW9uU3RhdGUsXG4gICAgcHJldmlvdXM6IEV2ZW50U291cmNlQ29ubmVjdGlvblN0YXRlLFxuICAgIHR1bm5lbDogRXZlbnRTb3VyY2VUdW5uZWwsXG4gICk6IHZvaWQ7XG59XG5cbmludGVyZmFjZSBSZWNvbm5lY3Rpb25TdGF0ZUNoYW5nZU5vdGlmaWNhdGlvbiB7XG4gIChcbiAgICBhY3RpdmU6IGMuUmVjb25uZWN0aW9uU3RhdGUsXG4gICAgcHJldmlvdXM6IGMuUmVjb25uZWN0aW9uU3RhdGUsXG4gICAgcnM6IGMuUmVjb25uZWN0aW9uU3RyYXRlZ3ksXG4gICAgdHVubmVsOiBFdmVudFNvdXJjZVR1bm5lbCxcbiAgKTogdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFdmVudFNvdXJjZVN0YXRlSW5pdDxFdmVudFNvdXJjZT4ge1xuICByZWFkb25seSBlc1VSTDogc3RyaW5nO1xuICByZWFkb25seSBlc0VuZHBvaW50VmFsaWRhdG9yOiBjLkNvbm5lY3Rpb25WYWxpZGF0b3I7XG4gIHJlYWRvbmx5IHVzZXJBZ2VudEZpbmdlcnByaW50OiBzdHJpbmc7XG4gIHJlYWRvbmx5IGV2ZW50U291cmNlRmFjdG9yeTogRXZlbnRTb3VyY2VGYWN0b3J5PEV2ZW50U291cmNlPjtcbiAgcmVhZG9ubHkgb3B0aW9ucz86IHtcbiAgICByZWFkb25seSBvbkNvbm5TdGF0ZUNoYW5nZT86IENvbm5lY3Rpb25TdGF0ZUNoYW5nZU5vdGlmaWNhdGlvbjtcbiAgICByZWFkb25seSBvblJlY29ublN0YXRlQ2hhbmdlPzogUmVjb25uZWN0aW9uU3RhdGVDaGFuZ2VOb3RpZmljYXRpb247XG4gIH07XG59XG5cbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG5leHBvcnQgY2xhc3MgRXZlbnRTb3VyY2VUdW5uZWw8RXZlbnRTb3VyY2UgPSBhbnk+IHtcbiAgcmVhZG9ubHkgZXNVUkw6IHN0cmluZztcbiAgcmVhZG9ubHkgZXNFbmRwb2ludFZhbGlkYXRvcjogYy5Db25uZWN0aW9uVmFsaWRhdG9yO1xuICByZWFkb25seSBvYnNlcnZlclVuaXZlcnNhbFNjb3BlSUQ6IFwidW5pdmVyc2FsXCIgPSBcInVuaXZlcnNhbFwiO1xuICByZWFkb25seSBldmVudFNvdXJjZUZhY3Rvcnk6IEV2ZW50U291cmNlRmFjdG9yeTxFdmVudFNvdXJjZT47XG4gIHJlYWRvbmx5IG9uQ29ublN0YXRlQ2hhbmdlPzogQ29ubmVjdGlvblN0YXRlQ2hhbmdlTm90aWZpY2F0aW9uO1xuICByZWFkb25seSBvblJlY29ublN0YXRlQ2hhbmdlPzogUmVjb25uZWN0aW9uU3RhdGVDaGFuZ2VOb3RpZmljYXRpb247XG5cbiAgLy8gaXNIZWFsdGh5IGNhbiBiZSB0cnVlIG9yIGZhbHNlIGZvciBrbm93biBzdGF0ZXMsIG9yIHVuZGVmaW5lZCBhdCBpbml0XG4gIC8vIGZvciBcInVua25vd25cIiBzdGF0ZVxuICAjY29ubmVjdGlvblN0YXRlOiBFdmVudFNvdXJjZUNvbm5lY3Rpb25TdGF0ZSA9IHsgaXNDb25uZWN0aW9uU3RhdGU6IHRydWUgfTtcbiAgI3JlY29ublN0cmF0ZWd5PzogYy5SZWNvbm5lY3Rpb25TdHJhdGVneTtcblxuICBjb25zdHJ1Y3Rvcihpbml0OiBFdmVudFNvdXJjZVN0YXRlSW5pdDxFdmVudFNvdXJjZT4pIHtcbiAgICB0aGlzLmVzVVJMID0gaW5pdC5lc1VSTDtcbiAgICB0aGlzLmVzRW5kcG9pbnRWYWxpZGF0b3IgPSBpbml0LmVzRW5kcG9pbnRWYWxpZGF0b3I7XG4gICAgdGhpcy5ldmVudFNvdXJjZUZhY3RvcnkgPSBpbml0LmV2ZW50U291cmNlRmFjdG9yeTtcbiAgICB0aGlzLm9uQ29ublN0YXRlQ2hhbmdlID0gaW5pdC5vcHRpb25zPy5vbkNvbm5TdGF0ZUNoYW5nZTtcbiAgICB0aGlzLm9uUmVjb25uU3RhdGVDaGFuZ2UgPSBpbml0Lm9wdGlvbnM/Lm9uUmVjb25uU3RhdGVDaGFuZ2U7XG4gIH1cblxuICBpc1JlY29ubmVjdGluZygpOiBjLlJlY29ubmVjdGlvblN0cmF0ZWd5IHwgZmFsc2Uge1xuICAgIHJldHVybiB0aGlzLiNyZWNvbm5TdHJhdGVneSA/IHRoaXMuI3JlY29ublN0cmF0ZWd5IDogZmFsc2U7XG4gIH1cblxuICBpc1JlY29ubmVjdEFib3J0ZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuI3JlY29ublN0cmF0ZWd5ICYmIHRoaXMuI3JlY29ublN0cmF0ZWd5LmlzQWJvcnRlZFxuICAgICAgPyB0cnVlXG4gICAgICA6IGZhbHNlO1xuICB9XG5cbiAgY29ubmVjdGVkKGVzOiBFdmVudFNvdXJjZSwgY29ublN0YXRlOiBFdmVudFNvdXJjZUNvbm5lY3Rpb25IZWFsdGh5KSB7XG4gICAgaWYgKHRoaXMuI3JlY29ublN0cmF0ZWd5KSB0aGlzLiNyZWNvbm5TdHJhdGVneS5jb21wbGV0ZWQoKTtcbiAgICB0aGlzLmV2ZW50U291cmNlRmFjdG9yeS5jb25uZWN0ZWQ/Lihlcyk7XG5cbiAgICAvLyB1cGRhdGUgbWVzc2FnZXMgYW5kIGxpc3RlbmVycyBhcyB0byBvdXIgbmV3IHN0YXRlOyBhdCB0aGlzIHBvaW50IHRoZVxuICAgIC8vIHJlY29ubmVjdGlvbiBzdGF0ZSBpbiB0aGlzLiNyZWNvbm5TdHJhdGVneSBpcyBhdmFpbGFibGVcbiAgICB0aGlzLmNvbm5lY3Rpb25TdGF0ZSA9IGNvbm5TdGF0ZTtcblxuICAgIC8vIG5vdyByZXNldCB0aGUgcmVjb25uZWN0aW9uIHN0cmF0ZWd5IGJlY2F1c2UgbWVzc2FnZXMgYXJlIHVwZGF0ZWRcbiAgICB0aGlzLiNyZWNvbm5TdHJhdGVneSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByZXBhcmVSZWNvbm5lY3QoY29ublN0YXRlOiBFdmVudFNvdXJjZUNvbm5lY3Rpb25VbmhlYWx0aHkpIHtcbiAgICB0aGlzLiNyZWNvbm5TdHJhdGVneSA9IHRoaXMuI3JlY29ublN0cmF0ZWd5ID8/IG5ldyBjLlJlY29ubmVjdGlvblN0cmF0ZWd5KHtcbiAgICAgIG9uU3RhdGVDaGFuZ2U6IHRoaXMub25SZWNvbm5TdGF0ZUNoYW5nZVxuICAgICAgICA/IChhY3RpdmUsIHByZXZpb3VzLCBycykgPT4ge1xuICAgICAgICAgIHRoaXMub25SZWNvbm5TdGF0ZUNoYW5nZT8uKGFjdGl2ZSwgcHJldmlvdXMsIHJzLCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICA6IHVuZGVmaW5lZCxcbiAgICB9KTtcbiAgICBjb25uU3RhdGUgPSB7XG4gICAgICAuLi5jb25uU3RhdGUsXG4gICAgICByZWNvbm5lY3RTdHJhdGVneTogdGhpcy4jcmVjb25uU3RyYXRlZ3ksXG4gICAgfTtcbiAgICB0aGlzLmNvbm5lY3Rpb25TdGF0ZSA9IGNvbm5TdGF0ZTtcbiAgICByZXR1cm4gdGhpcy4jcmVjb25uU3RyYXRlZ3kucmVjb25uZWN0KCk7XG4gIH1cblxuICBpbml0KCkge1xuICAgIGlmICh0aGlzLmlzUmVjb25uZWN0QWJvcnRlZCgpKSByZXR1cm47XG5cbiAgICB0aGlzLmVzRW5kcG9pbnRWYWxpZGF0b3IudmFsaWRhdGUodGhpcy4jcmVjb25uU3RyYXRlZ3kpLnRoZW4oKHJlc3ApID0+IHtcbiAgICAgIGlmIChyZXNwLm9rKSB7XG4gICAgICAgIC8vIHRoaXMuZXZlbnRTb3VyY2VGYWN0b3J5KCkgc2hvdWxkIGFzc2lnbiBvbm1lc3NhZ2UgYnkgZGVmYXVsdFxuICAgICAgICBjb25zdCBldmVudFNvdXJjZSA9IHRoaXMuZXZlbnRTb3VyY2VGYWN0b3J5LmNvbnN0cnVjdCh0aGlzLmVzVVJMKTtcblxuICAgICAgICAvLyBmb3IgdHlwZS1zYWZldHkgaW4gRGVubyB3ZSBuZWVkIHRvIGNvZXJjZSB0byB3aGF0IHdlIGtub3cgRVMgaXM7XG4gICAgICAgIC8vIFRPRE86IGZpZ3VyZSBvdXQgaG93IHdoeSAvLy8gPHJlZmVyZW5jZSBsaWI9XCJkb21cIiAvPiBkaWQgbm90IHdvcmsuXG4gICAgICAgIC8vIG5vdGU6IDxyZWZlcmVuY2UgbGliPVwiZG9tXCIgLz4gd29ya3MgaW4gVlMgQ29kZSBidXQgbm90IGluIERlbm8uZW1pdCgpLlxuICAgICAgICBjb25zdCBjb2VyY2VkRVMgPSBldmVudFNvdXJjZSBhcyB1bmtub3duIGFzIHtcbiAgICAgICAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgICAgICAgIG9uZXJyb3I6ICgodGhpczogRXZlbnRTb3VyY2UsIGV2OiBFdmVudCkgPT4gYW55KSB8IG51bGw7XG4gICAgICAgICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICAgICAgICBvbm9wZW46ICgodGhpczogRXZlbnRTb3VyY2UsIGV2OiBFdmVudCkgPT4gYW55KSB8IG51bGw7XG4gICAgICAgICAgY2xvc2U6ICgpID0+IHZvaWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29lcmNlZEVTLm9ub3BlbiA9ICgpID0+IHtcbiAgICAgICAgICB0aGlzLmNvbm5lY3RlZChldmVudFNvdXJjZSwge1xuICAgICAgICAgICAgaXNDb25uZWN0aW9uU3RhdGU6IHRydWUsXG4gICAgICAgICAgICBpc0hlYWx0aHk6IHRydWUsXG4gICAgICAgICAgICBjb25uRXN0YWJsaXNoZWRPbjogbmV3IERhdGUoKSxcbiAgICAgICAgICAgIGVuZHBvaW50VVJMOiB0aGlzLmVzVVJMLFxuICAgICAgICAgICAgcGluZ1VSTDogdGhpcy5lc0VuZHBvaW50VmFsaWRhdG9yLnZhbGlkYXRpb25FbmRwb2ludFVSTC50b1N0cmluZygpLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvZXJjZWRFUy5vbmVycm9yID0gKGV2ZW50KSA9PiB7XG4gICAgICAgICAgY29lcmNlZEVTLmNsb3NlKCk7XG4gICAgICAgICAgY29uc3QgY29ublN0YXRlOiBFdmVudFNvdXJjZUVycm9yID0ge1xuICAgICAgICAgICAgaXNDb25uZWN0aW9uU3RhdGU6IHRydWUsXG4gICAgICAgICAgICBpc0hlYWx0aHk6IGZhbHNlLFxuICAgICAgICAgICAgY29ubkZhaWxlZE9uOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgaXNFdmVudFNvdXJjZUVycm9yOiB0cnVlLFxuICAgICAgICAgICAgZXJyb3JFdmVudDogZXZlbnQsXG4gICAgICAgICAgfTtcbiAgICAgICAgICBjb25zdCByZWNvbm5lY3RTdHJhdGVneSA9IHRoaXMucHJlcGFyZVJlY29ubmVjdChjb25uU3RhdGUpO1xuICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5pbml0KCksIHJlY29ubmVjdFN0cmF0ZWd5LmludGVydmFsTWlsbGVjcyk7XG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBjb25uU3RhdGU6XG4gICAgICAgICAgJiBFdmVudFNvdXJjZUNvbm5lY3Rpb25VbmhlYWx0aHlcbiAgICAgICAgICAmIEV2ZW50U291cmNlRW5kcG9pbnRVbmF2YWlsYWJsZSA9IHtcbiAgICAgICAgICAgIGlzQ29ubmVjdGlvblN0YXRlOiB0cnVlLFxuICAgICAgICAgICAgaXNIZWFsdGh5OiBmYWxzZSxcbiAgICAgICAgICAgIGNvbm5GYWlsZWRPbjogbmV3IERhdGUoKSxcbiAgICAgICAgICAgIGlzRW5kcG9pbnRVbmF2YWlsYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGVuZHBvaW50VVJMOiB0aGlzLmVzVVJMLFxuICAgICAgICAgICAgcGluZ1VSTDogdGhpcy5lc0VuZHBvaW50VmFsaWRhdG9yLnZhbGlkYXRpb25FbmRwb2ludFVSTC50b1N0cmluZygpLFxuICAgICAgICAgICAgaHR0cFN0YXR1czogcmVzcC5zdGF0dXMsXG4gICAgICAgICAgICBodHRwU3RhdHVzVGV4dDogcmVzcC5zdGF0dXNUZXh0LFxuICAgICAgICAgIH07XG4gICAgICAgIGNvbnN0IHJlY29ubmVjdFN0cmF0ZWd5ID0gdGhpcy5wcmVwYXJlUmVjb25uZWN0KGNvbm5TdGF0ZSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5pbml0KCksIHJlY29ubmVjdFN0cmF0ZWd5LmludGVydmFsTWlsbGVjcyk7XG4gICAgICB9XG4gICAgfSkuY2F0Y2goKGNvbm5lY3Rpb25FcnJvcjogRXJyb3IpID0+IHtcbiAgICAgIGNvbnN0IGNvbm5TdGF0ZTpcbiAgICAgICAgJiBFdmVudFNvdXJjZUNvbm5lY3Rpb25VbmhlYWx0aHlcbiAgICAgICAgJiBFdmVudFNvdXJjZUVuZHBvaW50VW5hdmFpbGFibGUgPSB7XG4gICAgICAgICAgaXNDb25uZWN0aW9uU3RhdGU6IHRydWUsXG4gICAgICAgICAgaXNIZWFsdGh5OiBmYWxzZSxcbiAgICAgICAgICBjb25uRmFpbGVkT246IG5ldyBEYXRlKCksXG4gICAgICAgICAgcGluZ1VSTDogdGhpcy5lc0VuZHBvaW50VmFsaWRhdG9yLnZhbGlkYXRpb25FbmRwb2ludFVSTC50b1N0cmluZygpLFxuICAgICAgICAgIGNvbm5lY3Rpb25FcnJvcixcbiAgICAgICAgICBpc0VuZHBvaW50VW5hdmFpbGFibGU6IHRydWUsXG4gICAgICAgICAgZW5kcG9pbnRVUkw6IHRoaXMuZXNVUkwsXG4gICAgICAgIH07XG4gICAgICBjb25zdCByZWNvbm5lY3RTdHJhdGVneSA9IHRoaXMucHJlcGFyZVJlY29ubmVjdChjb25uU3RhdGUpO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmluaXQoKSwgcmVjb25uZWN0U3RyYXRlZ3kuaW50ZXJ2YWxNaWxsZWNzKTtcbiAgICB9KTtcblxuICAgIC8vIHdlIHJldHVybiAndGhpcycgdG8gYWxsb3cgY29udmVuaWVudCBtZXRob2QgY2hhaW5pbmdcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGdldCBjb25uZWN0aW9uU3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuI2Nvbm5lY3Rpb25TdGF0ZTtcbiAgfVxuXG4gIHNldCBjb25uZWN0aW9uU3RhdGUodmFsdWUpIHtcbiAgICBjb25zdCBwcmV2aW91c0Nvbm5TdGF0ZSA9IHRoaXMuI2Nvbm5lY3Rpb25TdGF0ZTtcbiAgICB0aGlzLiNjb25uZWN0aW9uU3RhdGUgPSB2YWx1ZTtcbiAgICB0aGlzLm9uQ29ublN0YXRlQ2hhbmdlPy4odGhpcy4jY29ubmVjdGlvblN0YXRlLCBwcmV2aW91c0Nvbm5TdGF0ZSwgdGhpcyk7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBFdmVudFNvdXJjZUNvbm5OYXJyYXRpdmUge1xuICByZWFkb25seSBpc0hlYWx0aHk6IGJvb2xlYW47XG4gIHJlYWRvbmx5IHN1bW1hcnk6IHN0cmluZztcbiAgcmVhZG9ubHkgY29sb3I6IHN0cmluZztcbiAgcmVhZG9ubHkgc3VtbWFyeUhpbnQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBldmVudFNvdXJjZUNvbm5OYXJyYXRpdmUoXG4gIHR1bm5lbDogRXZlbnRTb3VyY2VUdW5uZWwsXG4pOiBFdmVudFNvdXJjZUNvbm5OYXJyYXRpdmUge1xuICBjb25zdCBzc2VTdGF0ZSA9IHR1bm5lbC5jb25uZWN0aW9uU3RhdGU7XG4gIGNvbnN0IHJlY29ubiA9IHR1bm5lbC5pc1JlY29ubmVjdGluZygpO1xuICBsZXQgcmVjb25uZWN0ZWQgPSBmYWxzZTtcbiAgaWYgKHJlY29ubikge1xuICAgIHN3aXRjaCAocmVjb25uLnN0YXRlKSB7XG4gICAgICBjYXNlIGMuUmVjb25uZWN0aW9uU3RhdGUuVFJZSU5HOlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHN1bW1hcnk6IGByZWNvbm5lY3RpbmcgJHtyZWNvbm4uYXR0ZW1wdH0vJHtyZWNvbm4ubWF4QXR0ZW1wdHN9YCxcbiAgICAgICAgICBjb2xvcjogXCJvcmFuZ2VcIixcbiAgICAgICAgICBpc0hlYWx0aHk6IGZhbHNlLFxuICAgICAgICAgIHN1bW1hcnlIaW50OlxuICAgICAgICAgICAgYFRyeWluZyB0byByZWNvbm5lY3QgdG8gJHt0dW5uZWwuZXNVUkx9IChFUyksIHJlY29ubmVjdGluZyBldmVyeSAke3JlY29ubi5pbnRlcnZhbE1pbGxlY3N9IG1pbGxpc2Vjb25kc2AsXG4gICAgICAgIH07XG5cbiAgICAgIGNhc2UgYy5SZWNvbm5lY3Rpb25TdGF0ZS5BQk9SVEVEOlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHN1bW1hcnk6IGBBQk9SVEVEYCxcbiAgICAgICAgICBjb2xvcjogXCJyZWRcIixcbiAgICAgICAgICBpc0hlYWx0aHk6IGZhbHNlLFxuICAgICAgICAgIHN1bW1hcnlIaW50OlxuICAgICAgICAgICAgYFVuYWJsZSB0byByZWNvbm5lY3QgdG8gJHt0dW5uZWwuZXNVUkx9IChFUykgYWZ0ZXIgJHtyZWNvbm4ubWF4QXR0ZW1wdHN9IGF0dGVtcHRzLCBnaXZpbmcgdXBgLFxuICAgICAgICB9O1xuXG4gICAgICBjYXNlIGMuUmVjb25uZWN0aW9uU3RhdGUuQ09NUExFVEVEOlxuICAgICAgICByZWNvbm5lY3RlZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIC8vIGMuUmVjb25uZWN0aW9uU3RhdGUuVU5LTk9XTiBhbmQgYy5SZWNvbm5lY3Rpb25TdGF0ZS5DT01QTEVURUQgd2lsbCBmYWxsXG4gIC8vIHRocm91Z2ggdG8gdGhlIG1lc3NhZ2VzIGJlbG93XG5cbiAgaWYgKGlzRXZlbnRTb3VyY2VDb25uZWN0aW9uSGVhbHRoeShzc2VTdGF0ZSkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VtbWFyeTogcmVjb25uZWN0ZWQgPyBcInJlY29ubmVjdGVkXCIgOiBcImNvbm5lY3RlZFwiLFxuICAgICAgY29sb3I6IFwiZ3JlZW5cIixcbiAgICAgIGlzSGVhbHRoeTogdHJ1ZSxcbiAgICAgIHN1bW1hcnlIaW50OlxuICAgICAgICBgQ29ubmVjdGlvbiB0byAke3NzZVN0YXRlLmVuZHBvaW50VVJMfSAoRVMpIHZlcmlmaWVkIHVzaW5nICR7c3NlU3RhdGUucGluZ1VSTH0gb24gJHtzc2VTdGF0ZS5jb25uRXN0YWJsaXNoZWRPbn1gLFxuICAgIH07XG4gIH1cblxuICBjb25zdCBpc0hlYWx0aHkgPSBmYWxzZTtcbiAgbGV0IHN1bW1hcnkgPSBcInVua25vd25cIjtcbiAgbGV0IGNvbG9yID0gXCJwdXJwbGVcIjtcbiAgbGV0IHN1bW1hcnlIaW50ID0gYHRoZSBFdmVudFNvdXJjZSB0dW5uZWwgaXMgbm90IGhlYWx0aHksIGJ1dCBub3Qgc3VyZSB3aHlgO1xuICBpZiAoaXNFdmVudFNvdXJjZUNvbm5lY3Rpb25VbmhlYWx0aHkoc3NlU3RhdGUpKSB7XG4gICAgaWYgKGlzRXZlbnRTb3VyY2VFbmRwb2ludFVuYXZhaWxhYmxlKHNzZVN0YXRlKSkge1xuICAgICAgc3VtbWFyeSA9IFwiRVMgdW5hdmFpbGFibGVcIjtcbiAgICAgIHN1bW1hcnlIaW50ID0gYCR7c3NlU3RhdGUuZW5kcG9pbnRVUkx9IChFUykgbm90IGF2YWlsYWJsZWA7XG4gICAgICBpZiAoc3NlU3RhdGUuaHR0cFN0YXR1cykge1xuICAgICAgICBzdW1tYXJ5ID0gYEVTIHVuYXZhaWxhYmxlICgke3NzZVN0YXRlLmh0dHBTdGF0dXN9KWA7XG4gICAgICAgIHN1bW1hcnlIaW50ICs9XG4gICAgICAgICAgYCAoSFRUUCBzdGF0dXM6ICR7c3NlU3RhdGUuaHR0cFN0YXR1c30sICR7c3NlU3RhdGUuaHR0cFN0YXR1c1RleHR9KWA7XG4gICAgICAgIGNvbG9yID0gXCJyZWRcIjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGlzRXZlbnRTb3VyY2VFcnJvcihzc2VTdGF0ZSkpIHtcbiAgICAgICAgc3VtbWFyeSA9IFwiZXJyb3JcIjtcbiAgICAgICAgc3VtbWFyeUhpbnQgPSBKU09OLnN0cmluZ2lmeShzc2VTdGF0ZS5lcnJvckV2ZW50KTtcbiAgICAgICAgY29sb3IgPSBcInJlZFwiO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7IGlzSGVhbHRoeSwgc3VtbWFyeSwgc3VtbWFyeUhpbnQsIGNvbG9yIH07XG59XG4iLCJpbXBvcnQgKiBhcyBnb3ZuIGZyb20gXCIuLi9nb3Zlcm5hbmNlLnRzXCI7XG5pbXBvcnQgKiBhcyBzc2UgZnJvbSBcIi4vZXZlbnQtc291cmNlLnRzXCI7XG5pbXBvcnQgKiBhcyB3cyBmcm9tIFwiLi93cy50c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50U291cmNlQ3VzdG9tRXZlbnREZXRhaWw8XG4gIFBheWxvYWQgZXh0ZW5kcyBnb3ZuLlZhbGlkYXRlZFBheWxvYWQsXG4+IHtcbiAgcmVhZG9ubHkgZXZlbnQ6IE1lc3NhZ2VFdmVudDtcbiAgcmVhZG9ubHkgZXZlbnRTcmNQYXlsb2FkOiBQYXlsb2FkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZldGNoQ3VzdG9tRXZlbnREZXRhaWw8Q29udGV4dD4ge1xuICByZWFkb25seSBjb250ZXh0OiBDb250ZXh0O1xuICByZWFkb25seSBmZXRjaFN0cmF0ZWd5OiBnb3ZuLkZldGNoU3RyYXRlZ3k7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRmV0Y2hQYXlsb2FkU3VwcGxpZXI8XG4gIFBheWxvYWQgZXh0ZW5kcyBnb3ZuLklkZW50aWZpYWJsZVBheWxvYWQsXG4+IHtcbiAgcmVhZG9ubHkgZmV0Y2hQYXlsb2FkOiBQYXlsb2FkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZldGNoUmVzcFBheWxvYWRTdXBwbGllcjxcbiAgUGF5bG9hZCBleHRlbmRzIGdvdm4uVmFsaWRhdGVkUGF5bG9hZCxcbj4ge1xuICByZWFkb25seSBmZXRjaFJlc3BQYXlsb2FkOiBQYXlsb2FkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdlYlNvY2tldFNlbmRDdXN0b21FdmVudERldGFpbDxcbiAgUGF5bG9hZCBleHRlbmRzIGdvdm4uSWRlbnRpZmlhYmxlUGF5bG9hZCxcbiAgQ29udGV4dCxcbj4ge1xuICByZWFkb25seSBjb250ZXh0OiBDb250ZXh0O1xuICByZWFkb25seSBwYXlsb2FkOiBQYXlsb2FkO1xuICByZWFkb25seSB3ZWJTb2NrZXRTdHJhdGVneTogZ292bi5XZWJTb2NrZXRTdHJhdGVneTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXZWJTb2NrZXRSZWNlaXZlQ3VzdG9tRXZlbnREZXRhaWw8XG4gIFBheWxvYWQgZXh0ZW5kcyBnb3ZuLlZhbGlkYXRlZFBheWxvYWQsXG4+IHtcbiAgcmVhZG9ubHkgZXZlbnQ6IE1lc3NhZ2VFdmVudDtcbiAgcmVhZG9ubHkgd2ViU29ja2V0U3RyYXRlZ3k6IGdvdm4uV2ViU29ja2V0U3RyYXRlZ3k7XG4gIHJlYWRvbmx5IHBheWxvYWQ6IFBheWxvYWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmljQnVzRXZlbnRTb3VyY2VUdW5uZWxzU3VwcGxpZXIge1xuICAob25NZXNzYWdlOiAoZXZlbnQ6IE1lc3NhZ2VFdmVudCkgPT4gdm9pZCk6IEdlbmVyYXRvcjxzc2UuRXZlbnRTb3VyY2VUdW5uZWw+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZpY0J1c1dlYlNvY2tldFR1bm5lbHNTdXBwbGllciB7XG4gIChvbk1lc3NhZ2U6IChldmVudDogTWVzc2FnZUV2ZW50KSA9PiB2b2lkKTogR2VuZXJhdG9yPHdzLldlYlNvY2tldFR1bm5lbD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRUYXJnZXRFdmVudE5hbWVTdHJhdGVneSB7XG4gIChwYXlsb2FkOiBnb3ZuLlBheWxvYWRJZGVudGl0eSB8IGdvdm4uSWRlbnRpZmlhYmxlUGF5bG9hZCB8IFwidW5pdmVyc2FsXCIpOiB7XG4gICAgcmVhZG9ubHkgcGF5bG9hZFNwZWNpZmljTmFtZT86IHN0cmluZztcbiAgICByZWFkb25seSB1bml2ZXJzYWxOYW1lOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgc2VsZWN0ZWROYW1lOiBzdHJpbmc7XG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmljZUJ1c0FyZ3VtZW50cyB7XG4gIHJlYWRvbmx5IGVzVHVubmVscz86IFNlcnZpY0J1c0V2ZW50U291cmNlVHVubmVsc1N1cHBsaWVyO1xuICByZWFkb25seSB3c1R1bm5lbHM/OiBTZXJ2aWNCdXNXZWJTb2NrZXRUdW5uZWxzU3VwcGxpZXI7XG4gIHJlYWRvbmx5IGZldGNoQmFzZVVSTD86IHN0cmluZztcbiAgcmVhZG9ubHkgZXZlbnROYW1lU3RyYXRlZ3k6IHtcbiAgICByZWFkb25seSB1bml2ZXJzYWxTY29wZUlEOiBcInVuaXZlcnNhbFwiO1xuICAgIHJlYWRvbmx5IGZldGNoOiBFdmVudFRhcmdldEV2ZW50TmFtZVN0cmF0ZWd5O1xuICAgIHJlYWRvbmx5IGZldGNoUmVzcG9uc2U6IEV2ZW50VGFyZ2V0RXZlbnROYW1lU3RyYXRlZ3k7XG4gICAgcmVhZG9ubHkgZmV0Y2hFcnJvcjogRXZlbnRUYXJnZXRFdmVudE5hbWVTdHJhdGVneTtcbiAgICByZWFkb25seSBldmVudFNvdXJjZTogRXZlbnRUYXJnZXRFdmVudE5hbWVTdHJhdGVneTtcbiAgICByZWFkb25seSBldmVudFNvdXJjZUVycm9yOiBFdmVudFRhcmdldEV2ZW50TmFtZVN0cmF0ZWd5O1xuICAgIHJlYWRvbmx5IGV2ZW50U291cmNlSW52YWxpZFBheWxvYWQ6IEV2ZW50VGFyZ2V0RXZlbnROYW1lU3RyYXRlZ3k7XG4gICAgcmVhZG9ubHkgd2ViU29ja2V0OiBFdmVudFRhcmdldEV2ZW50TmFtZVN0cmF0ZWd5O1xuICAgIHJlYWRvbmx5IHdlYlNvY2tldEVycm9yOiBFdmVudFRhcmdldEV2ZW50TmFtZVN0cmF0ZWd5O1xuICAgIHJlYWRvbmx5IHdlYlNvY2tldEludmFsaWRQYXlsb2FkOiBFdmVudFRhcmdldEV2ZW50TmFtZVN0cmF0ZWd5O1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VydmljZUJ1c0FyZ3VtZW50cyhcbiAgb3B0aW9uczogUGFydGlhbDxTZXJ2aWNlQnVzQXJndW1lbnRzPixcbik6IFNlcnZpY2VCdXNBcmd1bWVudHMge1xuICBjb25zdCB1bml2ZXJzYWxTY29wZUlEID0gXCJ1bml2ZXJzYWxcIjtcbiAgcmV0dXJuIHtcbiAgICBldmVudE5hbWVTdHJhdGVneToge1xuICAgICAgdW5pdmVyc2FsU2NvcGVJRCxcbiAgICAgIGZldGNoOiAocGF5bG9hZCkgPT4ge1xuICAgICAgICBjb25zdCBpZGVudGl0eSA9IHR5cGVvZiBwYXlsb2FkID09PSBcInN0cmluZ1wiXG4gICAgICAgICAgPyBwYXlsb2FkXG4gICAgICAgICAgOiBwYXlsb2FkLnBheWxvYWRJZGVudGl0eTtcbiAgICAgICAgY29uc3QgcGF5bG9hZFNwZWNpZmljTmFtZSA9IGBmZXRjaC0ke2lkZW50aXR5fWA7XG4gICAgICAgIGNvbnN0IHVuaXZlcnNhbE5hbWUgPSBgZmV0Y2hgO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHBheWxvYWRTcGVjaWZpY05hbWUsXG4gICAgICAgICAgdW5pdmVyc2FsTmFtZSxcbiAgICAgICAgICBzZWxlY3RlZE5hbWU6IGlkZW50aXR5ID09IHVuaXZlcnNhbFNjb3BlSURcbiAgICAgICAgICAgID8gdW5pdmVyc2FsTmFtZVxuICAgICAgICAgICAgOiBwYXlsb2FkU3BlY2lmaWNOYW1lLFxuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIGZldGNoUmVzcG9uc2U6IChwYXlsb2FkKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkZW50aXR5ID0gdHlwZW9mIHBheWxvYWQgPT09IFwic3RyaW5nXCJcbiAgICAgICAgICA/IHBheWxvYWRcbiAgICAgICAgICA6IHBheWxvYWQucGF5bG9hZElkZW50aXR5O1xuICAgICAgICBjb25zdCBwYXlsb2FkU3BlY2lmaWNOYW1lID0gYGZldGNoLXJlc3BvbnNlLSR7aWRlbnRpdHl9YDtcbiAgICAgICAgY29uc3QgdW5pdmVyc2FsTmFtZSA9IGBmZXRjaC1yZXNwb25zZWA7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcGF5bG9hZFNwZWNpZmljTmFtZSxcbiAgICAgICAgICB1bml2ZXJzYWxOYW1lLFxuICAgICAgICAgIHNlbGVjdGVkTmFtZTogaWRlbnRpdHkgPT0gdW5pdmVyc2FsU2NvcGVJRFxuICAgICAgICAgICAgPyB1bml2ZXJzYWxOYW1lXG4gICAgICAgICAgICA6IHBheWxvYWRTcGVjaWZpY05hbWUsXG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgZmV0Y2hFcnJvcjogKHBheWxvYWQpID0+IHtcbiAgICAgICAgY29uc3QgaWRlbnRpdHkgPSB0eXBlb2YgcGF5bG9hZCA9PT0gXCJzdHJpbmdcIlxuICAgICAgICAgID8gcGF5bG9hZFxuICAgICAgICAgIDogcGF5bG9hZC5wYXlsb2FkSWRlbnRpdHk7XG4gICAgICAgIGNvbnN0IHBheWxvYWRTcGVjaWZpY05hbWUgPSBgZmV0Y2gtZXJyb3ItJHtpZGVudGl0eX1gO1xuICAgICAgICBjb25zdCB1bml2ZXJzYWxOYW1lID0gYGZldGNoLWVycm9yYDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBwYXlsb2FkU3BlY2lmaWNOYW1lLFxuICAgICAgICAgIHVuaXZlcnNhbE5hbWUsXG4gICAgICAgICAgc2VsZWN0ZWROYW1lOiBpZGVudGl0eSA9PSB1bml2ZXJzYWxTY29wZUlEXG4gICAgICAgICAgICA/IHVuaXZlcnNhbE5hbWVcbiAgICAgICAgICAgIDogcGF5bG9hZFNwZWNpZmljTmFtZSxcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBldmVudFNvdXJjZTogKHBheWxvYWQpID0+IHtcbiAgICAgICAgY29uc3QgaWRlbnRpdHkgPSB0eXBlb2YgcGF5bG9hZCA9PT0gXCJzdHJpbmdcIlxuICAgICAgICAgID8gcGF5bG9hZFxuICAgICAgICAgIDogcGF5bG9hZC5wYXlsb2FkSWRlbnRpdHk7XG4gICAgICAgIGNvbnN0IHBheWxvYWRTcGVjaWZpY05hbWUgPSBgZXZlbnQtc291cmNlLSR7aWRlbnRpdHl9YDtcbiAgICAgICAgY29uc3QgdW5pdmVyc2FsTmFtZSA9IGBldmVudC1zb3VyY2VgO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHBheWxvYWRTcGVjaWZpY05hbWUsXG4gICAgICAgICAgdW5pdmVyc2FsTmFtZSxcbiAgICAgICAgICBzZWxlY3RlZE5hbWU6IGlkZW50aXR5ID09IHVuaXZlcnNhbFNjb3BlSURcbiAgICAgICAgICAgID8gdW5pdmVyc2FsTmFtZVxuICAgICAgICAgICAgOiBwYXlsb2FkU3BlY2lmaWNOYW1lLFxuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIGV2ZW50U291cmNlRXJyb3I6IChwYXlsb2FkKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkZW50aXR5ID0gdHlwZW9mIHBheWxvYWQgPT09IFwic3RyaW5nXCJcbiAgICAgICAgICA/IHBheWxvYWRcbiAgICAgICAgICA6IHBheWxvYWQucGF5bG9hZElkZW50aXR5O1xuICAgICAgICBjb25zdCBwYXlsb2FkU3BlY2lmaWNOYW1lID0gYGV2ZW50LXNvdXJjZS1lcnJvci0ke2lkZW50aXR5fWA7XG4gICAgICAgIGNvbnN0IHVuaXZlcnNhbE5hbWUgPSBgZXZlbnQtc291cmNlLWVycm9yYDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBwYXlsb2FkU3BlY2lmaWNOYW1lLFxuICAgICAgICAgIHVuaXZlcnNhbE5hbWUsXG4gICAgICAgICAgc2VsZWN0ZWROYW1lOiBpZGVudGl0eSA9PSB1bml2ZXJzYWxTY29wZUlEXG4gICAgICAgICAgICA/IHVuaXZlcnNhbE5hbWVcbiAgICAgICAgICAgIDogcGF5bG9hZFNwZWNpZmljTmFtZSxcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBldmVudFNvdXJjZUludmFsaWRQYXlsb2FkOiAoKSA9PiB7XG4gICAgICAgIC8vIHRoaXMgaXMgYSBzcGVjaWFsIGVycm9yIHdoaWNoIGNhbm5vdCBiZSBwYXlsb2FkLXNwZWNpZmljIGJlY2F1c2VcbiAgICAgICAgLy8gaXQgaW5kaWNhdGVzIGFuIHVuc29saWNpdGVkIHNlcnZlciBzZW50IGV2ZW50IGNvdWxkIG5vdCBiZSBpZGVudGlmaWVkXG4gICAgICAgIC8vIGFzIHNvbWV0aGluZyB3ZSBjYW4gaGFuZGxlIChpdCB3aWxsIGJlIGlnbm9yZWQpXG4gICAgICAgIGNvbnN0IHVuaXZlcnNhbE5hbWUgPSBgZXZlbnQtc291cmNlLWludmFsaWQtcGF5bG9hZGA7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcGF5bG9hZFNwZWNpZmljTmFtZTogdW5kZWZpbmVkLFxuICAgICAgICAgIHVuaXZlcnNhbE5hbWUsXG4gICAgICAgICAgc2VsZWN0ZWROYW1lOiB1bml2ZXJzYWxOYW1lLFxuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIHdlYlNvY2tldDogKHBheWxvYWQpID0+IHtcbiAgICAgICAgY29uc3QgaWRlbnRpdHkgPSB0eXBlb2YgcGF5bG9hZCA9PT0gXCJzdHJpbmdcIlxuICAgICAgICAgID8gcGF5bG9hZFxuICAgICAgICAgIDogcGF5bG9hZC5wYXlsb2FkSWRlbnRpdHk7XG4gICAgICAgIGNvbnN0IHBheWxvYWRTcGVjaWZpY05hbWUgPSBgd2ViLXNvY2tldC0ke2lkZW50aXR5fWA7XG4gICAgICAgIGNvbnN0IHVuaXZlcnNhbE5hbWUgPSBgd2ViLXNvY2tldGA7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcGF5bG9hZFNwZWNpZmljTmFtZSxcbiAgICAgICAgICB1bml2ZXJzYWxOYW1lLFxuICAgICAgICAgIHNlbGVjdGVkTmFtZTogaWRlbnRpdHkgPT0gdW5pdmVyc2FsU2NvcGVJRFxuICAgICAgICAgICAgPyB1bml2ZXJzYWxOYW1lXG4gICAgICAgICAgICA6IHBheWxvYWRTcGVjaWZpY05hbWUsXG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgd2ViU29ja2V0RXJyb3I6IChwYXlsb2FkKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkZW50aXR5ID0gdHlwZW9mIHBheWxvYWQgPT09IFwic3RyaW5nXCJcbiAgICAgICAgICA/IHBheWxvYWRcbiAgICAgICAgICA6IHBheWxvYWQucGF5bG9hZElkZW50aXR5O1xuICAgICAgICBjb25zdCBwYXlsb2FkU3BlY2lmaWNOYW1lID0gYHdlYi1zb2NrZXQtZXJyb3ItJHtpZGVudGl0eX1gO1xuICAgICAgICBjb25zdCB1bml2ZXJzYWxOYW1lID0gYHdlYi1zb2NrZXQtZXJyb3JgO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHBheWxvYWRTcGVjaWZpY05hbWUsXG4gICAgICAgICAgdW5pdmVyc2FsTmFtZSxcbiAgICAgICAgICBzZWxlY3RlZE5hbWU6IGlkZW50aXR5ID09IHVuaXZlcnNhbFNjb3BlSURcbiAgICAgICAgICAgID8gdW5pdmVyc2FsTmFtZVxuICAgICAgICAgICAgOiBwYXlsb2FkU3BlY2lmaWNOYW1lLFxuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIHdlYlNvY2tldEludmFsaWRQYXlsb2FkOiAoKSA9PiB7XG4gICAgICAgIC8vIHRoaXMgaXMgYSBzcGVjaWFsIGVycm9yIHdoaWNoIGNhbm5vdCBiZSBwYXlsb2FkLXNwZWNpZmljIGJlY2F1c2VcbiAgICAgICAgLy8gaXQgaW5kaWNhdGVzIGFuIHVuc29saWNpdGVkIHdlYiBzb2NrZXQgbWVzc2FnZSBjb3VsZCBub3QgYmUgaWRlbnRpZmllZFxuICAgICAgICAvLyBhcyBzb21ldGhpbmcgd2UgY2FuIGhhbmRsZSAoaXQgd2lsbCBiZSBpZ25vcmVkKVxuICAgICAgICBjb25zdCB1bml2ZXJzYWxOYW1lID0gYHdlYi1zb2NrZXQtaW52YWxpZC1wYXlsb2FkYDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBwYXlsb2FkU3BlY2lmaWNOYW1lOiB1bmRlZmluZWQsXG4gICAgICAgICAgdW5pdmVyc2FsTmFtZSxcbiAgICAgICAgICBzZWxlY3RlZE5hbWU6IHVuaXZlcnNhbE5hbWUsXG4gICAgICAgIH07XG4gICAgICB9LFxuICAgIH0sXG4gICAgLi4ub3B0aW9ucyxcbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIFNlcnZpY2VCdXMgZXh0ZW5kcyBFdmVudFRhcmdldFxuICBpbXBsZW1lbnRzXG4gICAgZ292bi5GZXRjaFN0cmF0ZWd5LFxuICAgIGdvdm4uRXZlbnRTb3VyY2VTdHJhdGVneSxcbiAgICBnb3ZuLldlYlNvY2tldFN0cmF0ZWd5IHtcbiAgcmVhZG9ubHkgZXNUdW5uZWxzOiBzc2UuRXZlbnRTb3VyY2VUdW5uZWxbXSA9IFtdO1xuICByZWFkb25seSB3c1R1bm5lbHM6IHdzLldlYlNvY2tldFR1bm5lbFtdID0gW107XG4gIHJlYWRvbmx5IGV2ZW50TGlzdGVuZXJzTG9nOiB7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGhvb2s6IEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3QgfCBudWxsO1xuICB9W10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBhcmdzOiBTZXJ2aWNlQnVzQXJndW1lbnRzKSB7XG4gICAgc3VwZXIoKTtcbiAgICBpZiAoYXJncy5lc1R1bm5lbHMpIHRoaXMucmVnaXN0ZXJFdmVudFNvdXJjZVR1bm5lbHMoYXJncy5lc1R1bm5lbHMpO1xuICAgIGlmIChhcmdzLndzVHVubmVscykgdGhpcy5yZWdpc3RlcldlYlNvY2tldFR1bm5lbHMoYXJncy53c1R1bm5lbHMpO1xuICB9XG5cbiAgcmVnaXN0ZXJFdmVudFNvdXJjZVR1bm5lbHMoZXN0czogU2VydmljQnVzRXZlbnRTb3VyY2VUdW5uZWxzU3VwcGxpZXIpIHtcbiAgICBmb3IgKFxuICAgICAgY29uc3QgdHVubmVsIG9mIGVzdHMoKGV2ZW50KSA9PiB7XG4gICAgICAgIGNvbnN0IGV2ZW50U3JjUGF5bG9hZCA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSk7XG4gICAgICAgIGNvbnN0IGVzRGV0YWlsOlxuICAgICAgICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgICAgICAgRXZlbnRTb3VyY2VDdXN0b21FdmVudERldGFpbDxhbnk+ID0geyBldmVudCwgZXZlbnRTcmNQYXlsb2FkIH07XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hOYW1pbmdTdHJhdGVneUV2ZW50KFxuICAgICAgICAgIGV2ZW50U3JjUGF5bG9hZCxcbiAgICAgICAgICBnb3ZuLmlzSWRlbnRpZmlhYmxlUGF5bG9hZChldmVudFNyY1BheWxvYWQpXG4gICAgICAgICAgICA/IHRoaXMuYXJncy5ldmVudE5hbWVTdHJhdGVneS5ldmVudFNvdXJjZVxuICAgICAgICAgICAgOiB0aGlzLmFyZ3MuZXZlbnROYW1lU3RyYXRlZ3kuZXZlbnRTb3VyY2VJbnZhbGlkUGF5bG9hZCxcbiAgICAgICAgICBlc0RldGFpbCxcbiAgICAgICAgKTtcbiAgICAgIH0pXG4gICAgKSB7XG4gICAgICB0aGlzLmVzVHVubmVscy5wdXNoKHR1bm5lbCk7XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXJXZWJTb2NrZXRUdW5uZWxzKGVzdHM6IFNlcnZpY0J1c1dlYlNvY2tldFR1bm5lbHNTdXBwbGllcikge1xuICAgIGZvciAoXG4gICAgICBjb25zdCB0dW5uZWwgb2YgZXN0cygoZXZlbnQpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBldmVudC5kYXRhID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgY29uc3QgcGF5bG9hZCA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSk7XG4gICAgICAgICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICAgICAgICBjb25zdCB3c0RldGFpbDogV2ViU29ja2V0UmVjZWl2ZUN1c3RvbUV2ZW50RGV0YWlsPGFueT4gPSB7XG4gICAgICAgICAgICBldmVudCxcbiAgICAgICAgICAgIHBheWxvYWQsXG4gICAgICAgICAgICB3ZWJTb2NrZXRTdHJhdGVneTogdGhpcyxcbiAgICAgICAgICB9O1xuICAgICAgICAgIHRoaXMuZGlzcGF0Y2hOYW1pbmdTdHJhdGVneUV2ZW50KFxuICAgICAgICAgICAgcGF5bG9hZCxcbiAgICAgICAgICAgIGdvdm4uaXNJZGVudGlmaWFibGVQYXlsb2FkKHBheWxvYWQpXG4gICAgICAgICAgICAgID8gdGhpcy5hcmdzLmV2ZW50TmFtZVN0cmF0ZWd5LndlYlNvY2tldFxuICAgICAgICAgICAgICA6IHRoaXMuYXJncy5ldmVudE5hbWVTdHJhdGVneS53ZWJTb2NrZXRJbnZhbGlkUGF5bG9hZCxcbiAgICAgICAgICAgIHdzRGV0YWlsLFxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgcGF5bG9hZCA9IGV2ZW50LmRhdGE7XG4gICAgICAgICAgaWYgKGdvdm4uaXNJZGVudGlmaWFibGVQYXlsb2FkKHBheWxvYWQpKSB7XG4gICAgICAgICAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgICAgICAgICAgY29uc3Qgd3NEZXRhaWw6IFdlYlNvY2tldFJlY2VpdmVDdXN0b21FdmVudERldGFpbDxhbnk+ID0ge1xuICAgICAgICAgICAgICBldmVudCxcbiAgICAgICAgICAgICAgcGF5bG9hZCxcbiAgICAgICAgICAgICAgd2ViU29ja2V0U3RyYXRlZ3k6IHRoaXMsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaE5hbWluZ1N0cmF0ZWd5RXZlbnQoXG4gICAgICAgICAgICAgIHBheWxvYWQsXG4gICAgICAgICAgICAgIHRoaXMuYXJncy5ldmVudE5hbWVTdHJhdGVneS53ZWJTb2NrZXQsXG4gICAgICAgICAgICAgIHdzRGV0YWlsLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaE5hbWluZ1N0cmF0ZWd5RXZlbnQoXG4gICAgICAgICAgICAgIGV2ZW50LmRhdGEsXG4gICAgICAgICAgICAgIHRoaXMuYXJncy5ldmVudE5hbWVTdHJhdGVneS53ZWJTb2NrZXRJbnZhbGlkUGF5bG9hZCxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGV2ZW50LFxuICAgICAgICAgICAgICAgIHdlYlNvY2tldFN0cmF0ZWd5OiB0aGlzLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSB7XG4gICAgICB0aGlzLndzVHVubmVscy5wdXNoKHR1bm5lbCk7XG4gICAgfVxuICB9XG5cbiAgZGlzcGF0Y2hOYW1pbmdTdHJhdGVneUV2ZW50KFxuICAgIGlkOiBnb3ZuLlBheWxvYWRJZGVudGl0eSB8IGdvdm4uSWRlbnRpZmlhYmxlUGF5bG9hZCxcbiAgICBzdHJhdGVneTogRXZlbnRUYXJnZXRFdmVudE5hbWVTdHJhdGVneSxcbiAgICBkZXRhaWw6IHVua25vd24sXG4gICkge1xuICAgIGNvbnN0IG5hbWVzID0gc3RyYXRlZ3koaWQpO1xuICAgIGlmIChuYW1lcy5wYXlsb2FkU3BlY2lmaWNOYW1lKSB7XG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoXG4gICAgICAgIG5ldyBDdXN0b21FdmVudChuYW1lcy5wYXlsb2FkU3BlY2lmaWNOYW1lLCB7IGRldGFpbCB9KSxcbiAgICAgICk7XG4gICAgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChcbiAgICAgIG5ldyBDdXN0b21FdmVudChuYW1lcy51bml2ZXJzYWxOYW1lLCB7XG4gICAgICAgIGRldGFpbCxcbiAgICAgIH0pLFxuICAgICk7XG4gIH1cblxuICBhZGRFdmVudExpc3RlbmVyKFxuICAgIHR5cGU6IHN0cmluZyxcbiAgICBsaXN0ZW5lcjogRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCB8IG51bGwsXG4gICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyB8IHVuZGVmaW5lZCxcbiAgKSB7XG4gICAgc3VwZXIuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgb3B0aW9ucyk7XG4gICAgdGhpcy5ldmVudExpc3RlbmVyc0xvZy5wdXNoKHsgbmFtZTogdHlwZSwgaG9vazogbGlzdGVuZXIgfSk7XG4gIH1cblxuICBvYnNlcnZlVW5zb2xpY2l0ZWRQYXlsb2FkPFxuICAgIFBheWxvYWQgZXh0ZW5kcyBnb3ZuLlZhbGlkYXRlZFBheWxvYWQsXG4gID4oXG4gICAgb2JzZXJ2ZXI6IGdvdm4uVW5zb2xpY2l0ZWRQYXlsb2FkT2JzZXJ2ZXI8UGF5bG9hZD4sXG4gICAgcGF5bG9hZElkU3VwcGxpZXI/OlxuICAgICAgfCBnb3ZuLlBheWxvYWRJZGVudGl0eVxuICAgICAgfCBnb3ZuLlBheWxvYWRTZXJ2aWNlLFxuICApOiB2b2lkIHtcbiAgICAvLyB1bnNvbGljaXRlZCBwYXlsb2FkcyBjYW4gY29tZSBmcm9tIGVpdGhlciBldmVudCBzb3VyY2VzIG9yIGZyb20gd2ViXG4gICAgLy8gc29ja2V0cyBzbyBvYnNlcnZlIGJvdGhcbiAgICB0aGlzLm9ic2VydmVFdmVudFNvdXJjZTxQYXlsb2FkPigocGF5bG9hZCkgPT4ge1xuICAgICAgb2JzZXJ2ZXIocGF5bG9hZCwgdGhpcyk7XG4gICAgfSwgcGF5bG9hZElkU3VwcGxpZXIpO1xuICAgIHRoaXMub2JzZXJ2ZVdlYlNvY2tldFJlY2VpdmVFdmVudDxQYXlsb2FkPigocGF5bG9hZCkgPT4ge1xuICAgICAgb2JzZXJ2ZXIocGF5bG9hZCwgdGhpcyk7XG4gICAgfSwgcGF5bG9hZElkU3VwcGxpZXIpO1xuICB9XG5cbiAgb2JzZXJ2ZVJlY2VpdmVkUGF5bG9hZDxcbiAgICBQYXlsb2FkIGV4dGVuZHMgZ292bi5WYWxpZGF0ZWRQYXlsb2FkLFxuICA+KFxuICAgIG9ic2VydmVyOiBnb3ZuLlJlY2VpdmVkUGF5bG9hZE9ic2VydmVyPFBheWxvYWQ+LFxuICAgIHBheWxvYWRJZFN1cHBsaWVyPzogZ292bi5QYXlsb2FkSWRlbnRpdHkgfCBnb3ZuLlBheWxvYWRTZXJ2aWNlLFxuICApOiB2b2lkIHtcbiAgICAvLyByZWNlaXZlZCBwYXlsb2FkcyBjYW4gY29tZSBmcm9tIGVpdGhlciBldmVudCBzb3VyY2VzLCB3ZWIgc29ja2V0cyxcbiAgICAvLyBvciBmZXRjaGVzIHNvIHJlZ2lzdGVyIGFsbCB0aHJlZVxuICAgIHRoaXMub2JzZXJ2ZUV2ZW50U291cmNlPFBheWxvYWQ+KChwYXlsb2FkKSA9PiB7XG4gICAgICBvYnNlcnZlcihwYXlsb2FkLCB0aGlzKTtcbiAgICB9LCBwYXlsb2FkSWRTdXBwbGllcik7XG4gICAgdGhpcy5vYnNlcnZlV2ViU29ja2V0UmVjZWl2ZUV2ZW50PFBheWxvYWQ+KChwYXlsb2FkKSA9PiB7XG4gICAgICBvYnNlcnZlcihwYXlsb2FkLCB0aGlzKTtcbiAgICB9LCBwYXlsb2FkSWRTdXBwbGllcik7XG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICB0aGlzLm9ic2VydmVGZXRjaEV2ZW50UmVzcG9uc2U8YW55LCBQYXlsb2FkLCBhbnk+KFxuICAgICAgKF9mZXRjaGVkLCByZWNlaXZlZCkgPT4ge1xuICAgICAgICBvYnNlcnZlcihyZWNlaXZlZCwgdGhpcyk7XG4gICAgICB9LFxuICAgICAgcGF5bG9hZElkU3VwcGxpZXIsXG4gICAgKTtcbiAgfVxuXG4gIG9ic2VydmVTb2xpY2l0ZWRQYXlsb2FkPFxuICAgIFNvbGljaXRlZFBheWxvYWQgZXh0ZW5kcyBnb3ZuLklkZW50aWZpYWJsZVBheWxvYWQsXG4gICAgU29saWNpdGVkUmVzcG9uc2VQYXlsb2FkIGV4dGVuZHMgZ292bi5WYWxpZGF0ZWRQYXlsb2FkLFxuICAgIENvbnRleHQsXG4gID4oXG4gICAgb2JzZXJ2ZXI6IGdvdm4uU29saWNpdGVkUGF5bG9hZE9ic2VydmVyPFxuICAgICAgU29saWNpdGVkUGF5bG9hZCxcbiAgICAgIFNvbGljaXRlZFJlc3BvbnNlUGF5bG9hZCxcbiAgICAgIENvbnRleHRcbiAgICA+LFxuICAgIHBheWxvYWRJZFN1cHBsaWVyPzpcbiAgICAgIHwgZ292bi5QYXlsb2FkSWRlbnRpdHlcbiAgICAgIHwgZ292bi5QYXlsb2FkU2VydmljZSxcbiAgKTogdm9pZCB7XG4gICAgLy8gc29saWNpdGVkIHBheWxvYWRzIGNhbiBjb21lIGZyb20gZWl0aGVyIGZldGNoIGV2ZW50cyBvciB3ZWIgc29ja2V0c1xuICAgIC8vIFRPRE86IGFkZCB3ZWIgc29ja2V0cycgc2VuZC9yZWNlaXZlIHdoZW4gYSByZWNlaXZlIGlzIGV4cGVjdGVkIGFmdGVyXG4gICAgLy8gICAgICAgYSBzZW5kIGV2ZW50IC0gbmVlZCB3YXkgdG8gdHJhY2sgc2VuZGVyL3JlY2VpdmVyXG4gICAgdGhpcy5vYnNlcnZlRmV0Y2hFdmVudFJlc3BvbnNlPFxuICAgICAgU29saWNpdGVkUGF5bG9hZCxcbiAgICAgIFNvbGljaXRlZFJlc3BvbnNlUGF5bG9hZCxcbiAgICAgIENvbnRleHRcbiAgICA+KChwYXlsb2FkLCByZXNwb25zZVBheWxvYWQsIGN0eCkgPT4ge1xuICAgICAgb2JzZXJ2ZXIocGF5bG9hZCwgcmVzcG9uc2VQYXlsb2FkLCBjdHgsIHRoaXMpO1xuICAgIH0sIHBheWxvYWRJZFN1cHBsaWVyKTtcbiAgfVxuXG4gIGZldGNoPFxuICAgIFVzZXJBZ2VudFBheWxvYWQgZXh0ZW5kcyBnb3ZuLklkZW50aWZpYWJsZVBheWxvYWQsXG4gICAgU2VydmVyUmVzcFBheWxvYWQgZXh0ZW5kcyBnb3ZuLlZhbGlkYXRlZFBheWxvYWQsXG4gICAgQ29udGV4dCxcbiAgPihcbiAgICB1YXNlOiBnb3ZuLkZldGNoU2VydmljZTxVc2VyQWdlbnRQYXlsb2FkLCBTZXJ2ZXJSZXNwUGF5bG9hZCwgQ29udGV4dD4sXG4gICAgc3VnZ2VzdGVkQ3R4OiBDb250ZXh0LFxuICApOiB2b2lkIHtcbiAgICBjb25zdCB0cmFuc2FjdGlvbklEID0gXCJUT0RPOlVVSUR2NT9cIjsgLy8gdG9rZW5zLCB1c2VyIGFnZW50IHN0cmluZ3MsIGV0Yy5cbiAgICBjb25zdCBjbGllbnRQcm92ZW5hbmNlID0gXCJTZXJ2aWNlQnVzLmZldGNoXCI7XG4gICAgY29uc3QgY3R4ID0geyAuLi5zdWdnZXN0ZWRDdHgsIHRyYW5zYWN0aW9uSUQsIGNsaWVudFByb3ZlbmFuY2UgfTtcbiAgICBjb25zdCBmZXRjaFBheWxvYWQgPSB1YXNlLnByZXBhcmVGZXRjaFBheWxvYWQoY3R4LCB0aGlzKTtcbiAgICBjb25zdCBmZXRjaEluaXQgPSB1YXNlLnByZXBhcmVGZXRjaChcbiAgICAgIHRoaXMuYXJncy5mZXRjaEJhc2VVUkwsXG4gICAgICBmZXRjaFBheWxvYWQsXG4gICAgICBjdHgsXG4gICAgICB0aGlzLFxuICAgICk7XG4gICAgY29uc3QgZmV0Y2hEZXRhaWw6XG4gICAgICAmIEZldGNoQ3VzdG9tRXZlbnREZXRhaWw8Q29udGV4dD5cbiAgICAgICYgZ292bi5GZXRjaEluaXRcbiAgICAgICYgRmV0Y2hQYXlsb2FkU3VwcGxpZXI8VXNlckFnZW50UGF5bG9hZD4gPSB7XG4gICAgICAgIC4uLmZldGNoSW5pdCxcbiAgICAgICAgZmV0Y2hQYXlsb2FkLFxuICAgICAgICBjb250ZXh0OiBjdHgsXG4gICAgICAgIGZldGNoU3RyYXRlZ3k6IHRoaXMsXG4gICAgICB9O1xuICAgIHRoaXMuZGlzcGF0Y2hOYW1pbmdTdHJhdGVneUV2ZW50KFxuICAgICAgZmV0Y2hQYXlsb2FkLFxuICAgICAgdGhpcy5hcmdzLmV2ZW50TmFtZVN0cmF0ZWd5LmZldGNoLFxuICAgICAgZmV0Y2hEZXRhaWwsXG4gICAgKTtcblxuICAgIGZldGNoKGZldGNoSW5pdC5lbmRwb2ludCwgZmV0Y2hJbml0LnJlcXVlc3RJbml0KVxuICAgICAgLnRoZW4oKHJlc3ApID0+IHtcbiAgICAgICAgaWYgKHJlc3Aub2spIHtcbiAgICAgICAgICByZXNwLmpzb24oKS50aGVuKChmZXRjaFJlc3BSYXdKU09OKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmZXRjaFJlc3BQYXlsb2FkID0gdWFzZS5wcmVwYXJlRmV0Y2hSZXNwb25zZVBheWxvYWQoXG4gICAgICAgICAgICAgIGZldGNoUGF5bG9hZCxcbiAgICAgICAgICAgICAgZmV0Y2hSZXNwUmF3SlNPTixcbiAgICAgICAgICAgICAgY3R4LFxuICAgICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGNvbnN0IGZldGNoUmVzcERldGFpbDpcbiAgICAgICAgICAgICAgJiBGZXRjaEN1c3RvbUV2ZW50RGV0YWlsPENvbnRleHQ+XG4gICAgICAgICAgICAgICYgRmV0Y2hQYXlsb2FkU3VwcGxpZXI8VXNlckFnZW50UGF5bG9hZD5cbiAgICAgICAgICAgICAgJiBGZXRjaFJlc3BQYXlsb2FkU3VwcGxpZXI8U2VydmVyUmVzcFBheWxvYWQ+ID0ge1xuICAgICAgICAgICAgICAgIGZldGNoUGF5bG9hZCxcbiAgICAgICAgICAgICAgICBmZXRjaFJlc3BQYXlsb2FkLFxuICAgICAgICAgICAgICAgIGNvbnRleHQ6IGN0eCxcbiAgICAgICAgICAgICAgICBmZXRjaFN0cmF0ZWd5OiB0aGlzLFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaE5hbWluZ1N0cmF0ZWd5RXZlbnQoXG4gICAgICAgICAgICAgIGZldGNoUGF5bG9hZCxcbiAgICAgICAgICAgICAgdGhpcy5hcmdzLmV2ZW50TmFtZVN0cmF0ZWd5LmZldGNoUmVzcG9uc2UsXG4gICAgICAgICAgICAgIGZldGNoUmVzcERldGFpbCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgZmV0Y2hFcnJvckRldGFpbDpcbiAgICAgICAgICAgICYgRmV0Y2hDdXN0b21FdmVudERldGFpbDxDb250ZXh0PlxuICAgICAgICAgICAgJiBnb3ZuLkZldGNoSW5pdFxuICAgICAgICAgICAgJiBGZXRjaFBheWxvYWRTdXBwbGllcjxVc2VyQWdlbnRQYXlsb2FkPlxuICAgICAgICAgICAgJiBnb3ZuLkVycm9yU3VwcGxpZXIgPSB7XG4gICAgICAgICAgICAgIC4uLmZldGNoSW5pdCxcbiAgICAgICAgICAgICAgZmV0Y2hQYXlsb2FkLFxuICAgICAgICAgICAgICBjb250ZXh0OiBjdHgsXG4gICAgICAgICAgICAgIGVycm9yOiBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgYCR7ZmV0Y2hJbml0LmVuZHBvaW50fSBpbnZhbGlkIEhUVFAgc3RhdHVzICR7cmVzcC5zdGF0dXN9ICgke3Jlc3Auc3RhdHVzVGV4dH0pYCxcbiAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgZmV0Y2hTdHJhdGVneTogdGhpcyxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgdGhpcy5kaXNwYXRjaE5hbWluZ1N0cmF0ZWd5RXZlbnQoXG4gICAgICAgICAgICBmZXRjaFBheWxvYWQsXG4gICAgICAgICAgICB0aGlzLmFyZ3MuZXZlbnROYW1lU3RyYXRlZ3kuZmV0Y2hFcnJvcixcbiAgICAgICAgICAgIGZldGNoRXJyb3JEZXRhaWwsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgIGNvbnN0IGZldGNoRXJyb3JEZXRhaWw6XG4gICAgICAgICAgJiBGZXRjaEN1c3RvbUV2ZW50RGV0YWlsPENvbnRleHQ+XG4gICAgICAgICAgJiBnb3ZuLkZldGNoSW5pdFxuICAgICAgICAgICYgRmV0Y2hQYXlsb2FkU3VwcGxpZXI8VXNlckFnZW50UGF5bG9hZD5cbiAgICAgICAgICAmIGdvdm4uRXJyb3JTdXBwbGllciA9IHtcbiAgICAgICAgICAgIC4uLmZldGNoSW5pdCxcbiAgICAgICAgICAgIGZldGNoUGF5bG9hZCxcbiAgICAgICAgICAgIGNvbnRleHQ6IGN0eCxcbiAgICAgICAgICAgIGVycm9yLFxuICAgICAgICAgICAgZmV0Y2hTdHJhdGVneTogdGhpcyxcbiAgICAgICAgICB9O1xuICAgICAgICB0aGlzLmRpc3BhdGNoTmFtaW5nU3RyYXRlZ3lFdmVudChcbiAgICAgICAgICBmZXRjaFBheWxvYWQsXG4gICAgICAgICAgdGhpcy5hcmdzLmV2ZW50TmFtZVN0cmF0ZWd5LmZldGNoRXJyb3IsXG4gICAgICAgICAgZmV0Y2hFcnJvckRldGFpbCxcbiAgICAgICAgKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihgJHtmZXRjaEluaXQuZW5kcG9pbnR9IFBPU1QgZXJyb3JgLCBlcnJvciwgZmV0Y2hJbml0KTtcbiAgICAgIH0pO1xuICB9XG5cbiAgb2JzZXJ2ZUZldGNoRXZlbnQ8XG4gICAgRmV0Y2hQYXlsb2FkIGV4dGVuZHMgZ292bi5JZGVudGlmaWFibGVQYXlsb2FkLFxuICAgIENvbnRleHQsXG4gID4oXG4gICAgb2JzZXJ2ZXI6IGdvdm4uRmV0Y2hPYnNlcnZlcjxGZXRjaFBheWxvYWQsIENvbnRleHQ+LFxuICAgIHBheWxvYWRJZFN1cHBsaWVyPzpcbiAgICAgIHwgZ292bi5QYXlsb2FkSWRlbnRpdHlcbiAgICAgIHwgZ292bi5QYXlsb2FkU2VydmljZSxcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgcGF5bG9hZElEID0gcGF5bG9hZElkU3VwcGxpZXJcbiAgICAgID8gKHR5cGVvZiBwYXlsb2FkSWRTdXBwbGllciA9PT0gXCJzdHJpbmdcIlxuICAgICAgICA/IHBheWxvYWRJZFN1cHBsaWVyXG4gICAgICAgIDogcGF5bG9hZElkU3VwcGxpZXIucGF5bG9hZElkZW50aXR5KVxuICAgICAgOiB0aGlzLmFyZ3MuZXZlbnROYW1lU3RyYXRlZ3kudW5pdmVyc2FsU2NvcGVJRDtcbiAgICBjb25zdCBuYW1lcyA9IHRoaXMuYXJncy5ldmVudE5hbWVTdHJhdGVneS5mZXRjaChwYXlsb2FkSUQpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIG5hbWVzLnNlbGVjdGVkTmFtZSxcbiAgICAgIChldmVudCkgPT4ge1xuICAgICAgICBjb25zdCB0eXBlZEN1c3RvbUV2ZW50ID0gZXZlbnQgYXMgdW5rbm93biBhcyB7XG4gICAgICAgICAgZGV0YWlsOlxuICAgICAgICAgICAgJiBGZXRjaEN1c3RvbUV2ZW50RGV0YWlsPENvbnRleHQ+XG4gICAgICAgICAgICAmIGdvdm4uRmV0Y2hJbml0XG4gICAgICAgICAgICAmIEZldGNoUGF5bG9hZFN1cHBsaWVyPEZldGNoUGF5bG9hZD47XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHsgZmV0Y2hQYXlsb2FkLCByZXF1ZXN0SW5pdCwgY29udGV4dCwgZmV0Y2hTdHJhdGVneSB9ID1cbiAgICAgICAgICB0eXBlZEN1c3RvbUV2ZW50LmRldGFpbDtcbiAgICAgICAgb2JzZXJ2ZXIoZmV0Y2hQYXlsb2FkLCByZXF1ZXN0SW5pdCwgY29udGV4dCwgZmV0Y2hTdHJhdGVneSk7XG4gICAgICB9LFxuICAgICk7XG4gIH1cblxuICBvYnNlcnZlRmV0Y2hFdmVudFJlc3BvbnNlPFxuICAgIEZldGNoUGF5bG9hZCBleHRlbmRzIGdvdm4uSWRlbnRpZmlhYmxlUGF5bG9hZCxcbiAgICBGZXRjaFJlc3BQYXlsb2FkIGV4dGVuZHMgZ292bi5WYWxpZGF0ZWRQYXlsb2FkLFxuICAgIENvbnRleHQsXG4gID4oXG4gICAgb2JzZXJ2ZXI6IGdvdm4uRmV0Y2hSZXNwb25zZU9ic2VydmVyPFxuICAgICAgRmV0Y2hQYXlsb2FkLFxuICAgICAgRmV0Y2hSZXNwUGF5bG9hZCxcbiAgICAgIENvbnRleHRcbiAgICA+LFxuICAgIHBheWxvYWRJZFN1cHBsaWVyPzpcbiAgICAgIHwgZ292bi5QYXlsb2FkSWRlbnRpdHlcbiAgICAgIHwgZ292bi5QYXlsb2FkU2VydmljZSxcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgcGF5bG9hZElEID0gcGF5bG9hZElkU3VwcGxpZXJcbiAgICAgID8gKHR5cGVvZiBwYXlsb2FkSWRTdXBwbGllciA9PT0gXCJzdHJpbmdcIlxuICAgICAgICA/IHBheWxvYWRJZFN1cHBsaWVyXG4gICAgICAgIDogcGF5bG9hZElkU3VwcGxpZXIucGF5bG9hZElkZW50aXR5KVxuICAgICAgOiB0aGlzLmFyZ3MuZXZlbnROYW1lU3RyYXRlZ3kudW5pdmVyc2FsU2NvcGVJRDtcbiAgICBjb25zdCBuYW1lcyA9IHRoaXMuYXJncy5ldmVudE5hbWVTdHJhdGVneS5mZXRjaFJlc3BvbnNlKHBheWxvYWRJRCk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgbmFtZXMuc2VsZWN0ZWROYW1lLFxuICAgICAgKGV2ZW50KSA9PiB7XG4gICAgICAgIGNvbnN0IHR5cGVkQ3VzdG9tRXZlbnQgPSBldmVudCBhcyB1bmtub3duIGFzIHtcbiAgICAgICAgICBkZXRhaWw6XG4gICAgICAgICAgICAmIEZldGNoQ3VzdG9tRXZlbnREZXRhaWw8Q29udGV4dD5cbiAgICAgICAgICAgICYgRmV0Y2hSZXNwUGF5bG9hZFN1cHBsaWVyPEZldGNoUmVzcFBheWxvYWQ+XG4gICAgICAgICAgICAmIEZldGNoUGF5bG9hZFN1cHBsaWVyPEZldGNoUGF5bG9hZD47XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHsgZmV0Y2hQYXlsb2FkLCBmZXRjaFJlc3BQYXlsb2FkLCBjb250ZXh0LCBmZXRjaFN0cmF0ZWd5IH0gPVxuICAgICAgICAgIHR5cGVkQ3VzdG9tRXZlbnQuZGV0YWlsO1xuICAgICAgICBvYnNlcnZlcihmZXRjaFJlc3BQYXlsb2FkLCBmZXRjaFBheWxvYWQsIGNvbnRleHQsIGZldGNoU3RyYXRlZ3kpO1xuICAgICAgfSxcbiAgICApO1xuICB9XG5cbiAgb2JzZXJ2ZUZldGNoRXZlbnRFcnJvcjxcbiAgICBGZXRjaFBheWxvYWQgZXh0ZW5kcyBnb3ZuLklkZW50aWZpYWJsZVBheWxvYWQsXG4gICAgQ29udGV4dCxcbiAgPihcbiAgICBvYnNlcnZlcjogZ292bi5GZXRjaEVycm9yT2JzZXJ2ZXI8XG4gICAgICBGZXRjaFBheWxvYWQsXG4gICAgICBDb250ZXh0XG4gICAgPixcbiAgICBwYXlsb2FkSWRTdXBwbGllcj86XG4gICAgICB8IGdvdm4uUGF5bG9hZElkZW50aXR5XG4gICAgICB8IGdvdm4uUGF5bG9hZFNlcnZpY2UsXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHBheWxvYWRJRCA9IHBheWxvYWRJZFN1cHBsaWVyXG4gICAgICA/ICh0eXBlb2YgcGF5bG9hZElkU3VwcGxpZXIgPT09IFwic3RyaW5nXCJcbiAgICAgICAgPyBwYXlsb2FkSWRTdXBwbGllclxuICAgICAgICA6IHBheWxvYWRJZFN1cHBsaWVyLnBheWxvYWRJZGVudGl0eSlcbiAgICAgIDogdGhpcy5hcmdzLmV2ZW50TmFtZVN0cmF0ZWd5LnVuaXZlcnNhbFNjb3BlSUQ7XG4gICAgY29uc3QgbmFtZXMgPSB0aGlzLmFyZ3MuZXZlbnROYW1lU3RyYXRlZ3kuZmV0Y2hFcnJvcihwYXlsb2FkSUQpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIG5hbWVzLnNlbGVjdGVkTmFtZSxcbiAgICAgIChldmVudCkgPT4ge1xuICAgICAgICBjb25zdCB0eXBlZEN1c3RvbUV2ZW50ID0gZXZlbnQgYXMgdW5rbm93biBhcyB7XG4gICAgICAgICAgZGV0YWlsOlxuICAgICAgICAgICAgJiBGZXRjaEN1c3RvbUV2ZW50RGV0YWlsPENvbnRleHQ+XG4gICAgICAgICAgICAmIGdvdm4uRmV0Y2hJbml0XG4gICAgICAgICAgICAmIEZldGNoUGF5bG9hZFN1cHBsaWVyPEZldGNoUGF5bG9hZD5cbiAgICAgICAgICAgICYgZ292bi5FcnJvclN1cHBsaWVyO1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCB7IGZldGNoUGF5bG9hZCwgZXJyb3IsIHJlcXVlc3RJbml0LCBjb250ZXh0LCBmZXRjaFN0cmF0ZWd5IH0gPVxuICAgICAgICAgIHR5cGVkQ3VzdG9tRXZlbnQuZGV0YWlsO1xuICAgICAgICBvYnNlcnZlcihlcnJvciwgcmVxdWVzdEluaXQsIGZldGNoUGF5bG9hZCwgY29udGV4dCwgZmV0Y2hTdHJhdGVneSk7XG4gICAgICB9LFxuICAgICk7XG4gIH1cblxuICBvYnNlcnZlRXZlbnRTb3VyY2U8XG4gICAgRXZlbnRTb3VyY2VQYXlsb2FkIGV4dGVuZHMgZ292bi5WYWxpZGF0ZWRQYXlsb2FkLFxuICA+KFxuICAgIG9ic2VydmVyOiBnb3ZuLkV2ZW50U291cmNlT2JzZXJ2ZXI8RXZlbnRTb3VyY2VQYXlsb2FkPixcbiAgICBwYXlsb2FkSWRTdXBwbGllcj86XG4gICAgICB8IGdvdm4uUGF5bG9hZElkZW50aXR5XG4gICAgICB8IGdvdm4uUGF5bG9hZFNlcnZpY2UsXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHBheWxvYWRJRCA9IHBheWxvYWRJZFN1cHBsaWVyXG4gICAgICA/ICh0eXBlb2YgcGF5bG9hZElkU3VwcGxpZXIgPT09IFwic3RyaW5nXCJcbiAgICAgICAgPyBwYXlsb2FkSWRTdXBwbGllclxuICAgICAgICA6IHBheWxvYWRJZFN1cHBsaWVyLnBheWxvYWRJZGVudGl0eSlcbiAgICAgIDogdGhpcy5hcmdzLmV2ZW50TmFtZVN0cmF0ZWd5LnVuaXZlcnNhbFNjb3BlSUQ7XG4gICAgY29uc3QgbmFtZXMgPSB0aGlzLmFyZ3MuZXZlbnROYW1lU3RyYXRlZ3kuZXZlbnRTb3VyY2UocGF5bG9hZElEKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBuYW1lcy5zZWxlY3RlZE5hbWUsXG4gICAgICAoZXZlbnQpID0+IHtcbiAgICAgICAgY29uc3QgdHlwZWRDdXN0b21FdmVudCA9IGV2ZW50IGFzIHVua25vd24gYXMge1xuICAgICAgICAgIGRldGFpbDogRXZlbnRTb3VyY2VDdXN0b21FdmVudERldGFpbDxFdmVudFNvdXJjZVBheWxvYWQ+O1xuICAgICAgICB9O1xuICAgICAgICBsZXQgeyBldmVudFNyY1BheWxvYWQgfSA9IHR5cGVkQ3VzdG9tRXZlbnQuZGV0YWlsO1xuICAgICAgICBpZiAoZ292bi5pc0V2ZW50U291cmNlU2VydmljZTxFdmVudFNvdXJjZVBheWxvYWQ+KHBheWxvYWRJZFN1cHBsaWVyKSkge1xuICAgICAgICAgIGlmIChwYXlsb2FkSWRTdXBwbGllci5pc0V2ZW50U291cmNlUGF5bG9hZChldmVudFNyY1BheWxvYWQpKSB7XG4gICAgICAgICAgICBldmVudFNyY1BheWxvYWQgPSBwYXlsb2FkSWRTdXBwbGllci5wcmVwYXJlRXZlbnRTb3VyY2VQYXlsb2FkKFxuICAgICAgICAgICAgICBldmVudFNyY1BheWxvYWQsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgLy8gZm9yY2VmdWxseSBtdXRhdGUgYW5kIGxldCByZWNlaXZlcnMga25vdyBpdCdzIHZhbGlkYXRlZFxuICAgICAgICAgICAgKGV2ZW50U3JjUGF5bG9hZCBhcyB1bmtub3duIGFzIGdvdm4uTXV0YXRhYmxlVmFsaWRhdGVkUGF5bG9hZClcbiAgICAgICAgICAgICAgLmlzVmFsaWRhdGVkUGF5bG9hZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIG9ic2VydmVyKGV2ZW50U3JjUGF5bG9hZCwgdGhpcyk7XG4gICAgICB9LFxuICAgICk7XG4gIH1cblxuICBvYnNlcnZlRXZlbnRTb3VyY2VFcnJvcjxcbiAgICBFdmVudFNvdXJjZVBheWxvYWQgZXh0ZW5kcyBnb3ZuLklkZW50aWZpYWJsZVBheWxvYWQsXG4gID4oXG4gICAgb2JzZXJ2ZXI6IGdvdm4uRXZlbnRTb3VyY2VFcnJvck9ic2VydmVyPEV2ZW50U291cmNlUGF5bG9hZD4sXG4gICAgcGF5bG9hZElkU3VwcGxpZXI/OlxuICAgICAgfCBnb3ZuLlBheWxvYWRJZGVudGl0eVxuICAgICAgfCBnb3ZuLlBheWxvYWRTZXJ2aWNlLFxuICApIHtcbiAgICBjb25zdCBwYXlsb2FkSUQgPSBwYXlsb2FkSWRTdXBwbGllclxuICAgICAgPyAodHlwZW9mIHBheWxvYWRJZFN1cHBsaWVyID09PSBcInN0cmluZ1wiXG4gICAgICAgID8gcGF5bG9hZElkU3VwcGxpZXJcbiAgICAgICAgOiBwYXlsb2FkSWRTdXBwbGllci5wYXlsb2FkSWRlbnRpdHkpXG4gICAgICA6IHRoaXMuYXJncy5ldmVudE5hbWVTdHJhdGVneS51bml2ZXJzYWxTY29wZUlEO1xuICAgIGNvbnN0IG5hbWVzID0gdGhpcy5hcmdzLmV2ZW50TmFtZVN0cmF0ZWd5LmV2ZW50U291cmNlRXJyb3IocGF5bG9hZElEKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBuYW1lcy5zZWxlY3RlZE5hbWUsXG4gICAgICAoZXZlbnQpID0+IHtcbiAgICAgICAgY29uc3QgdHlwZWRDdXN0b21FdmVudCA9IGV2ZW50IGFzIHVua25vd24gYXMge1xuICAgICAgICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgICAgICAgZGV0YWlsOiBFdmVudFNvdXJjZUN1c3RvbUV2ZW50RGV0YWlsPGFueT4gJiBnb3ZuLkVycm9yU3VwcGxpZXI7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHsgZXZlbnRTcmNQYXlsb2FkLCBlcnJvciB9ID0gdHlwZWRDdXN0b21FdmVudC5kZXRhaWw7XG4gICAgICAgIG9ic2VydmVyKGVycm9yLCBldmVudFNyY1BheWxvYWQsIHRoaXMpO1xuICAgICAgfSxcbiAgICApO1xuICB9XG5cbiAgd2ViU29ja2V0U2VuZDxTZW5kUGF5bG9hZCBleHRlbmRzIGdvdm4uSWRlbnRpZmlhYmxlUGF5bG9hZCwgQ29udGV4dD4oXG4gICAgY29udGV4dDogQ29udGV4dCxcbiAgICB3c3M6IGdvdm4uV2ViU29ja2V0U2VuZFNlcnZpY2U8U2VuZFBheWxvYWQ+LFxuICApOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHdzIG9mIHRoaXMud3NUdW5uZWxzKSB7XG4gICAgICB3cy5hY3RpdmVTb2NrZXQ/LnNlbmQoXG4gICAgICAgIHdzcy5wcmVwYXJlV2ViU29ja2V0U2VuZChcbiAgICAgICAgICB3c3MucHJlcGFyZVdlYlNvY2tldFNlbmRQYXlsb2FkKGNvbnRleHQsIHRoaXMpLFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICksXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHByZXBhcmVXZWJTb2NrZXRSZWNlaXZlUGF5bG9hZDxSZWNlaXZlUGF5bG9hZD4oXG4gICAgd2ViU29ja2V0UmVjZWl2ZVJhdzogc3RyaW5nIHwgQXJyYXlCdWZmZXJMaWtlIHwgQmxvYiB8IEFycmF5QnVmZmVyVmlldyxcbiAgKSB7XG4gICAgaWYgKHR5cGVvZiB3ZWJTb2NrZXRSZWNlaXZlUmF3ICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgYHdlYlNvY2tldFJlY2VpdmVSYXcgbXVzdCBiZSB0ZXh0OyBUT0RPOiBhbGxvdyBiaW5hcnk/YCxcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBKU09OLnBhcnNlKHdlYlNvY2tldFJlY2VpdmVSYXcpIGFzIFJlY2VpdmVQYXlsb2FkO1xuICB9XG5cbiAgb2JzZXJ2ZVdlYlNvY2tldFNlbmRFdmVudDxcbiAgICBTZW5kUGF5bG9hZCBleHRlbmRzIGdvdm4uSWRlbnRpZmlhYmxlUGF5bG9hZCxcbiAgICBDb250ZXh0LFxuICA+KFxuICAgIG9ic2VydmVyOiBnb3ZuLldlYlNvY2tldFNlbmRPYnNlcnZlcjxTZW5kUGF5bG9hZCwgQ29udGV4dD4sXG4gICAgcGF5bG9hZElkU3VwcGxpZXI/OlxuICAgICAgfCBnb3ZuLlBheWxvYWRJZGVudGl0eVxuICAgICAgfCBnb3ZuLlBheWxvYWRTZXJ2aWNlLFxuICApOiB2b2lkIHtcbiAgICBjb25zdCBwYXlsb2FkSUQgPSBwYXlsb2FkSWRTdXBwbGllclxuICAgICAgPyAodHlwZW9mIHBheWxvYWRJZFN1cHBsaWVyID09PSBcInN0cmluZ1wiXG4gICAgICAgID8gcGF5bG9hZElkU3VwcGxpZXJcbiAgICAgICAgOiBwYXlsb2FkSWRTdXBwbGllci5wYXlsb2FkSWRlbnRpdHkpXG4gICAgICA6IHRoaXMuYXJncy5ldmVudE5hbWVTdHJhdGVneS51bml2ZXJzYWxTY29wZUlEO1xuICAgIGNvbnN0IG5hbWVzID0gdGhpcy5hcmdzLmV2ZW50TmFtZVN0cmF0ZWd5LndlYlNvY2tldChwYXlsb2FkSUQpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIG5hbWVzLnNlbGVjdGVkTmFtZSxcbiAgICAgIChldmVudCkgPT4ge1xuICAgICAgICBjb25zdCB0eXBlZEN1c3RvbUV2ZW50ID0gZXZlbnQgYXMgdW5rbm93biBhcyB7XG4gICAgICAgICAgZGV0YWlsOiBXZWJTb2NrZXRTZW5kQ3VzdG9tRXZlbnREZXRhaWw8U2VuZFBheWxvYWQsIENvbnRleHQ+O1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCB7IGNvbnRleHQsIHBheWxvYWQsIHdlYlNvY2tldFN0cmF0ZWd5IH0gPSB0eXBlZEN1c3RvbUV2ZW50LmRldGFpbDtcbiAgICAgICAgb2JzZXJ2ZXIocGF5bG9hZCwgY29udGV4dCwgd2ViU29ja2V0U3RyYXRlZ3kpO1xuICAgICAgfSxcbiAgICApO1xuICB9XG5cbiAgb2JzZXJ2ZVdlYlNvY2tldFJlY2VpdmVFdmVudDxcbiAgICBSZWNlaXZlUGF5bG9hZCBleHRlbmRzIGdvdm4uVmFsaWRhdGVkUGF5bG9hZCxcbiAgPihcbiAgICBvYnNlcnZlcjogZ292bi5XZWJTb2NrZXRSZWNlaXZlT2JzZXJ2ZXI8UmVjZWl2ZVBheWxvYWQ+LFxuICAgIHBheWxvYWRJZFN1cHBsaWVyPzpcbiAgICAgIHwgZ292bi5QYXlsb2FkSWRlbnRpdHlcbiAgICAgIHwgZ292bi5QYXlsb2FkU2VydmljZSxcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgcGF5bG9hZElEID0gcGF5bG9hZElkU3VwcGxpZXJcbiAgICAgID8gKHR5cGVvZiBwYXlsb2FkSWRTdXBwbGllciA9PT0gXCJzdHJpbmdcIlxuICAgICAgICA/IHBheWxvYWRJZFN1cHBsaWVyXG4gICAgICAgIDogcGF5bG9hZElkU3VwcGxpZXIucGF5bG9hZElkZW50aXR5KVxuICAgICAgOiB0aGlzLmFyZ3MuZXZlbnROYW1lU3RyYXRlZ3kudW5pdmVyc2FsU2NvcGVJRDtcbiAgICBjb25zdCBuYW1lcyA9IHRoaXMuYXJncy5ldmVudE5hbWVTdHJhdGVneS53ZWJTb2NrZXQocGF5bG9hZElEKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBuYW1lcy5zZWxlY3RlZE5hbWUsXG4gICAgICAoZXZlbnQpID0+IHtcbiAgICAgICAgY29uc3QgdHlwZWRDdXN0b21FdmVudCA9IGV2ZW50IGFzIHVua25vd24gYXMge1xuICAgICAgICAgIGRldGFpbDogV2ViU29ja2V0UmVjZWl2ZUN1c3RvbUV2ZW50RGV0YWlsPFJlY2VpdmVQYXlsb2FkPjtcbiAgICAgICAgfTtcbiAgICAgICAgbGV0IHsgcGF5bG9hZCB9ID0gdHlwZWRDdXN0b21FdmVudC5kZXRhaWw7XG4gICAgICAgIGlmIChnb3ZuLmlzRXZlbnRTb3VyY2VTZXJ2aWNlPFJlY2VpdmVQYXlsb2FkPihwYXlsb2FkSWRTdXBwbGllcikpIHtcbiAgICAgICAgICBpZiAocGF5bG9hZElkU3VwcGxpZXIuaXNFdmVudFNvdXJjZVBheWxvYWQocGF5bG9hZCkpIHtcbiAgICAgICAgICAgIHBheWxvYWQgPSBwYXlsb2FkSWRTdXBwbGllci5wcmVwYXJlRXZlbnRTb3VyY2VQYXlsb2FkKFxuICAgICAgICAgICAgICBwYXlsb2FkLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIGZvcmNlZnVsbHkgbXV0YXRlIGFuZCBsZXQgcmVjZWl2ZXJzIGtub3cgaXQncyB2YWxpZGF0ZWRcbiAgICAgICAgICAgIChwYXlsb2FkIGFzIHVua25vd24gYXMgZ292bi5NdXRhdGFibGVWYWxpZGF0ZWRQYXlsb2FkKVxuICAgICAgICAgICAgICAuaXNWYWxpZGF0ZWRQYXlsb2FkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgb2JzZXJ2ZXIocGF5bG9hZCwgdGhpcyk7XG4gICAgICB9LFxuICAgICk7XG4gIH1cblxuICBvYnNlcnZlV2ViU29ja2V0RXJyb3JFdmVudDxQYXlsb2FkIGV4dGVuZHMgZ292bi5JZGVudGlmaWFibGVQYXlsb2FkPihcbiAgICBvYnNlcnZlcjogZ292bi5XZWJTb2NrZXRFcnJvck9ic2VydmVyPFBheWxvYWQ+LFxuICAgIHBheWxvYWRJZFN1cHBsaWVyPzpcbiAgICAgIHwgZ292bi5QYXlsb2FkSWRlbnRpdHlcbiAgICAgIHwgZ292bi5QYXlsb2FkU2VydmljZSxcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgcGF5bG9hZElEID0gcGF5bG9hZElkU3VwcGxpZXJcbiAgICAgID8gKHR5cGVvZiBwYXlsb2FkSWRTdXBwbGllciA9PT0gXCJzdHJpbmdcIlxuICAgICAgICA/IHBheWxvYWRJZFN1cHBsaWVyXG4gICAgICAgIDogcGF5bG9hZElkU3VwcGxpZXIucGF5bG9hZElkZW50aXR5KVxuICAgICAgOiB0aGlzLmFyZ3MuZXZlbnROYW1lU3RyYXRlZ3kudW5pdmVyc2FsU2NvcGVJRDtcbiAgICBjb25zdCBuYW1lcyA9IHRoaXMuYXJncy5ldmVudE5hbWVTdHJhdGVneS53ZWJTb2NrZXRFcnJvcihwYXlsb2FkSUQpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIG5hbWVzLnNlbGVjdGVkTmFtZSxcbiAgICAgIChldmVudCkgPT4ge1xuICAgICAgICBjb25zdCB0eXBlZEN1c3RvbUV2ZW50ID0gZXZlbnQgYXMgdW5rbm93biBhcyB7XG4gICAgICAgICAgZGV0YWlsOiBnb3ZuLkVycm9yU3VwcGxpZXI7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHsgZXJyb3IgfSA9IHR5cGVkQ3VzdG9tRXZlbnQuZGV0YWlsO1xuICAgICAgICBvYnNlcnZlcihlcnJvciwgdW5kZWZpbmVkLCB0aGlzKTtcbiAgICAgIH0sXG4gICAgKTtcbiAgfVxufVxuIiwiaW1wb3J0ICogYXMgYyBmcm9tIFwiLi9jb25uZWN0aW9uLnRzXCI7XG5pbXBvcnQgKiBhcyBzYWZldHkgZnJvbSBcIi4uLy4uL3NhZmV0eS9tb2QudHNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBXZWJTb2NrZXRDb25uZWN0aW9uU3RhdGUge1xuICByZWFkb25seSBpc0Nvbm5lY3Rpb25TdGF0ZTogdHJ1ZTtcbiAgcmVhZG9ubHkgaXNIZWFsdGh5PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXZWJTb2NrZXRDb25uZWN0aW9uSGVhbHRoeSBleHRlbmRzIFdlYlNvY2tldENvbm5lY3Rpb25TdGF0ZSB7XG4gIHJlYWRvbmx5IGlzSGVhbHRoeTogdHJ1ZTtcbiAgcmVhZG9ubHkgY29ubkVzdGFibGlzaGVkT246IERhdGU7XG4gIHJlYWRvbmx5IGVuZHBvaW50VVJMOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHBpbmdVUkw6IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IGlzV2ViU29ja2V0Q29ubmVjdGlvbkhlYWx0aHkgPSBzYWZldHkudHlwZUd1YXJkPFxuICBXZWJTb2NrZXRDb25uZWN0aW9uSGVhbHRoeVxuPihcImlzSGVhbHRoeVwiLCBcImNvbm5Fc3RhYmxpc2hlZE9uXCIpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFdlYlNvY2tldENvbm5lY3Rpb25VbmhlYWx0aHkgZXh0ZW5kcyBXZWJTb2NrZXRDb25uZWN0aW9uU3RhdGUge1xuICByZWFkb25seSBpc0hlYWx0aHk6IGZhbHNlO1xuICByZWFkb25seSBjb25uRmFpbGVkT246IERhdGU7XG4gIHJlYWRvbmx5IHJlY29ubmVjdFN0cmF0ZWd5PzogYy5SZWNvbm5lY3Rpb25TdHJhdGVneTtcbn1cblxuZXhwb3J0IGNvbnN0IGlzV2ViU29ja2V0Q29ubmVjdGlvblVuaGVhbHRoeSA9IHNhZmV0eS50eXBlR3VhcmQ8XG4gIFdlYlNvY2tldENvbm5lY3Rpb25VbmhlYWx0aHlcbj4oXCJpc0hlYWx0aHlcIiwgXCJjb25uRmFpbGVkT25cIik7XG5cbmV4cG9ydCBjb25zdCBpc1dlYlNvY2tldFJlY29ubmVjdGluZyA9IHNhZmV0eS50eXBlR3VhcmQ8XG4gIFdlYlNvY2tldENvbm5lY3Rpb25VbmhlYWx0aHlcbj4oXCJpc0hlYWx0aHlcIiwgXCJjb25uRmFpbGVkT25cIiwgXCJyZWNvbm5lY3RTdHJhdGVneVwiKTtcblxuZXhwb3J0IGludGVyZmFjZSBXZWJTb2NrZXRFcnJvckV2ZW50U3VwcGxpZXJcbiAgZXh0ZW5kcyBXZWJTb2NrZXRDb25uZWN0aW9uVW5oZWFsdGh5IHtcbiAgcmVhZG9ubHkgaXNFdmVudFNvdXJjZUVycm9yOiB0cnVlO1xuICByZWFkb25seSBlcnJvckV2ZW50OiBFdmVudDtcbn1cblxuZXhwb3J0IGNvbnN0IGlzV2ViU29ja2V0RXJyb3JFdmVudFN1cHBsaWVyID0gc2FmZXR5LnR5cGVHdWFyZDxcbiAgV2ViU29ja2V0RXJyb3JFdmVudFN1cHBsaWVyXG4+KFwiaXNFdmVudFNvdXJjZUVycm9yXCIsIFwiZXJyb3JFdmVudFwiKTtcblxuZXhwb3J0IGludGVyZmFjZSBXZWJTb2NrZXRDbG9zZUV2ZW50U3VwcGxpZXJcbiAgZXh0ZW5kcyBXZWJTb2NrZXRDb25uZWN0aW9uVW5oZWFsdGh5IHtcbiAgcmVhZG9ubHkgaXNDbG9zZUV2ZW50OiB0cnVlO1xuICByZWFkb25seSBjbG9zZUV2ZW50OiBDbG9zZUV2ZW50O1xufVxuXG5leHBvcnQgY29uc3QgaXNXZWJTb2NrZXRDbG9zZUV2ZW50U3VwcGxpZXIgPSBzYWZldHkudHlwZUd1YXJkPFxuICBXZWJTb2NrZXRDbG9zZUV2ZW50U3VwcGxpZXJcbj4oXCJpc0Nsb3NlRXZlbnRcIiwgXCJjbG9zZUV2ZW50XCIpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFdlYlNvY2tldEVuZHBvaW50VW5hdmFpbGFibGUge1xuICByZWFkb25seSBpc0VuZHBvaW50VW5hdmFpbGFibGU6IHRydWU7XG4gIHJlYWRvbmx5IGVuZHBvaW50VVJMOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHBpbmdVUkw6IHN0cmluZztcbiAgcmVhZG9ubHkgaHR0cFN0YXR1cz86IG51bWJlcjtcbiAgcmVhZG9ubHkgaHR0cFN0YXR1c1RleHQ/OiBzdHJpbmc7XG4gIHJlYWRvbmx5IGNvbm5lY3Rpb25FcnJvcj86IEVycm9yO1xufVxuXG5leHBvcnQgY29uc3QgaXNXZWJTb2NrZXRFbmRwb2ludFVuYXZhaWxhYmxlID0gc2FmZXR5LnR5cGVHdWFyZDxcbiAgV2ViU29ja2V0RW5kcG9pbnRVbmF2YWlsYWJsZVxuPihcImlzRW5kcG9pbnRVbmF2YWlsYWJsZVwiLCBcImVuZHBvaW50VVJMXCIpO1xuXG4vKipcbiAqIFdlYlNvY2tldEZhY3Rvcnkgd2lsbCBiZSBjYWxsZWQgdXBvbiBlYWNoIGNvbm5lY3Rpb24gb2YgV1MuIEl0J3MgaW1wb3J0YW50XG4gKiB0aGF0IHRoaXMgZmFjdG9yeSBzZXR1cCB0aGUgZnVsbCBXZWJTb2NrZXQsIGluY2x1ZGluZyBhbnkgb25tZXNzYWdlIG9yXG4gKiBldmVudCBsaXN0ZW5lcnMgYmVjYXVzZSByZWNvbm5lY3Rpb25zIHdpbGwgY2xvc2UgcHJldmlvdXMgV1NzIGFuZCByZWNyZWF0ZVxuICogdGhlIFdlYlNvY2tldCBldmVyeSB0aW1lIGEgY29ubmVjdGlvbiBpcyBcImJyb2tlblwiLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdlYlNvY2tldEZhY3Rvcnkge1xuICBjb25zdHJ1Y3Q6IChlc1VSTDogc3RyaW5nKSA9PiBXZWJTb2NrZXQ7XG4gIGNvbm5lY3RlZD86IChlczogV2ViU29ja2V0KSA9PiB2b2lkO1xufVxuXG5pbnRlcmZhY2UgQ29ubmVjdGlvblN0YXRlQ2hhbmdlTm90aWZpY2F0aW9uIHtcbiAgKFxuICAgIGFjdGl2ZTogV2ViU29ja2V0Q29ubmVjdGlvblN0YXRlLFxuICAgIHByZXZpb3VzOiBXZWJTb2NrZXRDb25uZWN0aW9uU3RhdGUsXG4gICAgdHVubmVsOiBXZWJTb2NrZXRUdW5uZWwsXG4gICk6IHZvaWQ7XG59XG5cbmludGVyZmFjZSBSZWNvbm5lY3Rpb25TdGF0ZUNoYW5nZU5vdGlmaWNhdGlvbiB7XG4gIChcbiAgICBhY3RpdmU6IGMuUmVjb25uZWN0aW9uU3RhdGUsXG4gICAgcHJldmlvdXM6IGMuUmVjb25uZWN0aW9uU3RhdGUsXG4gICAgcnM6IGMuUmVjb25uZWN0aW9uU3RyYXRlZ3ksXG4gICAgdHVubmVsOiBXZWJTb2NrZXRUdW5uZWwsXG4gICk6IHZvaWQ7XG59XG5cbmludGVyZmFjZSBBbGxvd0Nsb3NlU3VwcGxpZXIge1xuICAoZXZlbnQ6IENsb3NlRXZlbnQsIHR1bm5lbDogV2ViU29ja2V0VHVubmVsKTogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXZWJTb2NrZXRTdGF0ZUluaXQge1xuICByZWFkb25seSB3c1VSTDogc3RyaW5nO1xuICByZWFkb25seSB3c0VuZHBvaW50VmFsaWRhdG9yOiBjLkNvbm5lY3Rpb25WYWxpZGF0b3I7XG4gIHJlYWRvbmx5IHdlYlNvY2tldEZhY3Rvcnk6IFdlYlNvY2tldEZhY3Rvcnk7XG4gIHJlYWRvbmx5IG9wdGlvbnM/OiB7XG4gICAgcmVhZG9ubHkgb25Db25uU3RhdGVDaGFuZ2U/OiBDb25uZWN0aW9uU3RhdGVDaGFuZ2VOb3RpZmljYXRpb247XG4gICAgcmVhZG9ubHkgb25SZWNvbm5TdGF0ZUNoYW5nZT86IFJlY29ubmVjdGlvblN0YXRlQ2hhbmdlTm90aWZpY2F0aW9uO1xuICAgIHJlYWRvbmx5IGFsbG93Q2xvc2U/OiBBbGxvd0Nsb3NlU3VwcGxpZXI7XG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBXZWJTb2NrZXRUdW5uZWwge1xuICByZWFkb25seSB3c1VSTDogc3RyaW5nO1xuICByZWFkb25seSB3c0VuZHBvaW50VmFsaWRhdG9yOiBjLkNvbm5lY3Rpb25WYWxpZGF0b3I7XG4gIHJlYWRvbmx5IG9ic2VydmVyVW5pdmVyc2FsU2NvcGVJRDogXCJ1bml2ZXJzYWxcIiA9IFwidW5pdmVyc2FsXCI7XG4gIHJlYWRvbmx5IHdlYlNvY2tldEZhY3Rvcnk6IFdlYlNvY2tldEZhY3Rvcnk7XG4gIHJlYWRvbmx5IG9uQ29ublN0YXRlQ2hhbmdlPzogQ29ubmVjdGlvblN0YXRlQ2hhbmdlTm90aWZpY2F0aW9uO1xuICByZWFkb25seSBvblJlY29ublN0YXRlQ2hhbmdlPzogUmVjb25uZWN0aW9uU3RhdGVDaGFuZ2VOb3RpZmljYXRpb247XG4gIHJlYWRvbmx5IGFsbG93Q2xvc2U/OiBBbGxvd0Nsb3NlU3VwcGxpZXI7XG5cbiAgI2FjdGl2ZVNvY2tldD86IFdlYlNvY2tldDtcbiAgLy8gaXNIZWFsdGh5IGNhbiBiZSB0cnVlIG9yIGZhbHNlIGZvciBrbm93biBzdGF0ZXMsIG9yIHVuZGVmaW5lZCBhdCBpbml0XG4gIC8vIGZvciBcInVua25vd25cIiBzdGF0ZVxuICAjY29ubmVjdGlvblN0YXRlOiBXZWJTb2NrZXRDb25uZWN0aW9uU3RhdGUgPSB7IGlzQ29ubmVjdGlvblN0YXRlOiB0cnVlIH07XG4gICNyZWNvbm5TdHJhdGVneT86IGMuUmVjb25uZWN0aW9uU3RyYXRlZ3k7XG5cbiAgY29uc3RydWN0b3IoaW5pdDogV2ViU29ja2V0U3RhdGVJbml0KSB7XG4gICAgdGhpcy53c1VSTCA9IGluaXQud3NVUkw7XG4gICAgdGhpcy53c0VuZHBvaW50VmFsaWRhdG9yID0gaW5pdC53c0VuZHBvaW50VmFsaWRhdG9yO1xuICAgIHRoaXMud2ViU29ja2V0RmFjdG9yeSA9IGluaXQud2ViU29ja2V0RmFjdG9yeTtcbiAgICB0aGlzLm9uQ29ublN0YXRlQ2hhbmdlID0gaW5pdC5vcHRpb25zPy5vbkNvbm5TdGF0ZUNoYW5nZTtcbiAgICB0aGlzLm9uUmVjb25uU3RhdGVDaGFuZ2UgPSBpbml0Lm9wdGlvbnM/Lm9uUmVjb25uU3RhdGVDaGFuZ2U7XG4gICAgdGhpcy5hbGxvd0Nsb3NlID0gaW5pdC5vcHRpb25zPy5hbGxvd0Nsb3NlO1xuICB9XG5cbiAgaXNSZWNvbm5lY3RpbmcoKTogYy5SZWNvbm5lY3Rpb25TdHJhdGVneSB8IGZhbHNlIHtcbiAgICByZXR1cm4gdGhpcy4jcmVjb25uU3RyYXRlZ3kgPyB0aGlzLiNyZWNvbm5TdHJhdGVneSA6IGZhbHNlO1xuICB9XG5cbiAgaXNSZWNvbm5lY3RBYm9ydGVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLiNyZWNvbm5TdHJhdGVneSAmJiB0aGlzLiNyZWNvbm5TdHJhdGVneS5pc0Fib3J0ZWRcbiAgICAgID8gdHJ1ZVxuICAgICAgOiBmYWxzZTtcbiAgfVxuXG4gIGNvbm5lY3RlZCh3czogV2ViU29ja2V0LCBjb25uU3RhdGU6IFdlYlNvY2tldENvbm5lY3Rpb25IZWFsdGh5KSB7XG4gICAgaWYgKHRoaXMuI3JlY29ublN0cmF0ZWd5KSB0aGlzLiNyZWNvbm5TdHJhdGVneS5jb21wbGV0ZWQoKTtcbiAgICB0aGlzLndlYlNvY2tldEZhY3RvcnkuY29ubmVjdGVkPy4od3MpO1xuXG4gICAgLy8gdXBkYXRlIG1lc3NhZ2VzIGFuZCBsaXN0ZW5lcnMgYXMgdG8gb3VyIG5ldyBzdGF0ZTsgYXQgdGhpcyBwb2ludCB0aGVcbiAgICAvLyByZWNvbm5lY3Rpb24gc3RhdGUgaW4gdGhpcy4jcmVjb25uU3RyYXRlZ3kgaXMgYXZhaWxhYmxlXG4gICAgdGhpcy5jb25uZWN0aW9uU3RhdGUgPSBjb25uU3RhdGU7XG5cbiAgICAvLyBub3cgcmVzZXQgdGhlIHJlY29ubmVjdGlvbiBzdHJhdGVneSBiZWNhdXNlIG1lc3NhZ2VzIGFyZSB1cGRhdGVkXG4gICAgdGhpcy4jcmVjb25uU3RyYXRlZ3kgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBwcmVwYXJlUmVjb25uZWN0KGNvbm5TdGF0ZTogV2ViU29ja2V0Q29ubmVjdGlvblVuaGVhbHRoeSkge1xuICAgIHRoaXMuI3JlY29ublN0cmF0ZWd5ID0gdGhpcy4jcmVjb25uU3RyYXRlZ3kgPz8gbmV3IGMuUmVjb25uZWN0aW9uU3RyYXRlZ3koe1xuICAgICAgb25TdGF0ZUNoYW5nZTogdGhpcy5vblJlY29ublN0YXRlQ2hhbmdlXG4gICAgICAgID8gKGFjdGl2ZSwgcHJldmlvdXMsIHJzKSA9PiB7XG4gICAgICAgICAgdGhpcy5vblJlY29ublN0YXRlQ2hhbmdlPy4oYWN0aXZlLCBwcmV2aW91cywgcnMsIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIDogdW5kZWZpbmVkLFxuICAgIH0pO1xuICAgIGNvbm5TdGF0ZSA9IHtcbiAgICAgIC4uLmNvbm5TdGF0ZSxcbiAgICAgIHJlY29ubmVjdFN0cmF0ZWd5OiB0aGlzLiNyZWNvbm5TdHJhdGVneSxcbiAgICB9O1xuICAgIHRoaXMuY29ubmVjdGlvblN0YXRlID0gY29ublN0YXRlO1xuICAgIHJldHVybiB0aGlzLiNyZWNvbm5TdHJhdGVneS5yZWNvbm5lY3QoKTtcbiAgfVxuXG4gIGluaXQoKSB7XG4gICAgaWYgKHRoaXMuaXNSZWNvbm5lY3RBYm9ydGVkKCkpIHJldHVybjtcblxuICAgIHRoaXMud3NFbmRwb2ludFZhbGlkYXRvci52YWxpZGF0ZSh0aGlzLiNyZWNvbm5TdHJhdGVneSkudGhlbigocmVzcCkgPT4ge1xuICAgICAgaWYgKHJlc3Aub2spIHtcbiAgICAgICAgLy8gZ2FyYmFnZSBjb2xsZWN0aW9uIGlmIG9uZSBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAodGhpcy4jYWN0aXZlU29ja2V0KSB0aGlzLiNhY3RpdmVTb2NrZXQuY2xvc2UoKTtcbiAgICAgICAgdGhpcy4jYWN0aXZlU29ja2V0ID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIC8vIHRoaXMuZXZlbnRTb3VyY2VGYWN0b3J5KCkgc2hvdWxkIGFzc2lnbiBvbm1lc3NhZ2UgYnkgZGVmYXVsdFxuICAgICAgICBjb25zdCB3cyA9IHRoaXMuI2FjdGl2ZVNvY2tldCA9IHRoaXMud2ViU29ja2V0RmFjdG9yeS5jb25zdHJ1Y3QoXG4gICAgICAgICAgdGhpcy53c1VSTCxcbiAgICAgICAgKTtcblxuICAgICAgICB3cy5vbm9wZW4gPSAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5jb25uZWN0ZWQod3MsIHtcbiAgICAgICAgICAgIGlzQ29ubmVjdGlvblN0YXRlOiB0cnVlLFxuICAgICAgICAgICAgaXNIZWFsdGh5OiB0cnVlLFxuICAgICAgICAgICAgY29ubkVzdGFibGlzaGVkT246IG5ldyBEYXRlKCksXG4gICAgICAgICAgICBlbmRwb2ludFVSTDogdGhpcy53c1VSTCxcbiAgICAgICAgICAgIHBpbmdVUkw6IHRoaXMud3NFbmRwb2ludFZhbGlkYXRvci52YWxpZGF0aW9uRW5kcG9pbnRVUkwudG9TdHJpbmcoKSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB3cy5vbmNsb3NlID0gKGV2ZW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgYWxsb3dDbG9zZSA9IHRoaXMuYWxsb3dDbG9zZT8uKGV2ZW50LCB0aGlzKSA/PyBmYWxzZTtcbiAgICAgICAgICBpZiAoIWFsbG93Q2xvc2UpIHtcbiAgICAgICAgICAgIC8vIGlmIHdlIHdhbnQgYSBwZXJtYW5lbnQgY29ubmVjdGlvbiBnbyBhaGVhZCBhbmQgcmVjb25uZWN0IG5vd1xuICAgICAgICAgICAgY29uc3QgY29ublN0YXRlOiBXZWJTb2NrZXRDbG9zZUV2ZW50U3VwcGxpZXIgPSB7XG4gICAgICAgICAgICAgIGlzQ29ubmVjdGlvblN0YXRlOiB0cnVlLFxuICAgICAgICAgICAgICBpc0hlYWx0aHk6IGZhbHNlLFxuICAgICAgICAgICAgICBjb25uRmFpbGVkT246IG5ldyBEYXRlKCksXG4gICAgICAgICAgICAgIGlzQ2xvc2VFdmVudDogdHJ1ZSxcbiAgICAgICAgICAgICAgY2xvc2VFdmVudDogZXZlbnQsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29uc3QgcmVjb25uZWN0U3RyYXRlZ3kgPSB0aGlzLnByZXBhcmVSZWNvbm5lY3QoY29ublN0YXRlKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5pbml0KCksIHJlY29ubmVjdFN0cmF0ZWd5LmludGVydmFsTWlsbGVjcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHdzLm9uZXJyb3IgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICB3cy5jbG9zZSgpO1xuICAgICAgICAgIGNvbnN0IGNvbm5TdGF0ZTogV2ViU29ja2V0RXJyb3JFdmVudFN1cHBsaWVyID0ge1xuICAgICAgICAgICAgaXNDb25uZWN0aW9uU3RhdGU6IHRydWUsXG4gICAgICAgICAgICBpc0hlYWx0aHk6IGZhbHNlLFxuICAgICAgICAgICAgY29ubkZhaWxlZE9uOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgaXNFdmVudFNvdXJjZUVycm9yOiB0cnVlLFxuICAgICAgICAgICAgZXJyb3JFdmVudDogZXZlbnQsXG4gICAgICAgICAgfTtcbiAgICAgICAgICBjb25zdCByZWNvbm5lY3RTdHJhdGVneSA9IHRoaXMucHJlcGFyZVJlY29ubmVjdChjb25uU3RhdGUpO1xuICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5pbml0KCksIHJlY29ubmVjdFN0cmF0ZWd5LmludGVydmFsTWlsbGVjcyk7XG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBjb25uU3RhdGU6XG4gICAgICAgICAgJiBXZWJTb2NrZXRDb25uZWN0aW9uVW5oZWFsdGh5XG4gICAgICAgICAgJiBXZWJTb2NrZXRFbmRwb2ludFVuYXZhaWxhYmxlID0ge1xuICAgICAgICAgICAgaXNDb25uZWN0aW9uU3RhdGU6IHRydWUsXG4gICAgICAgICAgICBpc0hlYWx0aHk6IGZhbHNlLFxuICAgICAgICAgICAgY29ubkZhaWxlZE9uOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgaXNFbmRwb2ludFVuYXZhaWxhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZW5kcG9pbnRVUkw6IHRoaXMud3NVUkwsXG4gICAgICAgICAgICBwaW5nVVJMOiB0aGlzLndzRW5kcG9pbnRWYWxpZGF0b3IudmFsaWRhdGlvbkVuZHBvaW50VVJMLnRvU3RyaW5nKCksXG4gICAgICAgICAgICBodHRwU3RhdHVzOiByZXNwLnN0YXR1cyxcbiAgICAgICAgICAgIGh0dHBTdGF0dXNUZXh0OiByZXNwLnN0YXR1c1RleHQsXG4gICAgICAgICAgfTtcbiAgICAgICAgY29uc3QgcmVjb25uZWN0U3RyYXRlZ3kgPSB0aGlzLnByZXBhcmVSZWNvbm5lY3QoY29ublN0YXRlKTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmluaXQoKSwgcmVjb25uZWN0U3RyYXRlZ3kuaW50ZXJ2YWxNaWxsZWNzKTtcbiAgICAgIH1cbiAgICB9KS5jYXRjaCgoY29ubmVjdGlvbkVycm9yOiBFcnJvcikgPT4ge1xuICAgICAgY29uc3QgY29ublN0YXRlOlxuICAgICAgICAmIFdlYlNvY2tldENvbm5lY3Rpb25VbmhlYWx0aHlcbiAgICAgICAgJiBXZWJTb2NrZXRFbmRwb2ludFVuYXZhaWxhYmxlID0ge1xuICAgICAgICAgIGlzQ29ubmVjdGlvblN0YXRlOiB0cnVlLFxuICAgICAgICAgIGlzSGVhbHRoeTogZmFsc2UsXG4gICAgICAgICAgY29ubkZhaWxlZE9uOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgIHBpbmdVUkw6IHRoaXMud3NFbmRwb2ludFZhbGlkYXRvci52YWxpZGF0aW9uRW5kcG9pbnRVUkwudG9TdHJpbmcoKSxcbiAgICAgICAgICBjb25uZWN0aW9uRXJyb3IsXG4gICAgICAgICAgaXNFbmRwb2ludFVuYXZhaWxhYmxlOiB0cnVlLFxuICAgICAgICAgIGVuZHBvaW50VVJMOiB0aGlzLndzVVJMLFxuICAgICAgICB9O1xuICAgICAgY29uc3QgcmVjb25uZWN0U3RyYXRlZ3kgPSB0aGlzLnByZXBhcmVSZWNvbm5lY3QoY29ublN0YXRlKTtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5pbml0KCksIHJlY29ubmVjdFN0cmF0ZWd5LmludGVydmFsTWlsbGVjcyk7XG4gICAgfSk7XG5cbiAgICAvLyB3ZSByZXR1cm4gJ3RoaXMnIHRvIGFsbG93IGNvbnZlbmllbnQgbWV0aG9kIGNoYWluaW5nXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBnZXQgYWN0aXZlU29ja2V0KCkge1xuICAgIHJldHVybiB0aGlzLiNhY3RpdmVTb2NrZXQ7XG4gIH1cblxuICBnZXQgY29ubmVjdGlvblN0YXRlKCkge1xuICAgIHJldHVybiB0aGlzLiNjb25uZWN0aW9uU3RhdGU7XG4gIH1cblxuICBzZXQgY29ubmVjdGlvblN0YXRlKHZhbHVlKSB7XG4gICAgY29uc3QgcHJldmlvdXNDb25uU3RhdGUgPSB0aGlzLiNjb25uZWN0aW9uU3RhdGU7XG4gICAgdGhpcy4jY29ubmVjdGlvblN0YXRlID0gdmFsdWU7XG4gICAgdGhpcy5vbkNvbm5TdGF0ZUNoYW5nZT8uKHRoaXMuI2Nvbm5lY3Rpb25TdGF0ZSwgcHJldmlvdXNDb25uU3RhdGUsIHRoaXMpO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2ViU29ja2V0Q29ubk5hcnJhdGl2ZSB7XG4gIHJlYWRvbmx5IGlzSGVhbHRoeTogYm9vbGVhbjtcbiAgcmVhZG9ubHkgc3VtbWFyeTogc3RyaW5nO1xuICByZWFkb25seSBjb2xvcjogc3RyaW5nO1xuICByZWFkb25seSBzdW1tYXJ5SGludD86IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdlYlNvY2tldENvbm5OYXJyYXRpdmUoXG4gIHR1bm5lbDogV2ViU29ja2V0VHVubmVsLFxuICByZWNvbm4/OiBjLlJlY29ubmVjdGlvblN0cmF0ZWd5LFxuKTogV2ViU29ja2V0Q29ubk5hcnJhdGl2ZSB7XG4gIGNvbnN0IHdzID0gdHVubmVsLmNvbm5lY3Rpb25TdGF0ZTtcbiAgaWYgKCFyZWNvbm4gJiYgaXNXZWJTb2NrZXRSZWNvbm5lY3Rpbmcod3MpKSB7XG4gICAgcmVjb25uID0gd3MucmVjb25uZWN0U3RyYXRlZ3k7XG4gIH1cbiAgbGV0IHJlY29ubmVjdGVkID0gZmFsc2U7XG4gIGlmIChyZWNvbm4pIHtcbiAgICBzd2l0Y2ggKHJlY29ubi5zdGF0ZSkge1xuICAgICAgY2FzZSBjLlJlY29ubmVjdGlvblN0YXRlLlRSWUlORzpcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdW1tYXJ5OiBgcmVjb25uZWN0aW5nICR7cmVjb25uLmF0dGVtcHR9LyR7cmVjb25uLm1heEF0dGVtcHRzfWAsXG4gICAgICAgICAgY29sb3I6IFwib3JhbmdlXCIsXG4gICAgICAgICAgaXNIZWFsdGh5OiBmYWxzZSxcbiAgICAgICAgICBzdW1tYXJ5SGludDpcbiAgICAgICAgICAgIGBUcnlpbmcgdG8gcmVjb25uZWN0IHRvICR7dHVubmVsLndzVVJMfSAoV1MpLCByZWNvbm5lY3RpbmcgZXZlcnkgJHtyZWNvbm4uaW50ZXJ2YWxNaWxsZWNzfSBtaWxsaXNlY29uZHNgLFxuICAgICAgICB9O1xuXG4gICAgICBjYXNlIGMuUmVjb25uZWN0aW9uU3RhdGUuQUJPUlRFRDpcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdW1tYXJ5OiBgZmFpbGVkYCxcbiAgICAgICAgICBjb2xvcjogXCJyZWRcIixcbiAgICAgICAgICBpc0hlYWx0aHk6IGZhbHNlLFxuICAgICAgICAgIHN1bW1hcnlIaW50OlxuICAgICAgICAgICAgYFVuYWJsZSB0byByZWNvbm5lY3QgdG8gJHt0dW5uZWwud3NVUkx9IChXUykgYWZ0ZXIgJHtyZWNvbm4ubWF4QXR0ZW1wdHN9IGF0dGVtcHRzLCBnaXZpbmcgdXBgLFxuICAgICAgICB9O1xuXG4gICAgICBjYXNlIGMuUmVjb25uZWN0aW9uU3RhdGUuQ09NUExFVEVEOlxuICAgICAgICByZWNvbm5lY3RlZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIC8vIGMuUmVjb25uZWN0aW9uU3RhdGUuVU5LTk9XTiBhbmQgYy5SZWNvbm5lY3Rpb25TdGF0ZS5DT01QTEVURUQgd2lsbCBmYWxsXG4gIC8vIHRocm91Z2ggdG8gdGhlIG1lc3NhZ2VzIGJlbG93XG5cbiAgaWYgKGlzV2ViU29ja2V0Q29ubmVjdGlvbkhlYWx0aHkod3MpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN1bW1hcnk6IHJlY29ubmVjdGVkID8gXCJyZWNvbm5lY3RlZFwiIDogXCJjb25uZWN0ZWRcIixcbiAgICAgIGNvbG9yOiBcImdyZWVuXCIsXG4gICAgICBpc0hlYWx0aHk6IHRydWUsXG4gICAgICBzdW1tYXJ5SGludDpcbiAgICAgICAgYENvbm5lY3Rpb24gdG8gJHt3cy5lbmRwb2ludFVSTH0gKFdTKSB2ZXJpZmllZCB1c2luZyAke3dzLnBpbmdVUkx9IG9uICR7d3MuY29ubkVzdGFibGlzaGVkT259YCxcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgaXNIZWFsdGh5ID0gZmFsc2U7XG4gIGxldCBzdW1tYXJ5ID0gXCJ1bmtub3duXCI7XG4gIGxldCBjb2xvciA9IFwicHVycGxlXCI7XG4gIGxldCBzdW1tYXJ5SGludCA9IGB0aGUgV2ViU29ja2V0IHR1bm5lbCBpcyBub3QgaGVhbHRoeSwgYnV0IG5vdCBzdXJlIHdoeWA7XG4gIGlmIChpc1dlYlNvY2tldENvbm5lY3Rpb25VbmhlYWx0aHkod3MpKSB7XG4gICAgaWYgKGlzV2ViU29ja2V0RW5kcG9pbnRVbmF2YWlsYWJsZSh3cykpIHtcbiAgICAgIHN1bW1hcnkgPSBcIldTIHVuYXZhaWxhYmxlXCI7XG4gICAgICBzdW1tYXJ5SGludCA9IGAke3dzLmVuZHBvaW50VVJMfSBub3QgYXZhaWxhYmxlYDtcbiAgICAgIGlmICh3cy5odHRwU3RhdHVzKSB7XG4gICAgICAgIHN1bW1hcnkgPSBgV1MgdW5hdmFpbGFibGUgKCR7d3MuaHR0cFN0YXR1c30pYDtcbiAgICAgICAgc3VtbWFyeUhpbnQgKz0gYCAoSFRUUCBzdGF0dXM6ICR7d3MuaHR0cFN0YXR1c30sICR7d3MuaHR0cFN0YXR1c1RleHR9KWA7XG4gICAgICAgIGNvbG9yID0gXCJyZWRcIjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGlzV2ViU29ja2V0RXJyb3JFdmVudFN1cHBsaWVyKHdzKSkge1xuICAgICAgICBzdW1tYXJ5ID0gXCJlcnJvclwiO1xuICAgICAgICBzdW1tYXJ5SGludCA9IEpTT04uc3RyaW5naWZ5KHdzLmVycm9yRXZlbnQpO1xuICAgICAgICBjb2xvciA9IFwicmVkXCI7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHsgaXNIZWFsdGh5LCBzdW1tYXJ5LCBzdW1tYXJ5SGludCwgY29sb3IgfTtcbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBtYXJrZG93bkl0VHJhbnNmb3JtZXIoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZGVwZW5kZW5jaWVzOiB1bmRlZmluZWQsXG4gICAgICAgIGFjcXVpcmVEZXBlbmRlbmNpZXM6IGFzeW5jICh0cmFuc2Zvcm1lcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyBkZWZhdWx0OiBtYXJrZG93bkl0IH0gPSBhd2FpdCBpbXBvcnQoXCJodHRwczovL2pzcG0uZGV2L21hcmtkb3duLWl0QDEyLjIuMFwiKTtcbiAgICAgICAgICAgIHJldHVybiB7IG1hcmtkb3duSXQsIHBsdWdpbnM6IGF3YWl0IHRyYW5zZm9ybWVyLnBsdWdpbnMoKSB9O1xuICAgICAgICB9LFxuICAgICAgICBjb25zdHJ1Y3Q6IGFzeW5jICh0cmFuc2Zvcm1lcikgPT4ge1xuICAgICAgICAgICAgaWYgKCF0cmFuc2Zvcm1lci5kZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm1lci5kZXBlbmRlbmNpZXMgPSBhd2FpdCB0cmFuc2Zvcm1lci5hY3F1aXJlRGVwZW5kZW5jaWVzKHRyYW5zZm9ybWVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG1hcmtkb3duSXQgPSB0cmFuc2Zvcm1lci5kZXBlbmRlbmNpZXMubWFya2Rvd25JdCh7XG4gICAgICAgICAgICAgICAgaHRtbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBsaW5raWZ5OiB0cnVlLFxuICAgICAgICAgICAgICAgIHR5cG9ncmFwaGVyOiB0cnVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0cmFuc2Zvcm1lci5jdXN0b21pemUobWFya2Rvd25JdCwgdHJhbnNmb3JtZXIpO1xuICAgICAgICAgICAgcmV0dXJuIG1hcmtkb3duSXQ7IC8vIGZvciBjaGFpbmluZ1xuICAgICAgICB9LFxuICAgICAgICBjdXN0b21pemU6IChtYXJrZG93bkl0LCB0cmFuc2Zvcm1lcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGx1Z2lucyA9IHRyYW5zZm9ybWVyLmRlcGVuZGVuY2llcy5wbHVnaW5zO1xuICAgICAgICAgICAgbWFya2Rvd25JdC51c2UocGx1Z2lucy5mb290bm90ZSk7XG4gICAgICAgICAgICByZXR1cm4gdHJhbnNmb3JtZXI7IC8vIGZvciBjaGFpbmluZ1xuICAgICAgICB9LFxuICAgICAgICB1bmluZGVudFdoaXRlc3BhY2U6ICh0ZXh0LCByZW1vdmVJbml0aWFsTmV3TGluZSA9IHRydWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHdoaXRlc3BhY2UgPSB0ZXh0Lm1hdGNoKC9eWyBcXHRdKig/PVxcUykvZ20pO1xuICAgICAgICAgICAgY29uc3QgaW5kZW50Q291bnQgPSB3aGl0ZXNwYWNlID8gd2hpdGVzcGFjZS5yZWR1Y2UoKHIsIGEpID0+IE1hdGgubWluKHIsIGEubGVuZ3RoKSwgSW5maW5pdHkpIDogMDtcbiAgICAgICAgICAgIGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChgXlsgXFxcXHRdeyR7aW5kZW50Q291bnR9fWAsIFwiZ21cIik7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0ZXh0LnJlcGxhY2UocmVnZXgsIFwiXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHJlbW92ZUluaXRpYWxOZXdMaW5lID8gcmVzdWx0LnJlcGxhY2UoL15cXG4vLCBcIlwiKSA6IHJlc3VsdDtcbiAgICAgICAgfSxcbiAgICAgICAgcGx1Z2luczogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyBkZWZhdWx0OiBmb290bm90ZSB9ID0gYXdhaXQgaW1wb3J0KFwiaHR0cHM6Ly9qc3BtLmRldi9tYXJrZG93bi1pdC1mb290bm90ZUAzLjAuM1wiKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgZm9vdG5vdGUsXG4gICAgICAgICAgICAgICAgYWRqdXN0SGVhZGluZ0xldmVsOiAobWQsIG9wdGlvbnMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gZ2V0SGVhZGluZ0xldmVsKHRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YWdOYW1lWzBdLnRvTG93ZXJDYXNlKCkgPT09ICdoJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZ05hbWUgPSB0YWdOYW1lLnNsaWNlKDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQodGFnTmFtZSwgMTApO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlyc3RMZXZlbCA9IG9wdGlvbnMuZmlyc3RMZXZlbDtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGZpcnN0TGV2ZWwgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdExldmVsID0gZ2V0SGVhZGluZ0xldmVsKGZpcnN0TGV2ZWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmaXJzdExldmVsIHx8IGlzTmFOKGZpcnN0TGV2ZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZXZlbE9mZnNldCA9IGZpcnN0TGV2ZWwgLSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGV2ZWxPZmZzZXQgPCAxIHx8IGxldmVsT2Zmc2V0ID4gNikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbWQuY29yZS5ydWxlci5wdXNoKFwiYWRqdXN0LWhlYWRpbmctbGV2ZWxzXCIsIGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW5zID0gc3RhdGUudG9rZW5zXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbnNbaV0udHlwZSAhPT0gXCJoZWFkaW5nX2Nsb3NlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoZWFkaW5nT3BlbiA9IHRva2Vuc1tpIC0gMl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdmFyIGhlYWRpbmdfY29udGVudCA9IHRva2Vuc1tpIC0gMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGVhZGluZ0Nsb3NlID0gdG9rZW5zW2ldO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2UgY291bGQgZ28gZGVlcGVyIHdpdGggPGRpdiByb2xlPVwiaGVhZGluZ1wiIGFyaWEtbGV2ZWw9XCI3XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2VlIGh0dHA6Ly93M2MuZ2l0aHViLmlvL2FyaWEvYXJpYS9hcmlhLmh0bWwjYXJpYS1sZXZlbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJ1dCBjbGFtcGluZyB0byBhIGRlcHRoIG9mIDYgc2hvdWxkIHN1ZmZpY2UgZm9yIG5vd1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRMZXZlbCA9IGdldEhlYWRpbmdMZXZlbChoZWFkaW5nT3Blbi50YWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhZ05hbWUgPSAnaCcgKyBNYXRoLm1pbihjdXJyZW50TGV2ZWwgKyBsZXZlbE9mZnNldCwgNik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkaW5nT3Blbi50YWcgPSB0YWdOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRpbmdDbG9zZS50YWcgPSB0YWdOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH07XG59XG5cbi8qKlxuICogR2l2ZW4gYSBzZXQgb2YgbWFya2Rvd24gdGV4dCBhY3F1aXNpdGlvbiBhbmQgcmVuZGVyaW5nIHN0cmF0ZWdpZXMgYXMgYXN5bmNcbiAqIGdlbmVyYXRvcnMsIHRyYW5zZm9ybSBtYXJrZG93biB0ZXh0IGludG8gSFRNTCBhbmQgY2FsbCBoYW5kbGVycy5cbiAqIEBwYXJhbSB7e21hcmtkb3duVGV4dDogKG1kaXQpID0+IHN0cmluZywgcmVuZGVySFRNTDogKGh0bWwsIG1kaXQpID0+IHZvaWR9fSBzdHJhdGVnaWVzXG4gKiBAcGFyYW0geyp9IG9wdGlvbnMgcmVzdWx0IG9mIHRyYW5zZm9ybU1hcmtkb3duSXRPcHRpb25zXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5kZXJNYXJrZG93bihzdHJhdGVnaWVzLCBtZGl0dCA9IG1hcmtkb3duSXRUcmFuc2Zvcm1lcigpKSB7XG4gICAgY29uc3QgbWFya2Rvd25JdCA9IGF3YWl0IG1kaXR0LmNvbnN0cnVjdChtZGl0dCk7XG4gICAgZm9yIGF3YWl0IChjb25zdCBzdHJhdGVneSBvZiBzdHJhdGVnaWVzKG1kaXR0KSkge1xuICAgICAgICAvLyB3ZSB1c2UgYXdhaXQgb24gbWFya2Rvd25UZXh0KCkgc2luY2UgaXQgY291bGQgYmUgZmV0Y2hlZCBvciBub3RcbiAgICAgICAgLy8gaW1tZWRpYXRlbHkgYXZhaWxhYmxlXG4gICAgICAgIGNvbnN0IG1hcmtkb3duID0gbWRpdHQudW5pbmRlbnRXaGl0ZXNwYWNlKGF3YWl0IHN0cmF0ZWd5Lm1hcmtkb3duVGV4dChtZGl0dCkpO1xuXG4gICAgICAgIC8vIHJlbmRlckhUTUwgbWF5IGJlIGFzeW5jLCBidXQgd2UgZG9uJ3QgbmVlZCB0byBhd2FpdCBpdCBzaW5jZSB3ZSBkb1xuICAgICAgICAvLyBub3QgY2FyZSBhYm91dCB0aGUgcmVzdWx0XG4gICAgICAgIHN0cmF0ZWd5LnJlbmRlckhUTUwobWFya2Rvd25JdC5yZW5kZXIobWFya2Rvd24pLCBtZGl0dCk7XG4gICAgfVxufVxuXG4vKipcbiAqIGltcG9ydE1hcmtkb3duQ29udGVudCBmZXRjaGVzIG1hcmtkb3duIGZyb20gYSBzb3VyY2UsIGFuZFxuICogQHBhcmFtIHtzdHJpbmcgfCBVUkwgfCBSZXF1ZXN0fSBpbnB1dCBVUkwgdG8gYWNxdWlyZSBIVE1MIGZyb21cbiAqIEBwYXJhbSB7KGZvcmVpZ25Eb2MpID0+IFtdfSBzZWxlY3QgdXNlIHRoZSBwYXJzZWQgSFRNTCBmb3JlaWduRG9jIHRvIHNlbGVjdCB3aGljaCBub2RlcyB5b3Ugd2FudCB0byBhY3F1aXJlXG4gKiBAcGFyYW0geyhpbXBvcnRlZE5vZGUsIGlucHV0LCBodG1sKSA9PiB2b2lkfSBpbmplY3QgdGhlIGdpdmVuLCBhbHJlYWR5IGRvY3VtZW50LWFkb3B0ZWQgbm9kZSBhbnl3aGVyZSB5b3UnZCBsaWtlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbXBvcnRNYXJrZG93bkNvbnRlbnQoaW5wdXQsIHNlbGVjdCwgaW5qZWN0KSB7XG4gICAgZmV0Y2goaW5wdXQpLnRoZW4ocmVzcCA9PiB7XG4gICAgICAgIHJlc3AudGV4dCgpLnRoZW4oaHRtbCA9PiB7XG4gICAgICAgICAgICBjb25zdCBwYXJzZXIgPSBuZXcgRE9NUGFyc2VyKCk7XG4gICAgICAgICAgICBjb25zdCBmb3JlaWduRG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyhodG1sLCBcInRleHQvaHRtbFwiKTtcbiAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkID0gc2VsZWN0KGZvcmVpZ25Eb2MpO1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc2VsZWN0ZWQpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIHNlbGVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGltcG9ydGVkTm9kZSA9IGRvY3VtZW50LmFkb3B0Tm9kZShzKTtcbiAgICAgICAgICAgICAgICAgICAgaW5qZWN0KGltcG9ydGVkTm9kZSwgaW5wdXQsIGh0bWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbXBvcnRlZE5vZGUgPSBkb2N1bWVudC5hZG9wdE5vZGUoc2VsZWN0ZWQpO1xuICAgICAgICAgICAgICAgIGluamVjdChpbXBvcnRlZE5vZGUsIGlucHV0LCBodG1sKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbi8qKlxuICogR2l2ZW4gYSBsaXN0IG9mIHttYXJrZG93blRleHQsIHJlbmRlckhUTUx9W10gZnVuY3Rpb25zIGluIHNyY0VsZW1lbnRzIGFycmF5LCB0cmFuc2Zvcm0gbWFya2Rvd24gdGV4dCBpbnRvIEhUTUxcbiAqIGFuZCByZXBsYWNlIHRob3NlIGVsZW1lbnRzIHdpdGggYSBuZXcgPGRpdj4uIEZvciBlYWNoIGVsZW1lbnQsIGFsbG93XG4gKiBmaW5hbGl6YXRpb24gdG8gYmUgY2FsbGVkIGluIGNhc2UgdGhlIG5ldyBlbGVtZW50cyBzaG91bGQgdHJpZ2dlciBzb21lIGV2ZW50cy5cbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnRbXX0gc3JjRWxlbXMgYW4gYXJyYXkgb2YgSFRNTCBkb2N1bWVudCBub2RlcyB3aG9zZSBib2R5IGhhcyB0aGUgbWFya2Rvd24gb3IgZGF0YS10cmFuc2Zvcm1hYmxlLXNyYz1cImh0dHA6Ly94eXoubWRcIlxuICogQHBhcmFtIHsobmV3RWxlbSwgb2xkRWxlbSkgPT4gdm9pZH0gZmluYWxpemVFbGVtRm4gb3B0aW9uYWwgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGZvciBlYWNoIHRyYW5zZm9ybWVkIGVsZW1lbnRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRyYW5zZm9ybU1hcmtkb3duRWxlbXNDdXN0b20oc3JjRWxlbXMsIGZpbmFsaXplRWxlbUZuLCBtZGl0dCA9IG1hcmtkb3duSXRUcmFuc2Zvcm1lcigpKSB7XG4gICAgYXdhaXQgcmVuZGVyTWFya2Rvd24oZnVuY3Rpb24qICgpIHtcbiAgICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHNyY0VsZW1zKSB7XG4gICAgICAgICAgICB5aWVsZCB7XG4gICAgICAgICAgICAgICAgbWFya2Rvd25UZXh0OiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZvdW5kIGRhdGEtdHJhbnNmb3JtYWJsZS1zcmM9XCJodHRwOi8veHl6Lm1kXCIsIGZldGNoIHRoZSBtYXJrZG93biBmcm9tIGEgVVJMXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtLmRhdGFzZXQudHJhbnNmb3JtYWJsZVNyYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChlbGVtLmRhdGFzZXQudHJhbnNmb3JtYWJsZVNyYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGBFcnJvciBmZXRjaGluZyAke2VsZW0uZGF0YXNldC50cmFuc2Zvcm1hYmxlU3JjfTogJHtyZXNwb25zZS5zdGF0dXN9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBubyBkYXRhLXRyYW5zZm9ybWFibGUtc3JjPVwiaHR0cDovL3h5ei5tZFwiLCBhc3N1bWUgaXQncyBpbiB0aGUgYm9keVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW0uaW5uZXJUZXh0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBkZW5vLWxpbnQtaWdub3JlIHJlcXVpcmUtYXdhaXRcbiAgICAgICAgICAgICAgICByZW5kZXJIVE1MOiBhc3luYyAoaHRtbCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZC5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5wYXJlbnRFbGVtZW50LnJlcGxhY2VDaGlsZChmb3JtYXR0ZWQsIGVsZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbmFsaXplRWxlbUZuKSBmaW5hbGl6ZUVsZW1Gbihmb3JtYXR0ZWQsIGVsZW0pO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlVuZGlhZ25vc2FibGUgZXJyb3IgaW4gcmVuZGVySFRNTCgpXCIsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LCBtZGl0dClcbn1cblxuLyoqXG4gKiBSdW4gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChgW2RhdGEtdHJhbnNmb3JtYWJsZT1cIm1hcmtkb3duXCJdYCkgdG8gZmluZCBhbGxcbiAqIDxwcmU+IG9yIG90aGVyIGVsZW1lbnQgbWFya2VkIGFzIFwidHJhbnNmb3JtYWJsZVwiLCByZW5kZXIgdGhlIG1hcmtkb3duJ3MgSFRNTFxuICogYW5kIHJlcGxhY2UgdGhlIGV4aXN0aW5nIHRoZSBleGlzdGluZyBlbGVtZW50IHdpdGggdGhlIG5ld2x5IGZvcm1hdHRlZCBlbGVtLlxuICogRm9yIGVhY2ggZWxlbWVudCB0aGF0J3MgZm9ybWF0dGVkLCBkaXNwYXRjaCBhbiBldmVudCBmb3Igb3RoZXJzIHRvIGhhbmRsZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRyYW5zZm9ybU1hcmtkb3duRWxlbXMoZmlyc3RIZWFkaW5nTGV2ZWwgPSAyKSB7XG4gICAgY29uc3QgbWRpdHREZWZhdWx0cyA9IG1hcmtkb3duSXRUcmFuc2Zvcm1lcigpO1xuICAgIGF3YWl0IHRyYW5zZm9ybU1hcmtkb3duRWxlbXNDdXN0b20oXG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoYFtkYXRhLXRyYW5zZm9ybWFibGU9XCJtYXJrZG93blwiXWApLFxuICAgICAgICAobWRIdG1sRWxlbSwgbWRTcmNFbGVtKSA9PiB7XG4gICAgICAgICAgICBtZEh0bWxFbGVtLmRhdGFzZXQudHJhbnNmb3JtZWRGcm9tID0gXCJtYXJrZG93blwiO1xuICAgICAgICAgICAgaWYgKG1kU3JjRWxlbS5jbGFzc05hbWUpIG1kSHRtbEVsZW0uY2xhc3NOYW1lID0gbWRTcmNFbGVtLmNsYXNzTmFtZTtcbiAgICAgICAgICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KFwidHJhbnNmb3JtZWQtbWFya2Rvd25cIiwge1xuICAgICAgICAgICAgICAgIGRldGFpbDogeyBtZEh0bWxFbGVtLCBtZFNyY0VsZW0gfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9LCB7XG4gICAgICAgIC4uLm1kaXR0RGVmYXVsdHMsXG4gICAgICAgIGN1c3RvbWl6ZTogKG1hcmtkb3duSXQsIHRyYW5zZm9ybWVyKSA9PiB7XG4gICAgICAgICAgICBtZGl0dERlZmF1bHRzLmN1c3RvbWl6ZShtYXJrZG93bkl0LCB0cmFuc2Zvcm1lcik7XG4gICAgICAgICAgICBtYXJrZG93bkl0LnVzZSh0cmFuc2Zvcm1lci5kZXBlbmRlbmNpZXMucGx1Z2lucy5hZGp1c3RIZWFkaW5nTGV2ZWwsIHsgZmlyc3RMZXZlbDogZmlyc3RIZWFkaW5nTGV2ZWwgfSk7XG4gICAgICAgIH1cbiAgICB9KVxufVxuXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBa0JPLE1BQU0sWUFBWTtJQU14QixBQUFRLFFBQVEsR0FBZ0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQWMxRCxBQUFPLEVBQUUsQ0FBRSxLQUFnQixFQUFFLFFBQWtCLEVBQy9DO1FBQ0MsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sSUFBSSxDQUFDO0tBQ1o7SUFjRCxBQUFPLElBQUksQ0FBRSxLQUFnQixFQUFFLFFBQWtCLEVBQ2pEO1FBQ0MsTUFBTSxDQUFDLEdBQWEsUUFBUSxBQUFDO1FBQzdCLENBQUMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFRLENBQUM7S0FDaEM7SUE2QkQsQUFBTyxH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
