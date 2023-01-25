import * as c from "./connection.ts";
import * as safety from "../../safety/mod.ts";

// Using Server Sent Events (SSEs or "EventSource") on anything but HTTP/2 connections is not recommended.
// See [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) warning section.
// See [EventSource: why no more than 6 connections?](https://stackoverflow.com/questions/16852690/sseeventsource-why-no-more-than-6-connections).

export interface EventSourceConnectionState {
  readonly isConnectionState: true;
  readonly isHealthy?: boolean;
}

export interface EventSourceConnectionHealthy
  extends EventSourceConnectionState {
  readonly isHealthy: true;
  readonly connEstablishedOn: Date;
  readonly endpointURL: string;
  readonly pingURL: string;
}

export const isEventSourceConnectionHealthy = safety.typeGuard<
  EventSourceConnectionHealthy
>("isHealthy", "connEstablishedOn");

export interface EventSourceConnectionUnhealthy
  extends EventSourceConnectionState {
  readonly isHealthy: false;
  readonly connFailedOn: Date;
  readonly reconnectStrategy?: c.ReconnectionStrategy;
}

export const isEventSourceConnectionUnhealthy = safety.typeGuard<
  EventSourceConnectionUnhealthy
>("isHealthy", "connFailedOn");

export const isEventSourceReconnecting = safety.typeGuard<
  EventSourceConnectionUnhealthy
>("isHealthy", "connFailedOn", "reconnectStrategy");

export interface EventSourceError extends EventSourceConnectionUnhealthy {
  readonly isEventSourceError: true;
  readonly errorEvent: Event;
}

export const isEventSourceError = safety.typeGuard<
  EventSourceError
>("isEventSourceError", "errorEvent");

export interface EventSourceEndpointUnavailable {
  readonly isEndpointUnavailable: true;
  readonly endpointURL: string;
  readonly pingURL: string;
  readonly httpStatus?: number;
  readonly httpStatusText?: string;
  readonly connectionError?: Error;
}

export const isEventSourceEndpointUnavailable = safety.typeGuard<
  EventSourceEndpointUnavailable
>("isEndpointUnavailable", "endpointURL");

/**
 * EventSourceFactory will be called upon each connection of ES. It's important
 * that this factory setup the full EventSource, including any onmessage or
 * event listeners because reconnections will close previous ESs and recreate
 * the EventSource every time a connection is "broken".
 *
 * We're using a generic EventSource because we build in Deno but Deno doesn't
 * know what an EventSource is (it's known in browsers). This did not work:
 *     /// <reference lib="dom" />
 * note: <reference lib="dom" /> works in VS Code but created Deno.emit() and
 * 'path-task bundle-all' errors.
 * TODO: figure out how to not use EventSource generic.
 */
export interface EventSourceFactory<EventSource> {
  construct: (esURL: string) => EventSource;
  connected?: (es: EventSource) => void;
}

interface ConnectionStateChangeNotification {
  (
    active: EventSourceConnectionState,
    previous: EventSourceConnectionState,
    tunnel: EventSourceTunnel,
  ): void;
}

interface ReconnectionStateChangeNotification {
  (
    active: c.ReconnectionState,
    previous: c.ReconnectionState,
    rs: c.ReconnectionStrategy,
    tunnel: EventSourceTunnel,
  ): void;
}

export interface EventSourceStateInit<EventSource> {
  readonly esURL: string;
  readonly esEndpointValidator: c.ConnectionValidator;
  readonly userAgentFingerprint: string;
  readonly eventSourceFactory: EventSourceFactory<EventSource>;
  readonly options?: {
    readonly onConnStateChange?: ConnectionStateChangeNotification;
    readonly onReconnStateChange?: ReconnectionStateChangeNotification;
  };
}

// deno-lint-ignore no-explicit-any
export class EventSourceTunnel<EventSource = any> {
  readonly esURL: string;
  readonly esEndpointValidator: c.ConnectionValidator;
  readonly observerUniversalScopeID: "universal" = "universal";
  readonly eventSourceFactory: EventSourceFactory<EventSource>;
  readonly onConnStateChange?: ConnectionStateChangeNotification;
  readonly onReconnStateChange?: ReconnectionStateChangeNotification;

  // isHealthy can be true or false for known states, or undefined at init
  // for "unknown" state
  #connectionState: EventSourceConnectionState = { isConnectionState: true };
  #reconnStrategy?: c.ReconnectionStrategy;

  constructor(init: EventSourceStateInit<EventSource>) {
    this.esURL = init.esURL;
    this.esEndpointValidator = init.esEndpointValidator;
    this.eventSourceFactory = init.eventSourceFactory;
    this.onConnStateChange = init.options?.onConnStateChange;
    this.onReconnStateChange = init.options?.onReconnStateChange;
  }

  isReconnecting(): c.ReconnectionStrategy | false {
    return this.#reconnStrategy ? this.#reconnStrategy : false;
  }

  isReconnectAborted(): boolean {
    return this.#reconnStrategy && this.#reconnStrategy.isAborted
      ? true
      : false;
  }

  connected(es: EventSource, connState: EventSourceConnectionHealthy) {
    if (this.#reconnStrategy) this.#reconnStrategy.completed();
    this.eventSourceFactory.connected?.(es);

    // update messages and listeners as to our new state; at this point the
    // reconnection state in this.#reconnStrategy is available
    this.connectionState = connState;

    // now reset the reconnection strategy because messages are updated
    this.#reconnStrategy = undefined;
  }

  prepareReconnect(connState: EventSourceConnectionUnhealthy) {
    this.#reconnStrategy = this.#reconnStrategy ?? new c.ReconnectionStrategy({
      onStateChange: this.onReconnStateChange
        ? (active, previous, rs) => {
          this.onReconnStateChange?.(active, previous, rs, this);
        }
        : undefined,
    });
    connState = {
      ...connState,
      reconnectStrategy: this.#reconnStrategy,
    };
    this.connectionState = connState;
    return this.#reconnStrategy.reconnect();
  }

  init() {
    if (this.isReconnectAborted()) return;

    this.esEndpointValidator.validate(this.#reconnStrategy).then((resp) => {
      if (resp.ok) {
        // this.eventSourceFactory() should assign onmessage by default
        const eventSource = this.eventSourceFactory.construct(this.esURL);

        // for type-safety in Deno we need to coerce to what we know ES is;
        // TODO: figure out how why /// <reference lib="dom" /> did not work.
        // note: <reference lib="dom" /> works in VS Code but not in Deno.emit().
        const coercedES = eventSource as unknown as {
          // deno-lint-ignore no-explicit-any
          onerror: ((this: EventSource, ev: Event) => any) | null;
          // deno-lint-ignore no-explicit-any
          onopen: ((this: EventSource, ev: Event) => any) | null;
          close: () => void;
        };

        coercedES.onopen = () => {
          this.connected(eventSource, {
            isConnectionState: true,
            isHealthy: true,
            connEstablishedOn: new Date(),
            endpointURL: this.esURL,
            pingURL: this.esEndpointValidator.validationEndpointURL.toString(),
          });
        };

        coercedES.onerror = (event) => {
          coercedES.close();
          const connState: EventSourceError = {
            isConnectionState: true,
            isHealthy: false,
            connFailedOn: new Date(),
            isEventSourceError: true,
            errorEvent: event,
          };
          const reconnectStrategy = this.prepareReconnect(connState);
          setTimeout(() => this.init(), reconnectStrategy.intervalMillecs);
        };
      } else {
        const connState:
          & EventSourceConnectionUnhealthy
          & EventSourceEndpointUnavailable = {
            isConnectionState: true,
            isHealthy: false,
            connFailedOn: new Date(),
            isEndpointUnavailable: true,
            endpointURL: this.esURL,
            pingURL: this.esEndpointValidator.validationEndpointURL.toString(),
            httpStatus: resp.status,
            httpStatusText: resp.statusText,
          };
        const reconnectStrategy = this.prepareReconnect(connState);
        setTimeout(() => this.init(), reconnectStrategy.intervalMillecs);
      }
    }).catch((connectionError: Error) => {
      const connState:
        & EventSourceConnectionUnhealthy
        & EventSourceEndpointUnavailable = {
          isConnectionState: true,
          isHealthy: false,
          connFailedOn: new Date(),
          pingURL: this.esEndpointValidator.validationEndpointURL.toString(),
          connectionError,
          isEndpointUnavailable: true,
          endpointURL: this.esURL,
        };
      const reconnectStrategy = this.prepareReconnect(connState);
      setTimeout(() => this.init(), reconnectStrategy.intervalMillecs);
    });

    // we return 'this' to allow convenient method chaining
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

export interface EventSourceConnNarrative {
  readonly isHealthy: boolean;
  readonly summary: string;
  readonly color: string;
  readonly summaryHint?: string;
}

export function eventSourceConnNarrative(
  tunnel: EventSourceTunnel,
): EventSourceConnNarrative {
  const sseState = tunnel.connectionState;
  const reconn = tunnel.isReconnecting();
  let reconnected = false;
  if (reconn) {
    switch (reconn.state) {
      case c.ReconnectionState.TRYING:
        return {
          summary: `reconnecting ${reconn.attempt}/${reconn.maxAttempts}`,
          color: "orange",
          isHealthy: false,
          summaryHint:
            `Trying to reconnect to ${tunnel.esURL} (ES), reconnecting every ${reconn.intervalMillecs} milliseconds`,
        };

      case c.ReconnectionState.ABORTED:
        return {
          summary: `ABORTED`,
          color: "red",
          isHealthy: false,
          summaryHint:
            `Unable to reconnect to ${tunnel.esURL} (ES) after ${reconn.maxAttempts} attempts, giving up`,
        };

      case c.ReconnectionState.COMPLETED:
        reconnected = true;
        break;
    }
  }

  // c.ReconnectionState.UNKNOWN and c.ReconnectionState.COMPLETED will fall
  // through to the messages below

  if (isEventSourceConnectionHealthy(sseState)) {
    return {
      summary: reconnected ? "reconnected" : "connected",
      color: "green",
      isHealthy: true,
      summaryHint:
        `Connection to ${sseState.endpointURL} (ES) verified using ${sseState.pingURL} on ${sseState.connEstablishedOn}`,
    };
  }

  const isHealthy = false;
  let summary = "unknown";
  let color = "purple";
  let summaryHint = `the EventSource tunnel is not healthy, but not sure why`;
  if (isEventSourceConnectionUnhealthy(sseState)) {
    if (isEventSourceEndpointUnavailable(sseState)) {
      summary = "ES unavailable";
      summaryHint = `${sseState.endpointURL} (ES) not available`;
      if (sseState.httpStatus) {
        summary = `ES unavailable (${sseState.httpStatus})`;
        summaryHint +=
          ` (HTTP status: ${sseState.httpStatus}, ${sseState.httpStatusText})`;
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

  return { isHealthy, summary, summaryHint, color };
}
