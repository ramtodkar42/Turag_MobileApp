/**
 * Booking a doorstep inspection (as the web's /book): address, slots from the
 * backend, summary (pay the fee to confirm), "Inspection booked", My inspections.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Button,
  CheckRow,
  ChoiceChip,
  DateCalendar,
  DatePickerField,
  DatePickerSheet,
  InfoNote,
  KeyValueRow,
  TextField,
} from '../src/components';
import ConfirmDialog from '../src/components/feedback/ConfirmDialog';
import BookAppointment from '../src/screens/booking/BookAppointment/BookAppointment';
import BookingSummary from '../src/screens/booking/BookingSummary/BookingSummary';
import BookingPayment from '../src/screens/booking/BookingPayment/BookingPayment';
import BookingComingSoon from '../src/screens/booking/BookingComingSoon/BookingComingSoon';
import PaymentStatus from '../src/screens/booking/PaymentStatus/PaymentStatus';
import BookingConfirmed from '../src/screens/booking/BookingConfirmed/BookingConfirmed';
import MyBookings from '../src/screens/account/MyBookings/MyBookings';
import * as bookingApi from '../src/api/services/booking.api';
import { USE_REAL_API } from '../src/api/config';
import { ApiError } from '../src/api/client';
import { endSession, startSession } from '../src/api/session';
import { formatPhone } from '../src/utils/format';
import { getPhoneError, phoneError, validateProfile } from '../src/utils/validators';
import { ROUTES } from '../src/navigation/routes';

// Identity verification (the web's step before paying): verified unless a test says otherwise.
jest.mock('../src/api/services/verification.api', () => ({
  ...jest.requireActual('../src/api/services/verification.api'),
  getMyVerification: jest.fn(async () => ({ id: 'ver_1', status: 'APPROVED', docType: 'PAN' })),
  submitVerification: jest.fn(async () => ({ id: 'ver_2', status: 'PENDING_REVIEW', docType: 'AADHAAR' })),
}));

// The service area (doorstep inspections city by city): served unless a test says otherwise.
jest.mock('../src/api/services/serviceArea.api', () => ({
  checkServiceability: jest.fn(async () => true),
  notifyCityLaunch: jest.fn(async () => ({ leadId: 'sal_1' })),
}));
const serviceArea = require('../src/api/services/serviceArea.api');

// Pages reload when they come back into view; here, once after mounting.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

// As the web's /book: Home / Office, the address, building / flat, an optional
// landmark and the pincode. The city / area / state come from the map (none
// when the address is typed by hand); the server decides if the place is served.
const address = {
  place: 'home',
  address: 'Baner Road, Baner',
  building: 'Flat 1009, Sahyadri Residency',
  landmark: '',
  pincode: '411015',
  city: '',
  locality: '',
  state: '',
};
const BUILDING = 'Building / flat / house';
const ADDRESS = 'Address';
const LANDMARK = 'Landmark (optional)';
const vehicle = {
  vehicleId: 'veh_1',
  make: 'KIA',
  model: 'Seltos',
  year: 2023,
  category: 'PASSENGER',
  registrationNumber: 'MH12DX5080',
};

let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>,
    );
  });
  return tree.root;
};
// Small steps, so mock delays that start one after another all finish.
const advance = async (ms = 1000) => {
  for (let passed = 0; passed < ms; passed += 100) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(100, ms - passed));
    });
  }
};
const nav = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  replace: jest.fn(),
  popTo: jest.fn(),
  setParams: jest.fn(),
});
const button = (root, title) => root.findAllByType(Button).find(b => b.props.title === title);
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;

beforeEach(() => {
  jest.useFakeTimers();
  bookingApi.resetMockBookings();
});
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const field = (root, label) => root.findAllByType(TextField).find(f => f.props.label === label);

// Types the address into the booking form (as the web's /book: typed for each booking).
const fillAddress = async (root, value = address) => {
  await act(async () => field(root, ADDRESS).props.onChangeText(value.address));
  await act(async () => field(root, BUILDING).props.onChangeText(value.building));
  if (value.landmark) await act(async () => field(root, LANDMARK).props.onChangeText(value.landmark));
  await act(async () => field(root, 'Pincode').props.onChangeText(value.pincode));
};
const chip = (root, label) => root.findAllByType(ChoiceChip).find(c => c.props.label === label);

describe('Book a doorstep inspection', () => {
  const pickFirstFreeTime = async root => {
    const picker = root.findAll(n => n.props.onSlotChange && n.props.days)[0];
    const day = picker.props.days.find(d => d.key === picker.props.dayKey);
    const slot = day.slots.find(s => s.available);
    await act(async () => picker.props.onSlotChange(slot));
    return slot;
  };

  test('times come from the backend; Continue needs a time and an address', async () => {
    const navigation = nav();
    const root = await render(
      <BookAppointment navigation={navigation} route={{ params: { vehicle, valuation: { valuationId: 'val_1' } } }} />,
    );
    await advance(600);

    // Vehicle known: no type choice.
    expect(hasText(root, 'KIA Seltos 2023')).toBe(true);
    expect(chip(root, 'Car')).toBeUndefined();
    expect(hasText(root, '₹799 · paid when you confirm the booking')).toBe(true);
    expect(button(root, 'Continue').props.disabled).toBe(true);

    // No saved addresses (as the web): the address is typed here, every booking.
    const slot = await pickFirstFreeTime(root);
    expect(button(root, 'Continue').props.disabled).toBe(true);
    await fillAddress(root);
    expect(button(root, 'Continue').props.disabled).toBe(false);

    const checks = root.findAllByType(CheckRow);
    expect(checks.map(c => c.props.label)).toEqual([
      'I will be present with the original RC',
      'The vehicle will be parked in open space',
      'Keys and service records will be available',
    ]);
    await act(async () => checks[0].props.onToggle());

    await act(async () => button(root, 'Continue').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.BOOKING_SUMMARY, {
      vehicle,
      valuation: { valuationId: 'val_1' },
      category: 'PASSENGER',
      // Typed by hand, no map pin (optional): no geo, no city (the pincode tells the server).
      address: { ...address, geo: null },
      slot,
      preparation: { rcPresent: true, openSpace: false, keysAvailable: false },
      price: 799,
    });
  });

  test('a full time can’t be picked; changing the day clears the time', async () => {
    const root = await render(<BookAppointment navigation={nav()} route={{ params: {} }} />);
    await advance(600);
    const picker = () => root.findAll(n => n.props.onSlotChange && n.props.days)[0];
    const full = picker().props.days.flatMap(d => d.slots).find(s => !s.available);
    expect(full).toBeDefined();
    const fullChip = root.findAll(n => n.props.accessibilityState?.disabled === true && n.props.onPress)[0];
    expect(fullChip).toBeDefined();

    await pickFirstFreeTime(root);
    expect(picker().props.slotAt).toBeTruthy();
    const otherDay = picker().props.days.find(d => d.key !== picker().props.dayKey);
    await act(async () => picker().props.onDayChange(otherDay.key));
    expect(picker().props.slotAt).toBeUndefined();
  });

  test('from My inspections: choose Car or Two-wheeler', async () => {
    const navigation = nav();
    const root = await render(<BookAppointment navigation={navigation} route={{ params: {} }} />);
    await advance(600);
    expect(chip(root, 'Car')).toBeDefined();
    await act(async () => chip(root, 'Two-wheeler').props.onPress());
    await pickFirstFreeTime(root);
    await fillAddress(root, { ...address, address: 'Wakad Road, Wakad', pincode: '411057' });
    await act(async () => button(root, 'Continue').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(
      ROUTES.BOOKING_SUMMARY,
      expect.objectContaining({
        category: 'TWO_WHEELER',
        vehicle: null,
        address: expect.objectContaining({ address: 'Wakad Road, Wakad', pincode: '411057' }),
      }),
    );
  });

  test('as the web: Home / Office, no city to pick (never lists the cities served), building and landmark sent', async () => {
    const navigation = nav();
    const root = await render(<BookAppointment navigation={navigation} route={{ params: {} }} />);
    await advance(600);
    expect(chip(root, 'Pune')).toBeUndefined();
    expect(chip(root, 'Pimpri-Chinchwad')).toBeUndefined();
    expect(hasText(root, 'Pune')).toBe(false);
    await act(async () => chip(root, 'Office').props.onPress());
    expect(chip(root, 'Office').props.selected).toBe(true);

    const picker = root.findAll(n => n.props.onSlotChange && n.props.days)[0];
    const slot = picker.props.days.find(d => d.key === picker.props.dayKey).slots.find(s => s.available);
    await act(async () => picker.props.onSlotChange(slot));
    // The building is optional (as the web): address + pincode are enough.
    await act(async () => field(root, ADDRESS).props.onChangeText('Wakad Road, Wakad'));
    await act(async () => field(root, 'Pincode').props.onChangeText('411057'));
    expect(button(root, 'Continue').props.disabled).toBe(false);
    await act(async () => field(root, LANDMARK).props.onChangeText('near Phoenix Mall'));
    await act(async () => button(root, 'Continue').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(
      ROUTES.BOOKING_SUMMARY,
      expect.objectContaining({
        address: {
          place: 'office',
          address: 'Wakad Road, Wakad',
          building: '',
          landmark: 'near Phoenix Mall',
          pincode: '411057',
          city: '',
          locality: '',
          state: '',
          geo: null,
        },
      }),
    );
    // Asked the server first: is this place served? (the pincode, no city typed)
    expect(serviceArea.checkServiceability).toHaveBeenCalledWith({ city: '', pincode: '411057' });
  });

  test('a place Turag doesn’t serve yet: "Coming soon" instead of the summary', async () => {
    serviceArea.checkServiceability.mockResolvedValueOnce(false);
    const navigation = nav();
    const root = await render(<BookAppointment navigation={navigation} route={{ params: { vehicle } }} />);
    await advance(600);
    const slot = await pickFirstFreeTime(root);
    await fillAddress(root, { ...address, pincode: '400053' });
    await act(async () => button(root, 'Continue').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.BOOKING_COMING_SOON, {
      place: { city: 'PIN 400053', locality: null, state: null, pincode: '400053' },
      category: 'PASSENGER',
      vehicleId: 'veh_1',
      slotAt: slot.slotAt,
    });
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.BOOKING_SUMMARY, expect.anything());
  });

  test('no live payment gateway yet: "Payments are coming soon" and nothing can be booked', async () => {
    jest.spyOn(bookingApi, 'getBookingSlots').mockResolvedValueOnce({
      price: 799,
      enabled: true,
      paymentsAvailable: false,
      days: [{ key: '2026-10-23', time: 1, slots: [{ slotAt: '2026-10-23T04:30:00.000Z', time: 1, available: true }] }],
    });
    const navigation = nav();
    const root = await render(<BookAppointment navigation={navigation} route={{ params: {} }} />);
    await advance(600);
    expect(hasText(root, 'Payments are coming soon')).toBe(true);
    await pickFirstFreeTime(root);
    await fillAddress(root);
    expect(button(root, 'Continue').props.disabled).toBe(true);
    await act(async () => button(root, 'Inspect it yourself').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.EVALUATE_CHAT);
  });

  test('an address shorter than 4 characters is not enough (as the web)', async () => {
    const root = await render(<BookAppointment navigation={nav()} route={{ params: {} }} />);
    await advance(600);
    await pickFirstFreeTime(root);
    await fillAddress(root, { ...address, address: 'Abc' });
    expect(button(root, 'Continue').props.disabled).toBe(true);
  });

  describe('finding the spot (OpenStreetMap)', () => {
    // Nominatim: the address at a point / a place search.
    const baner = {
      lat: '18.559',
      lon: '73.7868',
      name: 'Baner Road',
      display_name: 'Baner Road, Baner, Pune, Maharashtra, 411045, India',
      address: { road: 'Baner Road', suburb: 'Baner', city: 'Pune', state_district: 'Pune District', postcode: '411045' },
    };
    const wakad = {
      lat: '18.5986',
      lon: '73.7618',
      name: 'Phoenix Mall of the Millennium',
      display_name: 'Phoenix Mall of the Millennium, Wakad, Pimpri-Chinchwad, Maharashtra, 411057, India',
      address: { shop: 'Phoenix Mall of the Millennium', road: 'Mumbai-Bengaluru Highway', suburb: 'Wakad', city: 'Pimpri-Chinchwad', postcode: '411057' },
    };
    const json = body => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
    let originalFetch;
    beforeEach(() => {
      originalFetch = global.fetch;
      global.fetch = jest.fn(url => json(String(url).includes('/reverse') ? baner : [wakad]));
      // The phone is in Baner unless a test says otherwise.
      const Geolocation = require('@react-native-community/geolocation').default;
      Geolocation.getCurrentPosition.mockReset();
      Geolocation.getCurrentPosition.mockImplementation(success =>
        success({ coords: { latitude: 18.559, longitude: 73.7868 } }),
      );
    });
    afterEach(() => {
      global.fetch = originalFetch;
    });

    const open = async navigation => {
      const root = await render(<BookAppointment navigation={navigation ?? nav()} route={{ params: {} }} />);
      await advance(600);
      return root;
    };
    const mapOf = root => root.findAll(n => n.props.onMessage && n.props.source?.html)[0];

    test('tapping the map pins the spot and fills address, pincode and city; flat / building is cleared', async () => {
      const navigation = nav();
      const root = await open(navigation);
      await pickFirstFreeTime(root);
      await act(async () => field(root, BUILDING).props.onChangeText('Flat 12, Sai Heights'));

      expect(mapOf(root).props.source.html).toContain('tile.openstreetmap.org');
      await act(async () =>
        mapOf(root).props.onMessage({ nativeEvent: { data: JSON.stringify({ lat: 18.559, lng: 73.7868 }) } }),
      );
      await advance(200);
      expect(global.fetch.mock.calls[0][0]).toMatch(/nominatim\.openstreetmap\.org\/reverse\?lat=18\.559&lon=73\.7868/);
      expect(global.fetch.mock.calls[0][1].headers['User-Agent']).toMatch(/Turag/);
      // A new place: the old flat / building doesn't belong to it - typed again.
      expect(field(root, BUILDING).props.value).toBe('');
      expect(field(root, ADDRESS).props.value).toBe('Baner Road, Baner');
      expect(field(root, 'Pincode').props.value).toBe('411045');
      expect(hasText(root, 'Baner Road, Baner, Pune, 411045')).toBe(true);

      await act(async () => field(root, BUILDING).props.onChangeText('Flat 12, Sai Heights'));
      await act(async () => button(root, 'Continue').props.onPress());
      expect(navigation.navigate).toHaveBeenCalledWith(
        ROUTES.BOOKING_SUMMARY,
        expect.objectContaining({
          // The map's city and area, as the web sends them (the server decides if it's served).
          address: expect.objectContaining({ city: 'Pune', locality: 'Baner', geo: { lat: 18.559, lng: 73.7868 } }),
        }),
      );
    });

    test('search a place: results drop down; picking one pins it and fills the address', async () => {
      const root = await open();
      const search = root.findAll(n => n.props.placeholder === 'Search area, street or landmark' && n.props.onChangeText)[0];
      await act(async () => search.props.onChangeText('phoenix wakad'));
      await advance(700);
      expect(global.fetch.mock.calls[0][0]).toMatch(/\/search\?q=phoenix\+wakad.*countrycodes=in/);

      const result = root.findAll(n => n.props.accessibilityRole === 'button' && hasText(n, 'Phoenix Mall of the Millennium'))[0];
      await act(async () => result.props.onPress());
      expect(field(root, BUILDING).props.value).toBe('Phoenix Mall of the Millennium');
      expect(field(root, ADDRESS).props.value).toBe('Mumbai-Bengaluru Highway, Wakad');
      expect(field(root, 'Pincode').props.value).toBe('411057');
      expect(global.fetch).toHaveBeenCalledTimes(1); // the search result already had the address

      // Another spot on the map with no building there: the mall's name goes.
      await act(async () =>
        mapOf(root).props.onMessage({ nativeEvent: { data: JSON.stringify({ lat: 18.559, lng: 73.7868 }) } }),
      );
      await advance(200);
      expect(field(root, BUILDING).props.value).toBe('');
      expect(field(root, ADDRESS).props.value).toBe('Baner Road, Baner');
      expect(field(root, 'Pincode').props.value).toBe('411045');
    });

    test('Use my current location: the phone’s position, then its address', async () => {
      const root = await open();
      const current = root.findAll(n => n.props.accessibilityLabel === 'Use my current location' && n.props.onPress)[0];
      await act(async () => current.props.onPress());
      await advance(200);
      expect(field(root, ADDRESS).props.value).toBe('Baner Road, Baner');
      expect(field(root, 'Pincode').props.value).toBe('411045');
    });

    test('a typed landmark stays when a new spot is pinned', async () => {
      const root = await open();
      await act(async () => field(root, LANDMARK).props.onChangeText('near X Mall'));
      await act(async () =>
        mapOf(root).props.onMessage({ nativeEvent: { data: JSON.stringify({ lat: 18.559, lng: 73.7868 }) } }),
      );
      await advance(200);
      expect(field(root, LANDMARK).props.value).toBe('near X Mall');
    });

    test('current location: quick network position first, then GPS if that is slow', async () => {
      const Geolocation = require('@react-native-community/geolocation').default;
      Geolocation.getCurrentPosition
        .mockImplementationOnce((success, error, options) => {
          expect(options.enableHighAccuracy).toBe(false); // quick (Wi-Fi / network) first
          error({ code: 3, message: 'timeout' });
        })
        .mockImplementationOnce((success, error, options) => {
          expect(options.enableHighAccuracy).toBe(true); // then a GPS fix
          success({ coords: { latitude: 18.559, longitude: 73.7868 } });
        });
      const root = await open();
      const current = root.findAll(n => n.props.accessibilityLabel === 'Use my current location' && n.props.onPress)[0];
      await act(async () => current.props.onPress());
      await advance(200);
      expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
      expect(field(root, 'Pincode').props.value).toBe('411045');
    });

    test('location switched off: says to turn it on (no slow GPS retry)', async () => {
      const Geolocation = require('@react-native-community/geolocation').default;
      Geolocation.getCurrentPosition.mockImplementationOnce((success, error) => error({ code: 2, message: 'off' }));
      const root = await open();
      const current = root.findAll(n => n.props.accessibilityLabel === 'Use my current location' && n.props.onPress)[0];
      await act(async () => current.props.onPress());
      expect(hasText(root, 'Location is turned off.')).toBe(true);
      expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    });

    test('still no position after GPS: a "taking too long" message with what to do', async () => {
      const Geolocation = require('@react-native-community/geolocation').default;
      Geolocation.getCurrentPosition.mockImplementation((success, error) => error({ code: 3, message: 'timeout' }));
      const root = await open();
      const current = root.findAll(n => n.props.accessibilityLabel === 'Use my current location' && n.props.onPress)[0];
      await act(async () => current.props.onPress());
      expect(hasText(root, 'Finding you is taking too long.')).toBe(true);
    });

    test('location permission off: a clear message, the form still works', async () => {
      const Geolocation = require('@react-native-community/geolocation').default;
      Geolocation.getCurrentPosition.mockImplementationOnce((success, error) => error({ code: 1, message: 'denied' }));
      const root = await open();
      const current = root.findAll(n => n.props.accessibilityLabel === 'Use my current location' && n.props.onPress)[0];
      await act(async () => current.props.onPress());
      expect(hasText(root, 'Location permission is off.')).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('a spot in a city Turag doesn’t serve: no warning on the form (never lists the cities served); the server decides', async () => {
      global.fetch = jest.fn(() =>
        json({
          ...baner,
          display_name: 'Andheri, Mumbai',
          address: { road: 'SV Road', suburb: 'Andheri', city: 'Mumbai', state: 'Maharashtra', postcode: '400053' },
        }),
      );
      serviceArea.checkServiceability.mockResolvedValueOnce(false);
      const navigation = nav();
      const root = await open(navigation);
      await pickFirstFreeTime(root);
      await act(async () => mapOf(root).props.onMessage({ nativeEvent: { data: JSON.stringify({ lat: 19.1, lng: 72.8 }) } }));
      await advance(200);
      expect(hasText(root, 'outside')).toBe(false);
      await act(async () => button(root, 'Continue').props.onPress());
      expect(serviceArea.checkServiceability).toHaveBeenCalledWith({ city: 'Mumbai', pincode: '400053' });
      expect(navigation.navigate).toHaveBeenCalledWith(
        ROUTES.BOOKING_COMING_SOON,
        expect.objectContaining({
          place: { city: 'Mumbai', locality: 'Andheri', state: 'Maharashtra', pincode: '400053' },
        }),
      );
    });
  });

  test('the map can’t load (offline): a note, and booking still works without a pin', async () => {
    const root = await render(<BookAppointment navigation={nav()} route={{ params: {} }} />);
    await advance(600);
    const map = root.findAll(n => n.props.onMessage && n.props.source?.html)[0];
    await act(async () => map.props.onMessage({ nativeEvent: { data: JSON.stringify({ error: true }) } }));
    expect(hasText(root, 'The map couldn’t load.')).toBe(true);
    await pickFirstFreeTime(root);
    await fillAddress(root);
    expect(button(root, 'Continue').props.disabled).toBe(false);
  });

  test('a bad pincode keeps Continue off', async () => {
    const root = await render(<BookAppointment navigation={nav()} route={{ params: {} }} />);
    await advance(600);
    await pickFirstFreeTime(root);
    await fillAddress(root, { ...address, pincode: '4110' });
    expect(button(root, 'Continue').props.disabled).toBe(true);
  });

  test('booking switched off on the backend: says so, no Continue', async () => {
    jest.spyOn(bookingApi, 'getBookingSlots').mockResolvedValue({ price: null, enabled: false, days: [] });
    const root = await render(<BookAppointment navigation={nav()} route={{ params: {} }} />);
    await advance(100);
    expect(root.findAllByType(InfoNote).some(n => /isn’t available right now/.test(n.props.children))).toBe(true);
    expect(button(root, 'Continue').props.disabled).toBe(true);
  });
});

describe('Coming soon to a city Turag doesn’t serve yet', () => {
  const params = {
    place: { city: 'Mumbai', locality: 'Andheri', state: 'Maharashtra', pincode: '400053' },
    category: 'PASSENGER',
    vehicleId: 'veh_1',
    slotAt: '2026-10-23T04:30:00.000Z',
  };

  test('names the city (never the ones served); "Notify me" saves the opt-in, then "You’re on the list"', async () => {
    const navigation = nav();
    const root = await render(<BookingComingSoon navigation={navigation} route={{ params }} />);
    expect(hasText(root, 'We’re coming soon to Mumbai')).toBe(true);
    expect(hasText(root, 'Pune')).toBe(false);
    expect(hasText(root, 'By continuing you agree to be contacted')).toBe(true);

    await act(async () => button(root, 'Notify me when you launch').props.onPress());
    expect(serviceArea.notifyCityLaunch).toHaveBeenCalledWith({ ...params.place, category: 'PASSENGER', vehicleId: 'veh_1', slotAt: params.slotAt });
    expect(hasText(root, 'You’re on the list')).toBe(true);
    expect(hasText(root, 'go live in Mumbai')).toBe(true);

    await act(async () => button(root, 'Back to booking').props.onPress());
    expect(navigation.goBack).toHaveBeenCalled();
  });

  test('saving fails: a message, and "Notify me" can be tried again', async () => {
    serviceArea.notifyCityLaunch.mockRejectedValueOnce(new Error('offline'));
    const root = await render(<BookingComingSoon navigation={nav()} route={{ params }} />);
    await act(async () => button(root, 'Notify me when you launch').props.onPress());
    expect(hasText(root, 'We couldn’t save your details.')).toBe(true);
    expect(button(root, 'Notify me when you launch')).toBeDefined();
  });

  test('the server turns the city down while booking: the same screen, not an error', async () => {
    jest
      .spyOn(bookingApi, 'createInspectionBooking')
      .mockRejectedValueOnce(new ApiError({ status: 422, code: 'CITY_NOT_SERVICEABLE', message: 'x' }));
    const navigation = nav();
    const route = {
      params: {
        category: 'PASSENGER',
        address: { ...address, city: 'Mumbai', locality: 'Andheri', state: 'Maharashtra', pincode: '400053' },
        slot: { slotAt: params.slotAt },
        preparation: {},
        vehicle: { vehicleId: 'veh_1' },
        price: 799,
      },
    };
    const root = await render(<BookingPayment navigation={navigation} route={route} />);
    const pay = root.findAllByType(Button).find(b => /Pay/.test(b.props.title));
    await act(async () => pay.props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.BOOKING_COMING_SOON, {
      place: params.place,
      category: 'PASSENGER',
      vehicleId: 'veh_1',
      slotAt: params.slotAt,
    });
  });
});

describe('Booking summary and confirmation', () => {
  const params = {
    vehicle,
    valuation: { valuationId: 'val_1' },
    category: 'PASSENGER',
    address: { ...address, city: 'Pune', id: 'a1' }, // picked on the map
    slot: { slotAt: '2026-10-07T04:30:00.000Z', time: Date.parse('2026-10-07T04:30:00.000Z'), available: true },
    preparation: { rcPresent: true, openSpace: true, keysAvailable: false },
    price: 799,
  };

  test('summary: the vehicle, Details and Payment details; "Pay ₹799" opens the payment screen', async () => {
    const create = jest.spyOn(bookingApi, 'createInspectionBooking');
    const navigation = nav();
    const root = await render(
      <BookingSummary
        navigation={navigation}
        route={{ params: { ...params, valuation: { valuationId: 'val_1', estimatedValue: 831300 } } }}
      />,
    );

    expect(hasText(root, 'KIA Seltos')).toBe(true);
    expect(hasText(root, 'MH 12 DX 5080')).toBe(true);
    expect(hasText(root, '₹8,31,300/-')).toBe(true);
    const rows = root.findAllByType(KeyValueRow).map(r => [r.props.label, r.props.value]);
    expect(rows).toEqual([
      ['Date', '07/10/2026'],
      ['Time', '10:00 am'],
      ['Place', 'Flat 1009, Sahyadri Residency, Baner Road, Baner, Pune'],
      ['On the day', 'Original RC, Open space'],
      ['Inspection fee', '₹799'],
      ['Total payable', '₹799'],
    ]);

    // Nothing is booked here: that happens when paying.
    await act(async () => button(root, 'Pay ₹799').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(
      ROUTES.BOOKING_PAYMENT,
      expect.objectContaining({ address: params.address, slot: params.slot, price: 799 }),
    );
    expect(create).not.toHaveBeenCalled();
  });

  test('payment: books it once (double tap) and opens "Hold on" with the picked method', async () => {
    const create = jest.spyOn(bookingApi, 'createInspectionBooking');
    const navigation = nav();
    const root = await render(<BookingPayment navigation={navigation} route={{ params }} />);

    expect(hasText(root, '₹799/-')).toBe(true);
    // (PaymentOption is memo()-wrapped: found by its props.)
    const options = () => root.findAll(n => n.props.icon && typeof n.props.selected === 'boolean');
    expect(options().map(o => o.props.title)).toEqual(['UPI', 'Add new card', 'Net banking']); // no Pay on delivery
    expect(options()[0].props.selected).toBe(true);
    await act(async () => options()[2].props.onPress());
    expect(options()[2].props.selected).toBe(true);

    await act(async () => {
      button(root, 'Pay ₹799').props.onPress();
      button(root, 'Pay ₹799').props.onPress(); // double tap: one booking
    });
    await advance(1000);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      category: 'PASSENGER',
      address: params.address,
      slotAt: params.slot.slotAt,
      preparation: params.preparation,
      vehicleId: 'veh_1',
      valuationId: 'val_1',
    });
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.PAYMENT_STATUS, {
      booking: expect.objectContaining({ id: expect.stringMatching(/^bkg_mock_/), status: 'PENDING_PAYMENT' }),
      method: 'NET_BANKING',
    });

    // Back here after a failed payment: the error, and paying again reuses the booking.
    await act(async () =>
      tree.update(
        <SafeAreaProvider initialMetrics={metrics}>
          <BookingPayment
            navigation={navigation}
            route={{ params: { ...params, payError: 'Payment didn’t go through. Tap Pay again to retry.' } }}
          />
        </SafeAreaProvider>,
      ),
    );
    expect(hasText(root, 'Payment didn’t go through.')).toBe(true);
    await act(async () => {
      button(root, 'Pay ₹799').props.onPress();
    });
    await advance(100);
    expect(create).toHaveBeenCalledTimes(1);
    expect(navigation.navigate.mock.calls[1][1].booking.id).toBe(navigation.navigate.mock.calls[0][1].booking.id);
  });

  test('"Hold on": pays the fee, then "Booking confirmed" with the paid booking', async () => {
    const pay = jest.spyOn(bookingApi, 'payForBooking');
    const created = bookingApi.createInspectionBooking({ category: 'PASSENGER', address, slotAt: params.slot.slotAt });
    await advance(1000);
    const booking = await created;
    const navigation = nav();
    const root = await render(<PaymentStatus navigation={navigation} route={{ params: { booking } }} />);

    expect(hasText(root, 'We are verifying your payment status.')).toBe(true);
    await advance(2000); // pay, then load the paid booking
    expect(pay).toHaveBeenCalledTimes(1);
    expect(pay).toHaveBeenCalledWith(
      booking.id,
      expect.objectContaining({ amountMinor: 79900, label: 'Doorstep inspection fee' }),
    );
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: ROUTES.MAIN_TABS },
        {
          name: ROUTES.BOOKING_CONFIRMED,
          params: { booking: expect.objectContaining({ id: booking.id, status: 'ASSIGNED', feePaid: true }) },
        },
      ],
    });
    // Paid: it's in My inspections now.
    const listed = bookingApi.getMyBookings();
    await advance(600);
    expect((await listed).some(b => b.id === booking.id)).toBe(true);
  });

  test('"Hold on": a failed payment goes back to the payment screen with the error', async () => {
    jest.spyOn(bookingApi, 'payForBooking').mockRejectedValueOnce(new ApiError({ status: 502 }));
    const navigation = nav();
    await render(<PaymentStatus navigation={navigation} route={{ params: { booking: { id: 'bkg_x' } } }} />);
    await advance(200);
    expect(navigation.popTo).toHaveBeenCalledWith(
      ROUTES.BOOKING_PAYMENT,
      { payError: 'Payment didn’t go through. Tap Pay again to retry.' },
      { merge: true },
    );
    expect(navigation.reset).not.toHaveBeenCalled();
  });

  test('unpaid bookings are not listed (as the backend)', async () => {
    const created = bookingApi.createInspectionBooking({
      category: 'PASSENGER',
      address,
      slotAt: params.slot.slotAt,
    });
    await advance(1000);
    const { id } = await created;
    const listed = bookingApi.getMyBookings();
    await advance(600);
    expect((await listed).some(b => b.id === id)).toBe(false);
  });

  test('not verified yet: "Verify your identity" comes before paying (as the web)', async () => {
    const verificationApi = require('../src/api/services/verification.api');
    verificationApi.getMyVerification.mockResolvedValueOnce(null);
    const navigation = nav();
    const root = await render(<BookingPayment navigation={navigation} route={{ params }} />);
    await act(async () => {
      button(root, 'Pay ₹799').props.onPress();
    });
    await advance(1000);
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.VERIFY_IDENTITY, {
      booking: expect.objectContaining({ status: 'PENDING_PAYMENT' }),
      method: 'UPI',
    });
  });

  test('a rejected ID is asked again; one under review goes straight to payment', async () => {
    const verificationApi = require('../src/api/services/verification.api');
    expect(verificationApi.needsVerification({ status: 'REJECTED' })).toBe(true);
    expect(verificationApi.needsVerification({ status: 'PENDING_REVIEW' })).toBe(false);
    expect(verificationApi.needsVerification({ status: 'APPROVED' })).toBe(false);
    expect(verificationApi.needsVerification(null)).toBe(true);
  });

  test('the time was just taken: a clear message to pick another', async () => {
    jest
      .spyOn(bookingApi, 'createInspectionBooking')
      .mockRejectedValue(new ApiError({ status: 422, code: 'BOOKING_SLOT_UNAVAILABLE', message: 'x' }));
    const navigation = nav();
    const root = await render(<BookingPayment navigation={navigation} route={{ params }} />);
    await act(async () => button(root, 'Pay ₹799').props.onPress());
    expect(hasText(root, 'That time is no longer available.')).toBe(true);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  test('"Booking confirmed": Details with what was paid and the status, receipt, Track the inspection', async () => {
    const navigation = nav();
    await require('../src/api/paymentRefs').savePaymentRef('bkg_9', 'pay_01M4E4VXCZCVAF6GFS2A7P01EB');
    const booking = {
      id: 'bkg_9',
      status: 'ASSIGNED',
      category: 'PASSENGER',
      feePaid: true,
      feePaidAt: Date.parse('2026-10-08T16:17:00.000Z'),
      inspectorAssigned: true,
      slotAt: Date.parse('2026-10-09T06:30:00.000Z'),
      address: 'Garware College, Karve Road, Deccan Gymkhana',
      cityCode: 'PUNE',
      pincode: '411004',
      price: 799,
    };
    const root = await render(<BookingConfirmed navigation={navigation} route={{ params: { booking } }} />);
    await advance(100);
    expect(hasText(root, 'Booking confirmed')).toBe(true);
    expect(hasText(root, 'An inspector is assigned to your booking.')).toBe(true);
    // The receipt (as the web's), with the booking's status.
    expect(hasText(root, 'bkg_9')).toBe(true);
    expect(hasText(root, 'Friday, 09 October at 12:00 pm')).toBe(true);
    expect(hasText(root, 'Garware College, Karve Road, Deccan Gymkhana, Pune - 411004')).toBe(true);
    expect(hasText(root, 'Turag field inspection')).toBe(true);
    expect(hasText(root, 'pay_01M4E4VXCZCVAF6GFS2A7P01EB')).toBe(true);
    expect(hasText(root, '8 Oct 2026, 9:47 pm')).toBe(true);
    expect(hasText(root, '₹799')).toBe(true);
    expect(hasText(root, 'Inspector assigned')).toBe(true);
    expect(button(root, 'Download receipt').props.disabled).toBe(false);
    await act(async () => button(root, 'Track the inspection').props.onPress());
    expect(navigation.replace).toHaveBeenCalledWith(ROUTES.BOOKING_DETAILS, { bookingId: 'bkg_9' });
  });
});

describe('My inspections', () => {
  test('lists bookings with status; report, cancel and book a new one', async () => {
    const navigation = nav();
    const root = await render(<MyBookings navigation={navigation} />);
    await advance(600);
    const rows = () => root.findAll(n => n.props.booking && n.props.onCancel);

    expect(rows().map(r => r.props.booking.id)).toEqual(['bkg_mock_1', 'bkg_mock_2']);
    expect(hasText(root, 'Inspector assigned')).toBe(true);
    expect(hasText(root, 'Completed')).toBe(true);

    await act(async () => rows()[1].props.onReport(rows()[1].props.booking));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.INSPECTION_REPORT, { inspectionId: 'insp_mock_r1' });

    await act(async () => rows()[0].props.onCancel(rows()[0].props.booking));
    const dialog = root.findAllByType(ConfirmDialog).find(d => d.props.visible);
    await act(async () => {
      dialog.props.onConfirm();
    });
    await advance(700);
    expect(rows()[0].props.booking.status).toBe('CANCELLED');

    await act(async () => button(root, 'Book an inspection').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.BOOK_APPOINTMENT, {});
  });
});

describe('real backend', () => {
  const reply = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify(body)),
  });

  beforeAll(() => {
    USE_REAL_API.bookings = true;
  });
  afterAll(() => {
    USE_REAL_API.bookings = false;
  });
  beforeEach(async () => {
    jest.useRealTimers();
    global.fetch = jest.fn();
    await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
  });
  afterEach(async () => {
    await endSession();
  });

  test('slots: public, grouped by day in order, price in rupees; null price = switched off', async () => {
    fetch.mockResolvedValueOnce(
      reply(200, {
        slots: [
          { slot_at: '2026-10-07T06:30:00.000Z', available: true },
          { slot_at: '2026-10-06T08:30:00.000Z', available: false },
          { slot_at: '2026-10-06T04:30:00.000Z', available: true },
        ],
        price: { amount_minor: 79900, currency: 'INR' },
      }),
    );
    const slots = await bookingApi.getBookingSlots();
    expect(fetch.mock.calls[0][0]).toMatch(/\/inspection-bookings\/slots$/);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(slots.price).toBe(799);
    expect(slots.enabled).toBe(true);
    expect(slots.days.map(d => d.slots.map(s => [s.slotAt, s.available]))).toEqual([
      [
        ['2026-10-06T04:30:00.000Z', true],
        ['2026-10-06T08:30:00.000Z', false],
      ],
      [['2026-10-07T06:30:00.000Z', true]],
    ]);

    // Older servers don't send payments_available: payments count as open.
    expect(slots.paymentsAvailable).toBe(true);

    fetch.mockResolvedValueOnce(reply(200, { slots: [], price: null }));
    expect(await bookingApi.getBookingSlots()).toEqual({
      price: null,
      enabled: false,
      paymentsAvailable: true,
      days: [],
    });

    // No live payment gateway yet (staging today).
    fetch.mockResolvedValueOnce(
      reply(200, { slots: [], price: { amount_minor: 79900, currency: 'INR' }, payments_available: false }),
    );
    expect((await bookingApi.getBookingSlots()).paymentsAvailable).toBe(false);
  });

  test('pay: initiates the fee, and on the test gateway completes it (as the web on staging)', async () => {
    fetch
      .mockResolvedValueOnce(
        reply(200, {
          payment: {
            payment_id: 'pay_1',
            provider_order_id: 'order_stub_abc',
            amount: { amount_minor: 79900, currency: 'INR' },
            key_id: 'rzp_test_stub',
            redirect_url: null,
          },
        }),
      )
      .mockResolvedValueOnce(reply(200, { status: 'processed' }));
    await expect(bookingApi.payForBooking('bkg_1')).resolves.toEqual({ paymentId: 'pay_1', confirmed: true });
    expect(fetch.mock.calls[0][0]).toMatch(/\/inspection-bookings\/bkg_1\/pay$/);
    expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).toBeTruthy();
    expect(fetch.mock.calls[1][0]).toMatch(/\/inspection-bookings\/bkg_1\/pay\/simulate$/);
    // Kept for the receipt's "Payment reference".
    await expect(require('../src/api/paymentRefs').loadPaymentRef('bkg_1')).resolves.toBe('pay_1');
  });

  test('pay: a live gateway (needs its checkout) says so instead of pretending', async () => {
    fetch.mockResolvedValueOnce(
      reply(200, {
        payment: {
          payment_id: 'pay_2',
          provider_order_id: 'order_LIVE123',
          amount: { amount_minor: 79900, currency: 'INR' },
          key_id: 'rzp_live_abc',
          redirect_url: null,
        },
      }),
    );
    await expect(bookingApi.payForBooking('bkg_1')).rejects.toMatchObject({ code: 'PAYMENT_UNAVAILABLE' });
    expect(fetch).toHaveBeenCalledTimes(1); // never "simulates" a real payment
  });

  // (After the test above: from here on the Razorpay SDK is a fake.)
  test('pay: Razorpay opens on the way to pay chosen in the app, with the user’s details', async () => {
    const open = jest.fn(async () => ({ razorpay_payment_id: 'pay_rzp' }));
    jest.doMock('react-native-razorpay', () => ({ __esModule: true, default: { open } }));
    fetch
      .mockResolvedValueOnce(
        reply(200, {
          payment: {
            payment_id: 'pay_3',
            provider_order_id: 'order_ABC',
            amount: { amount_minor: 79900, currency: 'INR' },
            key_id: 'rzp_test_abc',
            redirect_url: null,
          },
        }),
      )
      // The webhook has confirmed it by the first check.
      .mockResolvedValueOnce(
        reply(200, {
          bookings: [
            {
              booking_id: 'bkg_1',
              mode: 'DOORSTEP',
              category: 'PASSENGER',
              status: 'ASSIGNED',
              address_line: 'Baner Road, Baner',
              pincode: '411015',
              city: 'PUNE',
              slot_at: '2026-10-07T04:30:00.000Z',
              price: { amount_minor: 79900, currency: 'INR' },
              inspector_assigned: true,
              fee_paid: true,
              created_at: '2026-10-05T10:00:00.000Z',
            },
          ],
        }),
      );
    const done = bookingApi.payForBooking('bkg_1', {
      method: 'NET_BANKING',
      prefill: { name: 'Ram Todkar', contact: '+919876543210' },
    });
    // (Real timers here: the first status check comes after 2.5 s.)
    await expect(done).resolves.toEqual({ paymentId: 'pay_3', confirmed: true });
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'rzp_test_abc',
        order_id: 'order_ABC',
        // Net banking chosen in the app: Razorpay opens on it, not asking again.
        prefill: { name: 'Ram Todkar', contact: '+919876543210', method: 'netbanking' },
      }),
    );
  });

  test('create sends the web’s body (signed in) and maps the booking', async () => {
    fetch.mockResolvedValueOnce(
      reply(201, {
        booking: {
          booking_id: 'bkg_1',
          mode: 'DOORSTEP',
          category: 'PASSENGER',
          status: 'REQUESTED',
          address_line: 'Flat 1009, Sahyadri Residency, Baner',
          pincode: '411015',
          city: 'PUNE',
          slot_at: '2026-10-07T04:30:00.000Z',
          price: { amount_minor: 79900, currency: 'INR' },
          inspector_assigned: false,
          valuation_id: 'val_1',
          inspection_id: null,
          fee_paid: false,
          created_at: '2026-10-05T10:00:00.000Z',
        },
      }),
    );
    const booking = await bookingApi.createInspectionBooking({
      category: 'PASSENGER',
      address: { ...address, city: 'Pune', geo: { lat: 18.559, lng: 73.7868 } }, // picked on the map
      slotAt: '2026-10-07T04:30:00.000Z',
      preparation: { rcPresent: true, openSpace: false, keysAvailable: true },
      vehicleId: 'veh_1',
      valuationId: 'val_1',
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/inspection-bookings$/);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer access-1');
    expect(JSON.parse(init.body)).toEqual({
      category: 'PASSENGER',
      mode: 'DOORSTEP',
      // As the web: the address, then building and landmark on their own.
      address_line: 'Baner Road, Baner',
      building: 'Flat 1009, Sahyadri Residency',
      landmark: null,
      pincode: '411015',
      city: 'Pune', // the map's city, raw (the server resolves it)
      geo_lat: 18.559,
      geo_lng: 73.7868,
      slot_at: '2026-10-07T04:30:00.000Z',
      preparation: { rc_present: true, open_space: false, keys_available: true },
      vehicle_id: 'veh_1',
      valuation_id: 'val_1',
      inspection_consent: true,
    });
    expect(booking).toEqual(
      expect.objectContaining({ id: 'bkg_1', status: 'REQUESTED', inspectorAssigned: false, price: 799, city: 'Pune' }),
    );
  });
});

// --- Shared form pieces ------------------------------------------------------

test('Phone formatting', () => {
  expect(formatPhone('9334556653')).toBe('+91 93345 56653');
});

test('Date picker: shows dd/mm/yyyy, only available dates are pickable, picking closes the sheet', async () => {
  const onChange = jest.fn();
  const available = ['2026-10-25', '2026-10-26'];
  const root = await render(
    <DatePickerField label="Date" value="2026-10-25" onChange={onChange} availableDates={available} />,
  );

  expect(root.findByType(TextField).props.value).toBe('25/10/2026');

  await act(async () => root.findByProps({ accessibilityLabel: 'Date' }).props.onPress());
  expect(root.findByType(DatePickerSheet).props.visible).toBe(true);

  const calendar = root.findByType(DateCalendar);
  const marks = root.findAll(n => n.props.markedDates && n.props.disabledByDefault)[0].props;
  expect(marks.disabledByDefault).toBe(true);
  expect(marks.markedDates['2026-10-25']).toEqual(expect.objectContaining({ selected: true, disabled: false }));
  expect(marks.markedDates['2026-10-26']).toEqual(expect.objectContaining({ disabled: false }));
  expect(marks.markedDates['2026-10-27']).toBeUndefined();

  await act(async () => calendar.props.onSelect('2026-10-26'));
  expect(onChange).toHaveBeenCalledWith('2026-10-26');
  expect(root.findByType(DatePickerSheet).props.visible).toBe(false);
});

test('Calendar without availableDates: only dates before today are disabled', async () => {
  const root = await render(<DateCalendar value={null} onSelect={jest.fn()} minDate="2026-10-01" />);
  const props = root.findAll(n => n.props.markedDates && n.props.minDate)[0].props;
  expect(props.disabledByDefault).toBe(false);
  expect(props.minDate).toBe('2026-10-01');
  expect(props.maxDate).toBeUndefined();
});

test('Phone error shows only for a complete but invalid number', () => {
  expect(getPhoneError('12345')).toBe(''); // still typing
  expect(getPhoneError('1234567890')).toBe(phoneError());
  expect(getPhoneError('9876543210')).toBe('');
  expect(getPhoneError('+91 93345 56653')).toBe('');
});

test('New-user details need a name and a valid email', () => {
  expect(validateProfile({ fullName: 'Ram', email: 'ram@gmail.com' })).toEqual({});
  const errors = validateProfile({ fullName: ' ', email: 'ram@' });
  expect(errors.fullName).toBeDefined();
  expect(errors.email).toMatch(/email/);
});
