export const MAX_PHOTOS = 12;
export async function preparePhoto(file) {
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type))
    throw new Error("Choose JPEG, PNG, WebP or AVIF photos. Export HEIC photos as JPEG first.");
  if (file.size > 30 * 1024 * 1024) throw new Error("Each original photo must be under 30 MB.");
  const image = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 2400 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // Re-encoding removes location/camera EXIF metadata and limits upload size.
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob || blob.size > 2 * 1024 * 1024)
      throw new Error("This photo is too large after compression. Export a smaller JPEG.");
    const hash = [
      ...new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())),
    ]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    return {
      path: `assets/images/uploads/${hash}.jpg`,
      blob,
      name: file.name,
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    image.close();
  }
}
export async function encodePhoto(photo) {
  const bytes = new Uint8Array(await photo.blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return { path: photo.path, content: btoa(binary) };
}
