import * as events from "https://deno.land/x/eventemitter@1.2.4/mod.ts";
import * as safety from "../safety/mod.ts";

export interface StateTransition<Event, State> {
  readonly event: Event;
  readonly fromState: State;
  readonly toState: State;
}

export interface StateEventListener {
  readonly onEvent: (...args: unknown[]) => void | Promise<void>;
}

export interface StateEventListenerCustom<Event, State> {
  readonly onAnyEvent: (
    event: Event,
    fsm: FiniteStateMachine<Event, State>,
    ...args: unknown[]
  ) => Promise<void>;
}

export interface StateTransitionListener {
  readonly onTransition: (...args: unknown[]) => Promise<void>;
}

export interface StateTransitionListenerCustom<Event, State> {
  readonly onAnyTransition: (
    transition: StateTransition<Event, State>,
    fsm: FiniteStateMachine<Event, State>,
    ...args: unknown[]
  ) => Promise<void>;
}

export interface FiniteStateMachine<Event, State> {
  readonly state: State;
  readonly isTerminal: boolean;
  readonly isTransitionable: (event: Event) => boolean;
  readonly transition: (event: Event, ...args: unknown[]) => Promise<void>;
  readonly transitionSync: (
    event: Event,
    ...args: unknown[]
  ) => State | undefined;
}

export function event<Event, State>(
  fromState: State,
  event: Event,
  toState: State,
): StateTransition<Event, State> {
  return { fromState, event, toState };
}

export const isStateEventListener = safety.typeGuard<StateEventListener>(
  "onEvent",
);

export function isStateEventListenerCustom<Event, State>(
  o: unknown,
): o is StateEventListenerCustom<Event, State> {
  const isType = safety.typeGuard<StateEventListenerCustom<Event, State>>(
    "onAnyEvent",
  );
  return isType(o);
}

export const isStateTransitionListener = safety.typeGuard<
  StateTransitionListener
>(
  "onTransition",
);

export function isStateTransitionListenerCustom<Event, State>(
  o: unknown,
): o is StateTransitionListenerCustom<Event, State> {
  const isType = safety.typeGuard<
    StateTransitionListenerCustom<Event, State>
  >(
    "onAnyTransition",
  );
  return isType(o);
}

export class TypicalStateMachineEventsEmitter<Event, State>
  extends events.EventEmitter<{
    event(
      event: Event,
      fsm: TypicalStateMachine<Event, State>,
      ...args: unknown[]
    ): void;
    transition(
      st: StateTransition<Event, State>,
      fsm: TypicalStateMachine<Event, State>,
      ...args: unknown[]
    ): void;
    rejected(
      event: Event,
      fsm: TypicalStateMachine<Event, State>,
      ...args: unknown[]
    ): void;
  }> {}

export interface TypicalStateMachineOptions<Event, State> {
  readonly tsmeEmitter?: TypicalStateMachineEventsEmitter<Event, State>;
  readonly throwOnReject?: (event: Event, ...args: unknown[]) => Error;
}

export class TypicalStateMachine<Event, State>
  implements FiniteStateMachine<Event, State> {
  protected ee?: TypicalStateMachineEventsEmitter<Event, State>;
  protected throwOnReject?: (event: Event, ...args: unknown[]) => Error;
  protected active: State;

  constructor(
    readonly allowed: StateTransition<Event, State>[],
    active: State,
    options?: TypicalStateMachineOptions<Event, State>,
  ) {
    this.active = active;
    this.ee = options?.tsmeEmitter;
    this.throwOnReject = options?.throwOnReject;
  }

  get state(): State {
    return this.active;
  }

  get isTerminal(): boolean {
    for (const t of this.allowed) {
      if (t.fromState === this.active) {
        return false;
      }
    }

    return true;
  }

  isTransitionable(event: Event): boolean {
    for (const t of this.allowed) {
      if (t.fromState === this.active && t.event === event) {
        return true;
      }
    }

    return false;
  }

  transition(event: Event, ...args: unknown[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // delay execution to make it async
      setTimeout(
        async (self: this) => {
          let found = false;

          // find transition
          for (const t of self.allowed) {
            if (t.fromState === self.active && t.event === event) {
              self.active = t.toState;
              found = true;
              if (self.ee) await self.ee.emit("event", event, self, ...args);
              if (self.ee) await self.ee.emit("transition", t, self, ...args);
              if (isStateEventListener(t)) await t.onEvent(...args);
              if (isStateTransitionListener(t)) await t.onTransition(...args);
              if (isStateEventListenerCustom<Event, State>(t)) {
                await t.onAnyEvent(event, this, ...args);
              }
              if (isStateTransitionListenerCustom<Event, State>(t)) {
                await t.onAnyTransition(t, this, ...args);
              }
              resolve();
              break;
            }
          }

          // no such transition
          if (!found) {
            if (self.ee) self.ee.emit("rejected", event, self, ...args);
            reject(`${event} transition from ${self.active} not allowed`);
          }
        },
        1,
        this,
      );
    });
  }

  transitionSync(event: Event, ...args: unknown[]): State | undefined {
    for (const t of this.allowed) {
      if (t.fromState === this.active && t.event === event) {
        this.active = t.toState;
        if (this.ee) this.ee.emit("event", event, this, ...args);
        if (this.ee) this.ee.emit("transition", t, this, ...args);
        if (isStateEventListener(t)) t.onEvent(...args);
        if (isStateTransitionListener(t)) t.onTransition(...args);
        if (isStateEventListenerCustom<Event, State>(t)) {
          t.onAnyEvent(event, this, ...args);
        }
        if (isStateTransitionListenerCustom<Event, State>(t)) {
          t.onAnyTransition(t, this, ...args);
        }
        return this.active;
      }
    }

    if (this.ee) this.ee.emit("rejected", event, this, ...args);
    if (this.throwOnReject) {
      throw this.throwOnReject(event, ...args);
    }
    return undefined;
  }
}
