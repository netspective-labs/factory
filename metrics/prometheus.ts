import * as govn from "./governance.ts";

export function prometheusDialect(): govn.MetricsDialect {
  const dialect: govn.MetricsDialect = {
    export: (instances: Iterable<govn.MetricInstance<govn.Metric>>) => {
      const encounteredMetrics = new Map<govn.MetricLabelName, boolean>();
      const result: string[] = [];
      for (const instance of instances) {
        const encountered = encounteredMetrics.get(instance.metric.name);
        if (!encountered) {
          instance.metric.declare(result, dialect);
          encounteredMetrics.set(instance.metric.name, true);
        }
        result.push(instance.stringify(dialect));
      }
      return result;
    },
  };
  return dialect;
}
