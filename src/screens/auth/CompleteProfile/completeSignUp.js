import { ApiError } from '../../../api/client';
import {
  acceptConsents,
  getMe,
  registerBusinessInterest,
  saveMyEmail,
  updateMyName,
} from '../../../api/services/profile.api';
import { updateSession } from '../../../api/session';
import { getUser, setUser } from '../../../store/userStore';
import { tNow } from '../../../i18n';

const EMAIL_IN_USE = 'EMAIL_IN_USE';
// "What brings you to Turag?" answers that are a business (told to Turag's team).
const BUSINESS_KINDS = { dealer: 'DEALER', bank: 'BANK' };

// An error shown on one form field (useProfileForm reads `field`).
const fieldError = (field, message) => Object.assign(new Error(message), { field });

// Saves what Create Account collected, in the order the backend needs:
// 1. consents (the backend won't save a profile before Terms + Privacy),
// 2. name, 3. email. Then the user is fully signed up.
// The email is saved unverified and Turag emails a link to confirm it whenever
// the user likes (as the web). "Best effort": a mail-service problem must not
// block sign-up, but an address that belongs to another account is shown on
// the Email field.
// Returns { user, emailNotice: { email, sent } | null } - sent: false when the
// link couldn't go out now (the user can resend it from Personal Information).
// `purpose` isn't stored by the backend yet, so it is kept on the device.
export default async function completeSignUp({
  needsProfile,
  needsConsent,
  values: { fullName, email, purpose },
  consents,
}) {
  const phone = getUser()?.contact;

  if (needsConsent) {
    await acceptConsents({
      terms: consents.terms,
      privacy: consents.privacy,
      marketing: consents.updates,
      // WhatsApp updates: only sent when ticked (as the web).
      ...(consents.whatsapp ? { whatsapp: true } : null),
    });
  }

  let user;
  let emailNotice = null;
  if (needsProfile) {
    user = await updateMyName(fullName, { phone });
    if (email) {
      try {
        await saveMyEmail(email);
        user = { ...user, email, emailVerified: false };
        emailNotice = { email, sent: true };
      } catch (e) {
        if (e instanceof ApiError && e.code === EMAIL_IN_USE) {
          throw fieldError('email', tNow('auth.create.emailInUse'));
        }
        if (!(e instanceof ApiError) || e.isNetworkError || e.isAuthError) {
          throw e;
        }
        // Mail service down: the account works; the link can be resent later.
        emailNotice = { email, sent: false };
      }
    }
  } else {
    ({ user } = await getMe({ phone }));
  }

  // A dealer or a bank / NBFC: Turag's team reaches out (as the web). Never
  // holds up the account that was just made.
  const businessKind = BUSINESS_KINDS[purpose];
  if (businessKind) {
    await registerBusinessInterest(businessKind).catch(() => {});
  }

  const signedUp = { ...user, contact: phone ?? user.contact, ...(purpose ? { purpose } : null) };
  setUser(signedUp);
  await updateSession({ user: signedUp, pending: null });
  return { user: signedUp, emailNotice };
}
