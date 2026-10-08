// A portable Markdown component shared by Eleventy, research and their previews.
export function photoGallery(md) {
  md.block.ruler.before(
    "fence",
    "gallery",
    (state, start, end, silent) => {
      const line = (i) =>
        state.src.slice(state.bMarks[i] + state.tShift[i], state.eMarks[i]).trim();
      if (line(start) !== "::: gallery") return false;
      let close = start + 1;
      while (close < end && line(close) !== ":::") close++;
      if (close === end) return false;
      if (silent) return true;
      const oldParent = state.parentType,
        oldMax = state.lineMax;
      state.parentType = "container";
      state.lineMax = close;
      const open = state.push("container_gallery_open", "div", 1);
      open.block = true;
      open.map = [start, close + 1];
      state.md.block.tokenize(state, start + 1, close);
      const finish = state.push("container_gallery_close", "div", -1);
      finish.block = true;
      state.parentType = oldParent;
      state.lineMax = oldMax;
      state.line = close + 1;
      return true;
    },
    { alt: ["paragraph", "reference", "blockquote", "list"] }
  );
  md.renderer.rules.container_gallery_open = (tokens, i) => {
    const count = tokens[i].meta?.photoCount || 0;
    return count > 1
      ? `<div class="photo-gallery" role="region" aria-label="Photo gallery, ${count} photos" tabindex="0">\n`
      : '<div class="photo-gallery" role="group" aria-label="Photograph">\n';
  };
  md.renderer.rules.container_gallery_close = () => "</div>\n";
  md.core.ruler.after("inline", "photo-figures", (state) => {
    const galleries = [];
    state.tokens.forEach((token, i, tokens) => {
      if (token.type === "container_gallery_open") {
        token.meta = { photoCount: 0 };
        galleries.push(token);
      }
      if (token.type === "container_gallery_close") galleries.pop();
      if (token.type !== "inline") return;
      const children = (token.children || []).filter(
        (t) => t.type !== "softbreak" && !(t.type === "text" && !t.content.trim())
      );
      if (
        children.length === 1 &&
        children[0].type === "image" &&
        (galleries.length || children[0].attrGet("title"))
      ) {
        if (galleries.length) galleries.at(-1).meta.photoCount++;
        children[0].meta = { ...children[0].meta, figure: true };
        if (tokens[i - 1]?.type === "paragraph_open") tokens[i - 1].hidden = true;
        if (tokens[i + 1]?.type === "paragraph_close") tokens[i + 1].hidden = true;
      }
    });
  });
  const image =
    md.renderer.rules.image || ((tokens, i, opts, env, self) => self.renderToken(tokens, i, opts));
  md.renderer.rules.image = (tokens, i, opts, env, self) => {
    const token = tokens[i];
    if (!token.meta?.figure) return image(tokens, i, opts, env, self);
    const caption = token.attrGet("title");
    token.attrs = (token.attrs || []).filter(([name]) => name !== "title");
    const img = image(tokens, i, opts, env, self);
    return `<figure class="photo-figure">${img}${caption ? `<figcaption>${md.utils.escapeHtml(caption)}</figcaption>` : ""}</figure>\n`;
  };
}

export function galleryMarkdown(photos) {
  if (!photos.length) throw new Error("Choose at least one photo.");
  const escape = (value) =>
    String(value || "").replace(/[\\\[\]\"\n\r]/g, (c) => (/[\n\r]/.test(c) ? " " : `\\${c}`));
  const images = photos.map((photo) => {
    if (!photo.alt?.trim()) throw new Error("Describe each photo for readers who cannot see it.");
    if (
      !/^(?:https:\/\/jdranpariya\.com)?\/assets\/images\/[a-zA-Z0-9_./-]+\.(?:jpe?g|png|webp|avif)$/i.test(
        photo.src
      ) ||
      photo.src.includes("..")
    )
      throw new Error("Choose a photo from the media library.");
    return `![${escape(photo.alt.trim())}](${photo.src}${photo.caption?.trim() ? ` "${escape(photo.caption.trim())}"` : ""})`;
  });
  return `\n\n::: gallery\n${images.join("\n\n")}\n:::\n\n`;
}
