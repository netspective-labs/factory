/**
 * mod.js.ts is a Typescript-friendly Deno-style strategy of bringing in
 * selective server-side Typescript functions and modules into client-side
 * browser and other user agent Javascript runtimes.
 *
 * mod.js.ts should be Deno bundled into mod.auto.js assuming that
 * mod.auto.js exists as a "twin". The existence of the mod.auto.js (even an
 * empty one) is a signal to the bundler to generate the twin *.auto.js file.
 * HTML and client-side source pulls in *.auto.js but since it's generated from
 * this file we know it will be correct.
 *
 * REMINDER: mod.auto.js must exist in order for mod.js.ts to be bundled.
 *           if it doesn't exist just create a empty file named mod.auto.js
 */

import { createDomain } from "https://unpkg.com/effector@22.3.0/effector.mjs";

// Using Server Sent Events (SSEs or "EventSource") on anything but HTTP/2 connections is not recommended.
// See [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) warning section.
// See [EventSource: why no more than 6 connections?](https://stackoverflow.com/questions/16852690/sseeventsource-why-no-more-than-6-connections).

export interface TunnelOptions {
  readonly millisecsBetweenReconnectAttempts?: number;
  readonly maxReconnectAttempts?: number;
  // deno-lint-ignore no-explicit-any
  readonly domain?: any; // Effector Domain, untyped while we figure out how to type it
}

/**
 * constructEventSource will be called upon each connection of ES. Caller should
 * use this factory function to setup the full EventSource, including any
 * onmessage or event listeners because reconnections will close previous ESs
 * and recreate the EventSource every time a connection is "broken".
 *
 * We're using a generic EventSource because we build in Deno but Deno doesn't
 * know what an EventSource is (it's known in browsers). This did not work:
 *     /// <reference lib="dom" />
 * note: <reference lib="dom" /> works in VS Code but created Deno.emit() and
 * 'path-task bundle-all' errors.
 * TODO[essential]: figure out how to not use EventSource generic.
 */
export interface EventSourceTunnelOptions<EventSource = unknown>
  extends TunnelOptions {
  readonly constructEventSource: (esURL: string) => EventSource;
}

/**
 * An esTunnel is a set of Effector-based events which manages an EventSource-
 * based "tunnel" that can automatically reconnect on errors.
 *
 * const tunnel = esTunnel({ constructEventSource: (esURL) => new EventSource(esURL) });
 * tunnel.connected.watch((payload) => { console.log('connected to event source', payload.eventSource); });
 * tunnel.$status.watch((statusText) => console.log('tunnel is', statusText));
 * tunnel.connect({ validateURL: "/synthetic/sse/ping", esURL: "/synthetic/sse/tunnel" });
 *
 * @param options Supplies the EventSource factory function, Effector domain, and reconnection options
 * @returns Effector SSE lifecycle events connect, connected, reconnect, abort and $staus store
 */
// TODO[essential]: figure out how to properly type createDomain in Deno
export function esTunnel(options: EventSourceTunnelOptions) {
  const {
    constructEventSource,
    domain = createDomain("esTunnel"),
    maxReconnectAttempts = 30,
    millisecsBetweenReconnectAttempts = 1000,
  } = options;

  // deno-lint-ignore no-explicit-any
  let eventSource: any = undefined; // this may be re-created at any time
  const connect = domain.createEvent("connect");
  const connected = domain.createEvent("connected");
  const reconnect = domain.createEvent("reconnect");
  const abort = domain.createEvent("abort");

  const $status = domain.createStore("initial")
    .on(
      connect,
      (_: unknown, payload: { attempt: number }) =>
        `connecting ${payload.attempt ?? 1}/${maxReconnectAttempts}`,
    )
    .on(connected, () => "connected")
    .on(
      reconnect,
      (_: unknown, payload: { attempt: number }) =>
        `connecting ${payload.attempt}/${maxReconnectAttempts}`,
    )
    .on(abort, () => `aborted after ${maxReconnectAttempts} tries`);

  connect.watch(
    (
      { validateURL, esURL, attempt = 0 }: {
        readonly validateURL: string;
        readonly esURL: string;
        readonly attempt?: number;
      },
    ) => {
      if (eventSource) eventSource.close();

      if (attempt > maxReconnectAttempts) {
        abort({
          validateURL,
          esURL,
          attempt,
          why: "max-reconnect-attempts-exceeded",
        });
        return;
      }

      fetch(validateURL).then((resp) => {
        if (resp.ok) {
          eventSource = constructEventSource(esURL);
          eventSource.onopen = (esOnOpenEvent: Event) =>
            connected({
              esOnOpenEvent,
              eventSource,
              esURL,
              validateURL,
              attempt,
            });
          eventSource.onerror = (esOnErrorEvent: Event) =>
            reconnect({
              attempt,
              esOnErrorEvent,
              esURL,
              validateURL,
              why: "event-source-error",
            });
        } else {
          reconnect({
            attempt,
            esURL,
            validateURL,
            why: "fetch-resp-not-ok",
            httpStatus: resp.status,
            httpStatusText: resp.statusText,
          });
        }
      }).catch((fetchError) =>
        reconnect({
          attempt,
          fetchError,
          esURL,
          validateURL,
          why: "fetch-failed",
        })
      );
    },
  );

  reconnect.watch((payload: {
    readonly validateURL: string;
    readonly esURL: string;
    readonly attempt: number;
  }) => {
    setTimeout(
      () =>
        connect({
          validateURL: payload.validateURL,
          esURL: payload.esURL,
          attempt: payload.attempt + 1,
        }),
      millisecsBetweenReconnectAttempts,
    );
  });

  return {
    connect,
    connected,
    reconnect,
    abort,
    $status,
  };
}

/**
 * constructWebSocket will be called upon each connection of WS. Caller should
 * use this factory function to setup the full WebSocket, including any
 * onmessage or event listeners because reconnections will close previous WSs
 * and recreate the WebSocket every time a connection is "broken".
 */
export interface WebSocketTunnelOptions extends TunnelOptions {
  readonly constructWebSocket: (wsURL: string) => WebSocket;
  readonly allowClose?: boolean;
}

/**
 * An wsTunnel is a set of Effector-based events which manages a WebSocket-
 * based "tunnel" that can automatically reconnect on errors.
 *
 * const tunnel = wsTunnel({ constructWebSocket: (wsURL) => new WebSocket(wsURL) });
 * tunnel.connected.watch((payload) => { console.log('connected to event source', payload.eventSource); });
 * tunnel.$status.watch((statusText) => console.log('tunnel is', statusText));
 * tunnel.connect({ validateURL: "/synthetic/ws/ping", wsURL: "/synthetic/ws/tunnel" });
 *
 * @param options Supplies the WebSocket factory function, Effector domain, and reconnection options
 * @returns Effector WS lifecycle events connect, connected, reconnect, abort and $staus store
 */
// TODO[essential]: figure out how to properly type createDomain in Deno
export function wsTunnel(options: WebSocketTunnelOptions) {
  const {
    constructWebSocket,
    domain = createDomain("wsTunnel"),
    maxReconnectAttempts = 30,
    millisecsBetweenReconnectAttempts = 1000,
    allowClose = false,
  } = options;

  // deno-lint-ignore no-explicit-any
  let webSocket: any = undefined; // this may be re-created at any time
  const connect = domain.createEvent("connect");
  const connected = domain.createEvent("connected");
  const reconnect = domain.createEvent("reconnect");
  const abort = domain.createEvent("abort");

  const $status = domain.createStore("initial")
    .on(
      connect,
      (_: unknown, payload: { attempt: number }) =>
        `connecting ${payload.attempt ?? 1}/${maxReconnectAttempts}`,
    )
    .on(connected, () => "connected")
    .on(
      reconnect,
      (_: unknown, payload: { attempt: number }) =>
        `connecting ${payload.attempt}/${maxReconnectAttempts}`,
    )
    .on(abort, () => `aborted after ${maxReconnectAttempts} tries`);

  connect.watch(
    (
      { validateURL, wsURL, attempt = 0 }: {
        readonly validateURL: string;
        readonly wsURL: string;
        readonly attempt?: number;
      },
    ) => {
      if (webSocket) webSocket.close();

      if (attempt > maxReconnectAttempts) {
        abort({
          validateURL,
          wsURL,
          attempt,
          why: "max-reconnect-attempts-exceeded",
        });
        return;
      }

      fetch(validateURL).then((resp) => {
        if (resp.ok) {
          webSocket = constructWebSocket(wsURL);
          webSocket.onopen = (wsOnOpenEvent: Event) =>
            connected({
              wsOnOpenEvent,
              webSocket,
              wsURL,
              validateURL,
              attempt,
            });
          webSocket.onclose = (wsOnCloseEvent: Event) => {
            if (!allowClose) {
              reconnect({
                attempt,
                wsOnCloseEvent,
                wsURL,
                validateURL,
                why: "web-socket-close-not-allowed",
              });
            }
          };
          webSocket.onerror = (wsOnErrorEvent: Event) =>
            reconnect({
              attempt,
              wsOnErrorEvent,
              wsURL,
              validateURL,
              why: "web-socket-error",
            });
        } else {
          reconnect({
            attempt,
            wsURL,
            validateURL,
            why: "fetch-resp-not-ok",
            httpStatus: resp.status,
            httpStatusText: resp.statusText,
          });
        }
      }).catch((fetchError) =>
        reconnect({
          attempt,
          fetchError,
          wsURL,
          validateURL,
          why: "fetch-failed",
        })
      );
    },
  );

  reconnect.watch((payload: {
    readonly validateURL: string;
    readonly wsURL: string;
    readonly attempt: number;
  }) => {
    setTimeout(
      () =>
        connect({
          validateURL: payload.validateURL,
          wsURL: payload.wsURL,
          attempt: payload.attempt + 1,
        }),
      millisecsBetweenReconnectAttempts,
    );
  });

  return {
    connect,
    connected,
    reconnect,
    abort,
    $status,
  };
}
