// My jobs filters, as the web's job board (jobs-filter.ts): the queue is
// already loaded, so this only narrows what's shown - the server decides which
// jobs the inspector sees. Pure (no React), so it's easy to test.
import { toIsoDate } from '../../../utils/date';
import { cityLabel } from '../../../utils/address';
import { isJobExpired } from '../constants';

// Status chips (only the statuses an inspector sees), in this order.
export const STATUS_CHOICES = ['ALL', 'ASSIGNED', 'ON_SITE', 'FULFILLED', 'CANCELLED'];

// q: search text; city: city code; from / to: inclusive days ('2026-10-25', '' = open).
export const EMPTY_FILTERS = { q: '', status: 'ALL', city: 'ALL', category: 'ALL', from: '', to: '' };

const DAY_MS = 24 * 60 * 60 * 1000;

// A slot (ms) -> its day on this phone ('2026-10-25'), the day the card shows.
export const dayKey = time => (time == null ? '' : toIsoDate(new Date(time)));

// Today, and `days` from today, for the Today / Next 7 days chips.
export const todayKey = (now = Date.now()) => dayKey(now);
export const dayOffsetKey = (days, now = Date.now()) => dayKey(now + days * DAY_MS);

// Search looks at the address, pincode, booking id, city and vehicle type.
const matchesQuery = (job, q) => {
  const needle = q.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return [job.building, job.address, job.pincode, job.id, job.cityCode, cityLabel(job.cityCode), job.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(needle);
};

export const filterJobs = (jobs, f) =>
  jobs.filter(job => {
    if (f.status !== 'ALL' && job.status !== f.status) return false;
    if (f.city !== 'ALL' && job.cityCode !== f.city) return false;
    if (f.category !== 'ALL' && job.category !== f.category) return false;
    if (f.from || f.to) {
      const day = dayKey(job.slotAt);
      if (!day) return false; // no slot can't be inside a date range
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
    }
    return matchesQuery(job, f.q);
  });

export const hasActiveFilters = f =>
  f.q.trim() !== '' ||
  f.status !== 'ALL' ||
  f.city !== 'ALL' ||
  f.category !== 'ALL' ||
  f.from !== '' ||
  f.to !== '';

// Count per status chip, for the jobs matching every other filter (so a
// chip's count is what tapping it shows).
export const statusCounts = (jobs, f) => {
  const rest = filterJobs(jobs, { ...f, status: 'ALL' });
  const counts = { ALL: rest.length };
  rest.forEach(job => {
    counts[job.status] = (counts[job.status] ?? 0) + 1;
  });
  return counts;
};

// The cities / vehicle types in the queue (the selects only show with 2+).
export const citiesIn = jobs => [...new Set(jobs.map(j => j.cityCode).filter(Boolean))];
export const categoriesIn = jobs => [...new Set(jobs.map(j => j.category).filter(Boolean))];

// The list's groups, as the web: to do (assigned / on site), expired
// (assigned but past the start grace - can't be started), the rest.
export const groupJobs = (jobs, now = Date.now()) => {
  const active = [];
  const expired = [];
  const done = [];
  jobs.forEach(job => {
    if (isJobExpired(job, now)) {
      expired.push(job);
    } else if (job.status === 'ASSIGNED' || job.status === 'ON_SITE') {
      active.push(job);
    } else {
      done.push(job);
    }
  });
  return { active, expired, done };
};
