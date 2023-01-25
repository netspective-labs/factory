import * as eds from "../../html-email/mod.ts";
import * as c from "../../../text/color.ts";
import * as tt from "../../../text/transform-tags.ts";
import * as esc from "../../../text/escape.ts";

// https://github.com/TedGoas/Cerberus
// "AST" below refers to "abstract syntax tree"

interface EmailMessageLayout extends eds.HtmlEmailLayout {
  subject: string;
  backgroundColor: c.Color;
  width: string;
  bodyHtmlAstPrepared: boolean;
  visuallyHiddenPreheaderText?: string;
  header?: { imageURL: string } | { text: string; fontColor: c.Color };
  heroImageURL?: string;
  bodyHtmlAST?: tt.TaggedRootElement;
  footerHtmlAstNode?: tt.TaggedElement;
  postFooterHtmlAstNode?: tt.TaggedElement;
}

export class CerberusEmailDesignSystem<Layout extends EmailMessageLayout>
  extends eds.EmailDesignSystem<Layout> {
  constructor(
    readonly universalAssetsBaseURL: string,
  ) {
    super(
      "CerberusEmailDS",
      { moduleImportMetaURL: import.meta.url },
      new CerberusEmailDesignSystemLayouts(),
      "/cerberus",
      universalAssetsBaseURL,
    );
  }

  layout(
    body: eds.HtmlEmailLayoutBody | (() => eds.HtmlEmailLayoutBody),
    layoutSS: eds.HtmlEmailLayoutStrategySupplier<Layout>,
    context: eds.UntypedEmailDesignSystemContext,
  ): Layout {
    const result = {
      ...this.prepareLayout(body, layoutSS, context),
      backgroundColor: "#252525",
      width: "600px",
      bodyHtmlAstPrepared: false,
    } as unknown as Layout; // TODO: figure out why type-cast is required
    if (
      result.frontmatter && result.frontmatter.subject &&
      typeof result.frontmatter.subject === "string"
    ) {
      result.subject = result.frontmatter.subject;
      result.visuallyHiddenPreheaderText = result.subject;
    }
    if (
      result.frontmatter?.header &&
      typeof result.frontmatter.header === "object"
    ) {
      const headerFM = result.frontmatter.header as Record<string, string>;
      if ("image-url" in headerFM) {
        result.header = { imageURL: headerFM["image-url"] };
      }
      if ("text" in headerFM) {
        result.header = {
          text: headerFM.text,
          fontColor: headerFM.fontColor as c.Color ?? "#EFEFEF",
        };
      }
    }
    if (
      result.frontmatter?.hero &&
      typeof result.frontmatter.hero === "object"
    ) {
      const heroFM = result.frontmatter.hero as Record<string, string>;
      if ("image-url" in heroFM) {
        result.heroImageURL = heroFM["image-url"];
      }
    }
    return result;
  }
}

export class CerberusEmailDesignSystemLayouts<
  Layout extends EmailMessageLayout,
> extends eds.EmailDesignSystemLayouts<Layout> {
  constructor() {
    super({ layoutStrategy: fluid });
    this.layouts.set(fluid.identity, fluid);
  }
}

const prepareBodyHtmlAstIdempotent: eds.HtmlEmailPartial<EmailMessageLayout> = (
  layout,
  bodyHTML,
) => {
  if (layout.bodyHtmlAstPrepared) return "";
  const wfto = tt.wellFormedHtml5TagsParserOptions();
  layout.bodyHtmlAST = bodyHTML
    ? tt.parseWellFormedTags(bodyHTML, {
      ...wfto,
      registerElementNode: (element, parent) => {
        switch (element.tag) {
          case "p":
            break;
          case "h1":
            element.attributes.style =
              "margin: 0 0 10px 0; font-family: sans-serif; font-size: 25px; line-height: 30px; color: #333333; font-weight: normal;";
            break;
          case "h2":
            element.attributes.style =
              "margin: 0 0 10px 0; font-family: sans-serif; font-size: 18px; line-height: 22px; color: #333333; font-weight: bold;";
            break;
          case "button":
            if (
              element.children.length == 1 &&
              tt.isTaggedTextSupplier(element.children[0])
            ) {
              return {
                // deno-fmt-ignore
                text: `<!-- Button : BEGIN -->
                    <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: auto;">
                        <tr>
                            <td class="button-td button-td-primary" style="border-radius: 4px; background: ${layout.backgroundColor};">
                                <a class="button-a button-a-primary" href="${element.attributes.url}" style="background: ${layout.backgroundColor}; border: 1px solid #000000; font-family: sans-serif; font-size: 15px; line-height: 15px; text-decoration: none; padding: 13px 17px; color: #ffffff; display: block; border-radius: 4px;">${element.children[0].text}</a>
                            </td>
                        </tr>
                    </table>
                    <!-- Button : END -->`,
                originalText: element.children[0].text,
                level: element.children[0].level,
              };
            }
            break;
          case "ul":
            element.attributes.style =
              "padding: 0; margin: 0 0 10px 0; list-style-type: disc;";
            break;
          case "li":
            element.attributes.style = "margin: 0 0 10px 30px;";
            break;
          case "div":
            if (element.attributes.class == "md") {
              // "eat" the markdown <div class="md">, usually the top-level but keep the children
              parent.children.push(...element.children);
              return undefined;
            }
            if (element.attributes.class == "two-captioned-images") {
              return {
                // deno-fmt-ignore
                text: `<!-- 2 Even Columns : BEGIN -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                          <td valign="top" width="50%">
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tr>
                                      <td style="text-align: center; padding: 0 10px;">
                                          <img src="${element.attributes["image-url-left"]}" width="200" height="" alt="alt_text" border="0" style="width: 100%; max-width: 200px; background: #dddddd; font-family: sans-serif; font-size: 15px; line-height: 15px; color: #555555;">
                                      </td>
                                  </tr>
                                  <tr>
                                      <td style="text-align: left; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #555555; padding: 10px 10px 0;">
                                          <p style="margin: 0;">${element.attributes["image-caption-left"]}</p>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                          <td valign="top" width="50%">
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tr>
                                      <td style="text-align: center; padding: 0 10px;">
                                          <img src="${element.attributes["image-url-right"]}" width="200" height="" alt="alt_text" border="0" style="width: 100%; max-width: 200px; background: #dddddd; font-family: sans-serif; font-size: 15px; line-height: 15px; color: #555555;">
                                      </td>
                                  </tr>
                                  <tr>
                                      <td style="text-align: left; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #555555; padding: 10px 10px 0;">
                                          <p style="margin: 0;">${element.attributes["image-caption-right"]}</p>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>
                  </table>
                  <!-- 2 Even Columns : END -->`,
                originalText: "",
                level: element.level,
              };
            }
            break;
          case "header":
            // remove the header from the body and override the frontmatter
            layout.header = {
              text: tt.emitElementText(element),
              fontColor: "#EFEFEF",
            };
            return undefined;
          case "footer":
            // remove the footer from the body and stash for use by template
            if (element.attributes.post) {
              layout.postFooterHtmlAstNode = element;
            } else {
              layout.footerHtmlAstNode = element;
            }
            return undefined;
          case "spacer":
            return {
              text:
                `</td></tr></table></td></tr> <!-- close previous content -->
                <!-- Clear Spacer : BEGIN -->
                <tr>
                    <td aria-hidden="true" height="40" style="font-size: 0px; line-height: 0px;">
                        &nbsp;
                    </td>
                </tr>
                <!-- Clear Spacer : END -->
                <tr><td> <!-- start new content -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="background-color: #ffffff;" class="darkmode-bg">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="padding: 20px; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #555555;">
                `,
              originalText: "",
              level: element.level,
            };
        }
        return element;
      },
    })
    : undefined;
  layout.bodyHtmlAstPrepared = true;
  return "<!-- layout.bodyHtmlAST prepared -->";
};

const fluidBody: eds.HtmlEmailPartial<EmailMessageLayout> = (
  layout,
  bodyHTML,
) => {
  prepareBodyHtmlAstIdempotent(layout, bodyHTML);
  const { bodyHtmlAST: ast } = layout;
  if (ast) {
    if (ast.isValid) {
      // deno-fmt-ignore
      return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding: 20px; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #555555;">
                ${tt.emitElementText(ast)}
                </td>
            </tr>
        </table>`
    } else {
      console.log(ast);
      return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
            <td style="padding: 20px; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #555555;">
                <h1 style="margin: 0 0 10px 0; font-family: sans-serif; font-size: 25px; line-height: 30px; color: #333333; font-weight: normal;">
                  ${ast.error}
                </h1>
                <pre>${esc.escapeHtmlCustom(bodyHTML ?? "")}</pre>
            </td>
        </tr>
        </table>`;
    }
  } else {
    return `<!-- no bodyHTML AST -->`;
  }
};

// deno-fmt-ignore
const fluid = eds.emailDesignSystemTemplate<EmailMessageLayout>("cerberus-eds/fluid", { moduleImportMetaURL: import.meta.url })`<!DOCTYPE html>
${prepareBodyHtmlAstIdempotent} <!-- do this as early as possible so all partials have state -->
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" ${(layout) => layout.origin.dataAttrs(layout, import.meta.url, "smartNavigationPage")}>
<head>
    <meta charset="utf-8"> <!-- utf-8 works for most cases -->
    <meta name="viewport" content="width=device-width"> <!-- Forcing initial-scale shouldn't be necessary -->
    <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!-- Use the latest (edge) version of IE rendering engine -->
    <meta name="x-apple-disable-message-reformatting">  <!-- Disable auto-scale in iOS 10 Mail entirely -->
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no"> <!-- Tell iOS not to automatically link certain text strings. -->
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title></title> <!-- The title tag shows in email notifications, like Android 4.4. -->

    <!-- What it does: Makes background images in 72ppi Outlook render at correct size. -->
    <!--[if gte mso 9]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->

    <!-- Web Font / @font-face : BEGIN -->
    <!-- NOTE: If web fonts are not required, lines 23 - 41 can be safely removed. -->

    <!-- Desktop Outlook chokes on web font references and defaults to Times New Roman, so we force a safe fallback font. -->
    <!--[if mso]>
        <style>
            * {
                font-family: sans-serif !important;
            }
        </style>
    <![endif]-->

    <!-- All other clients get the webfont reference; some will render the font and others will silently fail to the fallbacks. More on that here: https://web.archive.org/web/20190717120616/http://stylecampaign.com/blog/2015/02/webfont-support-in-email/ -->
    <!--[if !mso]><!-->
    <!-- insert web font reference, eg: <link href='https://fonts.googleapis.com/css?family=Roboto:400,700' rel='stylesheet' type='text/css'> -->
    <!--<![endif]-->

    <!-- Web Font / @font-face : END -->

    <!-- CSS Reset : BEGIN -->
    <style>

        /* What it does: Tells the email client that only light styles are provided but the client can transform them to dark. A duplicate of meta color-scheme meta tag above. */
        :root {
          color-scheme: light;
          supported-color-schemes: light;
        }

        /* What it does: Remove spaces around the email design added by some email clients. */
        /* Beware: It can remove the padding / margin and add a background color to the compose a reply window. */
        html,
        body {
            margin: 0 auto !important;
            padding: 0 !important;
            height: 100% !important;
            width: 100% !important;
        }

        /* What it does: Stops email clients resizing small text. */
        * {
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%;
        }

        /* What it does: Centers email on Android 4.4 */
        div[style*="margin: 16px 0"] {
            margin: 0 !important;
        }

        /* What it does: forces Samsung Android mail clients to use the entire viewport */
        #MessageViewBody, #MessageWebViewDiv{
            width: 100% !important;
        }

        /* What it does: Stops Outlook from adding extra spacing to tables. */
        table,
        td {
            mso-table-lspace: 0pt !important;
            mso-table-rspace: 0pt !important;
        }

        /* What it does: Fixes webkit padding issue. */
        table {
            border-spacing: 0 !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            margin: 0 auto !important;
        }

        /* What it does: Uses a better rendering method when resizing images in IE. */
        img {
            -ms-interpolation-mode:bicubic;
        }

        /* What it does: Prevents Windows 10 Mail from underlining links despite inline CSS. Styles for underlined links should be inline. */
        a {
            text-decoration: none;
        }

        /* What it does: A work-around for email clients meddling in triggered links. */
        a[x-apple-data-detectors],  /* iOS */
        .unstyle-auto-detected-links a,
        .aBn {
            border-bottom: 0 !important;
            cursor: default !important;
            color: inherit !important;
            text-decoration: none !important;
            font-size: inherit !important;
            font-family: inherit !important;
            font-weight: inherit !important;
            line-height: inherit !important;
        }

        /* What it does: Prevents Gmail from displaying a download button on large, non-linked images. */
        .a6S {
            display: none !important;
            opacity: 0.01 !important;
        }

        /* What it does: Prevents Gmail from changing the text color in conversation threads. */
        .im {
            color: inherit !important;
        }

        /* If the above doesn't work, add a .g-img class to any image in question. */
        img.g-img + div {
            display: none !important;
        }

        /* What it does: Removes right gutter in Gmail iOS app: https://github.com/TedGoas/Cerberus/issues/89  */
        /* Create one of these media queries for each additional viewport size you'd like to fix */

        /* iPhone 4, 4S, 5, 5S, 5C, and 5SE */
        @media only screen and (min-device-width: 320px) and (max-device-width: 374px) {
            u ~ div .email-container {
                min-width: 320px !important;
            }
        }
        /* iPhone 6, 6S, 7, 8, and X */
        @media only screen and (min-device-width: 375px) and (max-device-width: 413px) {
            u ~ div .email-container {
                min-width: 375px !important;
            }
        }
        /* iPhone 6+, 7+, and 8+ */
        @media only screen and (min-device-width: 414px) {
            u ~ div .email-container {
                min-width: 414px !important;
            }
        }

    </style>
    <!-- CSS Reset : END -->

    <!-- Progressive Enhancements : BEGIN -->
    <style>
	    /* What it does: Hover styles for buttons */
	    .button-td,
	    .button-a {
	        transition: all 100ms ease-in;
	    }
	    .button-td-primary:hover,
	    .button-a-primary:hover {
	        background: #555555 !important;
	        border-color: #555555 !important;
	    }

	    /* Media Queries */
	    @media screen and (max-width: ${(layout) => layout.width}) {

	        /* What it does: Adjust typography on small screens to improve readability */
	        .email-container p {
	            font-size: 17px !important;
	        }

	    }

      /* Dark Mode Styles : BEGIN */
      @media (prefers-color-scheme: dark) {
        .email-bg {
          background: #111111 !important;
        }
        .darkmode-bg {
            background: ${(layout) => layout.backgroundColor} !important;
        }
        h1,
        h2,
        h3,
        p,
        li,
        .darkmode-text,
        .email-container a:not([class]) {
          color: #F7F7F9 !important;
        }
        td.button-td-primary,
        td.button-td-primary a {
          background: #ffffff !important;
          border-color: #ffffff !important;
          color: ${(layout) => layout.backgroundColor} !important;
        }
        td.button-td-primary:hover,
        td.button-td-primary a:hover {
          background: #cccccc !important;
          border-color: #cccccc !important;
        }
        .footer td {
          color: #aaaaaa !important;
        }
        .darkmode-fullbleed-bg {
            background-color: #0F3016 !important;
        }
		}
    /* Dark Mode Styles : END */
    </style>
    <!-- Progressive Enhancements : END -->

</head>
<!--
	The email background color (${(layout) => layout.backgroundColor}) is defined in three places:
	1. body tag: for most email clients
	2. center tag: for Gmail and Inbox mobile apps and web versions of Gmail, GSuite, Inbox, Yahoo, AOL, Libero, Comcast, freenet, Mail.ru, Orange.fr
	3. mso conditional: For Windows 10 Mail
-->
<body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: ${(layout) => layout.backgroundColor};" class="email-bg">
	<center role="article" aria-roledescription="email" lang="en" style="width: 100%; background-color: ${(layout) => layout.backgroundColor};" class="email-bg">
    <!--[if mso | IE]>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${(layout) => layout.backgroundColor};" class="email-bg">
    <tr>
    <td>
    <![endif]-->
        ${(layout) => layout.visuallyHiddenPreheaderText ? `<!-- Visually Hidden Preheader Text : BEGIN -->
        <div style="max-height:0; overflow:hidden; mso-hide:all;" aria-hidden="true">
            ${layout.visuallyHiddenPreheaderText}
        </div>
        <!-- Visually Hidden Preheader Text : END -->
        <!-- Create white space after the desired preview text so email clients don’t pull other distracting text into the inbox preview. Extend as necessary. -->
        <!-- Preview Text Spacing Hack : BEGIN -->
        <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
	        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
        </div>
        <!-- Preview Text Spacing Hack : END -->` : '<!-- no Visually Hidden Preheader Text -->'}

        <!--
            Set the email width. Defined in two places:
            1. max-width for all clients except Desktop Windows Outlook, allowing the email to squish on narrow but never go wider than ${(layout) => layout.width}.
            2. MSO tags for Desktop Windows Outlook enforce a ${(layout) => layout.width} width.
        -->
        <div style="max-width: ${(layout) => layout.width}; margin: 0 auto;" class="email-container">
            <!--[if mso]>
            <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600">
            <tr>
            <td>
            <![endif]-->

	        <!-- Email Body : BEGIN -->
	        <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto;">
            ${(layout) => layout.header ? `<!-- Email Header : BEGIN -->
                <tr>
                    <td style="padding: 20px 0; text-align: center">
                      ${'imageURL' in layout.header ? `<img src="${layout.header.imageURL}" width="200" height="50" alt="alt_text" border="0" style="height: auto; background: #dddddd; font-family: sans-serif; font-size: 15px; line-height: 15px; color: #555555;">` : `<span style="color:${layout.header.fontColor}">${layout.header.text}</span>` }
                    </td>
                </tr>
                <!-- Email Header : END -->` : '<!-- no header -->'}
            ${(layout) => layout.heroImageURL ? `<!-- Hero Image, Flush : BEGIN -->
                <tr>
                    <td style="background-color: #ffffff;" class="darkmode-bg">
                        <img src="${layout.heroImageURL}" width="600" height="" alt="alt_text" border="0" style="width: 100%; max-width: ${layout.width}; height: auto; background: #dddddd; font-family: sans-serif; font-size: 15px; line-height: 15px; color: #555555; margin: auto; display: block;" class="g-img">
                    </td>
                </tr>
                <!-- Hero Image, Flush : END -->` : '<!-- no hero image -->'}

                <!-- 1 Column body : BEGIN -->
                <tr>
                    <td style="background-color: #ffffff;" class="darkmode-bg">
                        ${fluidBody}
                    </td>
                </tr>
                <!-- 1 Column body : END -->
            </table>
            <!-- Email Body : END -->

            ${(layout) => layout.footerHtmlAstNode ? `<!-- Email Footer : BEGIN -->
            <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto;" class="footer">
                <tr>
                    <td style="padding: 20px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #ffffff;">
                        <webversion style="color: #ffffff; text-decoration: underline; font-weight: bold;">View as a Web Page</webversion>
                        <br><br>
						            ${tt.emitElementText(layout.footerHtmlAstNode)}
                        <br><br>
                        <unsubscribe style="color: #ffffff; text-decoration: underline;">unsubscribe</unsubscribe>
                    </td>
                </tr>
            </table>
            <!-- Email Footer : END -->` : '<!-- layout.footerHtmlAstNode -->'}

            <!--[if mso]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </div>

        ${(layout) => layout.postFooterHtmlAstNode ? `<!-- "P.S" or footer postscript, full bleed background section : BEGIN -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #709f2b;" class="darkmode-fullbleed-bg">
            <tr>
                <td>
                    <div align="center" style="max-width: ${layout.width}; margin: auto;" class="email-container">
                        <!--[if mso]>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center">
                        <tr>
                        <td>
                        <![endif]-->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td style="padding: 20px; text-align: left; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #ffffff;">
                                    ${tt.emitElementText(layout.postFooterHtmlAstNode)}
                                </td>
                            </tr>
                        </table>
                        <!--[if mso]>
                        </td>
                        </tr>
                        </table>
                        <![endif]-->
                    </div>
                </td>
            </tr>
        </table>
        <!-- "P.S" or footer postscript, full bleed background section : END -->` : '<!-- layout.postFooterHtmlAstNode -->'}

    <!--[if mso | IE]>
    </td>
    </tr>
    </table>
    <![endif]-->
    </center>
</body>
</html>`;
