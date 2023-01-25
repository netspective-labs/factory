import { events } from "../deps.ts";
import * as dzx from "https://deno.land/x/dzx@0.3.1/mod.ts";
import * as gh from "../../task/github.ts";

// deno-lint-ignore no-explicit-any
export function ensureSupportBinsTask<EE extends events.EventEmitter<any>>() {
  return async () => {
    const destPath = "lib/sql/shell/bin";
    const options = { verbose: true };
    await gh.ensureGitHubBinary({
      // https://github.com/mergestat/mergestat
      // https://docs.mergestat.com/examples/basic-git
      repo: "mergestat/mergestat",
      destPath,
      release: {
        baseName: () => "mergestat-linux-amd64.tar.gz",
        unarchive: gh.extractSingleFileFromTarGZ(
          "./mergestat",
          "mergestat",
          {
            stripComponents: 1,
          },
        ),
      },
    }, options)();
    await gh.ensureGitHubBinary({
      // https://github.com/kashav/fsql
      repo: "kashav/fsql",
      destPath,
      release: {
        baseName: (latest) =>
          `fsql-${latest.tag_name.substring(1)}-linux-amd64.tar.gz`,
        unarchive: gh.extractSingleFileFromTarGZ(
          "linux-amd64/fsql",
          "fsql",
          {
            stripComponents: 1,
          },
        ),
      },
    }, options)();
    await gh.ensureGitHubBinary({
      // https://github.com/jhspetersson/fselect
      repo: "jhspetersson/fselect",
      destPath,
      release: {
        baseName: () => `fselect-x86_64-linux-musl.gz`,
        unarchive: async (archiveFsPath, finalize, ghbs, options) => {
          const destFsPath = path.join(ghbs.destPath, "fselect");
          dzx.$.verbose = options?.verbose ?? false;
          await dzx.$`gunzip -c ${archiveFsPath} > ${destFsPath}`;
          await finalize(destFsPath, ghbs);
          return destFsPath;
        },
      },
    }, options)();
  };
}
