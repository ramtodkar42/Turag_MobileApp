import { sha256 } from 'js-sha256';
import { BACKEND_URL, UPLOAD_TIMEOUT_MS } from './config';
import { ApiError, ERROR_CODES } from './client';
import { tNow } from '../i18n';

// File helpers for evidence uploads (photos / documents).
// The backend needs the exact byte size and SHA-256 of a file before it hands
// out an upload target, then the bytes are PUT straight to that target.

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Uint8Array(256);
for (let i = 0; i < BASE64.length; i += 1) {
  LOOKUP[BASE64.charCodeAt(i)] = i;
}

// base64 -> bytes (no atob dependency; works on every Hermes version).
/* eslint-disable no-bitwise -- base64 decoding works on bits */
export const base64ToBytes = base64 => {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = LOOKUP[clean.charCodeAt(i)];
    const b = LOOKUP[clean.charCodeAt(i + 1)];
    const c = LOOKUP[clean.charCodeAt(i + 2)];
    const d = LOOKUP[clean.charCodeAt(i + 3)];
    bytes[p++] = (a << 2) | (b >> 4);
    if (i + 2 < clean.length) {
      bytes[p++] = ((b & 15) << 4) | (c >> 2);
    }
    if (i + 3 < clean.length) {
      bytes[p++] = ((c & 3) << 6) | d;
    }
  }
  return bytes.subarray(0, p);
};
/* eslint-enable no-bitwise */

const blobToBytes = blob =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(base64ToBytes(result.slice(result.indexOf(',') + 1)));
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(blob);
  });

// A picked / captured file -> { blob, byteSize, checksum (sha256 hex), contentType }.
// file: { uri, type?, fileName? } (image picker / camera result).
export const readFileForUpload = async file => {
  const uri = file.uri.startsWith('/') ? `file://${file.uri}` : file.uri;
  const blob = await (await fetch(uri)).blob();
  const bytes = await blobToBytes(blob);
  return {
    blob,
    byteSize: bytes.length,
    checksum: sha256(bytes),
    contentType: file.type || blob.type || 'image/jpeg',
  };
};

// The local backend returns relative targets ("/api/v1/media/dev-upload?..."):
// they live on the backend we already talk to.
const absolute = url => (url.startsWith('/') ? `${BACKEND_URL}${url}` : url);

// PUT the bytes to the upload target the backend handed out (it carries its
// own authorisation; no Bearer token).
export const putToUploadTarget = async (target, blob) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(absolute(target.url), {
      method: target.method || 'PUT',
      headers: target.headers ?? {},
      body: blob,
      signal: controller.signal,
    });
  } catch {
    const timedOut = controller.signal.aborted;
    throw new ApiError({
      code: timedOut ? ERROR_CODES.TIMEOUT : ERROR_CODES.NETWORK,
      message: tNow(timedOut ? 'errors.timeout' : 'errors.network'),
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new ApiError({ status: res.status, message: tNow('valuation.upload.failed') });
  }
};

// A unique id per captured file, so a retried request never creates two assets.
export const newClientAssetId = () =>
  `ca_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
