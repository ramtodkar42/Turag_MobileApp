import {
  linkGoogle,
  sendLoginOtp,
  verifyLoginOtp,
} from '../../../api/services/auth.api';
import { startSession } from '../../../api/session';
import {
  getPendingSteps,
  routeAfterSignIn,
} from '../../../navigation/authRoutes';
import { setUser } from '../../../store/userStore';
import { ROUTES } from '../../../navigation/routes';

// What VerifyOtp does for each OTP it can check (today: the mobile login OTP).
// params come from the route: phone: { phone, via?, otpToken, resendAfter, devHint? }
// (via: 'whatsapp' | 'sms' - how the code was sent; resend uses the same;
// google: { token, name, email } - came from "Continue with Google").
// resend() returns params to merge (a new otpToken, ...), or nothing.
// verify() returns where to go next: { reset: [route, params] } (signed in, history
// cleared) or { navigate: [route, params] }.
const otpChannels = {
  // Login: the mobile OTP opens a session (a new number creates the account).
  // Existing users see "Login Successful" then their home (consumer or inspector,
  // by role); new users finish Create Account first.
  phone: {
    sentTo: ({ phone }) => `+91 ${phone}`,
    resend: async ({ phone, via }) => {
      const { otpToken, resendAfter, devHint } = await sendLoginOtp({
        phone,
        channel: via,
      });
      return { otpToken, resendAfter, devHint };
    },
    verify: async ({ phone, otpToken, google }, otp) => {
      const result = await verifyLoginOtp({ phone, otpToken, otp });
      const user = { ...result.user, contact: phone };
      const pending = getPendingSteps(user, result.consentRequired);
      await startSession({ ...result, user, pending });
      setUser(user);
      const [route, params] = routeAfterSignIn(user, pending);
      if (!google?.token) {
        return { reset: [route, params] };
      }
      // Came from Google (as the web): attach the Google email so next time
      // it signs straight in (best effort), and prefill Create Account.
      await linkGoogle(google.token).catch(() => false);
      return {
        reset: [
          route,
          route === ROUTES.COMPLETE_PROFILE
            ? {
                ...params,
                prefill: { fullName: google.name, email: google.email },
              }
            : params,
        ],
      };
    },
  },
};

export default otpChannels;
