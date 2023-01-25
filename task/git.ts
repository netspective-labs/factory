import * as path from "https://deno.land/std@0.147.0/path/mod.ts";
import * as colors from "https://deno.land/std@0.147.0/fmt/colors.ts";
import "https://deno.land/x/dzx@0.3.1/mod.ts";
import * as core from "./core.ts";
import * as dt from "./doctor.ts";
import * as ws from "../text/whitespace.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export type GitHookNameCamelToKebabCase<S extends string> = S extends
  `${infer T}${infer U}` ? `${T extends Capitalize<T> ? "-" : ""}${Lowercase<
    T
  >}${GitHookNameCamelToKebabCase<U>}`
  : S;

export const camelCaseToKebabHookName = (text: string) =>
  // find one or more uppercase characters and separate with -
  text.replace(/[A-Z]+/g, (match: string) => `-${match}`)
    .toLocaleLowerCase();

export type GitHookName = "preCommit" | "prePush" | "prepareCommitMsg";

export interface GitHookDefn<
  HookNameCamelCase extends GitHookName,
  HookNameKebabCase extends GitHookNameCamelToKebabCase<HookNameCamelCase> =
    GitHookNameCamelToKebabCase<HookNameCamelCase>,
  HookTaskNameCamelCase extends string = `gitHook${Capitalize<
    HookNameCamelCase
  >}`,
> {
  readonly hookName: HookNameCamelCase;
  readonly hookNameKC: HookNameKebabCase;
  readonly hookTaskName: HookTaskNameCamelCase;
  readonly bashScriptEnvVarsPrefix: string;
  readonly bashScriptContent: (purpose: "on-fail") => string;
  readonly bashScriptDestPath: (destRoot: () => string) => string;
  readonly bashScriptSrc: () => string;
  readonly persistBashScriptSrc: (
    hooksHome: () => string,
    options?: {
      ensureHome?: (hooksHome: string) => Promise<void>;
      chmod?: (destPath: string) => Promise<void>;
    },
  ) => Promise<void>;
  readonly hookLogic: () => Promise<number>;
  readonly hookTask: (
    onInvalidMsg?: (exitCode: number) => string,
  ) => () => Promise<void>;
  readonly exists: (hooksHome: () => string) => Promise<Deno.FileInfo | false>;
}

export function gitHookIntegration<HookName extends GitHookName>(
  hookName: HookName,
  hookLogic: () => Promise<number>,
  options?: Partial<GitHookDefn<HookName>>,
): GitHookDefn<HookName> {
  const {
    bashScriptEnvVarsPrefix = "GITHOOK",
    bashScriptContent = () => "cancel",
  } = options ?? {};
  const ghEVP = bashScriptEnvVarsPrefix;
  const result: GitHookDefn<HookName> = {
    hookName,
    hookNameKC: camelCaseToKebabHookName(
      hookName,
    ) as GitHookNameCamelToKebabCase<HookName>,
    hookTaskName: `gitHook${
      hookName.replace(/^[a-z]/, hookName.toUpperCase()[0])
    }` as Any,
    bashScriptEnvVarsPrefix,
    bashScriptContent,
    bashScriptDestPath: (destRoot: () => string) =>
      path.join(destRoot(), result.hookNameKC),
    //deno-fmt-ignore
    bashScriptSrc: () => ws.unindentWhitespace(`
      #!/bin/bash
      set -e    # ${bashScriptContent("on-fail")} if Taskfile.ts git-hook-${result.hookNameKC} returns non-zero
      ${ghEVP}_CWD=\`pwd\` ${ghEVP}_SCRIPT=$0 \\
        deno run -A --unstable Taskfile.ts git-hook-${result.hookNameKC}`),
    persistBashScriptSrc: async (hooksHome, options) => {
      const {
        ensureHome = async (destHome: string) =>
          await Deno.mkdir(destHome, { recursive: true }),
        chmod = async (destPath: string) => await Deno.chmod(destPath, 0o755),
      } = options ?? {};
      const src = result.bashScriptSrc();
      const destPath = result.bashScriptDestPath(hooksHome);
      await ensureHome(path.dirname(destPath));
      await Deno.writeTextFile(destPath, src);
      await chmod(destPath);
    },
    hookLogic,
    hookTask: (onInvalidMsg) => {
      return async () => {
        const exitCode = await hookLogic();
        if (exitCode) {
          console.error(
            onInvalidMsg?.(exitCode) ??
              colors.dim(
                `Git ${result.hookNameKC} hook failed: Deno exit code ${exitCode} (${
                  import.meta.url.slice(
                    import.meta.url.indexOf("netspective-labs/factory"),
                  )
                })`,
              ),
          );
          Deno.exit(exitCode);
        }
      };
    },
    exists: async (hooksHome) => {
      try {
        return await Deno.lstat(result.bashScriptDestPath(hooksHome));
      } catch (_) {
        return false;
      }
    },
    ...options, // if anything is passed in, it will override the above
  };
  return result;
}

export function prepareCommitMsgGitHook() {
  const result: GitHookDefn<"prepareCommitMsg"> = gitHookIntegration(
    "prepareCommitMsg",
    // deno-lint-ignore require-await
    async (): Promise<number> => {
      let gitHookExitCode = 0;
      // From: https://dev.to/craicoverflow/enforcing-conventional-commits-using-git-hooks-1o5p
      // Build the Regular Expression Options.
      const types =
        "build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test";
      const scopeMinLen = 1;
      const scopeMaxLen = 16;
      const scopeRegEx = `[a-z0-9_.-]{${scopeMinLen},${scopeMaxLen}}`;
      const subjectMinLen = 4;
      const subjectMaxLen = 120;
      // start with lowercase or number, then some constrained characters
      const subjectRegEx =
        `[a-z0-9][A-Za-z0-9_. -]{${subjectMinLen},${subjectMaxLen}}`;

      //# Build the Regular Expression String.
      const commitHeadRegEx = new RegExp(
        `^(revert: )?(${types})(\(${scopeRegEx}\))?!?: ${subjectRegEx}[^.]{1,}$`,
      );

      const commitMsgHead = Deno.env.get("GITHOOK_COMMITMSG_HEAD");
      if (commitMsgHead && commitMsgHead.trim().length > 0) {
        //deno-fmt-ignore
        if(!commitHeadRegEx.test(commitMsgHead)) {
          console.info($.red("💡 The commit message was not formatted correctly. Rejecting the commit request."));
          console.info($.dim("    - https://www.conventionalcommits.org/en/v1.0.0/"));
          console.info($.dim("    - https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional\n"));
          console.info($.dim("    Having trouble with the format? Just not sure of how to commit correctly? https://commitlint.io/"));
          console.info($.dim("    Something else happening? Use https://regexr.com/ with the following expression to validate your commit."));
          console.info($.dim(`    - RegEx: /${commitHeadRegEx}/`));
          gitHookExitCode = 101;
        }
      } else {
        //deno-fmt-ignore
        console.info($.red("💡 No commit message supplied. Rejecting the commit request."));
        gitHookExitCode = 102;
      }
      return gitHookExitCode;
    },
    {
      bashScriptContent: () => `cancels commit`,
      bashScriptSrc: () => {
        const ghEVP = result.bashScriptEnvVarsPrefix;
        return ws.unindentWhitespace(`
          #!/bin/bash
          set -e    # cancels commit if Taskfile.ts git-hook-${result.hookNameKC} returns non-zero
          ${ghEVP}_COMMITMSG_HEAD="$(head -1 $1)" ${ghEVP}_CWD=\`pwd\` ${ghEVP}_SCRIPT=$0 \\
            deno run -A --unstable Taskfile.ts git-hook-${result.hookNameKC}`);
      },
    },
  );
  return result;
}

export function preCommitGitHook(args?: {
  readonly sandboxGuard?: {
    readonly isSandboxDeps: () => Promise<false | [number, string]>;
  };
  readonly denoFmt?: boolean;
  readonly denoLint?: boolean;
  readonly denoTest?: boolean;
}) {
  return gitHookIntegration(
    "preCommit",
    async () => {
      const {
        sandboxGuard,
        denoFmt = true,
        denoLint = true,
        denoTest = true,
      } = args ?? {};
      // if you need the files being committed:
      // const commitList = (await $o`git diff --cached --name-only`).split("\n");
      if (sandboxGuard) {
        const isSandboxDeps = await sandboxGuard.isSandboxDeps();
        if (isSandboxDeps) {
          const [exitCode, issue] = isSandboxDeps;
          console.error($.brightRed(issue));
          return exitCode;
        }
      }
      const OK = { status: { code: 0 } };
      let po = denoFmt ? await $`deno fmt` : OK;
      if (po.status.code == 0) po = denoLint ? await $`deno lint` : OK;
      if (po.status.code == 0) {
        po = denoTest ? await $`deno test -A --unstable` : OK;
      }
      return po.status.code;
    },
    { bashScriptContent: () => `cancels commit` },
  );
}

export type GitHookIntegrations = {
  [hn in GitHookName]: GitHookDefn<GitHookName> | undefined;
};

export function typicalGitHooks() {
  const result: GitHookIntegrations = {
    "prepareCommitMsg": prepareCommitMsgGitHook(),
    "preCommit": preCommitGitHook(),
    "prePush": undefined,
  };
  return result;
}

export function gitTasks<GHI extends GitHookIntegrations>(options?: {
  repoRoot?: string;
  hooks?: GHI;
  gitHooksRelPath?: string;
}) {
  const {
    repoRoot = Deno.cwd(),
    gitHooksRelPath = ".githooks",
    hooks = typicalGitHooks(),
  } = options ??
    {};
  const gitHooksAbsPath = path.join(repoRoot, gitHooksRelPath);
  const hookDefns = hooks
    ? (Object.values(hooks) as unknown as GitHookDefn<GitHookName>[]).filter((
      h,
    ) => h ? true : false)
    : [];
  const result = {
    // Idempotently initializes the repo; sets up .githooks/* as the location for
    // this project's Git hooks and, if .envrc doesn't exist, copy it from the
    // example file.
    init: async () => {
      if (hooks) {
        await $`git config core.hooksPath ${gitHooksRelPath}`;
      }
      await $`git config pull.rebase false`;
      for (const hd of hookDefns) {
        hd.persistBashScriptSrc(() => gitHooksAbsPath);
      }
    },
    doctor: async (report: dt.DoctorReporter) => {
      if (hooks) {
        if (hookDefns.length > 0) {
          report({
            ok: `${hookDefns.length} Git hooks ${
              hookDefns.map((h) => h.hookNameKC).join(", ")
            } defined`,
          });
        } else {
          report({ warn: "No Git hooks defined" });
        }
        try {
          await Deno.lstat(gitHooksAbsPath);
          report({
            ok: `${gitHooksRelPath} path exists`,
          });
        } catch (_err) {
          report({
            warn: `${gitHooksRelPath} path does not exist`,
          });
        }
        if (await $o`git config core.hooksPath` == gitHooksRelPath) {
          report({ ok: `${gitHooksRelPath} setup properly in git config` });
        } else {
          report({
            warn: `${gitHooksRelPath} not setup properly in git config`,
          });
        }
        for (const hd of hookDefns) {
          const bsdp = hd.bashScriptDestPath(() => gitHooksRelPath);
          if (await hd.exists(() => gitHooksAbsPath)) {
            report({ ok: `${bsdp} found` });
          } else {
            report({ warn: `${bsdp} not found` });
          }
        }
      } else {
        report({ ok: "no Git hooks defined" });
      }
    },
    hooks,
    registerHooks: <EE extends core.EventEmitter<Any>>(ee: EE) => {
      const { prepareCommitMsg, preCommit, prePush } = hooks;
      if (prepareCommitMsg) {
        ee.on(prepareCommitMsg.hookTaskName, prepareCommitMsg.hookTask());
      }
      if (preCommit) {
        ee.on(preCommit.hookTaskName, preCommit.hookTask());
      }
      if (prePush) {
        ee.on(prePush.hookTaskName, prePush.hookTask());
      }
    },
  };
  return result;
}
