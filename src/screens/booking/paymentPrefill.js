import { getUser } from '../../store/userStore';

// The signed-in user's name, email and mobile, filled into the payment window
// so they don't type them again (only what's known is sent).
export const paymentPrefill = () => {
  const user = getUser();
  return {
    ...(user?.fullName ? { name: user.fullName } : {}),
    ...(user?.email ? { email: user.email } : {}),
    ...(user?.contact ? { contact: user.contact } : {}),
  };
};
