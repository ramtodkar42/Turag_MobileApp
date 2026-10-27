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
  // The inspection capture: the owner's self-inspection (M1, as the web's /inspect)
  // and the inspector's doorstep inspection (M2, with { bookingId }).
  SELF_INSPECTION: 'SelfInspection',
  CHAT_SPLASH: 'ChatSplash',
  CHAT: 'Chat',

  // Evaluate (valuation) - opened from the Evaluate tab: a chat with TURAG.AI,
  // then the self-inspection (SELF_INSPECTION) -> ValuationResult, or booking.
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
  VERIFY_IDENTITY: 'VerifyIdentity', // ID document + selfie before paying (when not verified yet)
  PAYMENT_STATUS: 'PaymentStatus', // "Hold On" while the payment is verified
  BOOKING_CONFIRMED: 'BookingConfirmed',
  BOOKING_COMING_SOON: 'BookingComingSoon', // the address is in a city Turag doesn't serve yet
  MY_BOOKINGS: 'MyBookings', // My inspections (Profile)

  // Selling: Garage vehicle -> CreateListing (a draft) -> MyListing (submit
  // for review, price, withdraw, offers); My listings in Profile.
  CREATE_LISTING: 'CreateListing',
  MY_LISTINGS: 'MyListings',
  PAYOUT_ACCOUNTS: 'PayoutAccounts', // seller: the bank account sales are paid to
  SETTLEMENTS: 'Settlements', // seller: payouts for sold vehicles

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
  SEARCH: 'Search', // Home's search: recent, price ranges, brands, suggestions
  OFFER_DETAILS: 'OfferDetails', // buyer: one offer - pay the token, transfer documents
  LOAN_APPLICATION: 'LoanApplication', // apply for a loan for an accepted vehicle
  MY_LISTING: 'MyListing', // seller: one listing (manage it) and the offers it received

  // Business accounts (Profile > Business accounts; only for organization members)
  BUSINESS_HOME: 'BusinessHome',
  DEALER_PORTAL: 'DealerPortal', // { org }
  DEALER_CREATE_LISTING: 'DealerCreateListing', // { org }
  INSTITUTIONAL_PORTAL: 'InstitutionalPortal', // { org }
  INTAKE_DETAIL: 'IntakeDetail', // { orgId, intakeId }
  YARD_PLACEMENT_DETAIL: 'YardPlacementDetail', // { orgId, placementId }
  BULK_INTAKE_IMPORT: 'BulkIntakeImport', // { org }
  INTAKE_IMPORT_JOB: 'IntakeImportJob', // { orgId, importId, job? }

  // Profile
  PERSONAL_INFO: 'PersonalInfo',
  CAR_ALERTS: 'CarAlerts', // WhatsApp alerts for newly listed cars
  DIGILOCKER: 'DigiLocker', // verify identity with DigiLocker (in the app)
  IDENTITY_VERIFICATION: 'IdentityVerification', // status of the ID check; opens VERIFY_IDENTITY to send one
  LISTING_PREVIEW: 'ListingPreview', // seller: the listing as buyers will see it
  LANGUAGE: 'Language',
  WEB_PAGE: 'WebPage', // a page of the Turag website inside the app (help, FAQ, legal)

  // Bottom tabs
  MARKET: 'Market',
  EVALUATE: 'Evaluate',
  GARAGE: 'Garage',
  SAVED: 'Saved',
  PROFILE: 'Profile',
  INSPECTIONS: 'Inspections', // inspector only: My jobs
};
