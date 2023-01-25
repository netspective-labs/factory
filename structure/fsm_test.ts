import * as ta from "https://deno.land/std@0.147.0/testing/asserts.ts";
import * as mod from "./fsm.ts";

// these are the states and events for the door
enum PublishState {
  idle,
  initialized,
  originating,
  originated,
  refining,
  refined,
  producing,
  produced,
  finalizing,
  finalized,
  concluded,
}
enum PublishEvent {
  initialize,
  originate,
  refine,
  produce,
  finalize,
  conclude,
}

const transitions: mod.StateTransition<PublishEvent, PublishState>[] = [
  mod.event(
    PublishState.idle,
    PublishEvent.initialize,
    PublishState.initialized,
  ),
  mod.event(
    PublishState.initialized,
    PublishEvent.originate,
    PublishState.originating,
  ),
  mod.event(
    PublishState.originating,
    PublishEvent.refine,
    PublishState.refining,
  ),
  mod.event(
    PublishState.refining,
    PublishEvent.produce,
    PublishState.producing,
  ),
  mod.event(
    PublishState.producing,
    PublishEvent.finalize,
    PublishState.finalizing,
  ),
  mod.event(
    PublishState.finalizing,
    PublishEvent.conclude,
    PublishState.concluded,
  ),
];

Deno.test("TypicalStateMachine without exceptions", async () => {
  const sm = new mod.TypicalStateMachine(
    transitions,
    PublishState.idle,
  );
  ta.assertEquals(sm.isTerminal, false);
  ta.assertEquals(sm.state, PublishState.idle);
  ta.assert(sm.isTransitionable(PublishEvent.initialize));
  ta.assertEquals(sm.isTransitionable(PublishEvent.originate), false);
  ta.assertEquals(sm.isTransitionable(PublishEvent.conclude), false);

  await sm.transition(PublishEvent.initialize);
  ta.assertEquals(sm.state, PublishState.initialized);

  ta.assertEquals(sm.transitionSync(PublishEvent.initialize), undefined);
  ta.assertEquals(
    sm.transitionSync(PublishEvent.originate),
    PublishState.originating,
  );

  ta.assertEquals(
    sm.transitionSync(PublishEvent.refine),
    PublishState.refining,
  );

  ta.assertEquals(
    sm.transitionSync(PublishEvent.produce),
    PublishState.producing,
  );

  ta.assertEquals(
    sm.transitionSync(PublishEvent.finalize),
    PublishState.finalizing,
  );

  ta.assertEquals(sm.isTerminal, false);
  sm.transitionSync(PublishEvent.conclude);
  ta.assertEquals(sm.state, PublishState.concluded);
  ta.assert(sm.isTerminal);
});

Deno.test("TypicalStateMachine with exceptions", () => {
  const sm = new mod.TypicalStateMachine(
    transitions,
    PublishState.idle,
    {
      throwOnReject: (event) => new Error(`rejected! ${event}`),
    },
  );
  ta.assertThrows(() => sm.transitionSync(PublishEvent.conclude));
});
