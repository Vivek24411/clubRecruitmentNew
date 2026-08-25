import { fetch } from 'expo/fetch';

const fallbackApiUrl = 'https://discovr-api.iitr.ac.in';
const studentWebOrigin = 'https://discovr.iitr.ac.in';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || fallbackApiUrl).replace(/\/$/, '');

let accessToken: string | null = null;

export function setApiAccessToken(token: string | null) {
  accessToken = token;
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null;
  timeoutMs?: number;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  // The currently deployed API expects an approved browser-style Origin on
  // anonymous mutations. Native clients have no automatic Origin, so send the
  // public student origin as a compatibility header until the mobile-aware
  // backend middleware is deployed.
  headers.set('Origin', studentWebOrigin);
  headers.set('X-Discovr-Client', 'mobile');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let body = options.body as BodyInit | null | undefined;
  if (body && !isForm && typeof body === 'object') {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, body, headers, signal: controller.signal });
    const payload = await response.json().catch(() => null) as ({ msg?: string; success?: boolean; errors?: { msg?: string }[] } & T) | null;
    if (!response.ok || payload?.success === false) {
      throw new ApiError(payload?.msg || payload?.errors?.[0]?.msg || `Request failed (${response.status})`, response.status, payload);
    }
    if (!payload) throw new ApiError('The server returned an empty response', response.status);
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new ApiError('The server took too long to respond', 408);
    throw new ApiError('Unable to reach Discovr. Check your connection and try again.', 0, error);
  } finally {
    clearTimeout(timeout);
  }
}
