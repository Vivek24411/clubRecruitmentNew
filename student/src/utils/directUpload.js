import axios from "axios";

const MEGABYTE = 1024 * 1024;
const SUBMISSION_IMAGE_SOURCE_LIMIT = 25 * MEGABYTE;
const SUBMISSION_IMAGE_TARGET = 8 * MEGABYTE;
const IMAGE_EDGE_LIMIT = 4096;
const IMAGE_PIXEL_TARGET = 20_000_000;

function formatLimit(bytes) {
  return `${Math.round(bytes / MEGABYTE)} MB`;
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Could not optimize this image")),
      type,
      quality,
    );
  });
}

async function optimizeSubmissionImage(file, uploadLimit) {
  if (file.size > SUBMISSION_IMAGE_SOURCE_LIMIT) {
    throw new Error(`Images may be up to ${formatLimit(SUBMISSION_IMAGE_SOURCE_LIMIT)} before optimization`);
  }
  if (typeof createImageBitmap !== "function") {
    if (file.size <= uploadLimit) return file;
    throw new Error("This browser cannot optimize an image above Cloudinary's 10 MB limit");
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const pixelScale = Math.sqrt(IMAGE_PIXEL_TARGET / (bitmap.width * bitmap.height));
    const initialScale = Math.min(1, IMAGE_EDGE_LIMIT / Math.max(bitmap.width, bitmap.height), pixelScale);
    const needsOptimization = file.size > SUBMISSION_IMAGE_TARGET || initialScale < 1;
    if (!needsOptimization && file.size <= uploadLimit) return file;

    const targetBytes = Math.min(SUBMISSION_IMAGE_TARGET, uploadLimit - 128 * 1024);
    let width = Math.max(1, Math.round(bitmap.width * initialScale));
    let height = Math.max(1, Math.round(bitmap.height * initialScale));
    let quality = 0.9;

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
        const name = file.name.replace(/\.[^.]+$/, "") || "submission-image";
        return new File([blob], `${name}.webp`, { type: "image/webp", lastModified: file.lastModified });
      }
      if (quality > 0.66) quality -= 0.08;
      else {
        const reduction = Math.min(0.9, Math.max(0.65, Math.sqrt(targetBytes / blob.size) * 0.94));
        width = Math.max(1, Math.round(width * reduction));
        height = Math.max(1, Math.round(height * reduction));
        quality = 0.82;
      }
    }
    throw new Error("This image could not be reduced below Cloudinary's 10 MB limit");
  } catch (error) {
    if (error?.message?.includes("Cloudinary") || error?.message?.includes("optimization")) throw error;
    throw new Error("This image could not be read or optimized in your browser");
  } finally {
    bitmap?.close?.();
  }
}

function uploadLimit(config, mimeType) {
  return Number(config.maxBytesByMimeType?.[mimeType]) || Number(config.maxBytes);
}

export async function uploadDirect(file, { role, kind }) {
  if (!file) return null;
  const { data } = await axios.post(`${import.meta.env.VITE_BASE_URI}/${role}/uploads/sign`, { kind });
  if (!data.success) throw new Error(data.msg || "Could not authorize upload");
  const config = data.upload;
  if (!config.mimeTypes.includes(file.type)) {
    throw new Error("This file type is not allowed");
  }

  const limit = uploadLimit(config, file.type);
  const uploadFile = kind === "submission" && file.type.startsWith("image/")
    ? await optimizeSubmissionImage(file, limit)
    : file;
  const finalLimit = uploadLimit(config, uploadFile.type);
  if (uploadFile.size > finalLimit) {
    throw new Error(`${file.type === "application/pdf" ? "PDFs" : "Videos"} may be up to ${formatLimit(finalLimit)}`);
  }

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
