import { path } from "./deps.ts";
import * as m from "../metrics/mod.ts";
import * as fst from "./fs-tree.ts";

export interface TransactionIdSupplier {
  readonly txID: string;
  readonly txHost: string;
}

export interface AssetsObservabilityArguments
  extends Partial<TransactionIdSupplier> {
  readonly assetsTree: fst.FileSysAssetsTree;
  readonly metrics: m.TypicalMetrics;
  readonly metricsNamePrefix?: string;
}

export interface AssetsMetricsResult {
  readonly pathExtnsColumnHeaders: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  readonly pathExtnsColumns: [
    scopeID: string,
    date: string,
    time: string,
    path: string,
    extn: string,
    count: number,
    totalBytes: number,
    txID?: string,
    host?: string,
  ][];
}

export interface AssetExtensionSupplier {
  readonly extension: string;
}

export interface AssetPathSupplier {
  readonly path: string;
}

export interface DateSupplier {
  readonly date: Date;
}

export async function fileSysAnalytics(
  aapo: AssetsObservabilityArguments,
): Promise<AssetsMetricsResult> {
  const metricsNamePrefix = aapo.metricsNamePrefix || "asset_name_extension_";
  const countByPathGauge = aapo.metrics.gaugeMetric<
    & AssetExtensionSupplier
    & AssetPathSupplier
    & Partial<TransactionIdSupplier>
    & DateSupplier
  >(
    `${metricsNamePrefix}in_path`,
    "Count of asset name extensions encountered in path",
  );
  const totalBytesByPathGauge = aapo.metrics.gaugeMetric<
    & AssetExtensionSupplier
    & AssetPathSupplier
    & Partial<TransactionIdSupplier>
    & DateSupplier
  >(
    `${metricsNamePrefix}bytes_in_path`,
    "Total bytes of asset name extensions encountered in path",
  );

  const result: AssetsMetricsResult = {
    pathExtnsColumnHeaders: [
      "Scope",
      "Date",
      "Time",
      "Files Path",
      "File Extension in Path",
      "Count of Files with Extension in Path",
      "Total Bytes in all Files with Extension in Path",
      "Build ID",
      "Host",
    ],
    pathExtnsColumns: [],
  };

  const now = new Date();
  for (const walkerNode of aapo.assetsTree.assets) {
    for (const subdir of walkerNode.subdirectories()) {
      const extnAnalytics = new Map<
        string,
        { extension: string; count: number; totalBytes: number }
      >();

      for (const file of subdir.files()) {
        const extension = path.extname(file.terminal.name);
        let analytics = extnAnalytics.get(extension);
        if (!analytics) {
          analytics = { count: 0, totalBytes: 0, extension };
          extnAnalytics.set(extension, analytics);
        }

        const fileInfo = await file.fileInfo();
        analytics.count++;
        analytics.totalBytes += fileInfo.size;
      }

      for (const analytics of extnAnalytics.values()) {
        const labels = {
          txHost: aapo.txHost,
          txID: aapo.txID,
          date: now,
          extension: analytics.extension,
          path: subdir.qualifiedPath,
        };
        aapo.metrics.record(
          countByPathGauge.instance(analytics.count, labels),
        );
        aapo.metrics.record(
          totalBytesByPathGauge.instance(analytics.totalBytes, labels),
        );
        result.pathExtnsColumns.push([
          walkerNode.walker.identity,
          labels.date.toLocaleDateString("en-US"),
          labels.date.toLocaleTimeString("en-US"),
          labels.path,
          labels.extension,
          analytics.count,
          analytics.totalBytes,
          labels.txID,
          labels.txHost,
        ]);
      }
    }
  }
  return result;
}
