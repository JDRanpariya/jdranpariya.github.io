// Small, side-effect-free parser for the image rows emitted by the editor.
// The research homepage can render these without shipping a Markdown/YAML engine.
export function galleryItems(source) {
  const unescape = (value) => value.replace(/\\([\\\[\]"])/g, "$1");
  const items = [];
  for (const line of source.split(/\r?\n/)) {
    const match = line
      .trim()
      .match(/^!\[((?:\\.|[^\]\\])*)\]\(([^\s)]+)(?:\s+"((?:\\.|[^"\\])*)")?\)$/);
    if (!match || !/^(?:\/[^/]|https:\/\/)/.test(match[2])) continue;
    items.push({ src: match[2], alt: unescape(match[1]), caption: unescape(match[3] || "") });
  }
  return items;
}

export function galleryBlockAtCursor(source, cursor) {
  for (const match of source.matchAll(/^::: gallery\s*\n[\s\S]*?\n:::[ \t]*(?:\n|$)/gm)) {
    const start = match.index,
      end = start + match[0].length;
    if (cursor >= start && cursor <= end) return { start, end, items: galleryItems(match[0]) };
  }
  return null;
}
