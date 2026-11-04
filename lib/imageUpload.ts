/**
 * Shrinks a phone photo before upload (long edge 1600 px, JPEG 80%) so it uploads quickly on a weak
 * connection and the printout stays readable. PDFs and small images are returned unchanged.
 */
export async function prepareImage(file: File, maxEdge = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size < 400 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // unsupported format (e.g. HEIC on some browsers): upload as is
  }
}

export const ACCEPTED_ATTACHMENTS = "image/jpeg,image/png,image/webp,application/pdf";
export const MAX_ATTACHMENT_MB = 8;
