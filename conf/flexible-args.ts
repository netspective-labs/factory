const jsTokenEvalRE = /^[a-zA-Z0-9_]+$/;

export interface TokenExplorer<Token> {
  (name: string): Token | undefined;
}

/**
 * jsTokenEvalResult finds functions, classes, or other single word (token)
 * "hooks". Allows defining "hook functions" like <html lang="en" XYZ-args-supplier="xyzArgsHook">
 * in DOM elements on the client side or environment variables hooks, feature
 * flags hooks, and CLI arguments hooks on the server side. Given one or more
 * "explorer" functions (which can be as simple as an eval or more complex query
 * functions), look for identity and, if the identity ("XYZ-args-supplier")
 * references a Javascript function return it as a Javascript function instance
 * ready to be evaluated. Identity is enforced to be a Javascript token pattern
 * for security purposes: since the token is likely to be be evaluated by the
 * discovery functions using "eval(identity)" we do not allow arbitrary identity
 * values.
 * @param identity what you're looking for (e.g. a class name, function name, env var name, etc.);
 * @param discover how to evaluate for discovery of token with 'name' (usually just 'eval' function scoped by caller)
 * @param isTokenValid will be called if a token is found, you can transform it or emit an event
 * @param onInvalidToken if the given text is not a single word, call this function and return its result
 * @param onFailedDiscovery in case the eval resulted in an exception, call this function and return its result
 * @returns the result of eval(name) or, if there's an error the result of the error callbacks
 */
export function jsTokenEvalResult<Token>(
  identity: string,
  discover: TokenExplorer<Token> | TokenExplorer<Token>[],
  isTokenValid?: (value: unknown, name: string) => Token | undefined,
  onInvalidToken?: (name: string) => Token | undefined,
  onFailedDiscovery?: (error: Error, name: string) => Token | undefined,
) {
  let result: Token | undefined;
  if (identity.match(jsTokenEvalRE)) {
    // proceed only if the name is a single word string
    try {
      if (Array.isArray(discover)) {
        for (const te of discover) {
          // find first matching candidate and continue to validity check
          result = te(identity);
          if (result) break;
        }
      } else {
        result = discover(identity);
      }
      if (result && isTokenValid) result = isTokenValid(result, identity);
    } catch (error) {
      result = onFailedDiscovery?.(error, identity);
    }
  } else {
    result = onInvalidToken?.(identity);
  }
  return result;
}

const jsTokenEvalResults: Record<string, unknown> = {}; // serves as a cache, speed up later lookups

export function cacheableJsTokenEvalResult<Token>(
  name: string,
  discover = eval,
  onInvalidToken?: (name: string) => Token | undefined,
  onFailedDiscovery?: (error: Error, name: string) => Token | undefined,
) {
  if (name in jsTokenEvalResults) return jsTokenEvalResults[name];
  return jsTokenEvalResult(
    name,
    discover,
    (value, name) => {
      jsTokenEvalResults[name] = value;
      return value; // be sure to value, this is what's returned as jsTokenEvalResult result
    },
    onInvalidToken,
    onFailedDiscovery,
  );
}

// we define HTMLElement as a generic argument because DOM is not known in Typescript
export interface WalkHookNameSupplier<HookTarget> {
  (element: HookTarget): string | undefined;
}

export interface HookWalkEntry<HookTarget, Hook> {
  readonly target: HookTarget;
  readonly hookDiscovered?: Hook;
  readonly hookName: string;
  readonly hookNameSupplier: WalkHookNameSupplier<HookTarget>;
}

export function* walkHooks<HookTarget, Hook>(
  targets: Iterable<HookTarget>,
  hookNameSuppliers: Iterable<WalkHookNameSupplier<HookTarget>>,
  discover: TokenExplorer<Hook> | TokenExplorer<Hook>[],
  prepareWalkEntry?: (
    suggested: HookWalkEntry<HookTarget, Hook>,
  ) => HookWalkEntry<HookTarget, Hook> | undefined,
): Generator<HookWalkEntry<HookTarget, Hook>> {
  const suppliers = Array.isArray(hookNameSuppliers)
    ? hookNameSuppliers
    : [hookNameSuppliers];
  for (const target of targets) {
    for (const hookNameSupplier of suppliers) {
      const hookName = hookNameSupplier(target);
      if (hookName) {
        const hookDiscovered = jsTokenEvalResult<Hook>(
          hookName,
          discover,
          (value) => value as Hook, // TODO: need validation
          (name) => {
            console.log(
              `[discoverDomElemHook] '${name}' is not a token in current scope for`,
              target,
            );
            return undefined;
          },
        );
        let hookExecArgs: HookWalkEntry<HookTarget, Hook> = {
          target,
          hookDiscovered,
          hookName,
          hookNameSupplier,
        };
        if (prepareWalkEntry) {
          const prepared = prepareWalkEntry(hookExecArgs);
          if (!prepared) continue; // filtered, don't yield
          hookExecArgs = prepared;
        }
        // run the hook which receives the discovery parameters and is expected
        // to return the parameters plus whatever is expected by the discoverDomElemHooks
        // caller; if it returns undefined, the default hookExecArgs + hookExecResult
        // is returned
        const hookExecResult =
          hookDiscovered && typeof hookDiscovered === "function"
            ? hookDiscovered(hookExecArgs)
            : undefined;

        // yield from any supplier found
        yield hookExecResult ?? hookExecArgs;
      }
    }
  }
}

// deno-lint-ignore no-empty-interface
export interface FlexibleArguments {
}

export type ArgumentsSupplier<
  Arguments extends FlexibleArguments,
> =
  | Partial<Arguments>
  | ((
    defaultArgs?: Arguments,
    rules?: FlexibleArgsRules<Arguments>,
  ) => Partial<Arguments>);

export type DefaultArgumentsSupplier<
  Arguments extends FlexibleArguments,
> =
  | Arguments
  | ((
    args?: ArgumentsSupplier<Arguments>,
    rules?: FlexibleArgsRules<Arguments>,
  ) => Arguments);

export interface FlexibleArgsGuard<
  Arguments extends FlexibleArguments,
  Rules extends FlexibleArgsRules<Arguments>,
> {
  readonly guard: (o: unknown) => o is Arguments;
  readonly onFailure: (args: Arguments, rules?: Rules) => Arguments;
}

export interface FlexibleArgsRules<
  Arguments extends FlexibleArguments,
> {
  /**
   * defaultArgs can come from anywhere (even "hooks"). In most cases they are
   * just a scalar object but they could be sourced from anywhere. For example,
   * you could use jsTokenEvalResult to dynamically evaluate a token or read
   * the arguments from a feature flag system like Unleash, environment
   * variables, or even the CLI through Flexible Arguments Adapters (FAAs).
   */
  readonly defaultArgs?: DefaultArgumentsSupplier<Arguments>;

  /**
   * argsGuard gives your code the opportunity to validate the Arguments after
   * finalization. In case the guard fails, onFailure will be called allowing
   * you to return a different set of results from a "backup" source.
   */
  readonly argsGuard?: FlexibleArgsGuard<
    Arguments,
    FlexibleArgsRules<Arguments>
  >;

  /**
   * finalizeArgs allows your code to see what's been constructed with all the
   * rules and gives one last opportunity to return different results.
   */
  readonly finalizeResult?: (
    suggested: FlexibleArgsResult<Arguments, FlexibleArgsRules<Arguments>>,
  ) => FlexibleArgsResult<
    Arguments,
    FlexibleArgsRules<Arguments>
  >;
}

export type FlexibleArgsRulesSupplier<
  Arguments extends FlexibleArguments,
  Rules extends FlexibleArgsRules<Arguments>,
> =
  | FlexibleArgsRules<Arguments>
  | ((args?: ArgumentsSupplier<Arguments>) => Rules);

export interface FlexibleArgsResult<
  Arguments extends FlexibleArguments,
  Rules extends FlexibleArgsRules<Arguments>,
> {
  readonly args: Arguments;
  readonly rules?: Rules;
}

/**
 * Flexibly create an object from an arguments supplier and a set of rules.
 * This is our standard approach to constructing objects and hooks;
 * argsSupplier is the primary object instance and should contain the
 * canonical properties. When certain properties should always be present, they
 * can be supplied in rules.defaultArgs.
 * @param argsSupplier
 * @param rulesSupplier
 * @returns
 */
export function flexibleArgs<
  Arguments extends FlexibleArguments,
>(
  argsSupplier: ArgumentsSupplier<Arguments>,
  rulesSupplier?: FlexibleArgsRulesSupplier<
    Arguments,
    FlexibleArgsRules<Arguments>
  >,
): FlexibleArgsResult<
  Arguments,
  FlexibleArgsRules<Arguments>
> {
  // rules can come from anywhere (even "hooks"). In most cases rules are
  // just a scalar object with simple properties but they could be sourced
  // from anywhere. For example, you could use jsTokenEvalResult to
  // dynamically evaluate a token or read the rules from DOM element hooks if
  // running in a browser or through environment variables if running on the
  // server. These "hooks" are called Flexible Arguments Rules Adapters (FARAs).
  const rules = rulesSupplier
    ? (typeof rulesSupplier === "function"
      ? rulesSupplier(argsSupplier)
      : rulesSupplier)
    : undefined;

  // if we have a defaultArgs rule, use it; if defaultArgs is a function,
  // evaluate it and assume that those are the actual default arguments.
  // because the resulting args from this function can never be undefine or
  // null we default to an empty object to start with.
  const defaultArgsSupplier = rules?.defaultArgs ?? {};
  const defaultArgs = typeof defaultArgsSupplier === "function"
    ? defaultArgsSupplier(argsSupplier, rules)
    : defaultArgsSupplier;

  // now that we have our rules and default arguments setup the canonical
  // arguments instance. If the argsSupplier is a function, evaluate it and
  // use it as the starting point. If argsSupplier is a function, it means
  // that it might be a "hook" or other dynamically sourced content. If
  // argsSupplier is a function, it will be given the defaultArgs as its
  // first parameter is the responsibility of the argsSupplier function to
  // use spread operators to "use" the defaults before returning because the
  // argsSupplier function is responsible for inheriting the default args.
  // If argsSupplier is an object instance, defaultArgs will automatically
  // be inherited.
  let args = typeof argsSupplier === "function"
    ? argsSupplier(defaultArgs, rules)
    : (argsSupplier ? { ...defaultArgs, ...argsSupplier } : defaultArgs);

  if (rules?.argsGuard) {
    if (!rules?.argsGuard.guard(args)) {
      args = rules.argsGuard.onFailure(args, rules);
    }
  }

  let result: FlexibleArgsResult<
    Arguments,
    FlexibleArgsRules<Arguments>
  > = { args, rules };

  if (rules?.finalizeResult) {
    result = rules.finalizeResult(result);
  }

  // TODO: add event emitter to rules and allow "publish" of arguments
  return result;
}

export function governedArgs<
  Arguments extends FlexibleArguments,
>(
  argsSupplier: ArgumentsSupplier<Arguments>,
  rulesSupplier?: FlexibleArgsRulesSupplier<
    Arguments,
    FlexibleArgsRules<Arguments>
  >,
) {
  const result = flexibleArgs(argsSupplier, rulesSupplier);
  // TODO: add https://ajv.js.org/ schema validation
  return result;
}
