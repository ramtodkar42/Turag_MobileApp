// Seller payouts (as the web's payout-client / listSellerSettlements, ADR-0037):
// the seller adds a bank account with a proof (passbook / cancelled cheque),
// Turag's team verifies it, and a verified account becomes where settlements
// are paid. Settlements are the payouts owed for the seller's sales. Needs sign-in.
import { Platform } from 'react-native';
import { ApiError, request } from '../client';
import { API_BASE_URL, UPLOAD_TIMEOUT_MS } from '../config';
import { ENDPOINTS } from '../endpoints';
import { mapPayoutAccount, mapSettlement } from '../mappers/payout';
import { getAccessToken, refreshAccessToken } from '../session';
import { tNow } from '../../i18n';


export const PAYOUT_PROOF_MAX_BYTES = 20 * 1024 * 1024;
export const PAYOUT_PROOF_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

// The seller's accounts, newest first (server order).
export const listPayoutAccounts = async () =>
  ((await request(ENDPOINTS.PAYOUT_ACCOUNTS)).accounts ?? []).map(mapPayoutAccount);

// Adds an account (it starts as DRAFT until its proof is uploaded).
// input: { holderName, bankName, ifsc, accountNumber } - already trimmed / cleaned.
export const createPayoutAccount = async ({ holderName, bankName, ifsc, accountNumber }) => {
  const data = await request(ENDPOINTS.PAYOUT_ACCOUNTS, {
    method: 'POST',
    body: { holder_name: holderName, bank_name: bankName, ifsc, account_number: accountNumber },
  });
  return mapPayoutAccount(data.account);
};

// Makes a verified account the one payouts go to (the previous one becomes INACTIVE).
export const activatePayoutAccount = async accountId =>
  mapPayoutAccount((await request(ENDPOINTS.payoutAccountActivate(accountId), { method: 'POST', body: {} })).account);

// The file's type in lower case ('' when unknown).
export const fileType = file => String(file?.type || '').toLowerCase();

// Uploads the proof as its raw bytes, as the web (PDF / JPEG / PNG / WEBP, up
// to 20 MB); the account goes to PENDING_VERIFICATION.
// file: { uri, type, fileName, fileSize } from the camera / gallery / PDF picker.
export const uploadPayoutProof = async (accountId, file) => {
  const type = fileType(file) || 'application/octet-stream';
  if ((file.fileSize ?? 0) > PAYOUT_PROOF_MAX_BYTES) {
    throw new ApiError({ status: 413, code: 'PAYOUT_DOCUMENT_TOO_LARGE', message: tNow('payouts.form.tooLarge') });
  }
  const uri = file.uri.startsWith('/') ? `file://${file.uri}` : file.uri;
  const blob = await (await fetch(uri)).blob();
  const name = file.fileName || (type === 'application/pdf' ? 'proof.pdf' : 'proof.jpg');
  const data = await request(ENDPOINTS.payoutAccountProof(accountId), {
    method: 'POST',
    body: blob,
    headers: { 'Content-Type': type, 'x-file-name': encodeURIComponent(name) },
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
  return mapPayoutAccount(data.account);
};

// The seller's settlement ledger.
export const listSettlements = async () => ((await request(ENDPOINTS.SETTLEMENTS)).data ?? []).map(mapSettlement);

// "Flat 402.pdf" -> a safe file name for the phone's storage.
const safeName = name => String(name || 'document').replace(/[^\w.\- ]+/g, '_').slice(-120);

const EXTENSIONS = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

// Downloads a private file and opens it in the phone's viewer (PDF / image
// app; iOS: the built-in preview), as transfer.api's documents. The route
// needs the login, so the file is fetched with the token (refreshed once if
// it just expired). A name without an extension gets one from the file's type,
// so the viewer knows what it is.
const openPrivateFile = async (path, fileName, contentType) => {
  let BlobUtil;
  try {
    BlobUtil = require('react-native-blob-util').default;
  } catch {
    throw new ApiError({ code: 'DOWNLOAD_UNAVAILABLE', message: tNow('payouts.file.downloadError') });
  }
  const dir = Platform.OS === 'ios' ? BlobUtil.fs.dirs.DocumentDir : BlobUtil.fs.dirs.CacheDir;
  let local = `${dir}/turag-documents/${safeName(fileName)}`;
  const url = `${API_BASE_URL}${path}`;
  const download = token =>
    BlobUtil.config({ path: local, overwrite: true }).fetch('GET', url, { Authorization: `Bearer ${token}` });

  let res;
  try {
    res = await download(await getAccessToken());
    if (res.info().status === 401) {
      res = await download(await refreshAccessToken());
    }
  } catch {
    throw new ApiError({ code: 'DOWNLOAD_FAILED', message: tNow('payouts.file.downloadError') });
  }
  if (res.info().status !== 200) {
    BlobUtil.fs.unlink(local).catch(() => {});
    throw new ApiError({ status: res.info().status, code: 'DOWNLOAD_FAILED', message: tNow('payouts.file.downloadError') });
  }
  const headers = res.info().headers ?? {};
  const type = String(contentType || headers['content-type'] || headers['Content-Type'] || 'application/pdf')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (!/\.\w{2,5}$/.test(local) && EXTENSIONS[type]) {
    try {
      await BlobUtil.fs.mv(local, `${local}${EXTENSIONS[type]}`);
      local = `${local}${EXTENSIONS[type]}`;
    } catch {
      // Keep the name without an extension; Android still opens it by type.
    }
  }
  try {
    if (Platform.OS === 'ios') {
      await BlobUtil.ios.previewDocument(local);
    } else {
      await BlobUtil.android.actionViewIntent(local, type);
    }
  } catch {
    throw new ApiError({ code: 'NO_VIEWER', message: tNow('payouts.file.noViewer') });
  }
};

// Opens an account's proof. proof: the account's { fileName, contentType }.
export const openPayoutProof = (accountId, proof) =>
  openPrivateFile(ENDPOINTS.payoutAccountProof(accountId), `payout-${accountId}-${proof?.fileName || 'proof'}`, proof?.contentType);

// Opens a paid settlement's receipt (named as the web: receipt-<id>).
export const openSettlementReceipt = settlementId =>
  openPrivateFile(ENDPOINTS.settlementReceipt(settlementId), `receipt-${settlementId}`);
