import * as interp from "../../text/interpolate.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export interface EngineInstanceConnInterpolatable
  extends Record<string, string> {
  USERNAME: string;
  PASSWORD: string;
}

export interface EngineInstanceConnProps {
  driver?: string;
  username?: string;
  password?: string;
  host?: string;
  port?: number;
  database?: string;
  filename?: string; // For SQLite
  interpolatables?: EngineInstanceConnInterpolatable;
}

export interface EngineConnPropsOptions<
  ConnProps extends EngineInstanceConnProps,
  ConnPropKey extends keyof ConnProps = keyof ConnProps,
> {
  readonly transformQueryParam?: (
    key: string,
    value: string,
  ) => { key: ConnPropKey; value: unknown };
  readonly transform?: (cpm: ConnProps) => Readonly<ConnProps>;
  readonly onInvalid?: (error: Error) => Readonly<ConnProps> | undefined;
  readonly envVarNamingStrategy?: (
    supplied: keyof EngineInstanceConnInterpolatable,
  ) => string;
  readonly interpolateStrategy?: interp.TextInterpolateStrategy<
    EngineInstanceConnInterpolatable
  >;
}

export function engineConnProps<
  ConnProps extends EngineInstanceConnProps,
  ConnPropKey extends keyof ConnProps = keyof ConnProps,
>(
  dbUriSupplier: string | (() => string),
  options?: EngineConnPropsOptions<ConnProps>,
): Readonly<ConnProps> | undefined {
  const { envVarNamingStrategy } = options ?? {};
  const {
    transformQueryParam = (key: string, value: string) => ({
      key: key as ConnPropKey,
      value,
    }),
    transform,
    onInvalid,
    interpolateStrategy = envVarNamingStrategy
      ? {
        replace: {
          "USERNAME": () =>
            Deno.env.get(envVarNamingStrategy("USERNAME")) ?? "",
          "PASSWORD": () =>
            Deno.env.get(envVarNamingStrategy("PASSWORD")) ?? "",
        },
      }
      : undefined,
  } = options ?? {};
  const interpolator = interpolateStrategy
    ? interp.textInterpolator(interpolateStrategy)
    : undefined;

  try {
    const dbUriSupplied = typeof dbUriSupplier === "function"
      ? dbUriSupplier()
      : dbUriSupplier;
    const { transformedText: dbURI, interpolated } = interpolator
      ? interpolator.interpolateObservable(dbUriSupplied)
      : { transformedText: dbUriSupplied, interpolated: undefined };
    const url = new URL(dbURI);
    const config: ConnProps = {} as ConnProps;
    if (interpolated) config.interpolatables = interpolated;

    // any arbitrary query params kv pairs become part of the conn props
    for (const [spKey, spValue] of url.searchParams.entries()) {
      const { key, value } = transformQueryParam(spKey, spValue);
      (config as Any)[key] = value;
    }

    // Fix trailing :
    config.driver = (url.protocol || "sqlite3:").replace(/\:$/, "");

    // Cloud Foundry fix
    if (config.driver == "mysql2") config.driver = "mysql";

    if (url.username.length) config.username = url.username;
    if (url.password.length) config.password = url.password;

    if (config.driver === "sqlite3") {
      if (url.hostname) {
        if (url.pathname) {
          // Relative path.
          config.filename = url.hostname + url.pathname;
        } else {
          // Just a filename.
          config.filename = url.hostname;
        }
      } else {
        // Absolute path.
        config.filename = url.pathname;
      }
    } else {
      // Some drivers (e.g., redis) don't have database names.
      if (url.pathname) {
        config.database = url.pathname
          .replace(/^\//, "")
          .replace(/\/$/, "");
      }

      if (url.hostname) config.host = url.hostname;
      if (url.port) config.port = parseInt(url.port);
    }

    return transform ? transform(config) : config as Readonly<ConnProps>;
  } catch (error) {
    return onInvalid?.(error);
  }
}
