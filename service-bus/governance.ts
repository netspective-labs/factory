import * as safety from "../safety/mod.ts";

export type PayloadIdentity = string;
export type ServiceIdentity = string;

export interface IdentifiablePayload {
  readonly payloadIdentity: PayloadIdentity; // use by observers
}

export const isIdentifiablePayload = safety.typeGuard<IdentifiablePayload>(
  "payloadIdentity",
);

export interface MutatableValidatedPayload {
  isValidatedPayload: true;
  isValidPayload: boolean;
}

// deno-lint-ignore no-empty-interface
export interface ValidatedPayload extends Readonly<MutatableValidatedPayload> {
}

export const ValidatedPayload = safety.typeGuard<ValidatedPayload>(
  "isValidatedPayload",
  "isValidPayload",
);

export interface PayloadService {
  readonly serviceIdentity: ServiceIdentity;
  readonly payloadIdentity: PayloadIdentity;
}

export interface ErrorSupplier {
  readonly error: Error;
}

export interface UnsolicitedPayloadObserver<
  Payload extends ValidatedPayload,
> {
  (p: Payload, ups: UnsolicitedPayloadStrategy): void;
}

export interface UnsolicitedPayloadStrategy {
  readonly observeUnsolicitedPayload: <
    Payload extends ValidatedPayload,
  >(
    observer: UnsolicitedPayloadObserver<Payload>,
    payloadID?: PayloadIdentity | PayloadService,
  ) => void;
}

export interface ReceivedPayloadObserver<
  Payload extends ValidatedPayload,
> {
  (p: Payload, ups: ReceivedPayloadStrategy): void;
}

export interface ReceivedPayloadStrategy {
  readonly observeReceivedPayload: <
    Payload extends ValidatedPayload,
  >(
    observer: ReceivedPayloadObserver<Payload>,
    payloadID?: PayloadIdentity | PayloadService,
  ) => void;
}

export interface SolicitedPayloadObserver<
  SolicitedPayload extends IdentifiablePayload,
  SolicitedResponsePayload extends ValidatedPayload,
  Context,
> {
  (
    srp: SolicitedResponsePayload,
    sp: SolicitedPayload,
    ctx: Context,
    sps: SolicitedPayloadStrategy,
  ): void;
}

export interface SolicitedPayloadStrategy {
  readonly observeSolicitedPayload: <
    SolicitedPayload extends IdentifiablePayload,
    SolicitedResponsePayload extends ValidatedPayload,
    Context,
  >(
    observer: SolicitedPayloadObserver<
      SolicitedPayload,
      SolicitedResponsePayload,
      Context
    >,
    payloadID?: PayloadIdentity | PayloadService,
  ) => void;
}

export interface EventSourceStrategy {
  readonly observeEventSource: <
    EventSourcePayload extends ValidatedPayload,
  >(
    observer: EventSourceObserver<EventSourcePayload>,
    payloadID?: PayloadIdentity,
  ) => void;
  readonly observeEventSourceError: <
    EventSourcePayload extends IdentifiablePayload,
  >(
    observer: EventSourceErrorObserver<EventSourcePayload>,
    payloadID?: PayloadIdentity | PayloadService,
  ) => void;
}

export interface EventSourceService<
  EventSourcePayload extends ValidatedPayload,
> extends PayloadService {
  readonly isEventSourcePayload: (
    rawJSON: unknown,
  ) => rawJSON is EventSourcePayload;
  readonly prepareEventSourcePayload: (rawJSON: unknown) => EventSourcePayload;
}

export function isEventSourceService<
  EventSourcePayload extends ValidatedPayload,
>(o: unknown): o is EventSourceService<EventSourcePayload> {
  const isType = safety.typeGuard<EventSourceService<EventSourcePayload>>(
    "isEventSourcePayload",
    "prepareEventSourcePayload",
  );
  return isType(o);
}

export interface EventSourceObserver<
  EventSourcePayload extends ValidatedPayload,
> {
  (esp: EventSourcePayload, ess: EventSourceStrategy): void;
}

export interface EventSourceErrorObserver<
  EventSourcePayload extends IdentifiablePayload,
> {
  (
    error: Error,
    esp: EventSourcePayload,
    ess: EventSourceStrategy,
  ): void;
}

export interface FetchObserver<
  FetchPayload extends IdentifiablePayload,
  Context,
> {
  (
    fp: FetchPayload,
    ri: RequestInit,
    ctx: Context,
    fs: FetchStrategy,
  ): void;
}

export interface FetchResponseObserver<
  FetchPayload extends IdentifiablePayload,
  FetchRespPayload extends ValidatedPayload,
  Context,
> {
  (
    frp: FetchRespPayload,
    fp: FetchPayload,
    ctx: Context,
    fs: FetchStrategy,
  ): void;
}

export interface FetchErrorObserver<
  FetchPayload extends IdentifiablePayload,
  Context,
> {
  (
    error: Error,
    ri: RequestInit,
    fp: FetchPayload,
    ctx: Context,
    fs: FetchStrategy,
  ): void;
}

export interface FetchStrategy {
  readonly fetch: <
    FetchPayload extends IdentifiablePayload,
    FetchRespPayload extends ValidatedPayload,
    Context,
  >(
    sbfe: FetchService<FetchPayload, FetchRespPayload, Context>,
    ctx: Context,
  ) => void;
  readonly observeFetchEvent: <
    FetchPayload extends IdentifiablePayload,
    Context,
  >(
    observer: FetchObserver<FetchPayload, Context>,
    payloadID?: PayloadIdentity | PayloadService,
  ) => void;
  readonly observeFetchEventResponse: <
    FetchPayload extends IdentifiablePayload,
    FetchRespPayload extends ValidatedPayload,
    Context,
  >(
    observer: FetchResponseObserver<
      FetchPayload,
      FetchRespPayload,
      Context
    >,
    payloadID?: PayloadIdentity | PayloadService,
  ) => void;
  readonly observeFetchEventError: <
    FetchPayload extends IdentifiablePayload,
    Context,
  >(
    observer: FetchErrorObserver<
      FetchPayload,
      Context
    >,
    payloadID?: PayloadIdentity | PayloadService,
  ) => void;
}

export interface FetchInit {
  readonly endpoint: string | Request | URL;
  readonly requestInit: RequestInit;
}

export interface FetchService<
  FetchPayload extends IdentifiablePayload,
  FetchRespPayload extends ValidatedPayload,
  Context,
> {
  readonly fetch: (sb: FetchStrategy, ctx: Context) => void;
  readonly prepareFetchContext: (ctx: Context, sb: FetchStrategy) => Context;
  readonly prepareFetchPayload: (
    ctx: Context,
    fs: FetchStrategy,
  ) => FetchPayload;
  readonly prepareFetchResponsePayload: (
    fp: FetchPayload,
    fetchRespRawJSON: unknown,
    ctx: Context,
    fs: FetchStrategy,
  ) => FetchRespPayload;
  readonly prepareFetch: (
    baseURL: string | undefined,
    payload: FetchPayload,
    ctx: Context,
    fs: FetchStrategy,
  ) => FetchInit;
}

export function isFetchService<
  FetchPayload extends IdentifiablePayload,
  FetchRespPayload extends ValidatedPayload,
  Context,
>(o: unknown): o is FetchService<FetchPayload, FetchRespPayload, Context> {
  const isType = safety.typeGuard<
    FetchService<FetchPayload, FetchRespPayload, Context>
  >(
    "fetch",
    "prepareFetchContext",
    "prepareFetchPayload",
    "prepareFetch",
    "prepareFetchResponsePayload",
  );
  return isType(o);
}

export interface WebSocketSendObserver<
  SendPayload extends IdentifiablePayload,
  Context,
> {
  (wsp: SendPayload, ctx: Context, wss: WebSocketStrategy): void;
}

export interface WebSocketReceiveObserver<
  ReceivePayload extends ValidatedPayload,
> {
  (payload: ReceivePayload, wss: WebSocketStrategy): void;
}

export interface WebSocketErrorObserver<
  WebSocketPayload extends IdentifiablePayload,
> {
  (
    error: Error,
    wsp: WebSocketPayload | undefined,
    wss: WebSocketStrategy,
  ): void;
}

export interface WebSocketStrategy {
  readonly webSocketSend: <SendPayload extends IdentifiablePayload, Context>(
    ctx: Context,
    wss: WebSocketSendService<SendPayload>,
  ) => void;
  readonly prepareWebSocketReceivePayload: <ReceivePayload>(
    webSocketReceiveRaw: string | ArrayBufferLike | Blob | ArrayBufferView,
  ) => ReceivePayload;
  readonly observeWebSocketSendEvent: <
    SendPayload extends IdentifiablePayload,
    Context,
  >(
    observer: WebSocketSendObserver<SendPayload, Context>,
    payloadID?: PayloadIdentity | PayloadService,
  ) => void;
  readonly observeWebSocketReceiveEvent: <
    ReceivePayload extends ValidatedPayload,
  >(
    observer: WebSocketReceiveObserver<ReceivePayload>,
    payloadID?: PayloadIdentity | PayloadService,
  ) => void;
  readonly observeWebSocketErrorEvent: <Payload extends IdentifiablePayload>(
    observer: WebSocketErrorObserver<Payload>,
    payloadID?: PayloadIdentity | PayloadService,
  ) => void;
}

export interface WebSocketSendService<
  SendPayload extends IdentifiablePayload,
> extends PayloadService {
  readonly webSocketSend: (sb: WebSocketStrategy) => void;
  readonly prepareWebSocketSendPayload: <Context>(
    ctx: Context,
    wss: WebSocketStrategy,
  ) => SendPayload;
  readonly prepareWebSocketSend: (
    payload: SendPayload,
    wss: WebSocketStrategy,
  ) => string | ArrayBufferLike | Blob | ArrayBufferView;
}

export function isWebSocketSendService<
  SendPayload extends IdentifiablePayload,
>(o: unknown): o is WebSocketSendService<SendPayload> {
  const isType = safety.typeGuard<WebSocketSendService<SendPayload>>(
    "webSocketSend",
    "prepareWebSocketSendPayload",
    "prepareWebSocketSend",
  );
  return isType(o);
}

export interface WebSocketReceiveService<
  ReceivePayload extends IdentifiablePayload,
> extends PayloadService {
  readonly isWebSocketReceivePayload: (
    rawJSON: unknown,
  ) => rawJSON is ReceivePayload;
  readonly prepareWebSocketReceivePayload: (rawJSON: unknown) => ReceivePayload;
}

export function isWebSocketReceiveService<
  ReceivePayload extends IdentifiablePayload,
>(o: unknown): o is WebSocketReceiveService<ReceivePayload> {
  const isType = safety.typeGuard<WebSocketReceiveService<ReceivePayload>>(
    "isWebSocketReceivePayload",
    "prepareWebSocketReceivePayload",
  );
  return isType(o);
}
