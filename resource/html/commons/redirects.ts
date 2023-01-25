import * as govn from "../../governance.ts";
import * as c from "../../content/mod.ts";
import * as fm from "../../frontmatter/mod.ts";
import * as coll from "../../collection/mod.ts";
import * as r from "../../../route/mod.ts";
import * as html from "../mod.ts";

// TODO: redirects might also want to generate (yield) .htaccess files too?
//       right now we're generating only HTML but .htaccess would be nice too
//       so that the server would send back a proper HTTP redirect.
// See: https://gist.github.com/ScottPhillips/1721489
//      https://www.redhat.com/sysadmin/beginners-guide-redirects-htaccess

export function redirectResources(
  resourcesTree: r.TypicalRouteTree,
): coll.ResourcesFactoriesSupplier<c.HtmlResource> {
  return {
    resourcesFactories: async function* () {
      for (const aliasFor of resourcesTree.redirects) {
        const htmlFS: coll.ResourceFactorySupplier<c.HtmlResource> = {
          // deno-lint-ignore require-await
          resourceFactory: async () => {
            const redirectHTML: html.HtmlLayoutBodySupplier = (layout) => {
              const targetURL = layout.contentStrategy?.navigation.redirectUrl(
                aliasFor,
              ) ??
                "/no/layout.contentStrategy.navigation.redirectUrl/in/redirect.ts";
              return `<!DOCTYPE HTML>
              <html lang="en-US">
                  <head>
                      <meta charset="UTF-8">
                      <meta http-equiv="refresh" content="0; url=${targetURL}">
                      <script type="text/javascript">window.location.href = "${targetURL}"</script>
                      <title>Redirect to ${aliasFor.label}</title>
                  </head>
                  <body>
                      If you are not redirected automatically, follow <a href='${targetURL}'>${aliasFor.label}</a>.
                  </body>
              </html>`;
            };

            const redirectResource:
              & html.PersistableHtmlResource
              & fm.FrontmatterSupplier<fm.UntypedFrontmatter>
              & r.RouteSupplier
              & c.ModelSupplier<{ aliasFor: r.RedirectSupplier }>
              & govn.OriginationSupplier<
                {
                  isredirectResources: true;
                  importMetaUrl: string;
                  aliasFor: r.RedirectSupplier;
                }
              > = {
                nature: html.htmlContentNature,
                frontmatter: {
                  layout: {
                    identity: "lds/page/no-decoration",
                  },
                },
                model: { aliasFor },
                route: {
                  ...resourcesTree.routeFactory.childRoute(
                    { unit: html.indexUnitName, label: "Routes" },
                    aliasFor.route!, // the route for aliases is created in rtree.TypicalRouteTree
                    false,
                  ),
                  nature: html.htmlContentNature,
                },
                html: {
                  // deno-lint-ignore require-await
                  text: async (layout: html.HtmlLayout) => redirectHTML(layout),
                  textSync: redirectHTML,
                },
                origination: {
                  isredirectResources: true,
                  importMetaUrl: import.meta.url,
                  aliasFor,
                },
              };
            return redirectResource;
          },
        };
        yield htmlFS;
      }
    },
  };
}
