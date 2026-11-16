"use client";
// Shrinks a photo in the browser before upload: max 1600 px wide, JPEG.
// Keeps Supabase's free 1 GB of storage going a long way (a typical phone photo drops from ~4 MB to ~250 KB).
export async function compressImage(file, maxSide = 1600, quality = 0.8) {
  if (!/^image\//.test(file.type)) throw new Error("Please choose a photo (JPG, PNG or WebP).");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("This photo could not be read.")); i.src = url; });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", quality));
    if (!blob) throw new Error("This photo could not be prepared.");
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

export const blobToDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
