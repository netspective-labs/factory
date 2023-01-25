import * as colors from "https://deno.land/std@0.147.0/fmt/colors.ts";
import * as iosc from "https://deno.land/std@0.147.0/streams/conversion.ts";
import * as human from "../text/human.ts";

export function singleHtmlFileDownloadTask(): () => Promise<void> {
  // deno-lint-ignore require-await
  return async () => {
    // https://github.com/gildas-lormeau/SingleFile/blob/master/cli/README.MD
    console.log(
      colors.red(
        "TODO: need to implement https://github.com/gildas-lormeau/SingleFile",
      ),
    );
  };
}

export function graphQlTask(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>,
  onData?: (data: unknown) => void,
  onError?: (error: Error) => void,
): () => Promise<void> {
  if (!onData) {
    onData = (data) => {
      console.dir(data, { showHidden: true, depth: undefined, colors: true });
    };
  }
  if (!onError) {
    onError = (error) => {
      console.dir(error, { colors: true });
    };
  }
  return async () => {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(
        variables
          ? {
            query,
            variables,
          }
          : { query },
      ),
    }).then((r) => r.json()).then(onData)
      .catch(onError);
  };
}

// deno-lint-ignore require-await
export const reportDownloadConsole = async (
  destFile: string,
  srcEndpoint: string,
  response: Response,
  mark: PerformanceMark,
) => {
  const measure = performance.measure(mark.name, {
    start: mark.startTime,
  });
  const info = Deno.statSync(destFile);
  console.log(
    `Downloaded ${colors.yellow(destFile)} (${
      human.humanFriendlyBytes(info.size)
    }) from ${
      colors.brightCyan(srcEndpoint)
    } (in ${measure.duration.toFixed()} ms, ETag: ${
      response.headers.get("ETag")
    })`,
  );
};

export async function downloadAsset(
  srcEndpoint: string,
  destFile: string,
  onData?: (
    destFile: string,
    srcEndpoint: string,
    response: Response,
    mark: PerformanceMark,
  ) => Promise<void>,
  onError?: (
    error: Error,
    destFile: string,
    srcEndpoint: string,
    response: Response | undefined,
    mark: PerformanceMark,
  ) => Promise<void>,
): Promise<void> {
  const markName = `${srcEndpoint}::${destFile}`;
  const mark = performance.mark(markName);
  await fetch(srcEndpoint).then(async (rsp) => {
    try {
      const rdr = rsp.body?.getReader();
      if (rdr) {
        const r = iosc.readerFromStreamReader(rdr);
        const f = await Deno.open(destFile, {
          create: true,
          write: true,
        });
        await iosc.copy(r, f);
        f.close();
        if (onData) await onData(srcEndpoint, destFile, rsp, mark);
      }
    } catch (err) {
      if (onError) await onError(err, srcEndpoint, destFile, rsp, mark);
    }
  }).catch(async (err) => {
    if (onError) await onError(err, srcEndpoint, destFile, undefined, mark);
  });
}

export function downloadTask(
  srcEndpoint: string,
  destFile: string,
  onData?: (
    destFile: string,
    srcEndpoint: string,
    response: Response,
    mark: PerformanceMark,
  ) => Promise<void>,
  onError?: (
    error: Error,
    destFile: string,
    srcEndpoint: string,
    response: Response | undefined,
    mark: PerformanceMark,
  ) => Promise<void>,
): () => Promise<void> {
  return async () => {
    if (!onError) {
      // deno-lint-ignore require-await
      onError = async (error) => {
        console.dir(error, { colors: true });
      };
    }

    await downloadAsset(
      srcEndpoint,
      destFile,
      onData || reportDownloadConsole,
      onError,
    );
  };
}
