import * as safety from "../safety/mod.ts";
import * as govn from "./governance.ts";

export function isMetricLabels<T extends govn.TypedObject>(
  o: unknown,
): o is govn.MetricLabels<T> {
  const isType = safety.typeGuard<govn.MetricLabels<T>>("object", "stringify");
  return isType(o);
}

export function openMetricsLabels<T extends govn.TypedObject>(
  values: T,
  options: {
    readonly skipUndefinedLabels: boolean;
  } = { skipUndefinedLabels: true },
): govn.MetricLabels<T> {
  return {
    object: values,
    stringify: () => {
      const kvPairs: string[] = [];
      for (const entry of Object.entries(values)) {
        const [name, value] = entry;
        switch (typeof value) {
          case "number":
            kvPairs.push(`${name}="${value}"`);
            break;

          case "function":
            // utility functions should be skipped
            continue;

          case "undefined":
            if (!options.skipUndefinedLabels) {
              kvPairs.push(`${name}=""`);
            }
            break;

          default:
            // strings, dates, etc.
            kvPairs.push(`${name}=${JSON.stringify(value)}`);
        }
      }
      return kvPairs.join(", ");
    },
  };
}

export function isLabeledMetricInstance<
  M extends govn.Metric,
  T extends govn.TypedObject,
>(o: unknown): o is govn.LabeledMetricInstance<M, T> {
  const isLabeled = safety.typeGuard<govn.LabeledMetricInstance<M, T>>(
    "labels",
  );
  if (isLabeled(o)) {
    if (isMetricLabels(o.labels)) return true;
  }
  return false;
}

export function infoMetric<T extends govn.TypedObject>(
  name: govn.MetricName,
  help: string,
): govn.InfoMetric<T> {
  const nature = "info";
  const metric: govn.InfoMetric<T> = {
    nature,
    name: `${name}_info`,
    help,
    instance: (labelValues) => {
      const instanceLabels = isMetricLabels<T>(labelValues)
        ? labelValues
        : openMetricsLabels(labelValues);
      const instance: govn.LabeledMetricInstance<govn.InfoMetric<T>, T> = {
        metric,
        labels: instanceLabels,
        stringify: (options: govn.MetricsDialect): string => {
          return `${instance.metric.name}{${
            instanceLabels.stringify(options)
          }} 1`;
        },
        tablify: () => ({ metricValue: undefined }), // info nature has no value
      };
      return instance;
    },
    declare: (dest): void => {
      dest.push(`# HELP ${metric.name} ${metric.help}`);
      dest.push(`# TYPE ${metric.name} ${nature}`);
    },
  };
  return metric;
}

export function gaugeMetric<T extends govn.TypedObject>(
  name: govn.MetricName,
  help: string,
): govn.GaugeMetric<T> {
  const nature = "gauge";
  const metric: govn.GaugeMetric<T> = {
    nature,
    name,
    help,
    instance: (metricValue, labelValues) => {
      let value = metricValue;
      const instanceLabels = isMetricLabels<T>(labelValues)
        ? labelValues
        : openMetricsLabels(labelValues);
      const instance: govn.GaugeMetricInstance<T> = {
        metric,
        labels: instanceLabels,
        value: (set?: number): number => {
          if (set) value = set;
          return value;
        },
        stringify: (options: govn.MetricsDialect): string => {
          return `${instance.metric.name}{${
            instanceLabels.stringify(options)
          }} ${value}`;
        },
        tablify: () => ({ metricValue: value }),
      };
      return instance;
    },
    declare: (dest): void => {
      dest.push(`# HELP ${metric.name} ${metric.help}`);
      dest.push(`# TYPE ${metric.name} ${nature}`);
    },
  };
  return metric;
}

export class TypicalMetrics implements govn.Metrics {
  readonly instances: govn.MetricInstance<govn.Metric>[] = [];

  constructor(readonly namePrefix?: string) {
  }

  infoMetric<T extends govn.TypedObject>(
    name: govn.MetricName,
    help: string,
  ): govn.InfoMetric<T> {
    return infoMetric(
      this.namePrefix ? `${this.namePrefix}${name}` : name,
      help,
    );
  }

  gaugeMetric<T extends govn.TypedObject>(
    name: govn.MetricName,
    help: string,
  ): govn.GaugeMetric<T> {
    return gaugeMetric(
      this.namePrefix ? `${this.namePrefix}${name}` : name,
      help,
    );
  }

  record(
    instance: govn.MetricInstance<govn.Metric>,
  ): govn.MetricInstance<govn.Metric> {
    this.instances.push(instance);
    return instance;
  }

  merge(metrics: govn.Metrics): govn.Metrics {
    this.instances.push(...metrics.instances);
    return this;
  }
}

/**
 * jsonMetricsReplacer is used for text transformation using something like:
 *
 *     JSON.stringify(metrics, jsonMetricsReplacer, "  ")
 *
 * Without jsonMetricsReplacer each metric looks like this:
 * {
 *    "metric": {
 *      "name": "asset_name_extension",
 *      "help": "Count of asset name extension encountered"
 *    },
 *    "labels": {
 *      "object": { // we do not want "object", just the labels
 *        "assetExtn": ".txt"
 *      }
 *    },
 *    // value will be missing because it's a function and JSON won't emit
 * }
 *
 * With jsonMetricsReplacer it will look much nicer, like this:
 * {
 *    "metric": "asset_name_extension",
 *    "labels": {
 *      "assetExtn": ".txt"
 *    },
 *    "value": 6
 * }
 */
export const jsonMetricsReplacer = (key: string, value: unknown) => {
  if (key == "value" && typeof value === "function") return value();
  if (key == "metric") {
    return (value as govn.Metric).name;
  }
  if (value && typeof value === "object") {
    if ("object" in value) {
      // deno-lint-ignore no-explicit-any
      return (value as any).object;
    }
    if ("instances" in value) {
      const metricsDefnMap = new Map<string, govn.Metric>();
      // deno-lint-ignore no-explicit-any
      const instances = ((value as any).instances) as govn.MetricInstance<
        govn.Metric
      >[];
      for (const instance of instances) {
        const found = metricsDefnMap.get(instance.metric.name);
        if (!found) {
          metricsDefnMap.set(instance.metric.name, instance.metric);
        }
      }
      return {
        instances,
        metrics: Array.from(metricsDefnMap.values()),
      };
    }
  }
  return value;
};
