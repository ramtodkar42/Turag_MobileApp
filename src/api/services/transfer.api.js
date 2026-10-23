// Ownership transfer after the token is paid (§8.1, as the web's transfer
// checklist / purchase documents): the order's checklist of documents (Form 29,
// Form 30, the NOC, KYC, insurance...), each provided by the seller, the buyer
// or Turag. A party uploads its own documents; Turag's team verifies them. The
// buyer can open the seller's documents only after handover (the server
// decides). Needs sign-in.
import { Platform } from 'react-native';
import { ApiError, request } from '../client';
import { API_BASE_URL, UPLOAD_TIMEOUT_MS } from '../config';
import { ENDPOINTS } from '../endpoints';
import { mapTransferChecklist } from '../mappers/offer';
import { getAccessToken, refreshAccessToken } from '../session';
import { tNow } from '../../i18n';

export const TRANSFER_DOC_MAX_BYTES = 20 * 1024 * 1024;
export const TRANSFER_DOC_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

// The order's checklist: { version, items: [{ code, label, required, responsible, status, document }] }.
export const getTransferChecklist = async orderId =>
  mapTransferChecklist((await request(ENDPOINTS.transferChecklist(orderId))).checklist);

// Uploads the document for one item (a PDF or a photo, up to 20 MB): the raw
// bytes, as the web; the item becomes PROVIDED. Returns the updated checklist.
// file: { uri, type, fileName, fileSize } from the camera / gallery / PDF picker.
export const uploadTransferDocument = async (orderId, itemCode, file) => {
  const type = String(file.type || '').toLowerCase() || 'application/octet-stream';
  if ((file.fileSize ?? 0) > TRANSFER_DOC_MAX_BYTES) {
    throw new ApiError({ status: 413, code: 'TRANSFER_DOC_TOO_LARGE', message: tNow('offers.transfer.tooLarge') });
  }
  const uri = file.uri.startsWith('/') ? `file://${file.uri}` : file.uri;
  const blob = await (await fetch(uri)).blob();
  const name = file.fileName || (type === 'application/pdf' ? 'document.pdf' : 'document.jpg');
  const data = await request(ENDPOINTS.transferDocument(orderId, itemCode), {
    method: 'POST',
    body: blob,
    headers: { 'Content-Type': type, 'x-file-name': encodeURIComponent(name) },
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
  return mapTransferChecklist(data.checklist);
};

// "Flat 402.pdf" -> a safe file name for the phone's storage.
const safeName = name => String(name || 'document').replace(/[^\w.\- ]+/g, '_').slice(-120);

// Downloads one item's document and opens it in the phone's viewer (PDF /
// image app; iOS: the built-in preview). The route needs the login, so the
// file is fetched with the token (refreshed once if it just expired).
// doc: the item's { fileName, contentType }.
export const openTransferDocument = async (orderId, itemCode, doc) => {
  let BlobUtil;
  try {
    BlobUtil = require('react-native-blob-util').default;
  } catch {
    throw new ApiError({ code: 'DOWNLOAD_UNAVAILABLE', message: tNow('offers.transfer.downloadError') });
  }
  const dir = Platform.OS === 'ios' ? BlobUtil.fs.dirs.DocumentDir : BlobUtil.fs.dirs.CacheDir;
  const path = `${dir}/turag-documents/${orderId}-${itemCode}-${safeName(doc.fileName)}`;
  const url = `${API_BASE_URL}${ENDPOINTS.transferDocument(orderId, itemCode)}`;
  const download = token =>
    BlobUtil.config({ path, overwrite: true }).fetch('GET', url, { Authorization: `Bearer ${token}` });

  let res;
  try {
    res = await download(await getAccessToken());
    if (res.info().status === 401) {
      res = await download(await refreshAccessToken());
    }
  } catch {
    throw new ApiError({ code: 'DOWNLOAD_FAILED', message: tNow('offers.transfer.downloadError') });
  }
  if (res.info().status !== 200) {
    BlobUtil.fs.unlink(path).catch(() => {});
    throw new ApiError({ status: res.info().status, code: 'DOWNLOAD_FAILED', message: tNow('offers.transfer.downloadError') });
  }
  const type = doc.contentType || res.info().headers?.['content-type'] || 'application/pdf';
  try {
    if (Platform.OS === 'ios') {
      await BlobUtil.ios.previewDocument(res.path());
    } else {
      await BlobUtil.android.actionViewIntent(res.path(), type);
    }
  } catch {
    throw new ApiError({ code: 'NO_VIEWER', message: tNow('offers.transfer.noViewer') });
  }
};
