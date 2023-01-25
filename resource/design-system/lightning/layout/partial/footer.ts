import * as html from "../../../../html/mod.ts";
import * as ldsGovn from "../../governance.ts";
import * as git from "../../../../../git/mod.ts";
import * as ws from "../../../../../workspace/mod.ts";

export const footerFixedCopyrightBuildPartial: ldsGovn.LightningPartial = (
  layout,
) => {
  let gitBranch: string | undefined;
  let remoteAsset: html.GitRemoteAnchor | undefined;
  let remoteCommit:
    | git.GitRemoteCommit<"hash" | "authorName" | "subject">
    | undefined;
  let changelogReportHref: string | undefined;
  const buildStatusHTML = layout.contentStrategy.mGitResolvers
    ?.cicdBuildStatusHTML?.(layout);
  if (layout.contentStrategy.git) {
    const cached = layout.contentStrategy.git.cached;
    gitBranch = cached.currentBranch || "??";
    remoteCommit = cached.mostRecentCommit
      ? layout.contentStrategy.mGitResolvers?.remoteCommit(
        cached.mostRecentCommit,
        layout.contentStrategy.git,
      )
      : undefined;
    remoteAsset = layout.activeRoute
      ? layout.contentStrategy.routeGitRemoteResolver?.(
        layout.activeRoute,
        gitBranch,
        layout.contentStrategy.git,
      )
      : undefined;
    changelogReportHref = cached.mostRecentCommit
      ? layout.contentStrategy.mGitResolvers?.changelogReportAnchorHref?.(
        cached.mostRecentCommit,
      )
      : undefined;
  }
  let wsAsset: ws.WorkspaceEditorTarget | undefined;
  if (layout.activeRoute) {
    wsAsset = layout.contentStrategy.wsEditorRouteResolver?.(
      layout.activeRoute,
    );
  }
  // we hide the footer using display:none and then stickyFooter() in universal-cc/script/typical-aft.js will display it in the proper place
  // deno-fmt-ignore
  return `<footer class="footer font-size-medium slds-no-print" style="position: absolute; bottom: 0; height: 60px; margin-top: 40px; width: 100%; display:none;">
    <div class="slds-container_x-large slds-container_center slds-p-left_small slds-p-right_small">
      <article class="slds-text-align_center slds-p-top_small slds-p-bottom_large">
        <p class="slds-text-body_small">© 1997-<script>document.write(new Date().getFullYear())</script> Netspective Media LLC. All Rights Reserved.</p>
        <p class="slds-text-body_small">
          Publication created <span is="time-ago" date="${layout.contentStrategy.renderedAt}"/>
          ${remoteCommit ? ` (${changelogReportHref ? `<a href="${changelogReportHref}" class="git-changelog">triggered</a>`: 'triggered'} by <a href="${remoteCommit.remoteURL}" class="git-remote-commit" title="${remoteCommit.commit.subject}">${remoteCommit.commit.authorName}</a>)` : ''}
          ${buildStatusHTML ?? "<!-- no layout.contentStrategy.mGitResolvers -->"}
        </p>
        <p class="slds-text-body_small">
        ${remoteAsset
          ? `📄 <a href="${remoteAsset.href}" title="${remoteAsset.assetPathRelToWorkTree}" class="git-remote-object">${remoteAsset.textContent}</a>`
          : `<!-- no git remote -->`}
        ${layout.activeRoute?.terminal?.lastModifiedAt
          ? `modified <span is="time-ago" date="${layout.activeRoute?.terminal?.lastModifiedAt}" title="${layout.activeRoute?.terminal?.lastModifiedAt}"/>`
          : '<!-- no layout.activeRoute?.terminal?.lastModifiedAt -->'}
        ${wsAsset?.openInWorkspaceHTML ? ` (🧑‍💻 ${wsAsset.openInWorkspaceHTML("workspace-editor-target")})` : "<!-- workspace editor not resolved -->"}
        ${layout.contentStrategy.git ? ` 🌲 ${gitBranch}` : "<!-- not in Git work tree -->"}
        <div id="rf-universal-footer-experimental-server-workspace" style="display:none">Should only be displayed and dynamically populated if running in "experimental server" operational context.</div>
        </p>
      </article>
    </div>
  </footer>`;
};
