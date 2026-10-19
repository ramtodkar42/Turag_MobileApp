import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { ROUTES } from './routes';
import Intro from '../screens/onboarding/Intro/Intro';
import Login from '../screens/auth/Login/Login';
import VerifyOtp from '../screens/auth/VerifyOtp/VerifyOtp';
import CompleteProfile from '../screens/auth/CompleteProfile/CompleteProfile';
import AuthSuccess from '../screens/auth/AuthSuccess/AuthSuccess';
import ChatSplash from '../screens/chat/ChatSplash/ChatSplash';
import Chat from '../screens/chat/Chat/Chat';
import EvaluateChat from '../screens/valuation/EvaluateChat/EvaluateChat';
import BookAppointment from '../screens/booking/BookAppointment/BookAppointment';
import BookingSummary from '../screens/booking/BookingSummary/BookingSummary';
import BookingPayment from '../screens/booking/BookingPayment/BookingPayment';
import PaymentStatus from '../screens/booking/PaymentStatus/PaymentStatus';
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
import MyListing from '../screens/selling/MyListing/MyListing';
import MyListings from '../screens/selling/MyListings/MyListings';
import CreateListing from '../screens/listing/CreateListing/CreateListing';
import PersonalInfo from '../screens/profile/PersonalInfo/PersonalInfo';
import Language from '../screens/profile/Language/Language';
import VehicleCamera from '../screens/valuation/VehicleCamera/VehicleCamera';
import ValuationResult from '../screens/valuation/ValuationResult/ValuationResult';
import GarageVehicle from '../screens/garage/GarageVehicle/GarageVehicle';
import ComingSoon from '../screens/common/ComingSoon/ComingSoon';
import MainTabs from './MainTabs';
import InspectorTabs from './InspectorTabs';
import JobDetails from '../screens/inspector/JobDetails/JobDetails';
import Capture from '../screens/inspector/Capture/Capture';
import SelfInspection from '../screens/selfInspection/SelfInspection/SelfInspection';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  contentStyle: { backgroundColor: colors.white },
};

// Screens that appear on their own (no user tap) fade in instead of sliding.
const fade = { animation: 'fade' };


// initialRoute: { name, params } picked at app start (signed out -> Intro,
// signed in -> their home, mid sign-up -> Create Account).
function RootNavigator({ initialRoute = { name: ROUTES.INTRO } }) {
  return (
    <Stack.Navigator initialRouteName={initialRoute.name} screenOptions={screenOptions}>
      <Stack.Screen name={ROUTES.INTRO} component={Intro} />
      <Stack.Screen
        name={ROUTES.LOGIN}
        component={Login}
        options={{ ...fade, contentStyle: { backgroundColor: colors.primary } }}
      />
      <Stack.Screen name={ROUTES.VERIFY_OTP} component={VerifyOtp} />
      <Stack.Screen
        name={ROUTES.COMPLETE_PROFILE}
        component={CompleteProfile}
        initialParams={initialRoute.name === ROUTES.COMPLETE_PROFILE ? initialRoute.params : undefined}
      />
      <Stack.Screen name={ROUTES.AUTH_SUCCESS} component={AuthSuccess} options={fade} />
      <Stack.Screen name={ROUTES.MAIN_TABS} component={MainTabs} options={fade} />
      <Stack.Screen name={ROUTES.INSPECTOR_TABS} component={InspectorTabs} options={fade} />
      <Stack.Screen name={ROUTES.JOB_DETAILS} component={JobDetails} />
      {/* No iOS swipe-back: back steps through the wizard (see useLeaveGuard). */}
      <Stack.Screen
        name={ROUTES.INSPECTION_CAPTURE}
        component={Capture}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name={ROUTES.SELF_INSPECTION} component={SelfInspection} />
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
      <Stack.Screen name={ROUTES.BOOKING_PAYMENT} component={BookingPayment} />
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
      <Stack.Screen name={ROUTES.MY_BOOKINGS} component={MyBookings} />
      <Stack.Screen name={ROUTES.BOOKING_DETAILS} component={BookingDetails} />
      <Stack.Screen name={ROUTES.BOOKING_CHAT} component={BookingChat} />
      <Stack.Screen name={ROUTES.INSPECTION_REPORT} component={InspectionReport} />
      <Stack.Screen name={ROUTES.BOOKING_RECEIPT} component={BookingReceipt} />
      <Stack.Screen name={ROUTES.MY_OFFERS} component={MyOffers} />
      <Stack.Screen name={ROUTES.MY_LISTING} component={MyListing} />
      <Stack.Screen name={ROUTES.MY_LISTINGS} component={MyListings} />
      <Stack.Screen name={ROUTES.CREATE_LISTING} component={CreateListing} />
      <Stack.Screen name={ROUTES.PERSONAL_INFO} component={PersonalInfo} />
      <Stack.Screen name={ROUTES.LANGUAGE} component={Language} />
      <Stack.Screen name={ROUTES.PROFILE_SECTION} component={ComingSoon} />
    </Stack.Navigator>
  );
}

export default RootNavigator;
