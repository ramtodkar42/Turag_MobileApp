import GuestView from '../screens/common/GuestView/GuestView';
import { useSignedIn } from '../store/userStore';

// A tab or page that needs an account: a guest sees what it's for and "Log in
// or sign up" instead (GuestView); the real screen appears as soon as they
// log in. guest: { titleKey, icon, headingKey, messageKey, withBack? }
export default function accountScreen(Screen, guest) {
  function AccountScreen(props) {
    return useSignedIn() ? <Screen {...props} /> : <GuestView {...props} {...guest} />;
  }
  return AccountScreen;
}
