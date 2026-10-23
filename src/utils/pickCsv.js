import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import { tNow } from '../i18n';

// The server's cap on an inline CSV (bulk intake import).
export const MAX_CSV_BYTES = 5 * 1024 * 1024;

// Some Android file apps label a .csv as plain text or as Excel, so those are
// allowed too; the name is checked after picking.
const CSV_TYPES = [types.csv, types.plainText, 'text/comma-separated-values', 'application/vnd.ms-excel'].filter(
  Boolean,
);

// A local file's text. react-native-blob-util reads it as UTF-8 (RN's
// FileReader has no readAsText); fetch() is the fallback.
const readText = async uri => {
  try {
    const BlobUtil = require('react-native-blob-util').default;
    return await BlobUtil.fs.readFile(decodeURIComponent(uri.replace(/^file:\/\//, '')), 'utf8');
  } catch {
    return (await fetch(uri)).text();
  }
};

// Opens the system file picker for a CSV and returns
// { uri (file://), fileName, fileSize, text }, or null if cancelled.
// Like pickPdf, the file is copied into the app's cache first (Android gives
// a content:// uri otherwise). Throws a readable Error for a non-CSV, a file
// over 5 MB or one that can't be read.
export const pickCsv = async () => {
  let file;
  try {
    [file] = await pick({ type: CSV_TYPES });
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw new Error(tNow('business.import.fileError'));
  }
  const fileName = file.name || 'repo-stock.csv';
  if (!/\.csv$/i.test(fileName)) {
    throw new Error(tNow('business.import.notCsv'));
  }
  if (file.size != null && file.size > MAX_CSV_BYTES) {
    throw new Error(tNow('business.import.tooLarge'));
  }
  const [copy] = await keepLocalCopy({
    files: [{ uri: file.uri, fileName }],
    destination: 'cachesDirectory',
  });
  if (copy.status !== 'success') {
    throw new Error(tNow('business.import.fileError'));
  }
  let text;
  try {
    text = await readText(copy.localUri);
  } catch {
    throw new Error(tNow('business.import.fileError'));
  }
  return { uri: copy.localUri, fileName, fileSize: file.size ?? undefined, text: String(text ?? '') };
};
