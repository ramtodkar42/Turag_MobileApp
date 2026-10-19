import { colors } from '../../../theme';

// The downloadable receipt (PDF): the same layout as the on-screen / web
// receipt, as one self-contained HTML page (icons are inline SVG, no fonts or
// images to load).

const escape = text =>
  String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Lucide icon paths (the web receipt's icons).
const ICONS = {
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  calendar: '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>',
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  hash: '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
};

const svg = (name, color, width = 2) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

const row = (icon, title, value, { mono = false, accent = false } = {}) => `
  <div class="row">
    <div class="badge ${accent ? 'accent' : ''}">${accent ? svg('check', '#FFFFFF', 3) : svg(icon, colors.primary)}</div>
    <div><div class="title">${escape(title)}</div><div class="value ${mono ? 'mono' : ''}">${escape(value)}</div></div>
  </div>`;

// receipt: buildReceipt(); labels: the translated texts (account.receipt.*).
export const receiptHtml = (receipt, labels) => `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 24px; font-family: -apple-system, Roboto, 'Segoe UI', Arial, sans-serif; color: ${colors.heading}; background: #FFFFFF; }
  .wrap { max-width: 480px; margin: 0 auto; }
  .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .brand { font-weight: 800; font-size: 22px; letter-spacing: -0.5px; color: ${colors.primary}; }
  .chip { font-size: 12px; font-weight: 700; color: ${colors.primary}; background: ${colors.dangerLight}; padding: 6px 12px; border-radius: 999px; }
  h1 { text-align: center; font-size: 26px; margin: 0; }
  .sub { text-align: center; color: ${colors.body}; font-size: 14px; margin: 8px 0 24px; }
  .card { border: 1px solid ${colors.border}; border-radius: 20px; overflow: hidden; }
  .head { padding: 16px 20px; border-bottom: 1px dashed ${colors.border}; }
  .label { font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: ${colors.placeholder}; font-weight: 700; }
  .ref { font-family: Menlo, 'Courier New', monospace; font-weight: 700; font-size: 15px; margin-top: 6px; word-break: break-all; }
  .body { padding: 20px; }
  .row { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
  .row:last-child { margin-bottom: 0; }
  .badge { flex: none; width: 40px; height: 40px; border-radius: 20px; background: ${colors.dangerLight}; display: flex; align-items: center; justify-content: center; }
  .badge.accent { background: ${colors.primary}; }
  .title { font-size: 12px; color: ${colors.placeholder}; }
  .value { font-size: 15px; font-weight: 600; margin-top: 2px; line-height: 1.4; }
  .mono { font-family: Menlo, 'Courier New', monospace; }
  .fee { background: ${colors.unreadTint}; padding: 18px 20px 14px; }
  .feeRow { display: flex; justify-content: space-between; align-items: center; }
  .feeLabel { font-weight: 600; font-size: 15px; }
  .amount { font-weight: 800; font-size: 28px; }
  .note { display: flex; align-items: center; gap: 10px; margin-top: 12px; font-size: 11px; color: ${colors.body}; white-space: nowrap; }
  .note:before, .note:after { content: ''; flex: 1; height: 1px; background: ${colors.border}; }
  .foot { text-align: center; color: ${colors.placeholder}; font-size: 11px; margin-top: 18px; line-height: 1.5; }
</style></head>
<body><div class="wrap">
  <div class="top"><span class="brand">TURAG</span><span class="chip">${escape(labels.badge)}</span></div>
  <h1>${escape(labels.title)}</h1>
  <div class="sub">${escape(labels.subtitle)}</div>
  <div class="card">
    <div class="head"><div class="label">${escape(labels.docLabel)}</div><div class="ref">${escape(receipt.bookingRef)}</div></div>
    <div class="body">
      ${row('car', labels.vehicle, receipt.vehicle)}
      ${row('calendar', labels.datetime, receipt.when)}
      ${row('pin', labels.location, receipt.where)}
      ${row('user', labels.type, receipt.type)}
      ${receipt.reference ? row('hash', labels.reference, receipt.reference, { mono: true }) : ''}
      ${row('check', labels.date, receipt.paidOn, { accent: true })}
    </div>
    <div class="fee">
      <div class="feeRow"><span class="feeLabel">${escape(labels.fee)}</span><span class="amount">${escape(receipt.amount)}</span></div>
      <div class="note">${escape(labels.paidNote)}</div>
    </div>
  </div>
  <div class="foot">${escape(labels.footerNote)}</div>
</div></body></html>`;
