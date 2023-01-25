import * as govn from "./governance.ts";
import * as s from "../statistics/stream.ts";

export function populateStreamMetrics(
  stats: s.StreamStatistics,
  metrics: govn.Metrics,
  // deno-lint-ignore no-explicit-any
  baggage: any,
  subjectKey: string,
  subjectHuman: string,
  units: string,
) {
  metrics.record(
    metrics.gaugeMetric(
      `${subjectKey}_count_${units}`,
      `Count of ${subjectHuman} in ${units}`,
    ).instance(stats.count(), baggage),
  );
  metrics.record(
    metrics.gaugeMetric(
      `${subjectKey}_sum_${units}`,
      `Sum of ${subjectHuman} in ${units}`,
    ).instance(stats.sum(), baggage),
  );
  metrics.record(
    metrics.gaugeMetric(
      `${subjectKey}_mean_${units}`,
      `Average (mean) of ${subjectHuman} in ${units}`,
    ).instance(stats.mean(), baggage),
  );
  const min = stats.min();
  const max = stats.max();
  if (min !== undefined) {
    metrics.record(
      metrics.gaugeMetric(
        `${subjectKey}_min_${units}`,
        `Minimum of ${subjectHuman} in ${units}`,
      ).instance(min, baggage),
    );
  }
  if (max !== undefined) {
    metrics.record(
      metrics.gaugeMetric(
        `${subjectKey}_max_${units}`,
        `Maximum of ${subjectHuman} in ${units}`,
      ).instance(max, baggage),
    );
  }
  metrics.record(
    metrics.gaugeMetric(
      `${subjectKey}_stddev_${units}`,
      `Standard deviation from mean of ${subjectHuman} in ${units}`,
    ).instance(stats.standardDeviation(), baggage),
  );
}

export function populateRankMetrics<T extends { statistic: number }>(
  rs: s.RankedStatistics<T>,
  metrics: govn.Metrics,
  // deno-lint-ignore no-explicit-any
  baggage: any,
  subjectKey: string,
  subjectHuman: string,
  units: string,
  // deno-lint-ignore no-explicit-any
  rankBaggage: (item: T, index: number) => any,
) {
  rs.ranked.forEach((item, index) => {
    metrics.record(
      metrics.gaugeMetric(
        `${subjectKey}_ranked_${units}`,
        `Rank of ${subjectHuman} in ${units}`,
      ).instance(item.statistic, {
        ...baggage,
        ...rankBaggage(item, index),
      }),
    );
  });
}
