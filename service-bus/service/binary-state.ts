import * as govn from "../governance.ts";

export interface BinaryStateServiceFetchPayload {
  payloadIdentity: string;
  state: "checked" | "unchecked";
}

export interface BinaryStateServiceFetchRespPayload
  extends govn.ValidatedPayload {
  payloadIdentity: string;
  fetchPayload: BinaryStateServiceFetchPayload;
  fetchRespRawJSON: unknown;
}

export interface BinaryStateServiceReceivedPayload
  extends govn.ValidatedPayload {
  payloadIdentity: string;
  state: "checked" | "unchecked";
}

export function binaryStateService(
  endpointSupplier: (baseURL?: string) => string,
  identitySupplier: () => string,
  stateSupplier: () => "checked" | "unchecked",
) {
  const proxy:
    & govn.FetchService<
      BinaryStateServiceFetchPayload,
      BinaryStateServiceFetchRespPayload,
      Record<string, unknown>
    >
    & govn.EventSourceService<BinaryStateServiceReceivedPayload>
    & govn.WebSocketReceiveService<BinaryStateServiceReceivedPayload> = {
      serviceIdentity: identitySupplier(),
      payloadIdentity: identitySupplier(),
      fetch: (fetchStrategy, ctx) => {
        fetchStrategy.fetch(proxy, ctx);
      },
      prepareFetchContext: (ctx) => ctx,
      prepareFetchPayload: (ctx) => {
        return {
          payloadIdentity: identitySupplier(),
          state: stateSupplier(),
          ...ctx,
        };
      },
      prepareFetchResponsePayload: (fetchPayload, fetchRespRawJSON) => {
        // assume that JSON processing has already been done, we just need to "type" it
        return {
          payloadIdentity: fetchPayload.payloadIdentity,
          fetchPayload,
          fetchRespRawJSON,
          isValidPayload: true,
          isValidatedPayload: true,
        };
      },
      isEventSourcePayload: (
        _rawJSON,
      ): _rawJSON is BinaryStateServiceReceivedPayload => {
        // TODO: we should really do some error checking
        return true;
      },
      prepareEventSourcePayload: (rawJSON) => {
        // TODO: we should really do some error checking
        const validated = rawJSON as govn.MutatableValidatedPayload;
        validated.isValidatedPayload = true;
        validated.isValidPayload = true;
        return validated as BinaryStateServiceReceivedPayload;
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
      isWebSocketReceivePayload: (
        _rawJSON,
      ): _rawJSON is BinaryStateServiceReceivedPayload => {
        // TODO: we should really do some error checking
        return true;
      },
      prepareWebSocketReceivePayload: (rawJSON) => {
        // TODO: we should really do some error checking
        const validated = rawJSON as govn.MutatableValidatedPayload;
        validated.isValidatedPayload = true;
        validated.isValidPayload = true;
        return validated as BinaryStateServiceReceivedPayload;
      },
    };
  return proxy;
}
