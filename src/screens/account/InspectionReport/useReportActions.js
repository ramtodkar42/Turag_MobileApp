import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Share } from 'react-native';
import { ApiError } from '../../../api/client';
import { getReportPdf, shareReport } from '../../../api/services/report.api';
import { tNow } from '../../../i18n';

// The PDF is made by the backend's worker. While it's GENERATING the screen says
// "Preparing your report…" and keeps asking, as the backend team asks: every 3 s
// at first, then every 6 s, for up to 3 minutes while the screen is open. A
// network blip (or a server hiccup) while waiting is tried again, not shown as
// a failure; only three in a row end the wait.
const FAST_POLL_MS = 3000;
const SLOW_POLL_MS = 6000;
const FAST_FOR_MS = 30000;
const MAX_WAIT_MS = 3 * 60000;
const MAX_BLIPS = 3;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const isBlip = e => e instanceof ApiError && (e.isNetworkError || e.status >= 500);

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
    const startedAt = Date.now();
    try {
      let pdf;
      let blips = 0;
      for (;;) {
        try {
          pdf = await getReportPdf(inspectionId);
          blips = 0;
        } catch (e) {
          blips += 1;
          if (!isBlip(e) || blips >= MAX_BLIPS) {
            throw e;
          }
          pdf = { status: 'GENERATING' };
        }
        const waited = Date.now() - startedAt;
        if (pdf.status !== 'GENERATING' || waited >= MAX_WAIT_MS || !mounted.current) {
          break;
        }
        setMessage({ text: tNow('account.report.pdf.preparing'), tone: 'info' });
        await wait(waited < FAST_FOR_MS ? FAST_POLL_MS : SLOW_POLL_MS);
        if (!mounted.current) {
          return;
        }
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
