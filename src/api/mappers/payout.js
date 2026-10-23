// Backend payout accounts and settlements -> the shapes the seller screens use.
// Settlement money stays in paise (amountMinor) so the summary sums are exact,
// as the web; screens turn it into rupees only to show it.
import { toTime } from './money';

const minor = money => (money?.amount_minor != null ? money.amount_minor : null);

// A seller's bank account. The full number never comes back: only the masked one.
export const mapPayoutAccount = a => ({
  id: a.account_id,
  status: a.status,
  holderName: a.holder_name ?? '',
  bankName: a.bank_name ?? '',
  ifsc: a.ifsc ?? '',
  numberMasked: a.account_number_masked ?? '',
  proof: a.proof
    ? { fileName: a.proof.file_name, contentType: a.proof.content_type, size: a.proof.size_bytes }
    : null,
  rejectionReason: a.rejection_reason ?? null,
  verifiedAt: toTime(a.verified_at),
  activatedAt: toTime(a.activated_at),
  createdAt: toTime(a.created_at),
});

// One settlement ledger entry. amountMinor / breakdown are null while the
// commission rule is not set (AWAITING_CONFIG) - never a guess.
export const mapSettlement = s => ({
  id: s.settlement_id,
  orderId: s.order_id,
  vehicle: s.vehicle ? { make: s.vehicle.make, model: s.vehicle.model, year: s.vehicle.mfg_year } : null,
  amountMinor: minor(s.amount),
  breakdown: s.breakdown
    ? {
        baseMinor: minor(s.breakdown.base) ?? 0,
        commissionMinor: minor(s.breakdown.commission) ?? 0,
        gstMinor: minor(s.breakdown.gst) ?? 0,
      }
    : null,
  account: s.account
    ? { holderName: s.account.holder_name, bankName: s.account.bank_name, numberMasked: s.account.account_number_masked }
    : null,
  status: s.status,
  bankReference: s.provider_payout_ref ?? null,
  hasReceipt: !!s.has_receipt,
  settledAt: toTime(s.settled_at),
  createdAt: toTime(s.created_at),
});
