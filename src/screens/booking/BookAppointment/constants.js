// Vehicle types a doorstep inspection is booked for (same as the web).
export const BOOKING_CATEGORIES = [
  { value: 'PASSENGER', labelKey: 'booking.category.PASSENGER', infoKey: 'booking.category.PASSENGER_info' },
  { value: 'TWO_WHEELER', labelKey: 'booking.category.TWO_WHEELER', infoKey: 'booking.category.TWO_WHEELER_info' },
];

// "On the day" (optional) - sent as the booking's preparation.
export const PREPARATION = [
  { key: 'rcPresent', labelKey: 'booking.prep.rc', helpKey: 'booking.prep.rcHelp' },
  { key: 'openSpace', labelKey: 'booking.prep.space', helpKey: 'booking.prep.spaceHelp' },
  { key: 'keysAvailable', labelKey: 'booking.prep.keys', helpKey: 'booking.prep.keysHelp' },
];
