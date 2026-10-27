import { toRupees } from './money';

// Traffic challans (ADR-0050), on the inspection report and a listing, or null
// when the vehicle was never checked. `outcome` keeps a failed check apart from
// a clean one: 'CLEAN' | 'FOUND' | 'NOT_FOUND' (no record) | 'UNAVAILABLE'
// (couldn't check - never shown as "no challans").
// -> { outcome, pendingCount, totalFine (₹), checkedAt, items: [{ number,
//    violation, date, fine (₹), status, authority }] }
export const mapChallans = c =>
  c
    ? {
        outcome: c.outcome,
        pendingCount: c.pending_count ?? null,
        totalFine: toRupees(c.total_fine_minor),
        checkedAt: c.checked_at ?? null,
        items: (c.challans ?? []).map(item => ({
          number: item.challan_number ?? null,
          violation: item.violation ?? null,
          date: item.date ?? null,
          fine: toRupees(item.fine_minor),
          status: item.status ?? null,
          authority: [item.issuing_authority, item.state].filter(Boolean).join(', ') || null,
        })),
      }
    : null;
