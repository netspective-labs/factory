import * as govn from "../governance.ts";
import * as sse from "./event-source.ts";
import * as ws from "./ws.ts";

export interface EventSourceCustomEventDetail<
  Payload extends govn.ValidatedPayload,
> {
  readonly event: MessageEvent;
  readonly eventSrcPayload: Payload;
}

export interface FetchCustomEventDetail<Context> {
  readonly context: Context;
  readonly fetchStrategy: govn.FetchStrategy;
}

export interface FetchPayloadSupplier<
  Payload extends govn.IdentifiablePayload,
> {
  readonly fetchPayload: Payload;
}

export interface FetchRespPayloadSupplier<
  Payload extends govn.ValidatedPayload,
> {
  readonly fetchRespPayload: Payload;
}

export interface WebSocketSendCustomEventDetail<
  Payload extends govn.IdentifiablePayload,
  Context,
> {
  readonly context: Context;
  readonly payload: Payload;
  readonly webSocketStrategy: govn.WebSocketStrategy;
}

export interface WebSocketReceiveCustomEventDetail<
  Payload extends govn.ValidatedPayload,
> {
  readonly event: MessageEvent;
  readonly webSocketStrategy: govn.WebSocketStrategy;
  readonly payload: Payload;
}

export interface ServicBusEventSourceTunnelsSupplier {
  (onMessage: (event: MessageEvent) => void): Generator<sse.EventSourceTunnel>;
}

export interface ServicBusWebSocketTunnelsSupplier {
  (onMessage: (event: MessageEvent) => void): Generator<ws.WebSocketTunnel>;
}

export interface EventTargetEventNameStrategy {
  (payload: govn.PayloadIdentity | govn.IdentifiablePayload | "universal"): {
    readonly payloadSpecificName?: string;
    readonly universalName: string;
    readonly selectedName: string;
  };
}

export interface ServiceBusArguments {
  readonly esTunnels?: ServicBusEventSourceTunnelsSupplier;
  readonly wsTunnels?: ServicBusWebSocketTunnelsSupplier;
  readonly fetchBaseURL?: string;
  readonly eventNameStrategy: {
    readonly universalScopeID: "universal";
    readonly fetch: EventTargetEventNameStrategy;
    readonly fetchResponse: EventTargetEventNameStrategy;
    readonly fetchError: EventTargetEventNameStrategy;
    readonly eventSource: EventTargetEventNameStrategy;
    readonly eventSourceError: EventTargetEventNameStrategy;
    readonly eventSourceInvalidPayload: EventTargetEventNameStrategy;
    readonly webSocket: EventTargetEventNameStrategy;
    readonly webSocketError: EventTargetEventNameStrategy;
    readonly webSocketInvalidPayload: EventTargetEventNameStrategy;
  };
}

export function serviceBusArguments(
  options: Partial<ServiceBusArguments>,
): ServiceBusArguments {
  const universalScopeID = "universal";
  return {
    eventNameStrategy: {
      universalScopeID,
      fetch: (payload) => {
        const identity = typeof payload === "string"
          ? payload
          : payload.payloadIdentity;
        const payloadSpecificName = `fetch-${identity}`;
        const universalName = `fetch`;
        return {
          payloadSpecificName,
          universalName,
          selectedName: identity == universalScopeID
            ? universalName
            : payloadSpecificName,
        };
      },
      fetchResponse: (payload) => {
        const identity = typeof payload === "string"
          ? payload
          : payload.payloadIdentity;
        const payloadSpecificName = `fetch-response-${identity}`;
        const universalName = `fetch-response`;
        return {
          payloadSpecificName,
          universalName,
          selectedName: identity == universalScopeID
            ? universalName
            : payloadSpecificName,
        };
      },
      fetchError: (payload) => {
        const identity = typeof payload === "string"
          ? payload
          : payload.payloadIdentity;
        const payloadSpecificName = `fetch-error-${identity}`;
        const universalName = `fetch-error`;
        return {
          payloadSpecificName,
          universalName,
          selectedName: identity == universalScopeID
            ? universalName
            : payloadSpecificName,
        };
      },
      eventSource: (payload) => {
        const identity = typeof payload === "string"
          ? payload
          : payload.payloadIdentity;
        const payloadSpecificName = `event-source-${identity}`;
        const universalName = `event-source`;
        return {
          payloadSpecificName,
          universalName,
          selectedName: identity == universalScopeID
            ? universalName
            : payloadSpecificName,
        };
      },
      eventSourceError: (payload) => {
        const identity = typeof payload === "string"
          ? payload
          : payload.payloadIdentity;
        const payloadSpecificName = `event-source-error-${identity}`;
        const universalName = `event-source-error`;
        return {
          payloadSpecificName,
          universalName,
          selectedName: identity == universalScopeID
            ? universalName
            : payloadSpecificName,
        };
      },
      eventSourceInvalidPayload: () => {
        // this is a special error which cannot be payload-specific because
        // it indicates an unsolicited server sent event could not be identified
        // as something we can handle (it will be ignored)
        const universalName = `event-source-invalid-payload`;
        return {
          payloadSpecificName: undefined,
          universalName,
          selectedName: universalName,
        };
      },
      webSocket: (payload) => {
        const identity = typeof payload === "string"
          ? payload
          : payload.payloadIdentity;
        const payloadSpecificName = `web-socket-${identity}`;
        const universalName = `web-socket`;
        return {
          payloadSpecificName,
          universalName,
          selectedName: identity == universalScopeID
            ? universalName
            : payloadSpecificName,
        };
      },
      webSocketError: (payload) => {
        const identity = typeof payload === "string"
          ? payload
          : payload.payloadIdentity;
        const payloadSpecificName = `web-socket-error-${identity}`;
        const universalName = `web-socket-error`;
        return {
          payloadSpecificName,
          universalName,
          selectedName: identity == universalScopeID
            ? universalName
            : payloadSpecificName,
        };
      },
      webSocketInvalidPayload: () => {
        // this is a special error which cannot be payload-specific because
        // it indicates an unsolicited web socket message could not be identified
        // as something we can handle (it will be ignored)
        const universalName = `web-socket-invalid-payload`;
        return {
          payloadSpecificName: undefined,
          universalName,
          selectedName: universalName,
        };
      },
    },
    ...options,
  };
}

export class ServiceBus extends EventTarget
  implements
    govn.FetchStrategy,
    govn.EventSourceStrategy,
    govn.WebSocketStrategy {
  readonly esTunnels: sse.EventSourceTunnel[] = [];
  readonly wsTunnels: ws.WebSocketTunnel[] = [];
  readonly eventListenersLog: {
    name: string;
    hook: EventListenerOrEventListenerObject | null;
  }[] = [];

  constructor(readonly args: ServiceBusArguments) {
    super();
    if (args.esTunnels) this.registerEventSourceTunnels(args.esTunnels);
    if (args.wsTunnels) this.registerWebSocketTunnels(args.wsTunnels);
  }

  registerEventSourceTunnels(ests: ServicBusEventSourceTunnelsSupplier) {
    for (
      const tunnel of ests((event) => {
        const eventSrcPayload = JSON.parse(event.data);
        const esDetail:
          // deno-lint-ignore no-explicit-any
          EventSourceCustomEventDetail<any> = { event, eventSrcPayload };
        this.dispatchNamingStrategyEvent(
          eventSrcPayload,
          govn.isIdentifiablePayload(eventSrcPayload)
            ? this.args.eventNameStrategy.eventSource
            : this.args.eventNameStrategy.eventSourceInvalidPayload,
          esDetail,
        );
      })
    ) {
      this.esTunnels.push(tunnel);
    }
  }

  registerWebSocketTunnels(ests: ServicBusWebSocketTunnelsSupplier) {
    for (
      const tunnel of ests((event) => {
        if (typeof event.data === "string") {
          const payload = JSON.parse(event.data);
          // deno-lint-ignore no-explicit-any
          const wsDetail: WebSocketReceiveCustomEventDetail<any> = {
            event,
            payload,
            webSocketStrategy: this,
          };
          this.dispatchNamingStrategyEvent(
            payload,
            govn.isIdentifiablePayload(payload)
              ? this.args.eventNameStrategy.webSocket
              : this.args.eventNameStrategy.webSocketInvalidPayload,
            wsDetail,
          );
        } else {
          const payload = event.data;
          if (govn.isIdentifiablePayload(payload)) {
            // deno-lint-ignore no-explicit-any
            const wsDetail: WebSocketReceiveCustomEventDetail<any> = {
              event,
              payload,
              webSocketStrategy: this,
            };
            this.dispatchNamingStrategyEvent(
              payload,
              this.args.eventNameStrategy.webSocket,
              wsDetail,
            );
          } else {
            this.dispatchNamingStrategyEvent(
              event.data,
              this.args.eventNameStrategy.webSocketInvalidPayload,
              {
                event,
                webSocketStrategy: this,
              },
            );
          }
        }
      })
    ) {
      this.wsTunnels.push(tunnel);
    }
  }

  dispatchNamingStrategyEvent(
    id: govn.PayloadIdentity | govn.IdentifiablePayload,
    strategy: EventTargetEventNameStrategy,
    detail: unknown,
  ) {
    const names = strategy(id);
    if (names.payloadSpecificName) {
      this.dispatchEvent(
        new CustomEvent(names.payloadSpecificName, { detail }),
      );
    }
    this.dispatchEvent(
      new CustomEvent(names.universalName, {
        detail,
      }),
    );
  }

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined,
  ) {
    super.addEventListener(type, listener, options);
    this.eventListenersLog.push({ name: type, hook: listener });
  }

  observeUnsolicitedPayload<
    Payload extends govn.ValidatedPayload,
  >(
    observer: govn.UnsolicitedPayloadObserver<Payload>,
    payloadIdSupplier?:
      | govn.PayloadIdentity
      | govn.PayloadService,
  ): void {
    // unsolicited payloads can come from either event sources or from web
    // sockets so observe both
    this.observeEventSource<Payload>((payload) => {
      observer(payload, this);
    }, payloadIdSupplier);
    this.observeWebSocketReceiveEvent<Payload>((payload) => {
      observer(payload, this);
    }, payloadIdSupplier);
  }

  observeReceivedPayload<
    Payload extends govn.ValidatedPayload,
  >(
    observer: govn.ReceivedPayloadObserver<Payload>,
    payloadIdSupplier?: govn.PayloadIdentity | govn.PayloadService,
  ): void {
    // received payloads can come from either event sources, web sockets,
    // or fetches so register all three
    this.observeEventSource<Payload>((payload) => {
      observer(payload, this);
    }, payloadIdSupplier);
    this.observeWebSocketReceiveEvent<Payload>((payload) => {
      observer(payload, this);
    }, payloadIdSupplier);
    // deno-lint-ignore no-explicit-any
    this.observeFetchEventResponse<any, Payload, any>(
      (_fetched, received) => {
        observer(received, this);
      },
      payloadIdSupplier,
    );
  }

  observeSolicitedPayload<
    SolicitedPayload extends govn.IdentifiablePayload,
    SolicitedResponsePayload extends govn.ValidatedPayload,
    Context,
  >(
    observer: govn.SolicitedPayloadObserver<
      SolicitedPayload,
      SolicitedResponsePayload,
      Context
    >,
    payloadIdSupplier?:
      | govn.PayloadIdentity
      | govn.PayloadService,
  ): void {
    // solicited payloads can come from either fetch events or web sockets
    // TODO: add web sockets' send/receive when a receive is expected after
    //       a send event - need way to track sender/receiver
    this.observeFetchEventResponse<
      SolicitedPayload,
      SolicitedResponsePayload,
      Context
    >((payload, responsePayload, ctx) => {
      observer(payload, responsePayload, ctx, this);
    }, payloadIdSupplier);
  }

  fetch<
    UserAgentPayload extends govn.IdentifiablePayload,
    ServerRespPayload extends govn.ValidatedPayload,
    Context,
  >(
    uase: govn.FetchService<UserAgentPayload, ServerRespPayload, Context>,
    suggestedCtx: Context,
  ): void {
    const transactionID = "TODO:UUIDv5?"; // tokens, user agent strings, etc.
    const clientProvenance = "ServiceBus.fetch";
    const ctx = { ...suggestedCtx, transactionID, clientProvenance };
    const fetchPayload = uase.prepareFetchPayload(ctx, this);
    const fetchInit = uase.prepareFetch(
      this.args.fetchBaseURL,
      fetchPayload,
      ctx,
      this,
    );
    const fetchDetail:
      & FetchCustomEventDetail<Context>
      & govn.FetchInit
      & FetchPayloadSupplier<UserAgentPayload> = {
        ...fetchInit,
        fetchPayload,
        context: ctx,
        fetchStrategy: this,
      };
    this.dispatchNamingStrategyEvent(
      fetchPayload,
      this.args.eventNameStrategy.fetch,
      fetchDetail,
    );

    fetch(fetchInit.endpoint, fetchInit.requestInit)
      .then((resp) => {
        if (resp.ok) {
          resp.json().then((fetchRespRawJSON) => {
            const fetchRespPayload = uase.prepareFetchResponsePayload(
              fetchPayload,
              fetchRespRawJSON,
              ctx,
              this,
            );
            const fetchRespDetail:
              & FetchCustomEventDetail<Context>
              & FetchPayloadSupplier<UserAgentPayload>
              & FetchRespPayloadSupplier<ServerRespPayload> = {
                fetchPayload,
                fetchRespPayload,
                context: ctx,
                fetchStrategy: this,
              };
            this.dispatchNamingStrategyEvent(
              fetchPayload,
              this.args.eventNameStrategy.fetchResponse,
              fetchRespDetail,
            );
          });
        } else {
          const fetchErrorDetail:
            & FetchCustomEventDetail<Context>
            & govn.FetchInit
            & FetchPayloadSupplier<UserAgentPayload>
            & govn.ErrorSupplier = {
              ...fetchInit,
              fetchPayload,
              context: ctx,
              error: new Error(
                `${fetchInit.endpoint} invalid HTTP status ${resp.status} (${resp.statusText})`,
              ),
              fetchStrategy: this,
            };
          this.dispatchNamingStrategyEvent(
            fetchPayload,
            this.args.eventNameStrategy.fetchError,
            fetchErrorDetail,
          );
        }
      }).catch((error) => {
        const fetchErrorDetail:
          & FetchCustomEventDetail<Context>
          & govn.FetchInit
          & FetchPayloadSupplier<UserAgentPayload>
          & govn.ErrorSupplier = {
            ...fetchInit,
            fetchPayload,
            context: ctx,
            error,
            fetchStrategy: this,
          };
        this.dispatchNamingStrategyEvent(
          fetchPayload,
          this.args.eventNameStrategy.fetchError,
          fetchErrorDetail,
        );
        console.error(`${fetchInit.endpoint} POST error`, error, fetchInit);
      });
  }

  observeFetchEvent<
    FetchPayload extends govn.IdentifiablePayload,
    Context,
  >(
    observer: govn.FetchObserver<FetchPayload, Context>,
    payloadIdSupplier?:
      | govn.PayloadIdentity
      | govn.PayloadService,
  ): void {
    const payloadID = payloadIdSupplier
      ? (typeof payloadIdSupplier === "string"
        ? payloadIdSupplier
        : payloadIdSupplier.payloadIdentity)
      : this.args.eventNameStrategy.universalScopeID;
    const names = this.args.eventNameStrategy.fetch(payloadID);
    this.addEventListener(
      names.selectedName,
      (event) => {
        const typedCustomEvent = event as unknown as {
          detail:
            & FetchCustomEventDetail<Context>
            & govn.FetchInit
            & FetchPayloadSupplier<FetchPayload>;
        };
        const { fetchPayload, requestInit, context, fetchStrategy } =
          typedCustomEvent.detail;
        observer(fetchPayload, requestInit, context, fetchStrategy);
      },
    );
  }

  observeFetchEventResponse<
    FetchPayload extends govn.IdentifiablePayload,
    FetchRespPayload extends govn.ValidatedPayload,
    Context,
  >(
    observer: govn.FetchResponseObserver<
      FetchPayload,
      FetchRespPayload,
      Context
    >,
    payloadIdSupplier?:
      | govn.PayloadIdentity
      | govn.PayloadService,
  ): void {
    const payloadID = payloadIdSupplier
      ? (typeof payloadIdSupplier === "string"
        ? payloadIdSupplier
        : payloadIdSupplier.payloadIdentity)
      : this.args.eventNameStrategy.universalScopeID;
    const names = this.args.eventNameStrategy.fetchResponse(payloadID);
    this.addEventListener(
      names.selectedName,
      (event) => {
        const typedCustomEvent = event as unknown as {
          detail:
            & FetchCustomEventDetail<Context>
            & FetchRespPayloadSupplier<FetchRespPayload>
            & FetchPayloadSupplier<FetchPayload>;
        };
        const { fetchPayload, fetchRespPayload, context, fetchStrategy } =
          typedCustomEvent.detail;
        observer(fetchRespPayload, fetchPayload, context, fetchStrategy);
      },
    );
  }

  observeFetchEventError<
    FetchPayload extends govn.IdentifiablePayload,
    Context,
  >(
    observer: govn.FetchErrorObserver<
      FetchPayload,
      Context
    >,
    payloadIdSupplier?:
      | govn.PayloadIdentity
      | govn.PayloadService,
  ): void {
    const payloadID = payloadIdSupplier
      ? (typeof payloadIdSupplier === "string"
        ? payloadIdSupplier
        : payloadIdSupplier.payloadIdentity)
      : this.args.eventNameStrategy.universalScopeID;
    const names = this.args.eventNameStrategy.fetchError(payloadID);
    this.addEventListener(
      names.selectedName,
      (event) => {
        const typedCustomEvent = event as unknown as {
          detail:
            & FetchCustomEventDetail<Context>
            & govn.FetchInit
            & FetchPayloadSupplier<FetchPayload>
            & govn.ErrorSupplier;
        };
        const { fetchPayload, error, requestInit, context, fetchStrategy } =
          typedCustomEvent.detail;
        observer(error, requestInit, fetchPayload, context, fetchStrategy);
      },
    );
  }

  observeEventSource<
    EventSourcePayload extends govn.ValidatedPayload,
  >(
    observer: govn.EventSourceObserver<EventSourcePayload>,
    payloadIdSupplier?:
      | govn.PayloadIdentity
      | govn.PayloadService,
  ): void {
    const payloadID = payloadIdSupplier
      ? (typeof payloadIdSupplier === "string"
        ? payloadIdSupplier
        : payloadIdSupplier.payloadIdentity)
      : this.args.eventNameStrategy.universalScopeID;
    const names = this.args.eventNameStrategy.eventSource(payloadID);
    this.addEventListener(
      names.selectedName,
      (event) => {
        const typedCustomEvent = event as unknown as {
          detail: EventSourceCustomEventDetail<EventSourcePayload>;
        };
        let { eventSrcPayload } = typedCustomEvent.detail;
        if (govn.isEventSourceService<EventSourcePayload>(payloadIdSupplier)) {
          if (payloadIdSupplier.isEventSourcePayload(eventSrcPayload)) {
            eventSrcPayload = payloadIdSupplier.prepareEventSourcePayload(
              eventSrcPayload,
            );
            // forcefully mutate and let receivers know it's validated
            (eventSrcPayload as unknown as govn.MutatableValidatedPayload)
              .isValidatedPayload = true;
          }
        }
        observer(eventSrcPayload, this);
      },
    );
  }

  observeEventSourceError<
    EventSourcePayload extends govn.IdentifiablePayload,
  >(
    observer: govn.EventSourceErrorObserver<EventSourcePayload>,
    payloadIdSupplier?:
      | govn.PayloadIdentity
      | govn.PayloadService,
  ) {
    const payloadID = payloadIdSupplier
      ? (typeof payloadIdSupplier === "string"
        ? payloadIdSupplier
        : payloadIdSupplier.payloadIdentity)
      : this.args.eventNameStrategy.universalScopeID;
    const names = this.args.eventNameStrategy.eventSourceError(payloadID);
    this.addEventListener(
      names.selectedName,
      (event) => {
        const typedCustomEvent = event as unknown as {
          // deno-lint-ignore no-explicit-any
          detail: EventSourceCustomEventDetail<any> & govn.ErrorSupplier;
        };
        const { eventSrcPayload, error } = typedCustomEvent.detail;
        observer(error, eventSrcPayload, this);
      },
    );
  }

  webSocketSend<SendPayload extends govn.IdentifiablePayload, Context>(
    context: Context,
    wss: govn.WebSocketSendService<SendPayload>,
  ): void {
    for (const ws of this.wsTunnels) {
      ws.activeSocket?.send(
        wss.prepareWebSocketSend(
          wss.prepareWebSocketSendPayload(context, this),
          this,
        ),
      );
    }
  }

  prepareWebSocketReceivePayload<ReceivePayload>(
    webSocketReceiveRaw: string | ArrayBufferLike | Blob | ArrayBufferView,
  ) {
    if (typeof webSocketReceiveRaw !== "string") {
      throw Error(
        `webSocketReceiveRaw must be text; TODO: allow binary?`,
      );
    }
    return JSON.parse(webSocketReceiveRaw) as ReceivePayload;
  }

  observeWebSocketSendEvent<
    SendPayload extends govn.IdentifiablePayload,
    Context,
  >(
    observer: govn.WebSocketSendObserver<SendPayload, Context>,
    payloadIdSupplier?:
      | govn.PayloadIdentity
      | govn.PayloadService,
  ): void {
    const payloadID = payloadIdSupplier
      ? (typeof payloadIdSupplier === "string"
        ? payloadIdSupplier
        : payloadIdSupplier.payloadIdentity)
      : this.args.eventNameStrategy.universalScopeID;
    const names = this.args.eventNameStrategy.webSocket(payloadID);
    this.addEventListener(
      names.selectedName,
      (event) => {
        const typedCustomEvent = event as unknown as {
          detail: WebSocketSendCustomEventDetail<SendPayload, Context>;
        };
        const { context, payload, webSocketStrategy } = typedCustomEvent.detail;
        observer(payload, context, webSocketStrategy);
      },
    );
  }

  observeWebSocketReceiveEvent<
    ReceivePayload extends govn.ValidatedPayload,
  >(
    observer: govn.WebSocketReceiveObserver<ReceivePayload>,
    payloadIdSupplier?:
      | govn.PayloadIdentity
      | govn.PayloadService,
  ): void {
    const payloadID = payloadIdSupplier
      ? (typeof payloadIdSupplier === "string"
        ? payloadIdSupplier
        : payloadIdSupplier.payloadIdentity)
      : this.args.eventNameStrategy.universalScopeID;
    const names = this.args.eventNameStrategy.webSocket(payloadID);
    this.addEventListener(
      names.selectedName,
      (event) => {
        const typedCustomEvent = event as unknown as {
          detail: WebSocketReceiveCustomEventDetail<ReceivePayload>;
        };
        let { payload } = typedCustomEvent.detail;
        if (govn.isEventSourceService<ReceivePayload>(payloadIdSupplier)) {
          if (payloadIdSupplier.isEventSourcePayload(payload)) {
            payload = payloadIdSupplier.prepareEventSourcePayload(
              payload,
            );
            // forcefully mutate and let receivers know it's validated
            (payload as unknown as govn.MutatableValidatedPayload)
              .isValidatedPayload = true;
          }
        }
        observer(payload, this);
      },
    );
  }

  observeWebSocketErrorEvent<Payload extends govn.IdentifiablePayload>(
    observer: govn.WebSocketErrorObserver<Payload>,
    payloadIdSupplier?:
      | govn.PayloadIdentity
      | govn.PayloadService,
  ): void {
    const payloadID = payloadIdSupplier
      ? (typeof payloadIdSupplier === "string"
        ? payloadIdSupplier
        : payloadIdSupplier.payloadIdentity)
      : this.args.eventNameStrategy.universalScopeID;
    const names = this.args.eventNameStrategy.webSocketError(payloadID);
    this.addEventListener(
      names.selectedName,
      (event) => {
        const typedCustomEvent = event as unknown as {
          detail: govn.ErrorSupplier;
        };
        const { error } = typedCustomEvent.detail;
        observer(error, undefined, this);
      },
    );
  }
}
