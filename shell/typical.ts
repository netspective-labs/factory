import { path } from "./deps.ts";
import * as safety from "../safety/mod.ts";
import * as ws from "../text/whitespace.ts";
import * as govn from "./governance.ts";

declare global {
  interface Window {
    rawShell: RawShell;
    sh: BinSh;
    bash: Bash;
  }
}

const isDryRunnable = safety.typeGuard<govn.ShellCmdDryRunnable>("isDryRun");

export abstract class AbstractShell implements govn.Shell {
  // split components of the command with double-quotes support
  readonly decoder = new TextDecoder();
  readonly needShellQuoteEscape = /[^A-Za-z0-9_\/:=-]/;
  // split components of the command with double-quotes support
  readonly splitCmdTextUnitsRegExp = /[^\s"]+|"([^"]*)"/gi;

  readonly forceShellQuotesEscaped = (value: string) =>
    `'${value.replace(/'/g, "'\\''")}'`
      .replace(/^(?:'')+/g, "") // deduplicate single-quotes
      .replace(/\\'''/g, "\\'"); // remove non-escaped single-quote if there are enclosed between 2 escaped

  readonly shellQuotesEscaped = (value: string) =>
    this.needShellQuoteEscape.test(value)
      ? this.forceShellQuotesEscaped(value)
      : value;

  readonly shellQuotesEscapedText = (value: string | string[]) => {
    if (typeof value === "string") return this.shellQuotesEscaped(value);
    return value.map((v) => this.shellQuotesEscaped(v)).join(" ");
  };

  readonly cmdTextUnits = (command: string): string[] => {
    const units = [];
    let match: RegExpExecArray | null;
    do {
      //Each call to exec returns the next regex match as an array
      match = this.splitCmdTextUnitsRegExp.exec(command);
      if (match != null) {
        //Index 1 in the array is the captured group if it exists
        //Index 0 is the matched text, which we use if no captured group exists
        units.push(match[1] ? match[1] : match[0]);
      }
    } while (match != null);
    return units;
  };

  constructor(
    readonly defaults?: Omit<
      govn.ShellCmdRunOptionsSupplier<govn.ShellCmdRunOptions>,
      "runOptions"
    >,
  ) {
  }

  async init(): Promise<void> {
  }

  isDryRun(...test: unknown[]): boolean {
    for (const o of test) {
      if (isDryRunnable(o) && o.isDryRun) return true;
    }
    return false;
  }

  abstract cmdTextRunOptions<
    RO extends govn.ShellCmdRunOptions = govn.ShellCmdRunOptions,
  >(cmd: string): RO;

  smartQuotesCmdRunOptions<
    RO extends govn.ShellCmdRunOptions = govn.ShellCmdRunOptions,
  >(...args: string[]): RO {
    return this.cmdTextRunOptions(this.shellQuotesEscapedText(args));
  }

  finalizeRunOptions<
    RO extends govn.ShellCmdRunOptions = govn.ShellCmdRunOptions,
  >(ro: RO): RO {
    return {
      ...ro,
      stdout: "piped",
      stderr: "piped",
    };
  }

  async execute<RO extends govn.ShellCmdRunOptions = govn.ShellCmdRunOptions>(
    ros: govn.ShellCmdRunOptionsSupplier<RO>,
    isValid?: (ser: govn.ShellExecuteResult<RO>) => boolean,
  ): Promise<govn.ShellExecuteResult<RO> | undefined> {
    const runOptions = this.finalizeRunOptions(ros.runOptions());
    const isDryRun = this.isDryRun(runOptions, ros);
    const defaults = this.defaults;
    const reportRun = ros.reportRun || defaults?.reportRun;
    if (reportRun) {
      reportRun(runOptions, isDryRun);
    }

    if (isDryRun) return undefined;

    let cmd: Deno.Process<RO & govn.ShellCmdDryRunnable> | undefined;
    try {
      cmd = Deno.run(runOptions);

      // see https://github.com/denoland/deno/issues/4568 why this is necessary
      const [stdErrRaw, stdOutRaw, status] = await Promise.all([
        cmd.stderrOutput(),
        cmd.output(),
        cmd.status(),
      ]);
      const result: govn.ShellExecuteResult<RO> = {
        runOptions,
        status,
        isValid: () => isValid ? isValid(result) : status.success,
      };
      const reportResult = ros.reportResult || defaults?.reportResult;
      if (reportResult) {
        reportResult(result);
      }
      const decoder = ros.decoder || defaults?.decoder || this.decoder;
      const consumeStdErr = ros.consumeStdErr || defaults?.consumeStdErr;
      if (consumeStdErr) {
        consumeStdErr(decoder.decode(stdErrRaw), result);
      }
      const consumeStdOut = ros.consumeStdOut || defaults?.consumeStdOut;
      if (consumeStdOut) {
        consumeStdOut(decoder.decode(stdOutRaw), result);
      }
      return result;
    } catch (error) {
      const reportError = ros.reportError || defaults?.reportError;
      if (reportError) {
        reportError(error, runOptions);
      } else {
        throw error;
      }
    } finally {
      if (cmd) {
        cmd.close();
      }
    }
  }

  async exec<RO extends govn.ShellCmdRunOptions = govn.ShellCmdRunOptions>(
    cmd: string,
    isValid?: (ser: govn.ShellExecuteResult<RO>) => boolean,
  ) {
    return await this.execute<RO>({
      runOptions: () => this.cmdTextRunOptions(cmd),
    }, isValid);
  }

  async execText(
    cmd: string,
    options?: {
      readonly onUnexpected?: () => string | undefined;
      readonly onError?: (error: Error) => string | undefined;
      readonly onStdErr?: (stdErr: string) => string | undefined;
    },
  ): Promise<string | undefined> {
    let result: string | undefined;
    await window.rawShell.execute({
      runOptions: () => this.cmdTextRunOptions(cmd),
      consumeStdOut: (stdOut) => {
        result = stdOut;
      },
      consumeStdErr: (options?.onStdErr || options?.onUnexpected)
        ? ((stdErr) => {
          result = options?.onStdErr
            ? options.onStdErr(stdErr)
            : (options?.onUnexpected ? options.onUnexpected() : undefined);
        })
        : undefined,
      reportError: (options?.onError || options?.onUnexpected)
        ? ((error) => {
          result = options?.onError
            ? options.onError(error)
            : (options?.onUnexpected ? options.onUnexpected() : undefined);
        })
        : undefined,
    });
    return result;
  }

  execShebang<RO extends govn.ShebangRunOptions = govn.ShebangRunOptions>(
    refine?: (
      suggested: govn.ShebangRunOptionsSupplier<RO>,
    ) => govn.ShebangRunOptionsSupplier<RO>,
    shebangDir = Deno.makeTempDirSync(),
    shebangFileBaseName = "execShebang",
  ): govn.ShebangScript<RO, string> {
    return async (literals, ...exprs) => {
      let interpolated = "";
      for (let i = 0; i < literals.length; i++) {
        interpolated += literals[i]
          // join lines when there is a suppressed newline
          .replace(/\\\n[ \t]*/g, "")
          // handle escaped backticks
          .replace(/\\`/g, "`");

        if (i < exprs.length) {
          // TODO: add type-safety here (e.g. strings, functions, etc.)
          interpolated += exprs[i];
        }
      }

      const shebangScript = ws.unindentWhitespace(interpolated);
      const shebangFile = path.join(shebangDir, shebangFileBaseName);
      Deno.writeTextFileSync(shebangFile, shebangScript);
      Deno.chmodSync(shebangFile, 0o777);
      const ros: govn.ShebangRunOptionsSupplier<RO> = {
        runOptions: () => ({
          ...this.cmdTextRunOptions<RO>(shebangFile),
          cwd: Deno.cwd(),
          shebangDir,
          shebangFile,
          shebangScript,
        }),
      };
      const result = await this.execute<RO>(refine ? refine(ros) : ros);
      Deno.removeSync(shebangDir, { recursive: true });
      return result;
    };
  }
}

export class RawShell extends AbstractShell {
  cmdTextRunOptions<
    RO extends govn.ShellCmdRunOptions = govn.ShellCmdRunOptions,
  >(cmd: string): RO {
    return { cmd: this.cmdTextUnits(cmd) } as RO;
  }
}

export class BinSh extends AbstractShell {
  cmdTextRunOptions<
    RO extends govn.ShellCmdRunOptions = govn.ShellCmdRunOptions,
  >(cmd: string): RO {
    return { cmd: ["/bin/sh", "-c", cmd] } as unknown as RO;
  }
}

export class Bash extends AbstractShell {
  constructor(
    readonly strict = true,
    readonly bashCmd = "/bin/bash",
    readonly defaults?: Omit<
      govn.ShellCmdRunOptionsSupplier<govn.ShellCmdRunOptions>,
      "runOptions"
    >,
  ) {
    super(defaults);
  }

  async init(): Promise<void> {
    // this.bashCmd is typically set to /bin/bash but we want to auto-detect
    // the proper location in case what was supplied was not correct
    await window.rawShell.execute({
      runOptions: () => ({
        cmd: ["/bin/sh", "-c", "command -v bash || which bash || type -p bash"],
      }),
      consumeStdOut: (stdOut) => {
        (this.bashCmd as string) = stdOut.trim();
      },
    });
  }

  cmdTextRunOptions<
    RO extends govn.ShellCmdRunOptions = govn.ShellCmdRunOptions,
  >(cmd: string): RO {
    return {
      cmd: [
        this.bashCmd,
        "-c",
        this.strict ? ("set -euo pipefail;" + cmd) : cmd,
      ],
    } as unknown as RO;
  }
}

if (!window.rawShell) {
  window.rawShell = new RawShell();
  await (window.rawShell as RawShell).init();
}

if (!window.sh) {
  window.sh = new BinSh();
  await window.sh.init();
}

if (!window.bash) {
  window.bash = new Bash();
  await window.bash.init();
}
