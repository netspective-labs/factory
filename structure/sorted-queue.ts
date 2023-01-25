// Code ported from https://github.com/jviide/sorted-queue
export type SortedQueueComparator<T> = (a: T, b: T) => number;

export class SortedQueue<T> {
  readonly comparator: SortedQueueComparator<T>;
  readonly items: Item<T>[];

  constructor(cmp: SortedQueueComparator<T> = defaultComparator) {
    this.comparator = cmp;
    this.items = [];
  }

  push(value: T): SortedQueueItem<T> {
    const item = new Item(
      value,
      this.items,
      this.items.length,
      this.comparator,
    );
    this.items.push(item);
    siftUp(this.items, item, this.comparator);
    return item;
  }

  peek(): SortedQueueItem<T> | undefined {
    return this.items.length > 0 ? this.items[0] : undefined;
  }

  pop(): SortedQueueItem<T> | undefined {
    const item = this.peek();
    if (!item) {
      return item;
    }
    item.pop();
    return item;
  }
}

class Item<T> {
  readonly value: T;
  items: Item<T>[] | null;
  index: number;
  comparator: SortedQueueComparator<T>;

  constructor(
    value: T,
    array: Item<T>[],
    index: number,
    cmp: SortedQueueComparator<T>,
  ) {
    this.value = value;
    this.items = array;
    this.index = index;
    this.comparator = cmp;
  }

  pop(): boolean {
    const array = this.items;
    if (!array) {
      return false;
    }
    const last = array.pop();
    if (last && last !== this) {
      last.index = this.index;
      array[this.index] = last;
      siftUp(array, last, this.comparator);
      siftDown(array, last, this.comparator);
    }
    this.items = null;
    return true;
  }
}

declare class _SortedQueueItem<T> {
  private constructor();
  readonly value: T;
  pop(): boolean;
}
export const SortedQueueItem = (Item as unknown) as typeof _SortedQueueItem;
export type SortedQueueItem<T> = _SortedQueueItem<T>;

function defaultComparator(a: unknown, b: unknown): number {
  if (a === b) {
    return 0;
  }
  if (a !== a) {
    return b !== b ? 0 : -1;
  }
  // deno-lint-ignore no-explicit-any
  return (b as any) < (a as any) || b !== b ? 1 : -1;
}

function swap<T>(array: Item<T>[], left: Item<T>, right: Item<T>): void {
  const li = left.index;
  const ri = right.index;
  array[li] = right;
  array[ri] = left;
  left.index = ri;
  right.index = li;
}

function siftUp<T>(
  array: Item<T>[],
  item: Item<T>,
  cmp: SortedQueueComparator<T>,
): void {
  while (item.index > 0) {
    // `item._index - 1` is cast to uint32 in by the `>>> 1`, which could make
    // the value wrap around if `item._index` were larger than `2**32`.
    // But `item._index` is initialized from `Array#length` and according to
    // ECMA-262, 7ᵗʰ Edition / June 2016:
    //   "Every Array object has a length property whose value is always a
    //    nonnegative integer less than 2**32."
    const parent = array[(item.index - 1) >>> 1];
    if (cmp(parent.value, item.value) <= 0) {
      return;
    }
    swap(array, parent, item);
  }
}

function siftDown<T>(
  array: Item<T>[],
  item: Item<T>,
  cmp: SortedQueueComparator<T>,
): void {
  for (;;) {
    const left = item.index * 2 + 1;
    if (left >= array.length) {
      return;
    }
    const right = left + 1;
    const child =
      right < array.length && cmp(array[right].value, array[left].value) < 0
        ? array[right]
        : array[left];
    if (cmp(child.value, item.value) > 0) {
      return;
    }
    swap(array, child, item);
  }
}
