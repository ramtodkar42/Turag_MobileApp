// All screen names in one place - never type route strings in screens.
export const ROUTES = {
  INTRO: 'Intro',

  // Auth: Login (mobile) -> VerifyOtp -> AuthSuccess ("Login Successful") -> Home,
  // or for new users -> CompleteProfile ("Create Account"; its email "Verify"
  // opens VerifyOtp (email) and comes back) -> AuthSuccess ("Account Created") -> Home
  LOGIN: 'Login',
  VERIFY_OTP: 'VerifyOtp',
  COMPLETE_PROFILE: 'CompleteProfile',
  AUTH_SUCCESS: 'AuthSuccess',

  MAIN_TABS: 'MainTabs', // consumer app
  INSPECTOR_TABS: 'InspectorTabs', // inspection officer app
  JOB_DETAILS: 'JobDetails', // inspector: one job (start / continue the inspection)
  INSPECTION_CAPTURE: 'InspectionCapture', // inspector: the M2 checklist + photos, submit
  SELF_INSPECTION: 'SelfInspection', // customer's own self-inspection (M1), as the web's /inspect
  CHAT_SPLASH: 'ChatSplash',
  CHAT: 'Chat',

  // Evaluate (valuation) - opened from the Evaluate tab: a chat with TURAG.AI,
  // then the self-inspection (INSPECTION_CAPTURE) -> ValuationResult, or booking.
  EVALUATE_CHAT: 'EvaluateChat',
  VEHICLE_CAMERA: 'VehicleCamera',
  VALUATION_RESULT: 'ValuationResult',

  // Garage (user's own vehicles)
  GARAGE_VEHICLE: 'GarageVehicle',

  // Booking a doorstep inspection (Appoint an Inspector / My inspections):
  // BookAppointment -> BookingSummary -> BookingPayment -> PaymentStatus ->
  // BookingConfirmed -> BookingDetails. The fee is paid to confirm the booking.
  BOOK_APPOINTMENT: 'BookAppointment',
  BOOKING_SUMMARY: 'BookingSummary',
  BOOKING_PAYMENT: 'BookingPayment', // pick how to pay the fee
  PAYMENT_STATUS: 'PaymentStatus', // "Hold On" while the payment is verified
  BOOKING_CONFIRMED: 'BookingConfirmed',
  MY_BOOKINGS: 'MyBookings', // My inspections (Profile)

  // Selling: Garage vehicle -> CreateListing (a draft) -> MyListing (submit
  // for review, price, withdraw, offers); My listings in Profile.
  CREATE_LISTING: 'CreateListing',
  MY_LISTINGS: 'MyListings',

  // Marketplace (buying)
  VEHICLE_LISTING: 'VehicleListing',
  MAKE_OFFER: 'MakeOffer',

  // Notifications (bell on Home) and the pages they open
  NOTIFICATIONS: 'Notifications',
  BOOKING_DETAILS: 'BookingDetails', // a booked inspection (status, cancel, chat, report)
  BOOKING_CHAT: 'BookingChat', // chat with the inspector
  INSPECTION_REPORT: 'InspectionReport',
  BOOKING_RECEIPT: 'BookingReceipt', // a paid booking's receipt (download as PDF)
  MY_OFFERS: 'MyOffers', // buyer: offers made (+ orders)
  MY_LISTING: 'MyListing', // seller: one listing (manage it) and the offers it received

  // Profile
  PERSONAL_INFO: 'PersonalInfo',
  LANGUAGE: 'Language',
  PROFILE_SECTION: 'ProfileSection', // placeholder for menu items not built yet

  // Bottom tabs
  MARKET: 'Market',
  EVALUATE: 'Evaluate',
  GARAGE: 'Garage',
  SAVED: 'Saved',
  PROFILE: 'Profile',
  INSPECTIONS: 'Inspections', // inspector only: My jobs
};
