import * as govn from "./governance.ts";

export type MailgunRegion = "us" | "eu";

export interface MailgunMessage extends govn.SmtpMessage {
  readonly testing?: boolean;
  readonly tracking?: boolean;
}

export interface MailgunClient {
  readonly apiKey: string;
  readonly domain: string;
  readonly region?: MailgunRegion;
  readonly apiEndpointHeaders: HeadersInit;
  readonly messagesApiEndpoint: string;
  readonly prepareMessage: (payload: govn.SmtpMessage) => MailgunMessage;
  readonly prepareBody: (message: MailgunMessage) => FormData;
  readonly send: (message: MailgunMessage) => Promise<Response>;
}

export function mailgunClient(
  config: Pick<MailgunClient, "apiKey" | "domain" | "region">,
): MailgunClient {
  const apiEndpointHeaders: HeadersInit = {
    Authorization: `Basic ${btoa(`api:${config.apiKey}`)}`,
  };

  const messagesApiEndpoint =
    typeof config.region !== "undefined" && config.region === "eu"
      ? `https://api.eu.mailgun.net/v3/${config.domain}/messages`
      : `https://api.mailgun.net/v3/${config.domain}/messages`;

  const prepareBody = (message: MailgunMessage) => {
    const body = new FormData();
    body.append("from", message.from);
    if (message.subject) body.append("subject", message.subject);
    body.append(
      "to",
      typeof message.to === "string"
        ? message.to
        : (message.to.length > 0 ? message.to[0] : "??"),
    );
    if (govn.isSmtpMessageBodyHTML(message.body)) {
      body.append("html", message.body.HTML);
    } else {
      if (typeof message.body === "string") {
        body.append("text", message.body);
      } else {
        body.append("text", message.body.text);
      }
    }

    if (message.testing) body.append("o:testmode", "yes");
    if (message.tracking) body.append("o:tracking", "yes");

    return body;
  };

  return {
    ...config,
    messagesApiEndpoint,
    apiEndpointHeaders,
    prepareMessage: (payload) => payload,
    prepareBody,
    send: async (message) => {
      return await fetch(messagesApiEndpoint, {
        method: "POST",
        headers: apiEndpointHeaders,
        body: prepareBody(message),
      });
    },
  };
}
