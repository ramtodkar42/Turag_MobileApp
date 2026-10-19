import { ApiError } from '../../../api/client';
import {
  acceptConsents,
  getMe,
  saveMyEmail,
  updateMyName,
} from '../../../api/services/profile.api';
import { updateSession } from '../../../api/session';
import { getUser, setUser } from '../../../store/userStore';
import { tNow } from '../../../i18n';

const EMAIL_IN_USE = 'EMAIL_IN_USE';

// An error shown on one form field (useProfileForm reads `field`).
const fieldError = (field, message) => Object.assign(new Error(message), { field });

// Saves what Create Account collected, in the order the backend needs:
// 1. consents (the backend won't save a profile before Terms + Privacy),
// 2. name, 3. email. Then the user is fully signed up.
// The email is "best effort": a mail-service problem must not block sign-up,
// but an address that belongs to another account is shown on the Email field.
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
    });
  }

  let user;
  if (needsProfile) {
    user = await updateMyName(fullName, { phone });
    if (email) {
      try {
        await saveMyEmail(email);
        user = { ...user, email };
      } catch (e) {
        if (e instanceof ApiError && e.code === EMAIL_IN_USE) {
          throw fieldError('email', tNow('auth.create.emailInUse'));
        }
        if (!(e instanceof ApiError) || e.isNetworkError || e.isAuthError) {
          throw e;
        }
        // Mail service down: the account works; the email can be added later.
      }
    }
  } else {
    ({ user } = await getMe({ phone }));
  }

  const signedUp = { ...user, contact: phone ?? user.contact, ...(purpose ? { purpose } : null) };
  setUser(signedUp);
  await updateSession({ user: signedUp, pending: null });
  return signedUp;
}
