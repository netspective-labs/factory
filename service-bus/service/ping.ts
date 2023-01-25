import * as govn from "../governance.ts";

export const pingPayloadIdentity = "ping" as const;

export interface PingFetchPayload {
  payloadIdentity: typeof pingPayloadIdentity;
}

export interface PingEventReceivedPayload extends govn.ValidatedPayload {
  payloadIdentity: typeof pingPayloadIdentity;
}

export interface PingFetchRespPayload extends PingEventReceivedPayload {
  fetchPayload: PingFetchPayload;
  fetchRespRawJSON: unknown;
}

export function isPingPayload(
  o: unknown,
): o is PingFetchPayload | PingEventReceivedPayload {
  if (govn.isIdentifiablePayload(o)) {
    if (o.payloadIdentity == pingPayloadIdentity) {
      return true;
    }
  }
  return false;
}

export function pingPayload(): PingFetchPayload | PingEventReceivedPayload {
  return { payloadIdentity: pingPayloadIdentity };
}

export function pingWebSocketSendPayload():
  | string
  | Blob
  | ArrayBufferView
  | ArrayBufferLike {
  return JSON.stringify(pingPayload());
}

export function pingService(
  endpointSupplier: (baseURL?: string) => string,
) {
  const service:
    & govn.FetchService<
      PingFetchPayload,
      PingFetchRespPayload,
      Record<string, unknown>
    >
    & govn.EventSourceService<PingEventReceivedPayload>
    & govn.WebSocketReceiveService<PingEventReceivedPayload> = {
      serviceIdentity: pingPayloadIdentity,
      payloadIdentity: pingPayloadIdentity,
      fetch: (fetchStrategy, ctx) => {
        fetchStrategy.fetch(service, ctx);
      },
      prepareFetch: (baseURL, payload) => {
        return {
          endpoint: endpointSupplier(baseURL), // we accept the suggested endpoint
          requestInit: {
            method: "POST",
            body: JSON.stringify(payload),
          },
        };
      },
      prepareFetchContext: (ctx) => ctx,
      prepareFetchPayload: (ctx) => {
        return {
          payloadIdentity: pingPayloadIdentity,
          ...ctx,
        };
      },
      prepareFetchResponsePayload: (fetchPayload, fetchRespRawJSON) => {
        // assume that JSON processing has already been done, we just need to "type" it
        return {
          payloadIdentity: fetchPayload.payloadIdentity,
          fetchPayload,
          fetchRespRawJSON,
        } as PingFetchRespPayload;
      },
      isEventSourcePayload: (
        _rawJSON,
      ): _rawJSON is PingEventReceivedPayload => {
        // TODO: we should really do some error checking
        return true;
      },
      prepareEventSourcePayload: (rawJSON) => {
        // TODO: we should really do some error checking
        const validated = rawJSON as govn.MutatableValidatedPayload;
        validated.isValidatedPayload = true;
        validated.isValidPayload = true;
        return validated as PingEventReceivedPayload;
      },
      isWebSocketReceivePayload: (
        _rawJSON,
      ): _rawJSON is PingEventReceivedPayload => true,
      prepareWebSocketReceivePayload: (rawJSON) => {
        // TODO: we should really do some error checking
        const validated = rawJSON as govn.MutatableValidatedPayload;
        validated.isValidatedPayload = true;
        validated.isValidPayload = true;
        return validated as PingEventReceivedPayload;
      },
    };
  return service;
}
