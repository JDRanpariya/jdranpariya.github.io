const DRAFT_KEY = "site-admin-drafts-v1";
const LAYOUT_KEY = "site-admin-layout-v2";
export const defaultLayout = { filesWidth: 260, ratio: 0.5, hidden: [], folders: {}, order: [] };
export function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch {
    return fallback;
  }
}
export function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
export function readDrafts() {
  return readJSON(DRAFT_KEY, {});
}
export function saveDraft(path, content, sha) {
  writeJSON(DRAFT_KEY, {
    ...readDrafts(),
    [path]: { content, sha: sha || null, updatedAt: new Date().toISOString() },
  });
}
export function forgetDraft(path) {
  const drafts = readDrafts();
  delete drafts[path];
  writeJSON(DRAFT_KEY, drafts);
}
export function readLayout() {
  const saved = readJSON(LAYOUT_KEY, {});
  return {
    ...defaultLayout,
    filesWidth: Math.max(180, Math.min(420, Number(saved.filesWidth) || 260)),
    ratio: Math.max(0.25, Math.min(0.75, Number(saved.ratio) || 0.5)),
    hidden: Array.isArray(saved.hidden)
      ? [...new Set(saved.hidden)]
          .filter((p) => ["files", "edit", "preview"].includes(p))
          .slice(0, 2)
      : [],
    folders: saved.folders && typeof saved.folders === "object" ? saved.folders : {},
    order: Array.isArray(saved.order) ? saved.order : [],
  };
}
export function saveLayout(value) {
  writeJSON(LAYOUT_KEY, value);
}

function mediaDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("site-admin-media-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos", { keyPath: "path" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Photo storage is unavailable. Keep the original files."));
  });
}
export async function storedPhotos() {
  const db = await mediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos");
    const request = tx.objectStore("photos").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}
export async function storePhoto(photo) {
  const db = await mediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").put(photo);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(new Error("Could not save the photo draft. Keep the original files."));
    };
  });
}
