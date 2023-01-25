export type MetricNature = "info" | "gauge";
export type MetricName = string;
export type MetricDescription = string;
export type MetricNamePrefix = MetricName;
export type MetricLabelName = string;

export interface Metric {
  readonly nature: MetricNature;
  readonly name: MetricName;
  readonly help: MetricDescription;
  readonly declare: (dest: string[], dialect: MetricsDialect) => void;
}

export interface MetricInstance<M extends Metric> {
  readonly metric: M;
  readonly stringify: (options: MetricsDialect) => string;
  readonly tablify: () => { metricValue?: number };
}

export interface MetricsDialect {
  export(instances: Iterable<MetricInstance<Metric>>): string[];
}

// deno-lint-ignore ban-types
export type TypedObject = object;

export interface MetricLabels<T extends TypedObject> {
  readonly object: T;
  readonly stringify: (options: MetricsDialect) => string;
}

export interface LabeledMetricInstance<
  M extends Metric,
  T extends TypedObject,
> extends MetricInstance<M> {
  readonly labels: MetricLabels<T>;
}

export interface InfoMetric<T extends TypedObject> extends Metric {
  readonly instance: (
    labelValues: T | MetricLabels<T>,
  ) => LabeledMetricInstance<InfoMetric<T>, T>;
}

export interface GaugeMetricInstance<T extends TypedObject>
  extends LabeledMetricInstance<GaugeMetric<T>, T> {
  readonly value: (set?: number) => number;
}

export interface GaugeMetric<T extends TypedObject> extends Metric {
  readonly instance: (
    metricValue: number,
    labelValues: T | MetricLabels<T>,
  ) => GaugeMetricInstance<T>;
}

export interface Metrics {
  readonly instances: Iterable<MetricInstance<Metric>>;
  readonly infoMetric: <T extends TypedObject>(
    name: MetricName,
    help: string,
  ) => InfoMetric<T>;
  readonly gaugeMetric: <T extends TypedObject>(
    name: MetricName,
    help: string,
  ) => GaugeMetric<T>;
  readonly record: (
    instance: MetricInstance<Metric>,
  ) => MetricInstance<Metric>;
}
