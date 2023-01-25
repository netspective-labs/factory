import { colors, events, path } from "./deps.ts";
import * as govn from "./governance.ts";
import * as conf from "../conf/mod.ts";

declare global {
  interface Window {
    fsdProxyEventsEmitters: Map<string, FileSysDirectoryProxyEventsEmitter>;
  }
}

if (!window.fsdProxyEventsEmitters) {
  window.fsdProxyEventsEmitters = new Map();
}

export class FileSysDirectoryProxyEventsEmitter extends events.EventEmitter<{
  proxyStrategyResult(psr: govn.FileSysDirectoryProxyStrategyResult): void;
  constructOrigin(proxyPath: string): void;
  constructOriginError(
    psr: govn.FileSysDirectoryProxyStrategyResult,
    error: Error,
  ): void;
  notADirectoryError(proxyPath: string): void;
}> {
  isVerbose: boolean;
  constructor(isVerbose: boolean) {
    super();
    this.isVerbose = isVerbose;
  }
}

export function fileSysDirectoryProxyEventsConsoleEmitter(
  cacheKey: string,
  envVarsPrefix: string,
): FileSysDirectoryProxyEventsEmitter {
  const config = new conf.TypicalEnvArgumentsConfiguration<
    { verbose: boolean }
  >(
    () => ({ verbose: false }),
    (ec) => ({ properties: [ec.booleanProperty("verbose")] }),
    envVarsPrefix,
  );
  const envVars = config.configureSync();
  let result: FileSysDirectoryProxyEventsEmitter;
  const cachedEE = window.fsdProxyEventsEmitters.get(cacheKey);
  if (!cachedEE) {
    if (envVars.verbose) {
      console.log(
        colors.brightBlue(
          `${cacheKey}: verbose ${
            colors.gray(
              `(${envVarsPrefix}VERBOSE FileSysDirectoryProxyEventsEmitter)`,
            )
          }`,
        ),
      );
    }
    result = new FileSysDirectoryProxyEventsEmitter(envVars.verbose);
    window.fsdProxyEventsEmitters.set(cacheKey, result);
    result.on("proxyStrategyResult", (psr) => {
      if (result.isVerbose) {
        const relPath = path.isAbsolute(psr.proxyPath)
          ? path.relative(Deno.cwd(), psr.proxyPath)
          : psr.proxyPath;
        if (psr.isConstructFromOrigin) {
          console.info(colors.cyan(
            `Acquiring path ${
              colors.brightCyan(relPath)
            } from origin: ${psr.proxyRemarks}`,
          ));
        } else {
          console.info(colors.gray(
            `Using cached path: ${relPath}`,
          ));
        }
      }
    });
  } else {
    result = cachedEE;
  }
  return result;
}

export abstract class ProxyableFileSysDirectory<OriginContext> {
  static readonly ageOneSecondMS = 1000;
  static readonly ageOneMinuteMS = this.ageOneSecondMS * 60;
  static readonly ageOneHourMS = this.ageOneMinuteMS * 60;
  static readonly ageOneDayMS = this.ageOneHourMS * 24;

  constructor(
    readonly proxyPath: string,
    readonly proxyStrategy: govn.FileSysDirectoryProxyStrategy,
    readonly fsdpEE?: FileSysDirectoryProxyEventsEmitter,
  ) {
  }

  abstract isOriginAvailable(
    fsdpsr: govn.FileSysDirectoryProxyStrategyResult,
  ): Promise<OriginContext | false>;

  abstract constructFromOrigin(
    ctx: OriginContext,
    fsdpsr: govn.FileSysDirectoryProxyStrategyResult,
  ): Promise<void>;

  relativePath(newPath: string): string {
    return path.join(this.proxyPath, newPath);
  }

  removeProxyPath(existing: Deno.FileInfo): boolean {
    if (existing.isDirectory) {
      Deno.removeSync(this.proxyPath, { recursive: true });
      return true;
    } else {
      if (this.fsdpEE) {
        this.fsdpEE.emitSync("notADirectoryError", this.proxyPath);
      } else {
        console.warn(
          `${this.proxyPath} is not a directory, unable to remove (ProxyableFileSysDirectory.removeProxyPath)`,
        );
      }
      return false;
    }
  }

  useProxy(_fsdpsr: govn.FileSysDirectoryProxyStrategyResult) {
    // for benefit of subclasses
  }

  proxyOriginError(
    error: Error,
    fsdpsr: govn.FileSysDirectoryProxyStrategyResult,
  ) {
    if (this.fsdpEE) {
      this.fsdpEE.emitSync("constructOriginError", fsdpsr, error);
    }
  }

  async prepareDirectory(): Promise<void> {
    const fsdpsr = await this.proxyStrategy(this.proxyPath);
    const fsdpEE = this.fsdpEE;
    if (fsdpEE) fsdpEE.emitSync("proxyStrategyResult", fsdpsr);
    if (fsdpsr.isConstructFromOrigin) {
      try {
        const po = await this.isOriginAvailable(fsdpsr);
        if (po) {
          // if no `stat` path does not exist
          if (fsdpsr.proxyPathInfo) this.removeProxyPath(fsdpsr.proxyPathInfo);
          await this.constructFromOrigin(po, fsdpsr);
          if (fsdpEE) fsdpEE.emit("constructOrigin", this.proxyPath);
        }
      } catch (error) {
        this.proxyOriginError(error, fsdpsr);
      }
    } else {
      this.useProxy(fsdpsr);
    }
  }
}
