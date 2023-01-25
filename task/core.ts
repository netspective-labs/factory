import * as colors from "https://deno.land/std@0.147.0/fmt/colors.ts";
import * as events from "https://deno.land/x/eventemitter@1.2.4/mod.ts";

// we export this since it's comprises the core Taskfile.ts "Tasks" instance.
export { EventEmitter } from "https://deno.land/x/eventemitter@1.2.4/mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export function kebabCaseToCamelTaskName(text: string) {
  return text.replace(/-./g, (x) => x.toUpperCase()[1]);
}

export const camelCaseToKebabTaskName = (text: string) =>
  // find one or more uppercase characters and separate with -
  text.replace(/[A-Z]+/g, (match: string) => `-${match}`)
    .toLocaleLowerCase();

export function eventEmitterInternalMap<EE extends events.EventEmitter<Any>>(
  ee: EE,
) {
  // this is ugly but necessary due to events.EventEmitter making _events_ private :-(
  return (ee as unknown as { ["_events_"]: Map<Any, unknown> })["_events_"];
}

/**
 * eventEmitterCLI take an github.com/ihack2712/eventemitter EventEmitter
 * instance and treats each "event" as a potential "task". It is called with
 * Deno.args or any string array in which the first token/word is the name of
 * an event and the remainder of the arguments are parameters to the event.
 * @param param0
 * @param ee
 * @param options
 */
export async function eventEmitterCLI<
  // deno-lint-ignore no-explicit-any
  EE extends events.EventEmitter<any>,
  Context,
>(
  [name, ...suppliedArgs]: string[],
  ee: EE,
  options?: {
    defaultTaskName?: string;
    context?: (ee: EE, name: string, ...args: unknown[]) => Context | undefined;
    transformArgs?: (...suppliedArgs: unknown[]) => unknown[];
    onTaskNotFound?: (
      task: string,
      // deno-lint-ignore no-explicit-any
      handlers: Map<any, unknown>,
    ) => Promise<void>;
  },
): Promise<void> {
  if (!name) name = options?.defaultTaskName || "help";
  if (name.indexOf("-") > 0) name = kebabCaseToCamelTaskName(name);

  // this is ugly but necessary due to events.EventEmitter making _events_ private :-(
  const handlers = eventEmitterInternalMap(ee);

  if (handlers.has(name)) {
    const untypedEE = ee as unknown as {
      // deno-lint-ignore no-explicit-any
      emit: (name: any, ...args: unknown[]) => Promise<any>;
    };

    const args = options?.transformArgs
      ? options.transformArgs(suppliedArgs)
      : suppliedArgs.map((a) => {
        try {
          // see if the string is JSON parseable; if it is, it's a properly typed instance
          return JSON.parse(a);
        } catch (_error) {
          // in case it's not JSON parseable assume it's a string
          return a;
        }
      });

    const context = options?.context
      ? options.context(ee, name, ...args)
      : undefined;

    if (context) {
      // deno-lint-ignore no-explicit-any
      await untypedEE.emit(name as any, context, ...args);
    } else {
      // deno-lint-ignore no-explicit-any
      await untypedEE.emit(name as any, ...args);
    }
  } else {
    if (options?.onTaskNotFound) {
      await options.onTaskNotFound(name, handlers);
    } else {
      // deno-fmt-ignore
      console.error(colors.red(`task "${colors.yellow(name)}" not found, available: ${Array.from(handlers.keys()).map((t) => colors.green(t)).join(", ")}`));
    }
  }
}

// deno-lint-ignore no-explicit-any
export function eeHelpTask<EE extends events.EventEmitter<any>>(
  ee: EE,
  options?: { defaultTaskName: string },
) {
  return () => {
    const defaultTaskName = options?.defaultTaskName || "help";
    // this is ugly but necessary due to events.EventEmitter making _events_ private :-(
    const handlers =
      // deno-lint-ignore no-explicit-any
      (ee as unknown as { ["_events_"]: Map<any, unknown> })["_events_"];
    for (const name of Array.from(handlers.keys()).sort()) {
      const handler = handlers.get(name);
      const alias = camelCaseToKebabTaskName(name);
      console.info(
        colors.gray(
          //deno-fmt-ignore
          `${name == defaultTaskName ? colors.brightCyan('*') : '-'} ${colors.yellow(alias)}${alias != name ? ` ${colors.dim('or')} ${colors.gray(name)}` : ''} (${colors.dim(Deno.inspect(handler))})`,
        ),
      );
    }
  };
}
