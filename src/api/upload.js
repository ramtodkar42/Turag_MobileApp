import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import { sha256 } from 'js-sha256';
import { BACKEND_URL, UPLOAD_TIMEOUT_MS } from './config';
import { ApiError, ERROR_CODES } from './client';
import { tNow } from '../i18n';

// File helpers for evidence uploads (photos / documents / videos).
// The backend needs the exact byte size and SHA-256 of a file before it hands
// out an upload target, then the bytes are PUT straight to that target.
//
// Photos and documents (a few MB) are read into memory and hashed here. A video
// (a 2-minute walkaround is tens of MB) must never be: holding it whole ran the
// phone out of memory. Its size + SHA-256 come from the native side, read 1 MB at
// a time (TuragFile.digest), and the PUT sends it straight from the file.

export const FILE_UNREADABLE = 'FILE_UNREADABLE';
const unreadable = () => new ApiError({ code: FILE_UNREADABLE, message: tNow('valuation.upload.readFailed') });

const fileUri = uri => (uri.startsWith('/') ? `file://${uri}` : uri);

// Whether this build has the native part that reads a file in pieces.
export const canStreamFiles = () => typeof NativeModules.TuragFile?.digest === 'function';

// A big file -> { uri, byteSize, checksum (sha256 hex), contentType }, without
// ever loading it into memory. Needs canStreamFiles().
export const fileInfoForUpload = async file => {
  const uri = fileUri(file.uri);
  let digest;
  try {
    digest = await NativeModules.TuragFile.digest(uri);
  } catch {
    throw unreadable();
  }
  return { uri, byteSize: Number(digest.size), checksum: digest.sha256, contentType: file.type || 'video/mp4' };
};

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
// A file that can't be read on the phone says so (React Native reports any failure
// of this local read as "Network request failed", which isn't what happened).
export const readFileForUpload = async file => {
  const uri = fileUri(file.uri);
  let blob;
  let bytes;
  try {
    blob = await (await fetch(uri)).blob();
    bytes = await blobToBytes(blob);
  } catch {
    throw unreadable();
  }
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

// The storage refused the bytes (its HTTP status is on the error, e.g. 413: too big).
export const UPLOAD_REFUSED = 'UPLOAD_REFUSED';

const uploadRefused = status => new ApiError({ status, code: UPLOAD_REFUSED, message: tNow('valuation.upload.failed') });
const uploadNetworkError = timedOut =>
  new ApiError({
    code: timedOut ? ERROR_CODES.TIMEOUT : ERROR_CODES.NETWORK,
    message: tNow(timedOut ? 'errors.timeout' : 'errors.network'),
  });

// PUT the bytes to the upload target the backend handed out (it carries its
// own authorisation; no Bearer token).
export const putToUploadTarget = async (target, blob, timeoutMs = UPLOAD_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(absolute(target.url), {
      method: target.method || 'PUT',
      headers: target.headers ?? {},
      body: blob,
      signal: controller.signal,
    });
  } catch {
    throw uploadNetworkError(controller.signal.aborted);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw uploadRefused(res.status);
  }
};

// The same PUT, straight from the file (info from fileInfoForUpload), so the bytes
// never pass through JavaScript.
// - Android: Turag's own uploader (TuragFile.upload). React Native's file body there
//   is a one-time stream that the network library may resend empty after a hiccup;
//   S3 then waited for bytes that never came and refused the upload at "100%".
//   Ours re-reads the file from the start whenever it is resent.
// - iPhone: React Native's { uri } body (iOS sends it from a re-sendable copy).
// onProgress(fraction 0..1): how much has gone up; called when the whole percent changes.
export const PROGRESS_EVENT = 'TuragFileUploadProgress';
const nativeUploader = () => Platform.OS === 'android' && typeof NativeModules.TuragFile?.upload === 'function';

const percentReporter = (onProgress, byteSize) => {
  let lastPercent = -1;
  return (loaded, total) => {
    const of = total || byteSize;
    if (!onProgress || !of) return;
    const percent = Math.min(100, Math.floor((loaded / of) * 100));
    if (percent !== lastPercent) {
      lastPercent = percent;
      onProgress(percent / 100);
    }
  };
};

export const putFileToUploadTarget = async (target, info, timeoutMs = UPLOAD_TIMEOUT_MS, onProgress) => {
  const url = absolute(target.url);
  const method = target.method || 'PUT';
  const headers = { ...(target.headers ?? {}) };
  // A file body needs its type; the target's own header wins when it has one.
  if (!Object.keys(headers).some(name => name.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = info.contentType;
  }
  Object.keys(headers).forEach(name => (headers[name] = String(headers[name])));
  const report = percentReporter(onProgress, info.byteSize);
  return nativeUploader()
    ? putWithNativeUploader({ url, method, headers, info, timeoutMs, report })
    : putWithXhr({ url, method, headers, info, timeoutMs, report });
};

const putWithNativeUploader = async ({ url, method, headers, info, timeoutMs, report }) => {
  const id = `up_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const subscription = DeviceEventEmitter.addListener(PROGRESS_EVENT, event => {
    if (event?.id === id) report(event.sent, event.total);
  });
  let answer;
  try {
    answer = await NativeModules.TuragFile.upload(id, info.uri, url, method, headers, timeoutMs);
  } catch (e) {
    throw uploadNetworkError(/timeout|timed out/i.test(String(e?.message ?? '')));
  } finally {
    subscription.remove();
  }
  if (answer.status < 200 || answer.status >= 300) {
    throw uploadRefused(answer.status);
  }
};

const putWithXhr = ({ url, method, headers, info, timeoutMs, report }) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.timeout = timeoutMs;
    if (xhr.upload) {
      xhr.upload.onprogress = event => report(event.loaded, event.total);
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(uploadRefused(xhr.status));
      }
    };
    xhr.onerror = () => reject(uploadNetworkError(false));
    xhr.ontimeout = () => reject(uploadNetworkError(true));
    xhr.send({ uri: info.uri });
  });

// A unique id per captured file, so a retried request never creates two assets.
export const newClientAssetId = () =>
  `ca_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
