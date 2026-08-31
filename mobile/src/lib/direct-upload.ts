import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { apiRequest } from '@/lib/api';

export type LocalUpload = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

type UploadConfig = {
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  resourceType: string;
  deliveryType?: 'upload' | 'authenticated';
  uploadUrl: string;
  maxBytes: number;
  maxBytesByMimeType?: Record<string, number>;
  mimeTypes: string[];
  allowedFormats: string[];
  uploadToken: string;
};

export type DirectAsset = {
  uploadToken: string;
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  resourceType: string;
  version: number;
  responseSignature: string;
  originalName: string;
  mimeType: string;
};

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export async function uploadDirect(file: LocalUpload, kind: 'profilePicture' | 'submission'): Promise<DirectAsset> {
  const signed = await apiRequest<{ success: boolean; upload: UploadConfig }>('/student/uploads/sign', {
    method: 'POST', body: { kind },
  });
  const config = signed.upload;
  if (!config.mimeTypes.includes(file.mimeType)) throw new Error('This file type is not allowed.');

  const blob = new File(file.uri);
  const maxBytes = config.maxBytesByMimeType?.[file.mimeType] || config.maxBytes;
  if (blob.size > maxBytes) throw new Error(`This file must be smaller than ${formatBytes(maxBytes)}.`);

  const form = new FormData();
  form.append('file', blob, file.name);
  form.append('api_key', config.apiKey);
  form.append('timestamp', String(config.timestamp));
  form.append('signature', config.signature);
  form.append('folder', config.folder);
  form.append('public_id', config.publicId);
  form.append('allowed_formats', config.allowedFormats.join(','));
  if (config.deliveryType && config.deliveryType !== 'upload') form.append('type', config.deliveryType);

  const response = await fetch(config.uploadUrl, { method: 'POST', body: form });
  const uploaded = await response.json() as {
    secure_url?: string; public_id?: string; bytes?: number; format?: string;
    resource_type?: string; version?: number; signature?: string; error?: { message?: string };
  };
  if (!response.ok || !uploaded.secure_url || !uploaded.public_id) {
    throw new Error(uploaded.error?.message || 'File upload failed.');
  }
  return {
    uploadToken: config.uploadToken,
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    bytes: uploaded.bytes || blob.size,
    format: uploaded.format || '',
    resourceType: uploaded.resource_type || config.resourceType,
    version: uploaded.version || 0,
    responseSignature: uploaded.signature || '',
    originalName: file.name,
    mimeType: file.mimeType,
  };
}
