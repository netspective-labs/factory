export interface ScalarStatisticsEncounterOptions {
  readonly onNewMinValue?: (
    prevMinValue: number,
    changeCount: number,
    valueCount: number,
  ) => void;
  readonly onNewMaxValue?: (
    prevMaxValue: number,
    changeCount: number,
    valueCount: number,
  ) => void;
}

/**
 * ScalarStatistics allows a stream of values to be "encountered" and will
 * compute common statistics on the stream of scalar values.
 */
export class StreamStatistics {
  protected newMean = 0;
  protected newVariance = 0;
  protected oldMean = 0;
  protected oldVariance = 0;
  protected currentMin = 0;
  protected currentMax = 0;
  protected currentSum = 0;
  protected valueCount = 0;

  encounter(value: number) {
    this.valueCount++;
    if (this.valueCount == 1) {
      this.oldMean =
        this.newMean =
        this.currentMin =
        this.currentMax =
          value;
      this.oldVariance = 0;
    } else {
      this.newMean = this.oldMean +
        (value - this.oldMean) / this.valueCount;
      this.newVariance = this.oldVariance +
        (value - this.oldMean) * (value - this.newMean);
      this.oldMean = this.newMean;
      this.oldVariance = this.newVariance;
      this.currentMin = Math.min(this.currentMin, value);
      this.currentMax = Math.max(this.currentMax, value);
      this.currentSum += value;
    }
  }

  clear() {
    this.valueCount = 0;
    this.newMean = 0;
    this.oldMean = 0;
    this.newVariance = 0;
    this.oldVariance = 0;
    this.currentMin = 0;
    this.currentMax = 0;
  }

  count() {
    return this.valueCount;
  }

  sum() {
    return this.currentSum;
  }

  mean() {
    return (this.valueCount > 0) ? this.newMean : 0;
  }

  variance() {
    return ((this.valueCount > 1)
      ? this.newVariance / (this.valueCount - 1)
      : 0.0);
  }

  //What is the standard deviation of the items?s
  standardDeviation() {
    return Math.sqrt(this.variance());
  }

  min() {
    return this.currentMin;
  }

  max() {
    return this.currentMax;
  }
}

export class RankedStatistics<T extends { statistic: number }>
  extends StreamStatistics {
  readonly maxRanks: number;
  readonly compareFn: (a: T, b: T) => number;
  #ranked: T[] = [];

  constructor(
    options?: {
      readonly maxRanks: number;
      readonly compareFn?: (a: T, b: T) => number;
    },
  ) {
    super();
    this.maxRanks = options?.maxRanks || 10;
    this.compareFn = options?.compareFn ||
      ((a, b) => b.statistic - a.statistic);
  }

  get ranked() {
    return this.#ranked;
  }

  rank(value: T): void {
    // compute continuous statistics
    this.encounter(value.statistic);

    // maintain "top X" of value.rank
    this.#ranked.push(value);
    this.#ranked = this.ranked.sort(this.compareFn);
    if (this.ranked.length > this.maxRanks) {
      this.ranked.length = this.maxRanks;
    }
  }
}
