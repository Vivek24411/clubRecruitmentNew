import axios from "axios";

const TEN_MEGABYTES = 10 * 1024 * 1024;
const IMAGE_EDGE_LIMIT = 4096;

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Could not optimize this image")),
      type,
      quality,
    );
  });
}

async function optimizeImage(file, maxBytes) {
  if (file.size <= maxBytes) return file;

  const targetBytes = Math.max(maxBytes - 128 * 1024, 1);
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const initialScale = Math.min(1, IMAGE_EDGE_LIMIT / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * initialScale));
    let height = Math.max(1, Math.round(bitmap.height * initialScale));
    let quality = 0.92;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("Image optimization is not supported in this browser");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvasBlob(canvas, "image/webp", quality);
      if (blob.size <= targetBytes) {
        const name = file.name.replace(/\.[^.]+$/, "") || "banner";
        return new File([blob], `${name}.webp`, { type: "image/webp", lastModified: file.lastModified });
      }

      if (quality > 0.7) {
        quality -= 0.08;
      } else {
        const reduction = Math.min(0.9, Math.max(0.65, Math.sqrt(targetBytes / blob.size) * 0.94));
        width = Math.max(1, Math.round(width * reduction));
        height = Math.max(1, Math.round(height * reduction));
        quality = 0.82;
      }
    }

    throw new Error("This image could not be reduced below the upload provider's 10 MB limit");
  } catch (error) {
    if (error?.message?.includes("10 MB")) throw error;
    throw new Error("This image is larger than the provider limit and could not be optimized automatically");
  } finally {
    bitmap?.close?.();
  }
}

export async function uploadDirect(file, { role, kind }) {
  if (!file) return null;
  const { data } = await axios.post(`${import.meta.env.VITE_BASE_URI}/${role}/uploads/sign`, { kind });
  if (!data.success) throw new Error(data.msg || "Could not authorize upload");
  const config = data.upload;
  if (!config.mimeTypes.includes(file.type) || file.size > config.maxBytes) {
    throw new Error("This file type or size is not allowed");
  }
  const providerLimit = config.providerMaxBytes || Math.min(config.maxBytes, TEN_MEGABYTES);
  const uploadFile = config.resourceType === "image"
    ? await optimizeImage(file, providerLimit)
    : file;

  const form = new FormData();
  form.append("file", uploadFile);
  form.append("api_key", config.apiKey);
  form.append("timestamp", String(config.timestamp));
  form.append("signature", config.signature);
  form.append("folder", config.folder);
  form.append("public_id", config.publicId);
  form.append("allowed_formats", config.allowedFormats.join(","));
  const response = await fetch(config.uploadUrl, { method: "POST", body: form, credentials: "omit" });
  const uploaded = await response.json();
  if (!response.ok) throw new Error(uploaded?.error?.message || "File upload failed");

  return {
    uploadToken: config.uploadToken,
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    bytes: uploaded.bytes,
    format: uploaded.format,
    resourceType: uploaded.resource_type,
    version: uploaded.version,
    responseSignature: uploaded.signature,
    originalName: file.name,
    mimeType: uploadFile.type,
  };
}
