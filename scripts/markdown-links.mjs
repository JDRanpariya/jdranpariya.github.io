// Guessing bare domains misreads ordinary prose such as "M.Sc." as a URL.
// Keep automatic full-URL/email links and explicitly authored Markdown links.
export function explicitAutoLinks(md) {
  md.linkify.set({ fuzzyLink: false });
}
