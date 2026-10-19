// Sample notifications in the exact shape GET /api/v1/notifications returns,
// used when USE_REAL_API.notifications is false. They go through the same
// mapper as real data, so the page behaves the same either way.
// Times are relative to "now" so Today / This week / Earlier always show.
const ago = minutes => new Date(Date.now() - minutes * 60 * 1000).toISOString();
const DAY = 24 * 60;

export const mockNotifications = () => [
  {
    id: 'ntf_mock_1',
    type: 'offer_received',
    title: 'New offer received',
    body: 'A buyer offered ₹8,40,000 for your KIA Seltos.',
    link: '/sell/lst_mock_1',
    read: false,
    created_at: ago(10),
  },
  {
    id: 'ntf_mock_2',
    type: 'offer_accepted',
    title: 'Offer accepted',
    body: 'Your offer of ₹2,20,000 on Maruti Suzuki Swift was accepted.',
    link: '/buy/offers',
    read: false,
    created_at: ago(95),
  },
  {
    id: 'ntf_mock_3',
    type: 'booking_assigned',
    title: 'Inspector assigned',
    body: 'An inspector has been assigned to your Today, 4:00 PM inspection.',
    link: '/account/bookings/bkg_mock_1',
    read: true,
    created_at: ago(DAY + 60),
  },
  {
    id: 'ntf_mock_4',
    type: 'offer_countered',
    title: 'Counter-offer received',
    body: 'The seller countered with ₹2,35,000.',
    link: '/buy/offers',
    read: true,
    created_at: ago(3 * DAY),
  },
  {
    id: 'ntf_mock_5',
    type: 'report_ready',
    title: 'Your inspection report is ready',
    body: 'Your Turag-verified inspection report is ready to view.',
    link: '/account/bookings/bkg_mock_2',
    read: true,
    created_at: ago(5 * DAY),
  },
  {
    id: 'ntf_mock_6',
    type: 'booking_confirmed',
    title: 'Doorstep inspection booked',
    body: 'Your doorstep inspection is booked.',
    link: '/account/bookings/bkg_mock_1',
    read: true,
    created_at: ago(12 * DAY),
  },
];

// A notification that "arrives" on a later refresh (see notification.api.js).
export const mockIncoming = () => ({
  id: 'ntf_mock_new',
  type: 'offer_countered',
  title: 'Counter-offer received',
  body: 'The seller countered with ₹8,60,000.',
  link: '/buy/offers',
  read: false,
  created_at: ago(0),
});
