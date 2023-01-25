import * as ta from "https://deno.land/std@0.147.0/testing/asserts.ts";
import { SortedQueue, SortedQueueItem } from "./sorted-queue.ts";

function collect<T>(queue: SortedQueue<T>): T[] {
  const array: T[] = [];
  for (;;) {
    const item = queue.pop();
    if (!item) {
      break;
    }
    array.push(item.value);
  }
  return array;
}

Deno.test(`SortedQueue`, async (ctx) => {
  await ctx.step("should support custom comparison functions", () => {
    const q = new SortedQueue((a: number, b: number) => b - a);
    q.push(-1);
    q.push(1);
    q.push(0);
    ta.assertEquals(q.pop()?.value, 1);
    ta.assertEquals(q.pop()?.value, 0);
    ta.assertEquals(q.pop()?.value, -1);
  });

  await ctx.step("#push(value)", async (ctx) => {
    await ctx.step(
      "should return an item with property 'value' set to the given value",
      () => {
        const q = new SortedQueue();
        const i = q.push(1);
        ta.assertEquals(i.value, 1);
      },
    );

    await ctx.step("should return a SortedQueueItem instance", () => {
      const q = new SortedQueue();
      const i = q.push(1);
      ta.assert(i instanceof SortedQueueItem);
    });
  });

  await ctx.step("#pop()", async (ctx) => {
    await ctx.step(
      "should return and remove the smallest queue item",
      () => {
        const q = new SortedQueue();
        q.push(1);
        q.push(0);
        q.push(2);
        ta.assertEquals(q.pop()?.value, 0);
        ta.assertEquals(q.pop()?.value, 1);
        ta.assertEquals(q.pop()?.value, 2);
      },
    );

    await ctx.step("should return undefined when the queue is empty", () => {
      const q = new SortedQueue();
      ta.assert(q.pop() === undefined);
    });
  });

  await ctx.step("#peek()", async (ctx) => {
    await ctx.step(
      "should return but not remove the smallest queue item",
      () => {
        const q = new SortedQueue();
        q.push(1);
        q.push(0);
        ta.assertEquals(q.peek()?.value, 0);
        ta.assertEquals(q.peek()?.value, 0);
        q.push(-1);
        ta.assertEquals(q.peek()?.value, -1);
      },
    );

    await ctx.step("should return undefined when the queue is empty", () => {
      const q = new SortedQueue();
      ta.assert(q.peek() === undefined);
    });
  });

  await ctx.step("should preserve order", () => {
    const original = [];
    for (let i = 0; i < 1024; i++) {
      original.push(i);
    }

    const copy = original.slice();
    const queue = new SortedQueue();
    while (copy.length > 0) {
      const index = (Math.random() * copy.length) | 0;
      queue.push(copy[index]);
      copy.splice(index, 1);
    }

    ta.assertEquals(collect(queue), original);
  });
});

Deno.test("SortedQueueItem", async (ctx) => {
  await ctx.step("#pop()", async (ctx) => {
    await ctx.step(
      "should return true when the item existed in the queue",
      () => {
        const q = new SortedQueue();
        const i = q.push(1);
        ta.assert(i.pop());
      },
    );

    await ctx.step(
      "should return false when the item did not exist in the queue",
      () => {
        const q = new SortedQueue();
        const i = q.push(1);
        i.pop();
        ta.assert(i.pop() === false);
      },
    );

    await ctx.step(
      "should remove items from the front of the queue and still keep the queue ordered",
      () => {
        const q = new SortedQueue();
        q.push(1);
        const i = q.push(0);
        q.push(2);
        i.pop();
        ta.assertEquals(q.pop()?.value, 1);
        ta.assertEquals(q.pop()?.value, 2);
      },
    );

    await ctx.step(
      "should remove items from the end of the queue and still keep the queue ordered",
      () => {
        const q = new SortedQueue();
        q.push(1);
        q.push(0);
        const i = q.push(2);
        i.pop();
        ta.assertEquals(q.pop()?.value, 0);
        ta.assertEquals(q.pop()?.value, 1);
      },
    );

    await ctx.step(
      "should keep ordering when the replacement item needs to be sifted up",
      () => {
        // Manufacture a situation where the replacement item popped
        // from the end of the backing array needs to be sifted up.
        const queue = new SortedQueue();
        const values = [
          0,
          1000,
          1,
          1001,
          1002,
          2,
          3,
          1003,
          1004,
          1005,
          1006,
          4,
        ];
        const items = values.map((v) => queue.push(v));
        items[3].pop();
        values.splice(3, 1);
        ta.assertEquals(collect(queue), values.sort((a, b) => a - b));
      },
    );

    await ctx.step(
      "should keep ordering when the replacement needs to be sifted down",
      () => {
        const queue = new SortedQueue();
        const values = [0, 1000, 1, 1001, 1002, 2, 3, 1003, 1004, 1005, 1006];
        const items = values.map((v) => queue.push(v));
        items[2].pop();
        values.splice(2, 1);
        ta.assertEquals(collect(queue), values.sort((a, b) => a - b));
      },
    );
  });
});
