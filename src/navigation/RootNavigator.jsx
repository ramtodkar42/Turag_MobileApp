import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { ROUTES } from './routes';
import Intro from '../screens/onboarding/Intro/Intro';
import Login from '../screens/auth/Login/Login';
import VerifyOtp from '../screens/auth/VerifyOtp/VerifyOtp';
import EmailLogin from '../screens/auth/EmailLogin/EmailLogin';
import CompleteProfile from '../screens/auth/CompleteProfile/CompleteProfile';
import AuthSuccess from '../screens/auth/AuthSuccess/AuthSuccess';
import ChatSplash from '../screens/chat/ChatSplash/ChatSplash';
import Chat from '../screens/chat/Chat/Chat';
import EvaluateChat from '../screens/valuation/EvaluateChat/EvaluateChat';
import BookAppointment from '../screens/booking/BookAppointment/BookAppointment';
import BookingSummary from '../screens/booking/BookingSummary/BookingSummary';
import BookingComingSoon from '../screens/booking/BookingComingSoon/BookingComingSoon';
import PaymentStatus from '../screens/booking/PaymentStatus/PaymentStatus';
import VerifyIdentity from '../screens/booking/VerifyIdentity/VerifyIdentity';
import BookingConfirmed from '../screens/booking/BookingConfirmed/BookingConfirmed';
import MyBookings from '../screens/account/MyBookings/MyBookings';
import VehicleListing from '../screens/marketplace/VehicleListing/VehicleListing';
import MakeOffer from '../screens/marketplace/MakeOffer/MakeOffer';
import Notifications from '../screens/notifications/Notifications/Notifications';
import BookingDetails from '../screens/account/BookingDetails/BookingDetails';
import BookingChat from '../screens/account/BookingChat/BookingChat';
import InspectionReport from '../screens/account/InspectionReport/InspectionReport';
import BookingReceipt from '../screens/account/BookingReceipt/BookingReceipt';
import MyOffers from '../screens/offers/MyOffers/MyOffers';
import Search from '../screens/search/Search/Search';
import OfferDetails from '../screens/offers/OfferDetails/OfferDetails';
import LoanApplication from '../screens/offers/LoanApplication/LoanApplication';
import MyListing from '../screens/selling/MyListing/MyListing';
import MyListings from '../screens/selling/MyListings/MyListings';
import ListingPreview from '../screens/selling/ListingPreview/ListingPreview';
import PayoutAccounts from '../screens/selling/PayoutAccounts/PayoutAccounts';
import Settlements from '../screens/selling/Settlements/Settlements';
import BusinessHome from '../screens/business/BusinessHome/BusinessHome';
import DealerPortal from '../screens/business/DealerPortal/DealerPortal';
import DealerCreateListing from '../screens/business/DealerCreateListing/DealerCreateListing';
import InstitutionalPortal from '../screens/business/InstitutionalPortal/InstitutionalPortal';
import IntakeDetail from '../screens/business/IntakeDetail/IntakeDetail';
import PlacementDetail from '../screens/business/PlacementDetail/PlacementDetail';
import BulkImport from '../screens/business/BulkImport/BulkImport';
import ImportJob from '../screens/business/ImportJob/ImportJob';
import CreateListing from '../screens/listing/CreateListing/CreateListing';
import PersonalInfo from '../screens/profile/PersonalInfo/PersonalInfo';
import CarAlerts from '../screens/profile/CarAlerts/CarAlerts';
import IdentityVerification from '../screens/profile/IdentityVerification/IdentityVerification';
import DigiLocker from '../screens/profile/DigiLocker/DigiLocker';
import Language from '../screens/profile/Language/Language';
import VehicleCamera from '../screens/valuation/VehicleCamera/VehicleCamera';
import ValuationResult from '../screens/valuation/ValuationResult/ValuationResult';
import GarageVehicle from '../screens/garage/GarageVehicle/GarageVehicle';
import WebPage from '../screens/common/WebPage/WebPage';
import MainTabs from './MainTabs';
import accountScreen from './accountScreen';
import InspectorTabs from './InspectorTabs';
import JobDetails from '../screens/inspector/JobDetails/JobDetails';
import SelfInspection from '../screens/selfInspection/SelfInspection/SelfInspection';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  contentStyle: { backgroundColor: colors.white },
};

// Screens that appear on their own (no user tap) fade in instead of sliding.
const fade = { animation: 'fade' };

// Profile pages that need an account: a guest who opens one is asked to log
// in, with what the page is for (back on this page after logging in).
const AccountPersonalInfo = accountScreen(PersonalInfo, {
  withBack: true,
  titleKey: 'profile.item.personalInfo',
  icon: 'user',
  headingKey: 'guest.personalInfo.title',
  messageKey: 'guest.personalInfo.message',
});
const AccountCarAlerts = accountScreen(CarAlerts, {
  withBack: true,
  titleKey: 'profile.item.carAlerts',
  icon: 'bell',
  headingKey: 'guest.carAlerts.title',
  messageKey: 'guest.carAlerts.message',
});
const AccountMyBookings = accountScreen(MyBookings, {
  withBack: true,
  titleKey: 'profile.item.myBookings',
  icon: 'calendar',
  headingKey: 'guest.bookings.title',
  messageKey: 'guest.bookings.message',
});
const AccountMyOffers = accountScreen(MyOffers, {
  withBack: true,
  titleKey: 'profile.item.myOffers',
  icon: 'tag',
  headingKey: 'guest.offers.title',
  messageKey: 'guest.offers.message',
});
const AccountMyListings = accountScreen(MyListings, {
  withBack: true,
  titleKey: 'profile.item.myListings',
  icon: 'store',
  headingKey: 'guest.listings.title',
  messageKey: 'guest.listings.message',
});
const AccountSettlements = accountScreen(Settlements, {
  withBack: true,
  titleKey: 'profile.item.settlements',
  icon: 'rupee',
  headingKey: 'guest.settlements.title',
  messageKey: 'guest.settlements.message',
});
const AccountPayoutAccounts = accountScreen(PayoutAccounts, {
  withBack: true,
  titleKey: 'profile.item.payoutAccounts',
  icon: 'bank',
  headingKey: 'guest.payouts.title',
  messageKey: 'guest.payouts.message',
});
const AccountIdentityVerification = accountScreen(IdentityVerification, {
  withBack: true,
  titleKey: 'profile.item.verification',
  icon: 'shieldCheck',
  headingKey: 'guest.verification.title',
  messageKey: 'guest.verification.message',
});

// initialRoute: { name, params } picked at app start (signed out -> Intro,
// signed in -> their home, mid sign-up -> Create Account).
function RootNavigator({ initialRoute = { name: ROUTES.INTRO } }) {
  return (
    <Stack.Navigator initialRouteName={initialRoute.name} screenOptions={screenOptions}>
      <Stack.Screen name={ROUTES.INTRO} component={Intro} />
      {/* Opened by a guest from inside the app: rises from the bottom over the screen they were on. */}
      <Stack.Screen
        name={ROUTES.LOGIN}
        component={Login}
        options={({ route }) => ({
          animation: route.params?.fromGuest ? 'slide_from_bottom' : 'fade',
          contentStyle: { backgroundColor: colors.primary },
        })}
      />
      <Stack.Screen name={ROUTES.VERIFY_OTP} component={VerifyOtp} />
      <Stack.Screen name={ROUTES.EMAIL_LOGIN} component={EmailLogin} />
      <Stack.Screen
        name={ROUTES.COMPLETE_PROFILE}
        component={CompleteProfile}
        initialParams={initialRoute.name === ROUTES.COMPLETE_PROFILE ? initialRoute.params : undefined}
      />
      <Stack.Screen name={ROUTES.AUTH_SUCCESS} component={AuthSuccess} options={fade} />
      <Stack.Screen name={ROUTES.MAIN_TABS} component={MainTabs} options={fade} />
      <Stack.Screen name={ROUTES.INSPECTOR_TABS} component={InspectorTabs} options={fade} />
      <Stack.Screen name={ROUTES.JOB_DETAILS} component={JobDetails} />
      {/* The capture for both the owner's self-inspection and the inspector's
          doorstep inspection. No iOS swipe-back: back asks before leaving
          (see useLeaveGuard). */}
      <Stack.Screen
        name={ROUTES.SELF_INSPECTION}
        component={SelfInspection}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name={ROUTES.CHAT_SPLASH} component={ChatSplash} options={fade} />
      <Stack.Screen name={ROUTES.CHAT} component={Chat} options={fade} />
      <Stack.Screen name={ROUTES.EVALUATE_CHAT} component={EvaluateChat} />
      <Stack.Screen
        name={ROUTES.VEHICLE_CAMERA}
        component={VehicleCamera}
        options={{ animation: 'slide_from_bottom', contentStyle: { backgroundColor: colors.black } }}
      />
      <Stack.Screen name={ROUTES.VALUATION_RESULT} component={ValuationResult} />
      <Stack.Screen name={ROUTES.GARAGE_VEHICLE} component={GarageVehicle} />
      <Stack.Screen name={ROUTES.BOOK_APPOINTMENT} component={BookAppointment} />
      <Stack.Screen name={ROUTES.BOOKING_SUMMARY} component={BookingSummary} />
      <Stack.Screen name={ROUTES.BOOKING_COMING_SOON} component={BookingComingSoon} />
      <Stack.Screen name={ROUTES.VERIFY_IDENTITY} component={VerifyIdentity} />
      {/* No swipe-back while the payment is verified (Android back: see the screen). */}
      <Stack.Screen
        name={ROUTES.PAYMENT_STATUS}
        component={PaymentStatus}
        options={{ ...fade, gestureEnabled: false }}
      />
      <Stack.Screen name={ROUTES.BOOKING_CONFIRMED} component={BookingConfirmed} options={fade} />
      <Stack.Screen name={ROUTES.VEHICLE_LISTING} component={VehicleListing} />
      <Stack.Screen name={ROUTES.MAKE_OFFER} component={MakeOffer} />
      <Stack.Screen name={ROUTES.NOTIFICATIONS} component={Notifications} />
      <Stack.Screen name={ROUTES.MY_BOOKINGS} component={AccountMyBookings} />
      <Stack.Screen name={ROUTES.BOOKING_DETAILS} component={BookingDetails} />
      <Stack.Screen name={ROUTES.BOOKING_CHAT} component={BookingChat} />
      <Stack.Screen name={ROUTES.INSPECTION_REPORT} component={InspectionReport} />
      <Stack.Screen name={ROUTES.BOOKING_RECEIPT} component={BookingReceipt} />
      <Stack.Screen name={ROUTES.MY_OFFERS} component={AccountMyOffers} />
      <Stack.Screen name={ROUTES.SEARCH} component={Search} options={fade} />
      <Stack.Screen name={ROUTES.OFFER_DETAILS} component={OfferDetails} />
      <Stack.Screen name={ROUTES.LOAN_APPLICATION} component={LoanApplication} />
      <Stack.Screen name={ROUTES.MY_LISTING} component={MyListing} />
      <Stack.Screen name={ROUTES.MY_LISTINGS} component={AccountMyListings} />
      <Stack.Screen name={ROUTES.LISTING_PREVIEW} component={ListingPreview} />
      <Stack.Screen name={ROUTES.SETTLEMENTS} component={AccountSettlements} />
      <Stack.Screen name={ROUTES.PAYOUT_ACCOUNTS} component={AccountPayoutAccounts} />
      {/* Business accounts (organization members only; opened from Profile). */}
      <Stack.Screen name={ROUTES.BUSINESS_HOME} component={BusinessHome} />
      <Stack.Screen name={ROUTES.DEALER_PORTAL} component={DealerPortal} />
      <Stack.Screen name={ROUTES.DEALER_CREATE_LISTING} component={DealerCreateListing} />
      <Stack.Screen name={ROUTES.INSTITUTIONAL_PORTAL} component={InstitutionalPortal} />
      <Stack.Screen name={ROUTES.INTAKE_DETAIL} component={IntakeDetail} />
      <Stack.Screen name={ROUTES.YARD_PLACEMENT_DETAIL} component={PlacementDetail} />
      <Stack.Screen name={ROUTES.BULK_INTAKE_IMPORT} component={BulkImport} />
      <Stack.Screen name={ROUTES.INTAKE_IMPORT_JOB} component={ImportJob} />
      <Stack.Screen name={ROUTES.CREATE_LISTING} component={CreateListing} />
      <Stack.Screen name={ROUTES.PERSONAL_INFO} component={AccountPersonalInfo} />
      <Stack.Screen name={ROUTES.CAR_ALERTS} component={AccountCarAlerts} />
      <Stack.Screen name={ROUTES.IDENTITY_VERIFICATION} component={AccountIdentityVerification} />
      <Stack.Screen name={ROUTES.DIGILOCKER} component={DigiLocker} />
      <Stack.Screen name={ROUTES.LANGUAGE} component={Language} />
      <Stack.Screen name={ROUTES.WEB_PAGE} component={WebPage} />
    </Stack.Navigator>
  );
}

export default RootNavigator;
