import { smtp } from "./deps.ts";
import * as govn from "./governance.ts";

export interface SmtpClientSupplier {
  readonly tlsStrategy: "TLS" | "startTLS" | "unsecure";
  readonly hostname: string;
  readonly port: number;
  readonly auth?: {
    readonly username: string;
    readonly password: string;
  };
  readonly client: () => smtp.SMTPClient;
  readonly prepareSend: (payload: govn.SmtpMessage) => smtp.SendConfig;
}

export interface SmtpServerEnvConfigOptions {
  readonly autoCloseOnUnload?: boolean;
  readonly smtpEnvVarsPrefix?: string;
  readonly onError?: (message: string) => void;
}

export function smtpServerEnvConfig(
  options?: SmtpServerEnvConfigOptions,
): SmtpClientSupplier | undefined {
  const { autoCloseOnUnload = true, smtpEnvVarsPrefix = "", onError } =
    options ?? {};
  const detected = {
    tlsStrategy: Deno.env.get(`${smtpEnvVarsPrefix}TLS_STRATEGY`),
    logStrategy: Deno.env.get(`${smtpEnvVarsPrefix}LOG_STRATEGY`),
    hostname: Deno.env.get(`${smtpEnvVarsPrefix}HOST_NAME`),
    port: Deno.env.get(`${smtpEnvVarsPrefix}HOST_PORT`) ?? "25",
    username: Deno.env.get(`${smtpEnvVarsPrefix}SEND_ACCOUNT_USERNAME`),
    password: Deno.env.get(`${smtpEnvVarsPrefix}SEND_ACCOUNT_PASSWORD`),
  };
  if (detected.hostname) {
    let client: smtp.SMTPClient | undefined;
    const result: SmtpClientSupplier = {
      hostname: detected.hostname,
      port: parseInt(detected.port ?? "25"),
      tlsStrategy: detected.tlsStrategy == "startTLS" ? "startTLS" : "TLS",
      auth: (detected.username && detected.password)
        ? {
          username: detected.username,
          password: detected.password,
        }
        : undefined,
      client: () => {
        if (!client) {
          client = new smtp.SMTPClient({
            debug: {
              log: detected.logStrategy == "debug.log" ? true : false,
            },
            connection: {
              hostname: result.hostname,
              port: result.port,
              tls: result.tlsStrategy == "startTLS" ? false : true,
              auth: result.auth,
            },
          });
          if (autoCloseOnUnload) {
            addEventListener("unload", () => {
              console.info(`Closing SMTP client ${result.hostname}`);
              client?.close();
            });
          }
        }
        return client;
      },
      prepareSend: (payload) => {
        return {
          from: detected.username ?? payload.from,
          to: typeof payload.to === "string"
            ? payload.to
            : (payload.to.length > 0 ? payload.to[0] : "??"),
          subject: payload.subject ?? "",
          content: "Body Text (TODO convert from HTML)",
          html: govn.isSmtpMessageBodyHTML(payload.body)
            ? payload.body.HTML
            : undefined,
        };
      },
    };
    return result;
  }
  onError?.(`${smtpEnvVarsPrefix}HOST_NAME not available`);
  return undefined;
}
