import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import { tNow } from '../i18n';

// Opens the system file picker for a PDF and returns it as a local file
// ({ uri (file://), type, fileName, fileSize }), or null if cancelled.
// The picked file is copied into the app's cache first, so it can be read
// and uploaded like a photo (Android gives a content:// uri otherwise).
export const pickPdf = async () => {
  let file;
  try {
    [file] = await pick({ type: [types.pdf] });
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw new Error(tNow('valuation.upload.fileError'));
  }
  const fileName = file.name || 'document.pdf';
  const [copy] = await keepLocalCopy({
    files: [{ uri: file.uri, fileName }],
    destination: 'cachesDirectory',
  });
  if (copy.status !== 'success') {
    throw new Error(tNow('valuation.upload.fileError'));
  }
  return { uri: copy.localUri, type: file.type || 'application/pdf', fileName, fileSize: file.size ?? undefined };
};
