// Business accounts API (as the web's /dealer and /institutional pages) -
// needs sign-in. Always the real backend: there is no mock for these.
//
// - /me/organizations: which organizations the user belongs to.
// - Dealer marketplace (DEALER orgs): the org's own fixed-price listings
//   (list / create / withdraw) and other dealers' live stock (browse).
// - Institutional portal (LENDER / YARD orgs): read-only portfolio, intake and
//   yard, plus the one write - the bulk repo-intake CSV import.
//
// The org routes answer 404 to a non-member and 409 for a non-active org;
// those become ApiErrors with ORG_NO_ACCESS / ORG_NOT_ACTIVE so screens can
// show the right state.
import { ApiError, request } from '../client';
import { ENDPOINTS } from '../endpoints';
import {
  mapDealerListing,
  mapDealerStock,
  mapImportJob,
  mapImportRow,
  mapIntake,
  mapIntakeSummary,
  mapOrg,
  mapPlacement,
  mapPlacementSummary,
  mapPortfolioItem,
} from '../mappers/business';
import { tNow } from '../../i18n';

const enc = encodeURIComponent;

// Endpoint paths (to move into src/api/endpoints.js).

export const ORG_NO_ACCESS = 'ORG_NO_ACCESS';
export const ORG_NOT_ACTIVE = 'ORG_NOT_ACTIVE';
export const BULK_INTAKE_UNAVAILABLE = 'LENDER_INTAKE_UNAVAILABLE';

// "?a=1&b=2" from the set values only ('' when none).
const query = params => {
  const parts = Object.entries(params)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${enc(key)}=${enc(String(value))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

// Runs an org-scoped call; access problems get a clear code + message.
const orgCall = async call => {
  try {
    return await call();
  } catch (e) {
    if (!(e instanceof ApiError)) {
      throw e;
    }
    if (e.status === 403 || e.status === 404) {
      throw new ApiError({ status: e.status, code: ORG_NO_ACCESS, message: tNow('business.error.noAccess') });
    }
    if (e.status === 409) {
      throw new ApiError({ status: 409, code: ORG_NOT_ACTIVE, message: tNow('business.error.notActive') });
    }
    throw e;
  }
};

// --- Organizations -----------------------------------------------------------

// The user's org memberships: [{ id, name, type, status, role, active, portal }].
export const getMyOrganizations = async () => {
  const data = await request(ENDPOINTS.MY_ORGANIZATIONS);
  return (data?.items ?? []).map(mapOrg);
};

// --- Dealer marketplace ----------------------------------------------------------

// The dealer org's own listings (all statuses).
export const getDealerListings = orgId =>
  orgCall(async () => {
    const data = await request(ENDPOINTS.dealerListings(orgId));
    return (data?.listings ?? []).map(mapDealerListing);
  });

// listing: { category ('PASSENGER' | 'TWO_WHEELER'), make, model, year, fuel,
//   askPrice (rupees), city ('PUNE' | 'PCMC' | null) } - the web's create form.
// The new listing starts in review. Returns it.
export const createDealerListing = (orgId, { category, make, model, year, fuel, askPrice, city }) =>
  orgCall(async () => {
    const data = await request(ENDPOINTS.dealerListings(orgId), {
      method: 'POST',
      body: {
        vehicle: { category, make: make.trim(), model: model.trim(), mfg_year: Number(year), fuel },
        ask_price_minor: Math.round(Number(askPrice) * 100),
        city: city || null,
      },
    });
    return mapDealerListing(data.listing);
  });

// Takes a listing back (while draft / in review / live). Returns it.
export const withdrawDealerListing = (orgId, listingId) =>
  orgCall(async () => {
    const data = await request(ENDPOINTS.dealerListingWithdraw(orgId, listingId), { method: 'POST' });
    return mapDealerListing(data.listing);
  });

// Other dealers' live stock. filters: { category, fuel, priceMax (rupees) }.
export const browseDealerStock = async ({ category, fuel, priceMax } = {}) => {
  const data = await request(
    `${ENDPOINTS.DEALER_BROWSE}${query({
      category,
      fuel,
      price_max: priceMax != null ? Math.round(Number(priceMax) * 100) : null,
    })}`,
  );
  return (data?.listings ?? []).map(mapDealerStock);
};

// --- Institutional portal (read-only) ---------------------------------------------

// filters: { status, category, location, ageingBucket, cursor }.
// Returns { items, nextCursor } (nextCursor null on the last page).
export const getPortfolio = (orgId, { status, category, location, ageingBucket, cursor } = {}) =>
  orgCall(async () => {
    const data = await request(
      `${ENDPOINTS.orgPortfolio(orgId)}${query({ status, category, location, ageing_bucket: ageingBucket, cursor })}`,
    );
    return { items: (data?.data ?? []).map(mapPortfolioItem), nextCursor: data?.next_cursor ?? null };
  });

export const getIntakeList = orgId =>
  orgCall(async () => (await request(ENDPOINTS.orgIntake(orgId)))?.intake?.map(mapIntakeSummary) ?? []);

export const getIntake = (orgId, intakeId) =>
  orgCall(async () => mapIntake((await request(ENDPOINTS.orgIntakeItem(orgId, intakeId))).intake));

export const getYard = orgId =>
  orgCall(async () => (await request(ENDPOINTS.orgYard(orgId)))?.placements?.map(mapPlacementSummary) ?? []);

export const getPlacement = (orgId, placementId) =>
  orgCall(async () => mapPlacement((await request(ENDPOINTS.orgYardItem(orgId, placementId))).placement));

// --- Bulk repo-intake import (LENDER / YARD) --------------------------------------

// The CSV template the web offers for download - the bank sheet headers the
// importer maps, plus one example row.
export const INTAKE_CSV_TEMPLATE =
  'Reg#,Asset,Segment,YOM,Fuel,Chassis Desc.,Engine No.,HP NO.,Repo Date,Vehicle Parked Place,Contact Person/Number\n' +
  'DL10AB6384,HONDA GRAZIA DLX,2W,2021,Petrol,ME4JF996KMW001852,JF99EW0117280,TWL0122,12/09/2026,Sharma Farm,Vivek 9599917840\n';

// The server takes the CSV inline (as text, up to 5 MB) with the lot's
// SARFAESI authority document key, and processes it in the same call.
// input: { filename, csvContent, authorityKey }. Returns the finished job.
// Errors carry the web's messages (feature off, unknown org, inactive org).
export const createIntakeImport = async (orgId, { filename, csvContent, authorityKey }) => {
  try {
    const data = await request(ENDPOINTS.orgIntakeImports(orgId), {
      method: 'POST',
      body: {
        filename: filename || 'repo-stock.csv',
        csv_content: csvContent,
        authority: { doc_type: 'SARFAESI_AUTHORITY', s3_key: authorityKey.trim() },
      },
      // Every row is processed inside this call, so give it longer.
      timeoutMs: 60000,
    });
    return mapImportJob(data.import);
  } catch (e) {
    if (!(e instanceof ApiError) || e.isNetworkError) {
      throw e;
    }
    let key = 'business.import.error.generic';
    if (e.status === 503 || e.code === BULK_INTAKE_UNAVAILABLE) {
      key = 'business.import.error.unavailable';
    } else if (e.status === 404) {
      key = 'business.import.error.noOrg';
    } else if (e.status === 409) {
      key = 'business.import.error.notActive';
    } else if (e.status === 422 || e.status === 400) {
      key = 'business.import.error.invalid';
    }
    throw new ApiError({ status: e.status, code: e.code, message: tNow(key), details: e.details });
  }
};

// The org's import jobs, newest first.
export const getIntakeImports = orgId =>
  orgCall(async () => (await request(ENDPOINTS.orgIntakeImports(orgId)))?.imports?.map(mapImportJob) ?? []);

export const getIntakeImport = (orgId, importId) =>
  orgCall(async () => mapImportJob((await request(ENDPOINTS.orgIntakeImport(orgId, importId))).import));

// One page of a job's per-row results. opts: { status, cursor, limit (200) }.
// Returns { rows, nextCursor }.
export const getIntakeImportRows = (orgId, importId, { status, cursor, limit = 200 } = {}) =>
  orgCall(async () => {
    const data = await request(`${ENDPOINTS.orgIntakeImportRows(orgId, importId)}${query({ status, cursor, limit })}`);
    return { rows: (data?.rows ?? []).map(mapImportRow), nextCursor: data?.next_cursor ?? null };
  });
