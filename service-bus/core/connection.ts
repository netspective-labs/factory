export interface ConnectionValidator {
  readonly validationEndpointURL: string | URL | Request;
  readonly validate: (rs?: ReconnectionStrategy) => Promise<Response>;
}

export function typicalConnectionValidator(
  pingURL: string | URL | Request,
): ConnectionValidator {
  return {
    validationEndpointURL: pingURL,
    validate: () => {
      return fetch(pingURL, { method: "HEAD" });
    },
  };
}

export interface ReconnectionStateChangeNotification {
  (
    active: ReconnectionState,
    previous: ReconnectionState,
    stategy: ReconnectionStrategy,
  ): void;
}

export interface ReconnectionStrategyOptions {
  readonly intervalMillecs?: number;
  readonly maxAttempts?: number;
  readonly onStateChange?: ReconnectionStateChangeNotification;
}

export enum ReconnectionState {
  IDLE = "idle",
  TRYING = "trying",
  COMPLETED = "completed",
  ABORTED = "aborted",
}

export class ReconnectionStrategy {
  readonly maxAttempts: number;
  readonly intervalMillecs: number;
  readonly onStateChange?: ReconnectionStateChangeNotification;
  #state: ReconnectionState = ReconnectionState.IDLE;
  #attempt = 0;

  constructor(options?: ReconnectionStrategyOptions) {
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
    return this; // return 'this' to encourage method chaining
  }

  completed(status = ReconnectionState.COMPLETED) {
    this.state = status;
    return this; // return 'this' to encourage method chaining
  }
}
