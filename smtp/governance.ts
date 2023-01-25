export type SmtpMessageBody = string | { readonly HTML: string } | {
  readonly text: string;
};

export interface SmtpMessage {
  readonly smtpServerID?: string;
  readonly from: string;
  readonly to: string | string[];
  readonly cc?: string | string[];
  readonly bcc?: string | string[];
  readonly subject?: string;
  readonly body: SmtpMessageBody;
}

export function isSmtpMessageBody(o: unknown): o is SmtpMessageBody {
  if (typeof o === "string") return true;
  if (o && typeof o === "object") {
    if ("HTML" in o) return true;
    if ("text" in o) return true;
  }
  return false;
}

export function isSmtpMessageBodyHTML(
  o: SmtpMessageBody,
): o is { readonly HTML: string } {
  if (o && typeof o === "object") {
    if ("HTML" in o) return true;
  }
  return false;
}

export function isSmtpMessage(o: unknown): o is SmtpMessage {
  if (o && typeof o === "object" && "from" in o && "to" in o && "body" in o) {
    // deno-lint-ignore no-explicit-any
    if (isSmtpMessageBody((o as any).body)) return true;
  }
  return false;
}
