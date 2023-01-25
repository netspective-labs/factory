import * as dt from "./doctor.ts";
import * as ws from "../text/whitespace.ts";

export function shellTasks(options: {
  integrationMarkerEV: string;
}) {
  const { integrationMarkerEV } = options;
  const result = {
    doctor: async (report: dt.DoctorReporter) => {
      if (await $o`echo $${integrationMarkerEV}`) {
        report({ ok: "repo-task alias available" });
      } else {
        report({
          suggest: `run \`${
            $.blue(
              `eval "$(deno run -A --unstable Taskfile.ts shell-contribs)"`,
            )
          }\``,
        });
      }
    },
    /**
     * Generate ("contribute") aliases, env vars, CLI completions, etc. useful for
     * shells. Using shell-contribs should eliminate need for custom shells, etc.
     * like github.com/netspective-studios/home-creators and allow generic shells to
     * be used.
     * -[ ] TODO: git semver in support/bin
     *
     * usage in zshrc, bashrc or CLI:
     * $ eval "$(deno run -A --unstable Taskfile.ts shell-contribs)"
     */
    // deno-lint-ignore require-await
    shellContribs: async () => {
      console.log(ws.unindentWhitespace(`
        # run Taskfile.ts in the current path or, if not founce, search parents/ancestors for first available Taskfile.ts
        alias path-task='${integrationMarkerEV}_PATHTASK=yes deno run --unstable -A $(/bin/bash -c '\\''file=Taskfile.ts; path=$(pwd); while [[ "$path" != "" && ! -e "$path/$file" ]]; do path=\${path%/*}; done; echo "$path/$file"'\\'')'

        # run Taskfile.ts in the root of the Git repository
        alias repo-task='${integrationMarkerEV}_REPOTASK=yes deno run --unstable -A $(git rev-parse --show-toplevel)/Taskfile.ts'

        # this env var acts as "marker" to indicate whether integration was successful
        export ${integrationMarkerEV}=$SHELL
      `));
    },
  };
  return result;
}
