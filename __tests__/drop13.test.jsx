/**
 * Backend drop (13), as the web: what the server now expects from a self-inspection
 * (questions only QC answers, reads it runs itself, the notes QC's check reads), and the
 * smaller changes around it (report wording, sign-up retry, Careers).
 */
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import fixture from './fixtures/passengerChecklistCurrent.json';
import { AppText } from '../src/components';
import { analyzeMedia, getSelfInspection } from '../src/api/services/selfInspection.api';
import * as profileApi from '../src/api/services/profile.api';
import * as reportApi from '../src/api/services/report.api';
import { mapReport } from '../src/api/mappers/booking';
import { endSession, startSession } from '../src/api/session';
import { ROUTES } from '../src/navigation/routes';
import completeSignUp from '../src/screens/auth/CompleteProfile/completeSignUp';
import InspectionReport from '../src/screens/account/InspectionReport/InspectionReport';
import Profile from '../src/screens/profile/Profile/Profile';
import { formatRcNote, formatVinNote } from '../src/screens/selfInspection/SelfInspection/identity/identityNote';
import { measureGrey, qualityWarnings, selfIdentityReads } from '../src/vendor/selfInspectionLogic';
import { clearUser, setUser } from '../src/store/userStore';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: () => Promise.resolve(JSON.stringify(body)),
});

describe('the self-inspection API', () => {
  let originalFetch;
  beforeEach(async () => {
    originalFetch = global.fetch;
    global.fetch = jest.fn();
    await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
  });
  afterEach(async () => {
    global.fetch = originalFetch;
    await endSession();
  });

  const load = async mode => {
    global.fetch.mockImplementation(async url => {
      if (url.includes('/checklists/')) return reply(200, fixture);
      if (url.endsWith('/media')) return reply(200, { items: [] });
      return reply(200, { inspection: { id: 'i1', mode, category: 'PASSENGER', checklist_version: 4 } });
    });
    const { sections } = await getSelfInspection('i1');
    return sections.flatMap(s => s.items).map(i => i.item_code);
  };

  test('checklist v4: the owner never sees the questions only QC answers', async () => {
    const m1 = await load('M1');
    ['C1', 'C3', 'R1', 'Q1'].forEach(code => expect(m1).not.toContain(code));
    expect(m1).toEqual(expect.arrayContaining(['P1', 'A1', 'O1', 'B1']));
  });

  test('an inspector still answers them', async () => {
    expect(await load('M2')).toEqual(expect.arrayContaining(['C1', 'C3', 'R1', 'Q1']));
  });

  test('the server read: no image or result in the request, the media row back', async () => {
    global.fetch.mockResolvedValueOnce(reply(200, { media: { id: 'med 1', ai_finding: { has_damage: false } } }));
    expect(await analyzeMedia('med 1')).toEqual({ id: 'med 1', ai_finding: { has_damage: false } });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/media\/med%201\/analyze$/);
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
  });

  test('a failed read reaches the caller, to mark the photo as not checked', async () => {
    global.fetch.mockResolvedValueOnce(reply(503, { error: { code: 'AI_ANALYSIS_UNAVAILABLE', message: 'Not now' } }));
    await expect(analyzeMedia('med_1')).rejects.toMatchObject({ status: 503, code: 'AI_ANALYSIS_UNAVAILABLE' });
  });
});

describe('the notes QC reads', () => {
  const fields = {
    registrationNumber: 'MH12AB1234',
    chassisNumber: 'MA3JMT12345678901',
    engineNumber: 'K12MN1234567',
    make: 'Maruti Suzuki',
    model: 'Swift',
    variant: 'VXI',
    fuel: 'PETROL',
    mfgYear: '2020',
    regDate: '2020-08-14',
  };

  test('the same format as the web', () => {
    expect(formatVinNote(' MA3JMT12345678901 ', ' K12MN1234567 ')).toBe('VIN MA3JMT12345678901 | Engine K12MN1234567');
    expect(formatVinNote('MA3JMT12345678901', null)).toBe('VIN MA3JMT12345678901');
    expect(formatRcNote(fields)).toBe(
      'RC: Reg MH12AB1234 | Chassis MA3JMT12345678901 | Engine K12MN1234567 | Maruti Suzuki Swift VXI | PETROL | MFG 2020 | Reg dt 2020-08-14',
    );
    expect(formatRcNote({})).toBe('RC: confirmed from photo');
  });

  test("the server's own parser reads them back", () => {
    expect(selfIdentityReads(formatRcNote(fields), formatVinNote('MA3JMT12345678901', 'K12MN1234567'))).toEqual({
      vin: 'MA3JMT12345678901',
      engineNumber: 'K12MN1234567',
      registrationNumber: 'MH12AB1234',
      plateDiffersFromRc: false,
    });
  });
});

describe('photo quality (the web\'s own measure)', () => {
  // A checker pattern is all edges; a flat grey has none.
  const sharp = Array.from({ length: 100 }, (_, i) => ((i + Math.floor(i / 10)) % 2 ? 90 : 170));
  const warningsFor = grey => qualityWarnings(measureGrey(grey, 10, 10));

  test('dark, washed out, possibly blurry, or fine', () => {
    expect(warningsFor(Array(100).fill(10))).toEqual(['DARK']);
    expect(warningsFor(Array(100).fill(250))).toEqual(['BRIGHT']);
    expect(warningsFor(Array(100).fill(128))).toEqual(['BLURRY']);
    expect(warningsFor(sharp)).toEqual([]);
  });
});

describe('the report', () => {
  const report = {
    assessment: {},
    findings: [
      { item_code: 'C3', group: 'Structure', label: 'A/B/C pillars intact', severity: 'MAJOR', note: 'Weld visible' },
      { item_code: 'B1', group: 'Exterior', label: 'Body panels', severity: 'MINOR' },
    ],
    checklist: [
      { item_code: 'C3', reviewed_from_photos: true },
      { item_code: 'B1' },
    ],
    valuation: { status: 'READY', valuation_id: 'v1', headline: { value: 41000000 }, confidence: { level: 'HIGH' } },
    valuation_adjusted_after_review: true,
  };

  test('maps which items QC answered from photos, and the saved value', () => {
    const mapped = mapReport(report);
    expect(mapped.findings.find(f => f.code === 'C3').reviewedFromPhotos).toBe(true);
    expect(mapped.findings.find(f => f.code === 'B1').reviewedFromPhotos).toBe(false);
    expect(mapped.valuationCard).toEqual({ valueMinor: 41000000, confidenceLevel: 'HIGH' });
    expect(mapped.valuationAdjusted).toBe(true);
    expect(mapped.valuationReason).toBeNull();
  });

  test('no value yet, older reports: nothing breaks', () => {
    const mapped = mapReport({ assessment: {}, findings: [{ item_code: 'B1', severity: 'MINOR' }], valuation: { status: 'NOT_READY', reason: 'Not enough data' } });
    expect(mapped.findings[0].reviewedFromPhotos).toBe(false);
    expect(mapped.valuationCard).toBeNull();
    expect(mapped.valuationAdjusted).toBe(false);
    expect(mapped.valuationReason).toBe('Not enough data');
  });

  test('says so on the items QC answered, and only those', async () => {
    const spy = jest.spyOn(reportApi, 'getInspectionReport').mockResolvedValue(mapReport(report));
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
          <InspectionReport navigation={{ goBack: jest.fn(), navigate: jest.fn() }} route={{ params: { inspectionId: 'i1' } }} />
        </SafeAreaProvider>,
      );
    });
    await act(async () => {});
    const note = "Reviewed by Turag from the owner's photos and videos. Not a physical check.";
    expect(tree.root.findAllByType(AppText).filter(n => n.props.children === note)).toHaveLength(1);
    act(() => tree.unmount());
    spy.mockRestore();
  });
});

describe('signing up as a dealer', () => {
  let register;
  beforeEach(() => {
    setUser({ contact: '9876543210' });
    jest.spyOn(profileApi, 'getMe').mockResolvedValue({ user: { fullName: 'Asha' } });
    register = jest.spyOn(profileApi, 'registerBusinessInterest');
  });
  afterEach(() => {
    clearUser();
    jest.restoreAllMocks();
  });
  const signUp = purpose =>
    completeSignUp({ needsProfile: false, needsConsent: false, values: { purpose }, consents: {} });

  test('saved the first time: asked once', async () => {
    register.mockResolvedValue({ recorded: true });
    await signUp('dealer');
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('DEALER');
  });

  test('not saved, or the request failed: tried once more, so the lead is not lost', async () => {
    register.mockResolvedValueOnce({ recorded: false }).mockResolvedValueOnce({ recorded: true });
    await signUp('bank');
    expect(register).toHaveBeenCalledTimes(2);
    register.mockClear();
    register.mockRejectedValueOnce(new Error('offline')).mockRejectedValueOnce(new Error('offline'));
    await expect(signUp('dealer')).resolves.toBeTruthy();
    expect(register).toHaveBeenCalledTimes(2);
  });

  test('a customer: not sent at all', async () => {
    await signUp('buy');
    expect(register).not.toHaveBeenCalled();
  });
});

test('Careers opens from Help', async () => {
  const navigation = { navigate: jest.fn(), getParent: () => null };
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
        <Profile navigation={navigation} />
      </SafeAreaProvider>,
    );
  });
  await act(async () => {});
  await act(async () => tree.root.findAll(n => n.props.label === 'Careers' && n.props.onPress)[0].props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.WEB_PAGE, { title: 'Careers', path: '/career' });
  act(() => tree.unmount());
});
