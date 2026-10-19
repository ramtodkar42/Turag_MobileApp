// Inspection report (customer view) - needs sign-in; the customer can see it
// when they own the booking linked to the inspection.
// Real backend when USE_REAL_API.bookings is true (src/api/config.js), mock otherwise.
import { request } from '../client';
import { USE_REAL_API } from '../config';
import { ENDPOINTS } from '../endpoints';
import { mapReport } from '../mappers/booking';
import { sampleReport } from '../mock/account';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Errors the Report screen shows as their own states (error.code).
export const REPORT_ERRORS = {
  NOT_READY: 'REPORT_NOT_READY', // 409: not verified yet
};

// The report summary (grade, findings, documents, valuation) for an inspection.
export const getInspectionReport = async inspectionId => {
  if (!USE_REAL_API.bookings) {
    await wait(700);
    return mapReport(sampleReport());
  }
  const data = await request(ENDPOINTS.report(inspectionId));
  return mapReport(data.report);
};

// The report PDF (GET /reports/{id}/pdf). The backend renders it in its
// worker, so the first ask may answer "being prepared".
// Returns { status: 'READY', url } | { status: 'GENERATING' } |
//         { status: 'FAILED' } | { status: 'NOT_AVAILABLE', reason }.
export const getReportPdf = async inspectionId => {
  if (!USE_REAL_API.bookings) {
    await wait(600);
    return { status: 'READY', url: `https://turag-testing.vercel.app/report/${inspectionId}` };
  }
  const data = await request(ENDPOINTS.reportPdf(inspectionId));
  return { status: data.status, url: data.url ?? null, reason: data.reason ?? null };
};

// A public link that shows the report is genuine (the web's "Get verification
// link"), for sharing with a buyer. Returns { url }.
export const shareReport = async inspectionId => {
  if (!USE_REAL_API.bookings) {
    await wait(400);
    return { url: `https://turag-testing.vercel.app/verify/mock_${inspectionId}` };
  }
  const data = await request(ENDPOINTS.reportShare(inspectionId), { method: 'POST' });
  return { url: data.verify_url ?? data.share_url };
};
