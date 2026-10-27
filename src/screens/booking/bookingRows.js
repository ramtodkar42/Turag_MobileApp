import { cityLabel } from '../../utils/address';
import { formatSlotDate, formatSlotTime } from '../../utils/date';

// "Baner, Pune": the area (or the address) and the city.
export const placeText = (area, city) =>
  [area, cityLabel(city)].filter(Boolean).join(', ');

// The Date / Time / Place rows of a booking's "Details" card (summary and
// "Booking confirmed").
export const scheduleRows = ({ time, place, t, language }) => [
  {
    label: t('booking.details.date'),
    value: time ? formatSlotDate(time) : '—',
  },
  {
    label: t('booking.details.time'),
    value: time ? formatSlotTime(time, language) : '—',
  },
  { label: t('booking.details.place'), value: place || '—' },
];
