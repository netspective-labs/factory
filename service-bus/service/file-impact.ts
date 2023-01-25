import * as govn from "../governance.ts";

export const serverFileImpactPayloadIdentity = "serverFileImpact" as const;

export interface MutatableServerFileImpact {
  readonly payloadIdentity: typeof serverFileImpactPayloadIdentity;
  // the absolute path and filename of the file that was impacted on the server
  serverFsAbsPathAndFileName: string;
  // if this file was being served by the server, the file's relative URL in user agent
  relativeUserAgentLocation?: string;
}

// deno-lint-ignore no-empty-interface
export interface ServerFileImpact extends Readonly<MutatableServerFileImpact> {
}

export interface ValidatedServerFileImpact
  extends govn.ValidatedPayload, ServerFileImpact {
}

export function isServerFileImpact(o: unknown): o is ServerFileImpact {
  if (govn.isIdentifiablePayload(o)) {
    if (o.payloadIdentity == serverFileImpactPayloadIdentity) {
      return true;
    }
  }
  return false;
}

export function serverFileImpact(
  sfi: Omit<ServerFileImpact, "payloadIdentity" | "isValidated" | "isValid">,
): ServerFileImpact {
  return {
    payloadIdentity: serverFileImpactPayloadIdentity,
    ...sfi,
  };
}

export function serverFileImpactService(): govn.EventSourceService<
  ValidatedServerFileImpact
> {
  const proxy:
    & govn.EventSourceService<ValidatedServerFileImpact>
    & govn.WebSocketReceiveService<ServerFileImpact> = {
      serviceIdentity: serverFileImpactPayloadIdentity,
      payloadIdentity: serverFileImpactPayloadIdentity,
      isEventSourcePayload: (
        rawJSON,
      ): rawJSON is ValidatedServerFileImpact => {
        // TODO: we should really do some error checking
        return isServerFileImpact(rawJSON);
      },
      prepareEventSourcePayload: (rawJSON) => {
        // TODO: we should really do some error checking
        const validated = rawJSON as govn.MutatableValidatedPayload;
        validated.isValidatedPayload = true;
        validated.isValidPayload = true;
        return validated as ValidatedServerFileImpact;
      },
      isWebSocketReceivePayload: (
        rawJSON,
      ): rawJSON is ValidatedServerFileImpact => {
        // TODO: we should really do some error checking
        return isServerFileImpact(rawJSON);
      },
      prepareWebSocketReceivePayload: (rawJSON) => {
        // TODO: we should really do some error checking
        const validated = rawJSON as govn.MutatableValidatedPayload;
        validated.isValidatedPayload = true;
        validated.isValidPayload = true;
        return validated as ValidatedServerFileImpact;
      },
    };
  return proxy;
}
