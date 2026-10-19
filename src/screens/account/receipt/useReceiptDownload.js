import { useCallback, useEffect, useRef, useState } from 'react';
import { errorCodes, isErrorWithCode, saveDocuments } from '@react-native-documents/picker';
import { tNow } from '../../../i18n';
import { receiptHtml } from './receiptHtml';

// The PDF maker is native: loaded on use, so an app not rebuilt yet says
// "couldn't create" instead of crashing on open.
const loadPdfMaker = () => {
  try {
    return require('react-native-html-to-pdf').generatePDF;
  } catch {
    return null;
  }
};

const LABEL_KEYS = [
  'badge',
  'title',
  'subtitle',
  'docLabel',
  'vehicle',
  'datetime',
  'location',
  'type',
  'reference',
  'date',
  'fee',
  'paidNote',
  'footerNote',
];

const cancelled = error => isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED;

// "Download receipt": makes the receipt PDF on the phone, then the system's
// "Save to..." screen (Downloads, Drive, Files...) - like the web's download.
// Returns { downloading, message: { text, tone } | null, download }.
export default function useReceiptDownload(receipt) {
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState(null);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const download = useCallback(async () => {
    if (!receipt) {
      return;
    }
    setDownloading(true);
    setMessage(null);
    try {
      const generatePDF = loadPdfMaker();
      if (!generatePDF) {
        throw new Error('pdf');
      }
      const labels = Object.fromEntries(LABEL_KEYS.map(key => [key, tNow(`account.receipt.${key}`)]));
      const fileName = `Turag-receipt-${receipt.bookingRef}`;
      const { filePath } = await generatePDF({ html: receiptHtml(receipt, labels), fileName });
      const uri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
      const [saved] = await saveDocuments({
        sourceUris: [uri],
        fileName: `${fileName}.pdf`,
        mimeType: 'application/pdf',
        copy: true,
      });
      if (saved?.error) {
        throw new Error(saved.error);
      }
      if (mounted.current) {
        setMessage({ text: tNow('account.receipt.saved'), tone: 'success' });
      }
    } catch (error) {
      if (mounted.current && !cancelled(error)) {
        setMessage({ text: tNow('account.receipt.downloadError'), tone: 'error' });
      }
    } finally {
      if (mounted.current) {
        setDownloading(false);
      }
    }
  }, [receipt]);

  return { downloading, message, download };
}
