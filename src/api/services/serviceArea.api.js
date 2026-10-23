// Service area for doorstep inspections (as the web's /book): Turag opens
// city by city, so before a booking the place is checked with the server, and
// outside the area the user can ask to be told when Turag launches there.
// The server only answers yes / no for the place asked about - it never lists
// the cities it serves, and neither does the app.
import { request } from '../client';
import { ENDPOINTS } from '../endpoints';

// Is doorstep inspection offered at this place? { city (the map's city name),
// pincode } -> true / false. Public (no sign-in). Fails open, as the web: a
// network blip never blocks a genuine booking - the booking itself is checked
// again by the server (CITY_NOT_SERVICEABLE).
export const checkServiceability = async ({ city, pincode }) => {
  try {
    const data = await request(ENDPOINTS.SERVICE_AREA_CHECK, {
      method: 'POST',
      auth: false,
      body: { city: city?.trim() || null, pincode: /^\d{6}$/.test(pincode ?? '') ? pincode : null },
    });
    return data?.serviceable !== false;
  } catch {
    return true;
  }
};

// "Notify me when you launch" in a city Turag doesn't serve yet (signed in).
// Sending it IS the opt-in (consent_notify): the server takes the phone and
// email from the account. City-level details only - never the street address.
// place: { city, locality?, state?, pincode? }; category ('PASSENGER' |
// 'TWO_WHEELER'), vehicleId and slotAt say what they were about to book.
export const notifyCityLaunch = async ({ city, locality, state, pincode, category, vehicleId, slotAt }) => {
  const data = await request(ENDPOINTS.SERVICE_AREA_LEADS, {
    method: 'POST',
    body: {
      city,
      locality: locality || null,
      state: state || null,
      pincode: /^\d{6}$/.test(pincode ?? '') ? pincode : null,
      category: category ?? null,
      vehicle_id: vehicleId ?? null,
      requested_slot_at: slotAt ?? null,
      consent_notify: true,
    },
  });
  return { leadId: data?.lead_id ?? null };
};
