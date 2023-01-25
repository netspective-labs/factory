// initComments({
//   node: document.getElementById("comment-section"),
//   defaultHomeserverUrl: "https://synapse.matrix.infra.medigy.com",
//   serverName: "synapse.matrix.infra.medigy.com",
//   siteName: "medigy-bzo-comments",
//   commentSectionId: "cactus-comments-gpm"
// })
const domainDetails = new URL(window.location.href);
const pageUrlslug = domainDetails.pathname.replace(/\//g, "-");
const commentSectionId = pageUrlslug;
initComments({
  node: document.getElementById("comment-section"),
  defaultHomeserverUrl: "https://synapse.matrix.infra.experimental.medigy.com",
  serverName: "synapse.matrix.infra.experimental.medigy.com",
  siteName: "devl-medigy",
  commentSectionId: commentSectionId,
});
