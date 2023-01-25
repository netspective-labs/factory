import * as govn from "./governance.ts";
import * as core from "./core.ts";
import * as tab from "../tabular/mod.ts";

export async function* tabularMetrics(
  instances: Iterable<govn.MetricInstance<govn.Metric>>,
  viewNamesStrategy = (
    name:
      | "metric"
      | "metric_instance"
      | "metric_label"
      | "metric_instance_label",
  ) => name,
  namespace = "observability",
) {
  // Identity generic is set to string because we're controlling the names
  // using viewNamesStrategy instead of TabularRecordDefn.identity
  const builders = tab.definedTabularRecordsBuilders<string>();

  const metricRB = builders.autoRowIdProxyBuilder<{
    readonly name: govn.MetricName;
    readonly nature: govn.MetricNature;
    readonly description: string;
  }, "name">({ identity: viewNamesStrategy("metric"), namespace }, {
    upsertStrategy: {
      exists: (metric, _rowID, index) => index("name")?.get(metric.name),
      index: (metric, index) => index("name").set(metric.name, metric),
    },
  });
  const metricLabelRB = builders.autoRowIdProxyBuilder<{
    readonly label: govn.MetricLabelName;
  }, "metricIdLabel">({
    identity: viewNamesStrategy("metric_label"),
    namespace,
  }, {
    upsertStrategy: {
      exists: (ml, _rowID, index) => index("metricIdLabel")?.get(ml.label),
      index: (ml, index) => index("metricIdLabel").set(ml.label, ml),
    },
  });
  const metricInstanceRB = builders.autoRowIdProxyBuilder<{
    readonly metricId: tab.TabularRecordIdRef;
    readonly metricName: govn.MetricName;
    readonly metricValue?: number;
  }>({ identity: viewNamesStrategy("metric_instance"), namespace });
  const metricInstanceLabelRB = builders.autoRowIdProxyBuilder<{
    readonly metricId: tab.TabularRecordIdRef;
    readonly metricName: govn.MetricName;
    readonly metricInstanceId: tab.TabularRecordIdRef;
    readonly metricLabelId: tab.TabularRecordIdRef;
    readonly label: string;
    readonly labelValue?: number | string;
  }>({ identity: viewNamesStrategy("metric_instance_label"), namespace });

  for (const instance of instances) {
    const metric = metricRB.upsert({
      name: instance.metric.name,
      nature: instance.metric.nature,
      description: instance.metric.help,
    });
    const { id: metricId, name: metricName } = metric;
    const metricInstance = metricInstanceRB.upsert({
      metricId,
      metricName,
      ...instance.tablify(),
    });
    if (core.isLabeledMetricInstance(instance)) {
      for (const entry of Object.entries(instance.labels.object)) {
        const [label, labelValue] = entry;
        const metricLabel = metricLabelRB.upsert({ label });
        metricInstanceLabelRB.upsert({
          metricId,
          metricName,
          metricInstanceId: metricInstance.id,
          metricLabelId: metricLabel.id,
          label: metricLabel.label,
          labelValue,
        });
      }
    }
  }

  yield* builders.definedTabularRecords();
}
