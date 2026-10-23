// Backend business-account views (organizations, dealer listings, the
// institutional portfolio / intake / yard / bulk imports) -> the shapes the
// Business screens use. Prices in rupees (the API sends paise as
// `*_minor` numbers), times in ms.
import { toRupees, toTime } from './money';

// A dealer can take back a listing only before it is sold / ended (as the web).
const WITHDRAWABLE = new Set(['DRAFT', 'PENDING_REVIEW', 'LIVE']);

// ResolvedMembershipView -> { membershipId, id, name, type, status, role,
//   active, portal ('DEALER' | 'INSTITUTIONAL') }
// Dealer orgs open the dealer marketplace; lender / yard orgs the
// institutional portal.
export const mapOrg = m => ({
  membershipId: m.membership_id,
  id: m.org_id,
  name: m.org_legal_name,
  type: m.org_type,
  status: m.org_status,
  role: m.role,
  // The org routes answer 409 for a non-active org, so it can't be opened.
  active: m.org_status === 'ACTIVE',
  portal: m.org_type === 'DEALER' ? 'DEALER' : 'INSTITUTIONAL',
});

// DealerOrgListingView (the org's own stock) -> a My listings row.
export const mapDealerListing = l => ({
  id: l.id,
  vehicleId: l.vehicle_id,
  status: l.status,
  askPrice: toRupees(l.ask_price_minor),
  city: l.city ?? null,
  channel: l.channel,
  createdAt: toTime(l.created_at),
  publishedAt: toTime(l.published_at),
  canWithdraw: WITHDRAWABLE.has(l.status),
});

// DealerListingSummary (another dealer's live stock; no seller identity).
export const mapDealerStock = s => ({
  id: s.listing_id,
  make: s.make,
  model: s.model,
  variant: s.variant ?? null,
  year: s.mfg_year,
  fuel: s.fuel,
  category: s.category,
  city: s.city ?? null,
  askPrice: toRupees(s.ask_price_minor),
  grade: s.grade ?? null,
  status: s.status,
  publishedAt: toTime(s.published_at),
});

// PortfolioItemView -> a portfolio row (no money: only a valuation band label).
export const mapPortfolioItem = i => ({
  id: i.asset_id,
  kind: i.kind,
  vehicle: {
    make: i.vehicle?.make ?? '',
    model: i.vehicle?.model ?? '',
    year: i.vehicle?.mfg_year ?? null,
    fuel: i.vehicle?.fuel ?? null,
    category: i.vehicle?.category ?? null,
    chassisLast6: i.vehicle?.chassis_last6 ?? null,
  },
  status: i.status,
  ageingDays: i.ageing_days ?? 0,
  ageingBucket: i.ageing_bucket,
  location: i.location ?? null,
  valuationBand: i.valuation?.band ?? null,
  channel: i.channel,
  createdAt: toTime(i.created_at),
});

// IntakeSummaryView -> an intake row.
export const mapIntakeSummary = r => ({
  id: r.intake_id,
  vehicleId: r.vehicle_id ?? null,
  status: r.status,
  createdAt: toTime(r.created_at),
});

// IntakeRegistrationView -> the intake detail (documents + possession list).
export const mapIntake = r => ({
  ...mapIntakeSummary(r),
  orgId: r.org_id,
  inspectionId: r.m3_inspection_id ?? null,
  authorityDocId: r.authority_doc_id,
  placementId: r.yard_placement_id ?? null,
  documents: (r.documents ?? []).map(d => ({
    id: d.document_id,
    type: d.doc_type,
    validFrom: toTime(d.valid_from),
    validUntil: toTime(d.valid_until),
    verifiedAt: toTime(d.verified_at),
    createdAt: toTime(d.created_at),
  })),
  possessionItems: (r.possession_items ?? []).map(p => ({
    id: p.item_id,
    label: p.label,
    mediaId: p.media_id ?? null,
    note: p.note ?? null,
    createdAt: toTime(p.created_at),
  })),
});

// YardPlacementSummaryView -> a yard row.
export const mapPlacementSummary = p => ({
  id: p.placement_id,
  vehicleId: p.vehicle_id ?? null,
  yardCode: p.yard_code,
  bayCode: p.bay_code ?? null,
  status: p.status,
  storageDays: p.storage_days ?? 0,
  placedAt: toTime(p.placed_at),
});

// YardPlacementView -> the placement detail with its movement log.
export const mapPlacement = p => ({
  ...mapPlacementSummary(p),
  orgId: p.org_id,
  intakeId: p.intake_id ?? null,
  releasedAt: toTime(p.released_at),
  createdAt: toTime(p.created_at),
  movements: (p.movements ?? []).map(m => ({
    id: m.movement_id,
    fromBay: m.from_bay ?? null,
    toBay: m.to_bay ?? null,
    reason: m.reason ?? null,
    movedAt: toTime(m.moved_at),
  })),
});

// IntakeImportJobView -> a bulk-import job (counts as the web's tiles).
export const mapImportJob = j => ({
  id: j.import_id,
  status: j.status,
  filename: j.filename,
  totalRows: j.total_rows ?? 0,
  createdCount: j.created_count ?? 0,
  failedCount: j.failed_count ?? 0,
  skippedCount: j.skipped_count ?? 0,
  errorSummary: j.error_summary ?? null,
  createdAt: toTime(j.created_at),
  submittedAt: toTime(j.submitted_at),
  completedAt: toTime(j.completed_at),
});

// IntakeImportRowView -> one row's outcome.
export const mapImportRow = r => ({
  rowNumber: r.row_number,
  status: r.status,
  regNumber: r.reg_number ?? null,
  intakeId: r.intake_id ?? null,
  vehicleId: r.vehicle_id ?? null,
  errorCode: r.error_code ?? null,
  errorDetail: r.error_detail ?? null,
});
