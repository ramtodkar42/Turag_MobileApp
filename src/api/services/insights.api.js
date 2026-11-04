import { request } from '../client';
import { USE_REAL_API } from '../config';
import { ENDPOINTS } from '../endpoints';

// Customer insights (the web's ADR-0062): a few optional questions, owner-scoped on
// the server. They're a favour, never a gate: nothing else depends on them, so every
// caller treats a failure as "don't ask right now".
const real = () => USE_REAL_API.auth;

// The "tell us about you" answers, or null when neither answered nor skipped.
export const getMyProfileAnswers = async () => {
  if (!real()) return { skipped: true };
  const data = await request(ENDPOINTS.PROFILE_ANSWERS);
  return data?.answers ?? null;
};

// answers: { heard_from, heard_from_other, intents, timeline }, or { skip: true }.
// Skipping never erases earlier answers.
export const saveProfileAnswers = async answers => {
  if (!real()) return answers;
  const data = await request(ENDPOINTS.PROFILE_ANSWERS, { method: 'PUT', body: answers });
  return data?.answers ?? null;
};

// This user's earlier answer about a subject, or null. kind: 'VALUE_ACCURACY' | 'NPS' | 'BOOKING_CANCEL_REASON'.
export const getMyFeedback = async (kind, subjectId) => {
  if (!real()) return null;
  const query = `?kind=${encodeURIComponent(kind)}&subject_id=${encodeURIComponent(subjectId)}`;
  const data = await request(`${ENDPOINTS.FEEDBACK}${query}`);
  return data?.feedback ?? null;
};

// One answer: { kind, subject_id, score?, choice?, comment? }. Repeats keep the first.
export const submitFeedback = async body => {
  if (!real()) return body;
  const data = await request(ENDPOINTS.FEEDBACK, { method: 'POST', body });
  return data?.feedback ?? null;
};
