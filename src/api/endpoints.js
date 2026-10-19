// Every backend path in one place (relative to API_BASE_URL).
export const ENDPOINTS = {
  OTP_START: '/auth/otp/start',
  OTP_VERIFY: '/auth/otp/verify',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  ME: '/me',
  EMAIL_START: '/me/email/start',
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
  report: inspectionId => `/reports/${encodeURIComponent(inspectionId)}`,
  reportPdf: inspectionId => `/reports/${encodeURIComponent(inspectionId)}/pdf`,
  reportShare: inspectionId => `/reports/${encodeURIComponent(inspectionId)}/share`,

  // Offers + orders (buyer and seller)
  OFFERS: '/offers',
  offerAction: (id, action) => `/offers/${encodeURIComponent(id)}/${action}`,
  order: id => `/orders/${encodeURIComponent(id)}`,
  orderCancel: id => `/orders/${encodeURIComponent(id)}/cancel`,
  LISTINGS: '/listings',
  myListing: id => `/listings/${encodeURIComponent(id)}`,
  listingSubmit: id => `/listings/${encodeURIComponent(id)}/submit`,
  myListingOffers: id => `/listings/${encodeURIComponent(id)}/offers`,
};
