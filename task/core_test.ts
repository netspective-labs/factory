import { assertEquals } from "https://deno.land/std@0.147.0/testing/asserts.ts";
import * as core from "./core.ts";

export interface SyntheticContext {
  readonly state: string;
}

export class Tasks extends core.EventEmitter<{
  help(): void;
  task1(): void;
  task2(param1: string, param2: number): Promise<void>;
  dependentTask3(): Promise<void>;
  task4(ctx: SyntheticContext, param1: string, param2: number): void;
}> {
  task1Executed = 0;
  task2Executed = 0;
  task2Param1?: string;
  task2Param2?: number;
  task3Executed = 0;
  task4Executed = 0;
  task4Param1?: string;
  task4Param2?: number;
  task4CtxState?: string;

  constructor() {
    super();
    // this is ugly but necessary due to events.EventEmitter making _events_ private :-(
    this.on("help", core.eeHelpTask(this));
    this.on("task1", () => {
      this.task1Executed++;
    });
    // deno-lint-ignore require-await
    this.on("task2", async (param1, param2) => {
      this.task2Executed++;
      this.task2Param1 = param1;
      this.task2Param2 = param2;
    });
    this.on("dependentTask3", async () => {
      this.task3Executed++;
      await this.emit("task1");
      await this.emit("task2", "dt3p1", 1000);
    });
    // deno-lint-ignore require-await
    this.on("task4", async (ctx, param1, param2) => {
      this.task4Executed++;
      this.task4Param1 = param1;
      this.task4Param2 = param2;
      this.task4CtxState = ctx.state;
    });
  }
}

Deno.test(`EventEmitter as Task runner`, async (ctx) => {
  const tasks = new Tasks();

  await ctx.step("task 1 executed", async () => {
    await core.eventEmitterCLI(["task1"], tasks);
    assertEquals(tasks.task1Executed, 1);
  });

  await ctx.step("task 2 executed without parameters", async () => {
    await core.eventEmitterCLI(["task2"], tasks);
    assertEquals(tasks.task2Executed, 1);
    assertEquals(tasks.task2Param1, undefined);
    assertEquals(tasks.task2Param2, undefined);
  });

  await ctx.step("task 2 executed with parameters", async () => {
    await core.eventEmitterCLI(["task2", "t2p1", "50"], tasks);
    assertEquals(tasks.task2Executed, 2);
    assertEquals(tasks.task2Param1, "t2p1");
    assertEquals(tasks.task2Param2, 50);
  });

  await ctx.step(
    "dependent task 3 executed along with tasks 1 and 2",
    async () => {
      await core.eventEmitterCLI(["dependentTask3"], tasks);
      assertEquals(tasks.task1Executed, 2);
      assertEquals(tasks.task2Executed, 3);
      assertEquals(tasks.task3Executed, 1);
      assertEquals(tasks.task2Param1, "dt3p1");
      assertEquals(tasks.task2Param2, 1000);
    },
  );

  await ctx.step(
    "task 4 with type-safe context",
    async () => {
      await core.eventEmitterCLI<Tasks, SyntheticContext>(
        ["task4", "t4p1", "750"],
        tasks,
        {
          // when given, context becomes first parameter of task
          context: () => ({ state: "text-from-ctx" }),
        },
      );
      assertEquals(tasks.task4Executed, 1);
      assertEquals(tasks.task2Param1, "dt3p1");
      assertEquals(tasks.task2Param2, 1000);
      assertEquals(tasks.task4CtxState, "text-from-ctx");
    },
  );
});
