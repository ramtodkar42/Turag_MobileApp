/**
 * Inspector app (as the web's /inspector pages): jobs from the queue, a job,
 * starting the M2 inspection on site, capturing the checklist (answers, N/A,
 * photos, documents), review and submit for QC - mock backend - plus the real
 * calls against a fake backend (fetch is mocked).
 */
/* eslint-env node */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SectionList } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { Badge, Button, OptionSheet, SearchBar, SelectField, TextField } from '../src/components';
import Jobs from '../src/screens/inspector/Jobs/Jobs';
import FilterPill from '../src/screens/inspector/Jobs/components/FilterPill';
import JobsFilterBar from '../src/screens/inspector/Jobs/components/JobsFilterBar';
import { EMPTY_FILTERS, filterJobs, hasActiveFilters, statusCounts } from '../src/screens/inspector/Jobs/jobsFilter';
import { isJobExpired } from '../src/screens/inspector/constants';
import { mapJob } from '../src/api/mappers/inspection';
import JobDetails from '../src/screens/inspector/JobDetails/JobDetails';
import * as inspectorApi from '../src/api/services/inspector.api';
import { USE_REAL_API } from '../src/api/config';
import { endSession, startSession } from '../src/api/session';
import { formatSlot } from '../src/utils/date';
import { ROUTES } from '../src/navigation/routes';

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

let tree;
const wrap = element => <SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(wrap(element));
  });
  return tree.root;
};
const advance = async (ms = 1000) => {
  for (let passed = 0; passed < ms; passed += 100) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(100, ms - passed));
    });
  }
};
const nav = () => ({ navigate: jest.fn(), goBack: jest.fn(), setParams: jest.fn() });
const button = (root, title) => root.findAllByType(Button).find(b => b.props.title === title);
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;

beforeEach(async () => {
  jest.useFakeTimers();
  inspectorApi.resetMockInspector();
  // Forget the remembered capture step (each test starts at step 1).
  await require('@react-native-async-storage/async-storage').createAsyncStorage('turag-prefs').clear();
});
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  jest.useRealTimers();
  jest.restoreAllMocks();
  launchImageLibrary.mockReset();
  launchImageLibrary.mockResolvedValue({ didCancel: true });
});

test('Login mock: 9890871972 is an inspection officer and never a new user', async () => {
  const { verifyLoginOtp } = jest.requireActual('../src/api/services/auth.api');
  const { getPendingSteps } = jest.requireActual('../src/navigation/authRoutes');
  const result = verifyLoginOtp({ phone: '9890871972', otpToken: 'mock:9890871972', otp: '1234' });
  jest.advanceTimersByTime(600);
  const session = await result;
  expect(session.user).toEqual(expect.objectContaining({ role: 'inspector' }));
  expect(getPendingSteps(session.user, session.consentRequired)).toBeNull();
});

test('Slot times read Today / Tomorrow / date', () => {
  const now = new Date(2026, 9, 2, 9, 0);
  expect(formatSlot(new Date(2026, 9, 2, 10, 30).toISOString(), now)).toBe('Today, 10:30');
  expect(formatSlot(new Date(2026, 9, 3, 9, 5).toISOString(), now)).toBe('Tomorrow, 09:05');
  expect(formatSlot(new Date(2026, 9, 12, 16, 45).toISOString(), now)).toBe('12 Oct, 16:45');
});

describe('My jobs', () => {
  test('assigned jobs from the queue, with status and address; tap opens the job', async () => {
    const navigation = nav();
    const root = await render(<Jobs navigation={navigation} />);
    await advance(600);

    const cards = root.findAll(n => n.props.job && n.props.onPress);
    expect(cards.map(c => c.props.job.id)).toEqual(['job_mock_2', 'job_mock_1']); // by time
    expect(hasText(root, 'To do')).toBe(true);
    expect([...new Set(root.findAllByType(Badge).map(b => b.props.label))]).toEqual(
      expect.arrayContaining(['Inspector on site', 'Inspector assigned']),
    );
    expect(hasText(root, 'Flat 1009, Sahyadri Residency, Baner, Pune 411045')).toBe(true);
    // No accept / decline: jobs are assigned automatically.
    expect(button(root, 'Accept')).toBeUndefined();

    await act(async () => cards[1].props.onPress(cards[1].props.job));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.JOB_DETAILS, { bookingId: 'job_mock_1' });
  });

  test('not an inspector: "Inspectors only"', async () => {
    const { ApiError } = require('../src/api/client');
    jest
      .spyOn(inspectorApi, 'getInspectorJobs')
      .mockRejectedValue(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'x' }));
    const root = await render(<Jobs navigation={nav()} />);
    await advance(100);
    expect(hasText(root, 'Inspectors only')).toBe(true);
  });
});

describe('A job', () => {
  test('assigned: check the RC number, confirm the vehicle, start - then capture', async () => {
    const navigation = nav();
    const root = await render(<JobDetails navigation={navigation} route={{ params: { bookingId: 'job_mock_1' } }} />);
    await advance(600);

    expect(button(root, 'Get directions')).toBeDefined();
    const plate = () => root.findAllByType(TextField).find(f => f.props.label === 'Registration Number');
    expect(button(root, 'Find vehicle').props.disabled).toBe(true);
    await act(async () => plate().props.onChangeText('mh12dx5087'));
    await act(async () => {
      button(root, 'Find vehicle').props.onPress();
    });
    await advance(900);
    expect(hasText(root, 'Is this the vehicle in front of you?')).toBe(true);

    await act(async () => {
      button(root, 'Start inspection').props.onPress();
    });
    await advance(1400);
    // The new shared M1 / M2 capture screen (not the old inspector capture).
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SELF_INSPECTION, {
      inspectionId: 'insp_mock_job_mock_1',
      bookingId: 'job_mock_1',
    });
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.INSPECTION_CAPTURE, expect.anything());
  });

  test('on site: Continue inspection; chat with the customer', async () => {
    const navigation = nav();
    const root = await render(<JobDetails navigation={navigation} route={{ params: { bookingId: 'job_mock_2' } }} />);
    await advance(600);

    await act(async () => button(root, 'Continue inspection').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SELF_INSPECTION, {
      inspectionId: 'insp_mock_m2',
      bookingId: 'job_mock_2',
    });
    await act(async () => button(root, 'Open chat').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.BOOKING_CHAT, { bookingId: 'job_mock_2', withCustomer: true });
  });
});

// Jobs at fixed times around "now" (22 Oct 2026, 10:00 on the phone).
const NOW = new Date(2026, 9, 22, 10, 0);
const hoursFromNow = hours => new Date(NOW.getTime() + hours * 60 * 60 * 1000).toISOString();
const rawJob = (id, extra) => ({
  booking_id: id,
  mode: 'DOORSTEP',
  category: 'PASSENGER',
  status: 'ASSIGNED',
  address_line: 'Baner Road, Baner',
  pincode: '411045',
  city: 'PUNE',
  slot_at: hoursFromNow(4),
  inspector_assigned: true,
  inspection_id: null,
  building: null,
  landmark: null,
  geo_lat: null,
  geo_lng: null,
  ...extra,
});
const toJob = raw => mapJob(raw);
const QUEUE = () =>
  [
    rawJob('job_a', {}), // today 14:00, to do
    rawJob('job_b', { status: 'ON_SITE', slot_at: hoursFromNow(-1), city: 'PCMC', address_line: 'Wakad', pincode: '411057', inspection_id: 'insp_b' }),
    rawJob('job_c', { slot_at: hoursFromNow(-2), category: 'TWO_WHEELER', address_line: 'Kothrud', pincode: '411038' }), // expired
    rawJob('job_d', { status: 'FULFILLED', slot_at: hoursFromNow(-72), address_line: 'Aundh', pincode: '411007' }),
    rawJob('job_e', { slot_at: hoursFromNow(5 * 24), city: 'PCMC', category: 'TWO_WHEELER', address_line: 'Hinjewadi', pincode: '411057' }),
    rawJob('job_f', { status: 'CANCELLED', slot_at: hoursFromNow(10 * 24), address_line: 'Hadapsar', pincode: '411028' }),
  ].map(toJob);

describe('My jobs: filters and the Expired group (as the web job board)', () => {
  // From the list's sections (the list only draws the first rows on screen).
  const cardIds = root => root.findByType(SectionList).props.sections.flatMap(section => section.data.map(job => job.id));
  const pill = (root, label) => root.findAllByType(FilterPill).find(p => p.props.label === label);
  const bar = root => root.findByType(JobsFilterBar);
  const sheet = (root, title) => root.findAllByType(OptionSheet).find(s => s.props.title === title);
  const show = async () => {
    jest.setSystemTime(NOW);
    jest.spyOn(inspectorApi, 'getInspectorJobs').mockResolvedValue(QUEUE());
    const navigation = nav();
    const root = await render(<Jobs navigation={navigation} />);
    await advance(100);
    return { root, navigation };
  };

  test('groups: to do, expired (no Open, ops must reschedule), the rest', async () => {
    const { root, navigation } = await show();
    expect(cardIds(root)).toEqual(['job_a', 'job_b', 'job_e', 'job_c', 'job_d', 'job_f']);
    expect(hasText(root, 'Expired (1)')).toBe(true);
    expect(hasText(root, 'Ask ops to reschedule a new slot.')).toBe(true);
    const expired = root.findAll(n => n.props.job && n.props.onPress && n.props.job.id === 'job_c')[0];
    expect(expired.props.expired).toBe(true);
    expect(hasText(expired, 'Slot passed. Ops must reschedule.')).toBe(true);
    expect(hasText(expired, 'Open job')).toBe(false);
    expect(expired.findAllByType(Badge)[0].props.label).toBe('Expired');
    // An ON_SITE visit an hour past its slot is never expired.
    const onSite = root.findAll(n => n.props.job && n.props.onPress && n.props.job.id === 'job_b')[0];
    expect(onSite.props.expired).toBe(false);
    expect(hasText(root, '3 active')).toBe(true);
    // It can still be opened (to read it and chat).
    await act(async () => expired.props.onPress(expired.props.job));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.JOB_DETAILS, { bookingId: 'job_c' });
  });

  test('status chips with counts; search; clear', async () => {
    const { root } = await show();
    expect(['All  6', 'Assigned  3', 'In progress  1', 'Completed  1', 'Cancelled  1'].map(l => !!pill(root, l))).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    await act(async () => pill(root, 'Completed  1').props.onPress());
    expect(cardIds(root)).toEqual(['job_d']);
    expect(hasText(root, '1 of 6 jobs')).toBe(true);
    expect(hasText(root, 'To do (0)')).toBe(true);
    expect(hasText(root, 'Nothing to inspect in this view.')).toBe(true);

    await act(async () => bar(root).props.onClear());
    expect(cardIds(root)).toHaveLength(6);

    // Search: pincode, booking id, city name, address.
    const search = text => act(async () => root.findByType(SearchBar).props.onChangeText(text));
    await search('411057');
    expect(cardIds(root)).toEqual(['job_b', 'job_e']);
    // Counts follow the other filters.
    expect(pill(root, 'All  2')).toBeDefined();
    expect(pill(root, 'Assigned  1')).toBeDefined();
    await search('job_d');
    expect(cardIds(root)).toEqual(['job_d']);
    await search('pimpri'); // PCMC's name
    expect(cardIds(root)).toEqual(['job_b', 'job_e']);
    await search('kothrud');
    expect(cardIds(root)).toEqual(['job_c']);

    await search('nothing like this');
    expect(cardIds(root)).toEqual([]);
    expect(hasText(root, 'Nothing matches')).toBe(true);
    await act(async () => button(root, 'Clear filters').props.onPress());
    expect(cardIds(root)).toHaveLength(6);
    expect(root.findByType(SearchBar).props.value).toBe('');
  });

  test('Today, Next 7 days, a date range', async () => {
    const { root } = await show();
    await act(async () => pill(root, 'Today').props.onPress());
    expect(pill(root, 'Today').props.selected).toBe(true);
    expect(cardIds(root)).toEqual(['job_a', 'job_b', 'job_c']);
    // Tapping it again turns it off.
    await act(async () => pill(root, 'Today').props.onPress());
    expect(cardIds(root)).toHaveLength(6);

    await act(async () => pill(root, 'Next 7 days').props.onPress());
    expect(cardIds(root)).toEqual(['job_a', 'job_b', 'job_e', 'job_c']);

    await act(async () => bar(root).props.onChange({ from: '2026-10-19', to: '2026-10-19' }));
    expect(cardIds(root)).toEqual(['job_d']);
    await act(async () => bar(root).props.onChange({ from: '2026-11-01', to: '' }));
    expect(cardIds(root)).toEqual(['job_f']);
  });

  test('city and vehicle type selects', async () => {
    const { root } = await show();
    expect(pill(root, 'All cities')).toBeDefined();
    expect(sheet(root, 'City').props.options.map(o => o.label)).toEqual(['All cities', 'Pune', 'Pimpri-Chinchwad']);
    await act(async () => sheet(root, 'City').props.onSelect('PCMC'));
    expect(cardIds(root)).toEqual(['job_b', 'job_e']);
    expect(pill(root, 'Pimpri-Chinchwad').props.selected).toBe(true);

    await act(async () => sheet(root, 'Vehicle type').props.onSelect('TWO_WHEELER'));
    expect(cardIds(root)).toEqual(['job_e']);
    expect(hasText(root, '1 of 6 jobs')).toBe(true);

    await act(async () => bar(root).props.onClear());
    expect(cardIds(root)).toHaveLength(6);
    expect(pill(root, 'All vehicle types')).toBeDefined();
  });

  test('pure filter helpers', () => {
    const jobs = QUEUE();
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: '  ' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, city: 'PUNE' })).toBe(true);
    expect(statusCounts(jobs, EMPTY_FILTERS)).toEqual({ ALL: 6, ASSIGNED: 3, ON_SITE: 1, FULFILLED: 1, CANCELLED: 1 });
    expect(filterJobs(jobs, { ...EMPTY_FILTERS, category: 'TWO_WHEELER', status: 'ASSIGNED' }).map(j => j.id)).toEqual([
      'job_c',
      'job_e',
    ]);
    // Expired: ASSIGNED and over an hour past the slot.
    const at = NOW.getTime();
    expect(isJobExpired({ status: 'ASSIGNED', slotAt: at - 61 * 60 * 1000 }, at)).toBe(true);
    expect(isJobExpired({ status: 'ASSIGNED', slotAt: at - 59 * 60 * 1000 }, at)).toBe(false);
    expect(isJobExpired({ status: 'ON_SITE', slotAt: at - 5 * 60 * 60 * 1000 }, at)).toBe(false);
    expect(isJobExpired({ status: 'ASSIGNED', slotAt: null }, at)).toBe(false);
  });
});

describe('A job: as the web job page', () => {
  const linking = require('../src/utils/linking');
  const open = async (raw, navigation = nav()) => {
    jest.setSystemTime(NOW);
    jest.spyOn(inspectorApi, 'getInspectorJob').mockResolvedValue(toJob(raw));
    const root = await render(<JobDetails navigation={navigation} route={{ params: { bookingId: raw.booking_id } }} />);
    await advance(100);
    return root;
  };

  test('address with building and landmark; directions to the pinned spot', async () => {
    const directions = jest.spyOn(linking, 'openDirections').mockResolvedValue(true);
    const root = await open(
      rawJob('job_g', { building: 'Flat 402, Sunshine Society', landmark: 'near X Mall', geo_lat: 18.559, geo_lng: 73.7868 }),
    );
    expect(hasText(root, 'Flat 402, Sunshine Society, Baner Road, Baner, Pune 411045 (near X Mall)')).toBe(true);
    await act(async () => button(root, 'Get directions').props.onPress());
    expect(directions).toHaveBeenCalledWith({
      location: { latitude: 18.559, longitude: 73.7868 },
      address: 'Baner Road, Baner, Pune 411045',
    });
  });

  test('no pin: directions to the text address', async () => {
    const directions = jest.spyOn(linking, 'openDirections').mockResolvedValue(true);
    const root = await open(rawJob('job_h', {}));
    await act(async () => button(root, 'Get directions').props.onPress());
    expect(directions).toHaveBeenCalledWith({ location: null, address: 'Baner Road, Baner, Pune 411045' });
  });

  test('expired: no Start, ops must reschedule; chat still open', async () => {
    const root = await open(rawJob('job_c', { slot_at: hoursFromNow(-2) }));
    expect(button(root, 'Find vehicle')).toBeUndefined();
    expect(button(root, 'Identify manually')).toBeUndefined();
    expect(hasText(root, 'This booking has expired')).toBe(true);
    expect(hasText(root, 'Ask ops to reschedule a new slot for the customer.')).toBe(true);
    expect(root.findAllByType(Badge).map(b => b.props.label)).toContain('Expired');
    expect(button(root, 'Open chat').props.disabled).toBe(false);
  });

  test('a started visit is never expired: Continue', async () => {
    const navigation = nav();
    const root = await open(rawJob('job_b', { status: 'ON_SITE', slot_at: hoursFromNow(-3), inspection_id: 'insp_b' }), navigation);
    expect(hasText(root, 'This booking has expired')).toBe(false);
    await act(async () => button(root, 'Continue inspection').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SELF_INSPECTION, { inspectionId: 'insp_b', bookingId: 'job_b' });
  });

  test('complete and cancelled: chat closed', async () => {
    let root = await open(rawJob('job_d', { status: 'FULFILLED', slot_at: hoursFromNow(-72), inspection_id: 'insp_d' }));
    expect(hasText(root, 'This inspection is complete.')).toBe(true);
    expect(button(root, 'Continue inspection')).toBeUndefined();
    expect(button(root, 'Open chat').props.disabled).toBe(true);
    act(() => tree.unmount());
    root = await open(rawJob('job_f', { status: 'CANCELLED' }));
    expect(hasText(root, 'This booking was cancelled.')).toBe(true);
    expect(button(root, 'Open chat').props.disabled).toBe(true);
  });

  test('the RC card shows the registry details (insurance, fitness, tax, finance, owners, RC status)', async () => {
    jest.spyOn(inspectorApi, 'proposeJobVehicle').mockResolvedValue({
      make: 'Hyundai',
      model: 'Creta',
      year: 2022,
      fuelCode: 'PETROL',
      fuel: 'Petrol',
      category: 'PASSENGER',
      rcCity: 'Pune',
      rcState: 'MH',
      rcStatus: 'ACTIVE',
      insuranceCompany: 'Acko General',
      insuranceUpto: '2027-03-01',
      fitnessUpto: '2037-01-01',
      taxUpto: '2037-01-01',
      financed: 'true',
      ownerCount: 2,
      fromCache: true,
    });
    const root = await open(rawJob('job_a', {}));
    const plate = root.findAllByType(TextField).find(f => f.props.label === 'Registration Number');
    await act(async () => plate.props.onChangeText('MH12DX5087'));
    await act(async () => {
      button(root, 'Find vehicle').props.onPress();
    });
    await advance(100);
    ['Verified registry record', '2022 Hyundai Creta', 'RC status', 'ACTIVE', 'Acko General', 'Insurance valid to', 'Fitness valid to', 'Tax valid to', 'Finance', 'Owners'].forEach(text =>
      expect(hasText(root, text)).toBe(true),
    );
    const rows = root.findAll(n => n.props.label === 'Finance' && n.props.value != null)[0];
    expect(rows.props.value).toBe('Yes');
  });

  test('RC not matched: identify manually (make, model, year, fuel), then the capture', async () => {
    const { ApiError } = require('../src/api/client');
    jest
      .spyOn(inspectorApi, 'proposeJobVehicle')
      .mockRejectedValue(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'We couldn’t match that plate. Identify the vehicle manually below.' }));
    const manual = jest.spyOn(inspectorApi, 'startManualInspection');
    const navigation = nav();
    const root = await open(rawJob('job_mock_1', {}), navigation);
    const plate = root.findAllByType(TextField).find(f => f.props.label === 'Registration Number');
    await act(async () => plate.props.onChangeText('MH12DX5087'));
    await act(async () => {
      button(root, 'Find vehicle').props.onPress();
    });
    await advance(100);
    expect(hasText(root, 'Identify the vehicle manually below.')).toBe(true);

    const select = label => root.findAllByType(SelectField).find(f => f.props.label === label);
    expect(button(root, 'Start with these details').props.disabled).toBe(true);
    expect(select('Make').props.options).toEqual(expect.arrayContaining(['Hyundai', 'Maruti Suzuki']));
    await act(async () => select('Make').props.onChange('Hyundai'));
    expect(select('Model').props.options).toEqual(expect.arrayContaining(['Creta', 'Venue']));
    await act(async () => select('Model').props.onChange('Creta'));
    const year = () => root.findAllByType(TextField).find(f => f.props.label === 'MFG year');
    await act(async () => year().props.onChangeText('1950'));
    expect(year().props.error).toBe('Enter a year from 1980 on.');
    expect(button(root, 'Start with these details').props.disabled).toBe(true);
    await act(async () => year().props.onChangeText('2021'));
    await act(async () => select('Fuel').props.onChange('PETROL'));
    await act(async () => {
      button(root, 'Start with these details').props.onPress();
    });
    await advance(1200);

    expect(manual).toHaveBeenCalledWith({
      job: expect.objectContaining({ id: 'job_mock_1', category: 'PASSENGER' }),
      make: 'Hyundai',
      model: 'Creta',
      year: '2021',
      fuel: 'PETROL',
    });
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SELF_INSPECTION, {
      inspectionId: 'insp_mock_job_mock_1',
      bookingId: 'job_mock_1',
    });
  });

  test('a model not in the list is typed', async () => {
    const manual = jest.spyOn(inspectorApi, 'startManualInspection').mockResolvedValue({ inspectionId: 'insp_x' });
    const root = await open(rawJob('job_a', { category: 'TWO_WHEELER' }));
    await act(async () => button(root, 'Identify manually').props.onPress());
    const select = label => root.findAllByType(SelectField).find(f => f.props.label === label);
    // Two-wheeler job: bike makes.
    expect(select('Make').props.options).toEqual(expect.arrayContaining(['Royal Enfield']));
    expect(select('Make').props.options).not.toContain('Hyundai');
    await act(async () => select('Make').props.onChange('Bajaj'));
    await act(async () => select('Model').props.onChange('__other__'));
    const typed = root.findAllByType(TextField).find(f => f.props.label === 'Model name');
    await act(async () => typed.props.onChangeText('Chetak'));
    await act(async () => select('Fuel').props.onChange('ELECTRIC'));
    await act(async () => {
      button(root, 'Start with these details').props.onPress();
    });
    expect(manual).toHaveBeenCalledWith(expect.objectContaining({ make: 'Bajaj', model: 'Chetak', year: '', fuel: 'ELECTRIC' }));
  });

  test('the server says the slot has lapsed (409 BOOKING_EXPIRED): ops must reschedule', async () => {
    const { ApiError } = require('../src/api/client');
    jest
      .spyOn(inspectorApi, 'startJobInspection')
      .mockRejectedValue(new ApiError({ status: 409, code: 'BOOKING_EXPIRED', message: 'x' }));
    const navigation = nav();
    const root = await open(rawJob('job_mock_1', {}), navigation);
    const plate = root.findAllByType(TextField).find(f => f.props.label === 'Registration Number');
    await act(async () => plate.props.onChangeText('MH12DX5087'));
    await act(async () => {
      button(root, 'Find vehicle').props.onPress();
    });
    await advance(900);
    await act(async () => {
      button(root, 'Start inspection').props.onPress();
    });
    await advance(100);
    expect(hasText(root, 'This booking has expired. Ask ops to reschedule a new slot.')).toBe(true);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});

// The capture itself (M2) is the shared inspection screen - its inspector
// mode is tested in selfInspection.test.jsx.

describe('real backend', () => {
  const reply = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify(body)),
  });
  const call = i => ({ url: fetch.mock.calls[i][0], init: fetch.mock.calls[i][1] });
  const { sampleQueue } = require('../src/api/mock/inspector');

  beforeAll(() => {
    USE_REAL_API.inspector = true;
    USE_REAL_API.valuation = true;
  });
  afterAll(() => {
    USE_REAL_API.inspector = false;
    USE_REAL_API.valuation = false;
  });
  beforeEach(async () => {
    jest.useRealTimers();
    global.fetch = jest.fn();
    await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
  });
  afterEach(async () => {
    await endSession();
  });

  test('jobs come from the queue; one job is picked from it', async () => {
    fetch.mockResolvedValue(reply(200, { bookings: sampleQueue() }));
    const jobs = await inspectorApi.getInspectorJobs();
    expect(call(0).url).toMatch(/\/inspection-bookings\/queue$/);
    expect(call(0).init.headers.Authorization).toBe('Bearer access-1');
    expect(jobs.map(j => [j.id, j.toDo])).toEqual([
      ['job_mock_2', true],
      ['job_mock_1', true],
    ]);
    await expect(inspectorApi.getInspectorJob('nope')).rejects.toMatchObject({ code: 'BOOKING_NOT_FOUND' });
  });

  test('starting: confirm the vehicle, then an M2 inspection linked to the booking', async () => {
    fetch
      .mockResolvedValueOnce(reply(201, { vehicle_id: 'veh_1', make: 'Hyundai', model: 'Creta', mfg_year: 2022, category: 'PASSENGER', registry: {} }))
      .mockResolvedValueOnce(reply(201, { inspection: { id: 'insp_1', status: 'IN_PROGRESS' } }));
    const job = { id: 'bkg_1', category: 'PASSENGER' };
    await expect(inspectorApi.startJobInspection({ job, registrationNumber: 'MH12DX5087' })).resolves.toEqual({
      inspectionId: 'insp_1',
    });
    expect(call(0).url).toMatch(/\/vehicles\/confirm$/);
    expect(call(1).url).toMatch(/\/inspections$/);
    expect(JSON.parse(call(1).init.body)).toEqual({
      vehicle_id: 'veh_1',
      mode: 'M2',
      category: 'PASSENGER',
      booking_id: 'bkg_1',
    });
  });

  test('identify manually: POST /vehicles/identify (make, model, fuel, year, the job category), then the same M2 inspection', async () => {
    fetch
      .mockResolvedValueOnce(reply(200, { vehicle_id: 'veh_9', make: 'Hyundai', model: 'Creta', mfg_year: 2021, lookup_source: 'MANUAL' }))
      .mockResolvedValueOnce(reply(201, { inspection: { id: 'insp_9', status: 'IN_PROGRESS' } }));
    const job = { id: 'bkg_1', category: 'PASSENGER' };
    await expect(
      inspectorApi.startManualInspection({ job, make: ' Hyundai ', model: 'Creta ', year: '2021', fuel: 'PETROL' }),
    ).resolves.toEqual({ inspectionId: 'insp_9' });
    expect(call(0).url).toMatch(/\/vehicles\/identify$/);
    expect(call(0).init.method).toBe('POST');
    expect(JSON.parse(call(0).init.body)).toEqual({
      make: 'Hyundai',
      model: 'Creta',
      fuel: 'PETROL',
      year: 2021,
      category: 'PASSENGER',
    });
    expect(call(1).url).toMatch(/\/inspections$/);
    expect(JSON.parse(call(1).init.body)).toEqual({ vehicle_id: 'veh_9', mode: 'M2', category: 'PASSENGER', booking_id: 'bkg_1' });
  });

  test('identify manually without year / fuel sends only make, model, category', async () => {
    fetch
      .mockResolvedValueOnce(reply(200, { vehicle_id: 'veh_9', make: 'Bajaj', model: 'Chetak', mfg_year: 2024 }))
      .mockResolvedValueOnce(reply(201, { inspection: { id: 'insp_9' } }));
    await inspectorApi.startManualInspection({
      job: { id: 'bkg_2', category: 'TWO_WHEELER' },
      make: 'Bajaj',
      model: 'Chetak',
      year: '',
      fuel: null,
    });
    expect(JSON.parse(call(0).init.body)).toEqual({ make: 'Bajaj', model: 'Chetak', category: 'TWO_WHEELER' });
  });

  test('409 BOOKING_EXPIRED on create: "ask ops to reschedule"', async () => {
    fetch
      .mockResolvedValueOnce(reply(201, { vehicle_id: 'veh_1', make: 'Hyundai', model: 'Creta', mfg_year: 2022, registry: {} }))
      .mockResolvedValueOnce(reply(409, { error: { code: 'BOOKING_EXPIRED', message: 'This booking has expired.' } }));
    await expect(
      inspectorApi.startJobInspection({ job: { id: 'bkg_1', category: 'PASSENGER' }, registrationNumber: 'MH12DX5087' }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'BOOKING_EXPIRED',
      message: 'This booking has expired. Ask ops to reschedule a new slot.',
    });
  });

  test('RC lookup: registry record vs live lookup; no match = NOT_FOUND', async () => {
    fetch.mockResolvedValueOnce(
      reply(200, { make: 'Hyundai', model: 'Creta', mfg_year: 2022, from_cache: true, registry: { rc_status: 'ACTIVE', insurance_company: 'Acko' } }),
    );
    await expect(inspectorApi.proposeJobVehicle('mh12dx5087')).resolves.toEqual(
      expect.objectContaining({ make: 'Hyundai', rcStatus: 'ACTIVE', insuranceCompany: 'Acko', fromCache: true }),
    );
    expect(call(0).url).toMatch(/\/vehicles\/propose$/);
    expect(JSON.parse(call(0).init.body)).toEqual({ registration_number: 'MH12DX5087' });

    fetch.mockResolvedValueOnce(reply(404, { error: { code: 'NOT_FOUND', message: 'x' } }));
    await expect(inspectorApi.proposeJobVehicle('MH12DX5087')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('the queue: the map pin, building and landmark', async () => {
    fetch.mockResolvedValue(
      reply(200, {
        bookings: [
          { ...sampleQueue()[0], geo_lat: 18.559, geo_lng: 73.7868, building: 'Flat 402', landmark: 'near X Mall' },
          sampleQueue()[1],
        ],
      }),
    );
    const jobs = await inspectorApi.getInspectorJobs();
    const pinned = jobs.find(j => j.id === 'job_mock_1');
    expect(pinned).toEqual(
      expect.objectContaining({ location: { latitude: 18.559, longitude: 73.7868 }, building: 'Flat 402', landmark: 'near X Mall' }),
    );
    expect(jobs.find(j => j.id === 'job_mock_2').location).toBeNull();
  });
});
