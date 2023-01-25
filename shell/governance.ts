export interface ShellCmdDryRunnable {
  readonly isDryRun?: boolean;
}

export interface ShellCmdRunOptions
  extends Deno.RunOptions, ShellCmdDryRunnable {
}

export interface ShellOutputConsumer<RO extends Deno.RunOptions> {
  (output: string, ser: ShellExecuteResult<RO>): void;
}

export interface ShellCmdRunOptionsSupplier<RO extends ShellCmdRunOptions>
  extends ShellCmdDryRunnable {
  readonly runOptions: () => RO;
  readonly consumeStdOut?: ShellOutputConsumer<RO>;
  readonly consumeStdErr?: ShellOutputConsumer<RO>;
  readonly reportRun?: (runOptions: RO, isDryRun?: boolean) => void;
  readonly reportError?: (error: Error, runOptions: RO) => void;
  readonly reportResult?: (ser: ShellExecuteResult<RO>) => void;
  readonly decoder?: TextDecoder;
}

export interface ShellExecuteResult<RO extends ShellCmdRunOptions> {
  readonly runOptions: RO;
  readonly status: Deno.ProcessStatus;
  readonly isValid: (status: Deno.ProcessStatus) => boolean;
}

export interface ShebangScript<RO extends ShellCmdRunOptions, Interpolate> {
  (
    literals: TemplateStringsArray,
    ...expressions: Interpolate[]
  ): Promise<ShellExecuteResult<RO> | undefined>;
}

export interface ShebangRunOptions extends ShellCmdRunOptions {
  readonly shebangScript: string;
  readonly shebangDir: string;
  readonly shebangFile: string;
}

// deno-lint-ignore no-empty-interface
export interface ShebangRunOptionsSupplier<RO extends ShebangRunOptions>
  extends ShellCmdRunOptionsSupplier<RO> {
}

export interface Shell {
  readonly cmdTextRunOptions: <
    RO extends ShellCmdRunOptions = ShellCmdRunOptions,
  >(cmd: string) => RO;
  readonly smartQuotesCmdRunOptions: <
    RO extends ShellCmdRunOptions = ShellCmdRunOptions,
  >(...args: string[]) => RO;
  readonly execute: <RO extends ShellCmdRunOptions = ShellCmdRunOptions>(
    ros: ShellCmdRunOptionsSupplier<RO>,
    isValid?: (ser: ShellExecuteResult<RO>) => boolean,
  ) => Promise<ShellExecuteResult<RO> | undefined>;
  readonly exec: <RO extends ShellCmdRunOptions = ShellCmdRunOptions>(
    cmd: string,
    isValid?: (ser: ShellExecuteResult<RO>) => boolean,
  ) => Promise<ShellExecuteResult<RO> | undefined>;
  readonly execText: (
    cmd: string,
    options?: {
      readonly onUnexpected?: () => string | undefined;
      readonly onError?: (error: Error) => string | undefined;
      readonly onStdErr?: (stdErr: string) => string | undefined;
    },
  ) => Promise<string | undefined>;
  readonly execShebang: <RO extends ShebangRunOptions = ShebangRunOptions>() =>
    ShebangScript<RO, string>;
}
