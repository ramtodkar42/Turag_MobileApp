import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Share } from 'react-native';
import { getReportPdf, shareReport } from '../../../api/services/report.api';
import { tNow } from '../../../i18n';

// The PDF is rendered by the backend's worker: while it's "being prepared",
// ask again every few seconds for up to about a minute.
const POLL_MS = 3000;
const POLL_TRIES = 20;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// "Download PDF" and "Share report" on the report screen (as the web's).
// download(): gets the PDF link and opens it (the phone's viewer can save /
// print / share it). share(): a verification link to the report, through the
// phone's share sheet. Returns { downloading, sharing, message, download, share }.
export default function useReportActions({ inspectionId, title }) {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState(null); // { text, tone: 'info' | 'error' }
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const download = useCallback(async () => {
    setDownloading(true);
    setMessage(null);
    try {
      let pdf = await getReportPdf(inspectionId);
      for (let i = 0; pdf.status === 'GENERATING' && i < POLL_TRIES && mounted.current; i += 1) {
        setMessage({ text: tNow('account.report.pdf.preparing'), tone: 'info' });
        await wait(POLL_MS);
        pdf = await getReportPdf(inspectionId);
      }
      if (!mounted.current) {
        return;
      }
      if (pdf.status === 'READY' && pdf.url) {
        setMessage(null);
        await Linking.openURL(pdf.url);
      } else if (pdf.status === 'GENERATING') {
        setMessage({ text: tNow('account.report.pdf.stillPreparing'), tone: 'info' });
      } else {
        setMessage({ text: tNow('account.report.pdf.unavailable'), tone: 'error' });
      }
    } catch (e) {
      if (mounted.current) {
        setMessage({ text: e.message || tNow('account.report.pdf.unavailable'), tone: 'error' });
      }
    } finally {
      if (mounted.current) {
        setDownloading(false);
      }
    }
  }, [inspectionId]);

  const share = useCallback(async () => {
    setSharing(true);
    setMessage(null);
    try {
      const { url } = await shareReport(inspectionId);
      await Share.share({
        title,
        message: tNow('account.report.share.message', { title, url }),
        url, // iOS shows it as a link
      });
    } catch (e) {
      if (mounted.current) {
        setMessage({ text: e.message || tNow('account.report.share.error'), tone: 'error' });
      }
    } finally {
      if (mounted.current) {
        setSharing(false);
      }
    }
  }, [inspectionId, title]);

  return { downloading, sharing, message, download, share };
}
