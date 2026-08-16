import axios from "axios";

export async function uploadDirect(file, { role, kind }) {
  if (!file) return null;
  const { data } = await axios.post(`${import.meta.env.VITE_BASE_URI}/${role}/uploads/sign`, { kind });
  if (!data.success) throw new Error(data.msg || "Could not authorize upload");
  const config = data.upload;
  if (!config.mimeTypes.includes(file.type) || file.size > config.maxBytes) {
    throw new Error("This file type or size is not allowed");
  }

  const form = new FormData();
  form.append("file", file);
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
    mimeType: file.type,
  };
}
