// Every backend path in one place (relative to API_BASE_URL).
export const ENDPOINTS = {
  OTP_START: '/auth/otp/start',
  OTP_VERIFY: '/auth/otp/verify',
  OTP_CHANNELS: '/auth/otp/channels', // public: how the code can be sent (whatsapp / sms)
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  ME: '/me',
  EMAIL_START: '/me/email/start',
  MY_AVATAR: '/me/avatar', // the profile photo: POST a JPEG, GET it back (signed in)
  CONSENTS: '/consents',
  NOTIFICATIONS: '/notifications',
  NOTIFICATIONS_READ: '/notifications/read',
  NOTIFICATION_DEVICES: '/notifications/devices', // push: register / remove this phone
  MARKETPLACE_LISTINGS: '/marketplace/listings',
  marketplaceListing: id => `/marketplace/listings/${encodeURIComponent(id)}`,
  listingOffers: id => `/marketplace/listings/${encodeURIComponent(id)}/offers`,
  SAVED_LISTINGS: '/saved-listings',
  VEHICLE_PROPOSE: '/vehicles/propose',
  VEHICLE_CONFIRM: '/vehicles/confirm',
  VALUATION_ESTIMATE: '/valuations/estimate',
  INSPECTIONS: '/inspections',
  inspectionItem: (id, itemCode) =>
    `/inspections/${encodeURIComponent(id)}/items/${encodeURIComponent(itemCode)}`,
  inspectionSubmit: id => `/inspections/${encodeURIComponent(id)}/submit`,
  inspectionPay: id => `/inspections/${encodeURIComponent(id)}/pay`, // the self-inspection fee
  inspectionPaySimulate: id => `/inspections/${encodeURIComponent(id)}/pay/simulate`, // dev/stub only
  CAR_ALERTS: '/car-alerts', // WhatsApp alerts for newly listed cars
  carAlert: id => `/car-alerts/${encodeURIComponent(id)}`,
  mediaRequestUpload: inspectionId =>
    `/inspections/${encodeURIComponent(inspectionId)}/media/request-upload`,
  mediaCheckDuplicate: inspectionId =>
    `/inspections/${encodeURIComponent(inspectionId)}/media/check-duplicate`,
  mediaComplete: mediaId => `/media/${encodeURIComponent(mediaId)}/complete`,
  media: mediaId => `/media/${encodeURIComponent(mediaId)}`,
  SAVED_VEHICLES: '/saved-vehicles',
  savedVehicle: id => `/saved-vehicles/${encodeURIComponent(id)}`,
  savedListing: listingId => `/saved-listings/${encodeURIComponent(listingId)}`,

  // Bookings + reports
  BOOKINGS: '/inspection-bookings',
  BOOKING_SLOTS: '/inspection-bookings/slots',
  BOOKING_QUEUE: '/inspection-bookings/queue', // inspector: my jobs
  VEHICLE_IDENTIFY: '/vehicles/identify', // inspector: identify by make / model when the RC lookup can't
  inspection: id => `/inspections/${encodeURIComponent(id)}`,
  inspectionIdentityExtract: id => `/inspections/${encodeURIComponent(id)}/identity-extract`,
  inspectionIdentityVerify: id => `/inspections/${encodeURIComponent(id)}/identity-verify`,
  inspectionMedia: id => `/inspections/${encodeURIComponent(id)}/media`,
  inspectionResume: id => `/inspections/${encodeURIComponent(id)}/resume`,
  inspectionReopen: id => `/inspections/${encodeURIComponent(id)}/reopen`,
  checklist: (category, version) =>
    `/checklists/${encodeURIComponent(category)}${version != null ? `?version=${encodeURIComponent(version)}` : ''}`,
  bookingCancel: id => `/inspection-bookings/${encodeURIComponent(id)}/cancel`,
  bookingPay: id => `/inspection-bookings/${encodeURIComponent(id)}/pay`,
  bookingPaySimulate: id => `/inspection-bookings/${encodeURIComponent(id)}/pay/simulate`,
  bookingMessages: id => `/inspection-bookings/${encodeURIComponent(id)}/messages`,
  VERIFICATION: '/verification', // the customer's identity verification (ID document + selfie)
  DIGILOCKER_START: '/verification/digilocker', // start a DigiLocker journey (returns its URL)
  DIGILOCKER_COMPLETE: '/verification/digilocker/complete', // back from DigiLocker: finish it
  BUSINESS_INTEREST: '/me/business-interest', // signed up as a dealer / bank: tell Turag's team
  SERVICE_AREA_CHECK: '/service-area/check', // public: is doorstep inspection offered at this place?
  SERVICE_AREA_LEADS: '/service-area/leads', // "notify me" when Turag launches in a city
  report: inspectionId => `/reports/${encodeURIComponent(inspectionId)}`,
  reportPdf: inspectionId => `/reports/${encodeURIComponent(inspectionId)}/pdf`,
  reportShare: inspectionId => `/reports/${encodeURIComponent(inspectionId)}/share`,

  // Offers + orders (buyer and seller)
  OFFERS: '/offers',
  offerAction: (id, action) => `/offers/${encodeURIComponent(id)}/${action}`,
  order: id => `/orders/${encodeURIComponent(id)}`,
  orderCancel: id => `/orders/${encodeURIComponent(id)}/cancel`,
  orderTokenPayment: id => `/orders/${encodeURIComponent(id)}/token-payment`,
  orderTokenPaymentSimulate: id => `/orders/${encodeURIComponent(id)}/token-payment/simulate`,
  orderHandover: id => `/orders/${encodeURIComponent(id)}/handover`,
  transferChecklist: id => `/orders/${encodeURIComponent(id)}/transfer-checklist`,
  transferDocument: (id, itemCode) =>
    `/orders/${encodeURIComponent(id)}/transfer-checklist/${encodeURIComponent(itemCode)}/document`,
  payment: id => `/payments/${encodeURIComponent(id)}`,
  LOAN_APPLICATIONS: '/loan-applications',

  // Seller payouts: the bank account sales are paid to (verified by Turag), and the settlements
  PAYOUT_ACCOUNTS: '/payout-accounts',
  payoutAccountActivate: id => `/payout-accounts/${encodeURIComponent(id)}/activate`,
  payoutAccountProof: id => `/payout-accounts/${encodeURIComponent(id)}/proof`, // POST the file, GET it back
  SETTLEMENTS: '/settlements',
  settlementReceipt: id => `/settlements/${encodeURIComponent(id)}/receipt`,
  LISTINGS: '/listings',
  myListing: id => `/listings/${encodeURIComponent(id)}`,
  listingSubmit: id => `/listings/${encodeURIComponent(id)}/submit`,
  myListingOffers: id => `/listings/${encodeURIComponent(id)}/offers`,

  // Business accounts (members of an organization): dealer listings, and the
  // lender / yard portfolio, intake, yard and bulk intake imports
  MY_ORGANIZATIONS: '/me/organizations',
  DEALER_BROWSE: '/dealer/listings',
  dealerListings: orgId => `/dealer/orgs/${encodeURIComponent(orgId)}/listings`,
  dealerListingWithdraw: (orgId, listingId) => `/dealer/orgs/${encodeURIComponent(orgId)}/listings/${encodeURIComponent(listingId)}/withdraw`,
  orgPortfolio: orgId => `/orgs/${encodeURIComponent(orgId)}/portfolio`,
  orgIntake: orgId => `/orgs/${encodeURIComponent(orgId)}/intake`,
  orgIntakeItem: (orgId, intakeId) => `/orgs/${encodeURIComponent(orgId)}/intake/${encodeURIComponent(intakeId)}`,
  orgYard: orgId => `/orgs/${encodeURIComponent(orgId)}/yard`,
  orgYardItem: (orgId, placementId) => `/orgs/${encodeURIComponent(orgId)}/yard/${encodeURIComponent(placementId)}`,
  orgIntakeImports: orgId => `/orgs/${encodeURIComponent(orgId)}/intake-imports`,
  orgIntakeImport: (orgId, importId) => `/orgs/${encodeURIComponent(orgId)}/intake-imports/${encodeURIComponent(importId)}`,
  orgIntakeImportRows: (orgId, importId) => `/orgs/${encodeURIComponent(orgId)}/intake-imports/${encodeURIComponent(importId)}/rows`,
};
