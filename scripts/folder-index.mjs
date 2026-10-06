export function folderChildren(items, inputPath, includeDrafts = false) {
  const parent = inputPath.replace(/^\.\//, "").replace(/\/index\.md$/, "");
  return items
    .filter((item) => {
      const path = item.inputPath.replace(/^\.\//, "");
      if (!item.url || path === inputPath.replace(/^\.\//, "")) return false;
      if (!includeDrafts && item.data.status === "draft") return false;
      // A nested folder is represented by its index; regular files are direct children.
      const container = path.replace(/\/index\.md$/, "").replace(/\/[^/]+$/, "");
      return container === parent;
    })
    .sort((a, b) => String(a.data.title || "").localeCompare(String(b.data.title || "")));
}

export function contentEntry(item, includeDrafts = false) {
  return (
    !item.data.folderIndex &&
    !item.data.standalonePage &&
    (includeDrafts || item.data.status !== "draft")
  );
}
