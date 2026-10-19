/**
 * Inspector app (as the web's /inspector pages): jobs from the queue, a job,
 * starting the M2 inspection on site, capturing the checklist (answers, N/A,
 * photos, documents), review and submit for QC - mock backend - plus the real
 * calls against a fake backend (fetch is mocked).
 */
/* eslint-env node */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { Badge, Button, ChoiceChip, OptionSheet, TextField } from '../src/components';
import Jobs from '../src/screens/inspector/Jobs/Jobs';
import JobDetails from '../src/screens/inspector/JobDetails/JobDetails';
import Capture from '../src/screens/inspector/Capture/Capture';
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
const chip = (root, label) => root.findAllByType(ChoiceChip).find(c => c.props.label === label);
// The "Upload document" sheet: pick 'gallery' or 'pdf' (the picker opens once the sheet has closed).
const pickSource = async (root, source) => {
  const sheet = root.findAllByType(OptionSheet).find(s => s.props.visible && s.props.title === 'Upload document');
  expect(sheet.props.options.map(o => o.label)).toEqual(['Photo from gallery', 'PDF file']);
  await act(async () => {
    sheet.props.onSelect(source);
    sheet.props.onClose();
  });
  await advance(400);
};

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
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.INSPECTION_CAPTURE, {
      inspectionId: 'insp_mock_job_mock_1',
      bookingId: 'job_mock_1',
    });
  });

  test('on site: Continue inspection; chat with the customer', async () => {
    const navigation = nav();
    const root = await render(<JobDetails navigation={navigation} route={{ params: { bookingId: 'job_mock_2' } }} />);
    await advance(600);

    await act(async () => button(root, 'Continue inspection').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.INSPECTION_CAPTURE, {
      inspectionId: 'insp_mock_m2',
      bookingId: 'job_mock_2',
    });
    await act(async () => button(root, 'Open chat').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.BOOKING_CHAT, { bookingId: 'job_mock_2', withCustomer: true });
  });
});

describe('Capture', () => {
  const step = root => root.findAll(n => n.props.item && n.props.onAnswer)[0];
  const next = async root => {
    const title = button(root, 'Next') ? 'Next' : 'Review';
    await act(async () => button(root, title).props.onPress());
  };

  // A navigation mock whose back (header / Android) goes through 'beforeRemove'
  // like React Navigation's: a listener can keep the screen.
  const guardedNav = () => {
    const listeners = [];
    const navigation = {
      ...nav(),
      left: false,
      addListener: jest.fn((name, cb) => {
        listeners.push(cb);
        return () => listeners.splice(listeners.indexOf(cb), 1);
      }),
      dispatch: jest.fn(() => {
        navigation.left = true;
      }),
    };
    navigation.goBack = jest.fn(() => {
      let prevented = false;
      const event = { data: { action: { type: 'GO_BACK' } }, preventDefault: () => (prevented = true) };
      listeners.forEach(cb => cb(event));
      navigation.left = navigation.left || !prevented;
    });
    return navigation;
  };
  const job = { inspectionId: 'insp_mock_m2', bookingId: 'job_mock_2' };
  const stepText = (root, n) => hasText(root, `Step ${n} of 12`);
  const back = async navigation => act(async () => navigation.goBack());

  describe('moving around', () => {
    const { createAsyncStorage } = require('@react-native-async-storage/async-storage');
    const reviewList = root => root.findAll(n => n.props.problems && n.props.onOpen)[0];

    test('an item opened from Review: Back to review / Next issue, and back returns to Review', async () => {
      // Reopened at Review (where it was left).
      await createAsyncStorage('turag-prefs').setItem('capture.step.insp_mock_m2', '12');
      const navigation = guardedNav();
      const root = await render(<Capture navigation={navigation} route={{ params: job }} />);
      await advance(700);
      expect(button(root, 'Submit for QC')).toBeDefined();

      const { problems } = reviewList(root).props;
      expect(problems.length).toBeGreaterThan(1);
      await act(async () => reviewList(root).props.onOpen(problems[0].index));
      expect(stepText(root, problems[0].index + 1)).toBe(true);
      expect(button(root, 'Back to review')).toBeDefined();

      // Next issue jumps straight to the next item that needs attention.
      await act(async () => button(root, 'Next issue').props.onPress());
      expect(stepText(root, problems[1].index + 1)).toBe(true);

      // Back (header / Android) returns to Review, it doesn't leave or go to step 1.
      await back(navigation);
      expect(navigation.left).toBe(false);
      expect(button(root, 'Submit for QC')).toBeDefined();
    });

    test('normal steps: back goes to the previous step; on step 1 it asks before leaving', async () => {
      const navigation = guardedNav();
      const root = await render(<Capture navigation={navigation} route={{ params: job }} />);
      await advance(700);
      await act(async () => button(root, 'Next').props.onPress());
      expect(stepText(root, 2)).toBe(true);

      await back(navigation);
      expect(stepText(root, 1)).toBe(true);
      expect(navigation.left).toBe(false);

      const dialog = () => root.findAll(n => n.props.visible && n.props.onConfirm && n.props.title)[0];
      await back(navigation);
      expect(dialog().props.title).toBe('Leave this inspection?');
      await act(async () => dialog().props.onCancel()); // Stay
      expect(navigation.left).toBe(false);

      await back(navigation);
      await act(async () => dialog().props.onConfirm()); // Leave
      expect(navigation.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
      expect(navigation.left).toBe(true);
    });

    test('reopening continues at the step it was left on', async () => {
      const root = await render(<Capture navigation={guardedNav()} route={{ params: job }} />);
      await advance(700);
      await act(async () => button(root, 'Next').props.onPress());
      await act(async () => button(root, 'Next').props.onPress());
      expect(stepText(root, 3)).toBe(true);
      act(() => tree.unmount());

      const again = await render(<Capture navigation={guardedNav()} route={{ params: job }} />);
      await advance(700);
      expect(stepText(again, 3)).toBe(true);
    });
  });

  test('Change on a document from an earlier visit asks first, uploads the new one, then deletes the old one', async () => {
    // The RC was uploaded in an earlier visit.
    const earlier = inspectorApi.uploadInspectorFile({
      inspectionId: 'insp_mock_m2',
      itemCode: 'P2',
      shotCode: 'RC_FRONT',
      kind: 'DOCUMENT',
      file: { uri: 'file:///old-rc.jpg' },
    });
    jest.advanceTimersByTime(1000);
    const { mediaId: oldId } = await earlier;
    const remove = jest.spyOn(inspectorApi, 'deleteInspectorFile');

    const params = { inspectionId: 'insp_mock_m2', bookingId: 'job_mock_2' };
    const root = await render(<Capture navigation={nav()} route={{ params }} />);
    await advance(700);
    await next(root);
    await next(root);
    expect(step(root).props.item.code).toBe('P2');
    expect(button(root, 'Retake')).toBeDefined(); // already in

    launchImageLibrary.mockResolvedValue({ assets: [{ uri: 'file:///rc.jpg', fileName: 'rc.jpg', fileSize: 1000 }] });
    await act(async () => button(root, 'Change').props.onPress());
    const dialog = root.findAll(n => n.props.visible && n.props.onConfirm && n.props.title)[0];
    expect(dialog.props.title).toBe('Replace this document?');
    await act(async () => dialog.props.onConfirm());
    await advance(400);
    // Then: a photo from the gallery, or a PDF.
    await pickSource(root, 'gallery');
    await advance(1800);

    expect(launchImageLibrary).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('insp_mock_m2', oldId);
  });

  test('one item per step; answers save; N/A asks why; photos and documents upload; then submit for QC', async () => {
    const save = jest.spyOn(inspectorApi, 'saveInspectorAnswer');
    const navigation = nav();
    const params = { inspectionId: 'insp_mock_m2', bookingId: 'job_mock_2' };
    const root = await render(<Capture navigation={navigation} route={{ params }} />);
    await advance(700);

    // M2 items, the hidden guided-photo item left out; saved answers come back.
    const total = 12; // A1 P1 P2 P3 Q1 O1 B1 B2 C1 D1 D2 H1
    expect(hasText(root, `Step 1 of ${total}`)).toBe(true);
    expect(step(root).props.item.code).toBe('A1');
    expect(chip(root, 'OK').props.selected).toBe(true);

    // P1 (answered) -> P2: the RC document, from the gallery.
    await next(root);
    await next(root);
    expect(step(root).props.item.code).toBe('P2');
    await act(async () => chip(root, 'OK').props.onPress());
    // Upload: a photo from the gallery or a PDF - here the RC as a PDF.
    await act(async () => {
      button(root, 'Upload').props.onPress();
    });
    await pickSource(root, 'pdf');
    await advance(1200);
    expect(require('@react-native-documents/picker').pick).toHaveBeenCalled();
    expect(launchImageLibrary).not.toHaveBeenCalled();
    expect(button(root, 'Retake')).toBeDefined();
    expect(hasText(root, 'PDF uploaded')).toBe(true);

    // P3 optional: N/A needs a reason.
    await next(root);
    await act(async () => chip(root, 'N/A').props.onPress());
    const sheet = root.findAllByType(OptionSheet).find(s => s.props.visible);
    expect(sheet.props.options).toHaveLength(10);
    await act(async () => {
      sheet.props.onSelect('OWNER_REFUSED');
    });
    await advance(300);
    expect(save).toHaveBeenCalledWith(
      'insp_mock_m2',
      'P3',
      expect.objectContaining({ severity: 'NOT_ASSESSABLE', naReason: 'OWNER_REFUSED' }),
    );

    // Q1, then O1 (odometer: a number, saved as "OK").
    await next(root);
    await act(async () => chip(root, 'OK').props.onPress());
    await next(root);
    const odo = () => root.findAllByType(TextField).find(f => f.props.label === 'Reading (km)');
    await act(async () => odo().props.onChangeText('18400'));
    await act(async () => {
      odo().props.onBlur();
    });
    await advance(300);
    expect(save).toHaveBeenCalledWith('insp_mock_m2', 'O1', expect.objectContaining({ severity: 'OK', numericValue: 18400 }));

    // B1: Moderate -> repair cost; walk-around photos from the in-app camera -
    // every angle is needed, not just one.
    await next(root);
    await act(async () => chip(root, 'Moderate').props.onPress());
    expect(root.findAllByType(TextField).some(f => f.props.label === 'Estimated repair cost')).toBe(true);
    expect(hasText(root, 'All 8 photos needed')).toBe(true);
    expect(hasText(root, 'At least')).toBe(false);
    await act(async () => button(root, 'Take photo').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.VEHICLE_CAMERA, {
      shot: { key: 'B1|WALK_FRONT', title: 'Front 0°' },
      returnTo: ROUTES.INSPECTION_CAPTURE,
    });
    const capturePhoto = async shot => {
      await act(async () => {
        tree.update(
          wrap(
            <Capture
              navigation={navigation}
              route={{ params: { ...params, captured: { key: `B1|${shot}`, file: { uri: `file:///${shot}.jpg`, fileSize: 1000 } } } }}
            />,
          ),
        );
      });
      await advance(1200);
    };
    await capturePhoto('WALK_FRONT');
    expect(navigation.setParams).toHaveBeenCalledWith({ captured: undefined });
    const b1 = step(root).props.item;
    for (const shot of b1.evidence.shotCodes.slice(1)) {
      await capturePhoto(shot);
    }

    // Review: C1 (required) is still missing, so no submit yet.
    for (let i = 0; i < 6; i += 1) {
      await next(root);
    }
    expect(hasText(root, '1 item(s) need attention')).toBe(true);
    expect(button(root, 'Submit for QC').props.disabled).toBe(true);
    const rows = root.findAll(n => n.props.items && n.props.onOpen)[0];
    const c1 = rows.props.items.findIndex(i => i.code === 'C1');
    await act(async () => rows.props.onOpen(c1));
    await act(async () => chip(root, 'OK').props.onPress());
    await advance(300);
    // Opened from Review: straight back to it (no stepping through the rest).
    expect(button(root, 'Next issue')).toBeUndefined(); // C1 was the only one
    await act(async () => button(root, 'Back to review').props.onPress());
    expect(button(root, 'Submit for QC').props.disabled).toBe(false);

    await act(async () => {
      button(root, 'Submit for QC').props.onPress();
    });
    await advance(900);
    expect(hasText(root, 'Sent for QC')).toBe(true);
    await act(async () => button(root, 'Back to my jobs').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.INSPECTOR_TABS, { screen: ROUTES.INSPECTIONS });
  });
});

describe('real backend', () => {
  const reply = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify(body)),
  });
  const call = i => ({ url: fetch.mock.calls[i][0], init: fetch.mock.calls[i][1] });
  const { sampleChecklist, sampleInspection, sampleQueue } = require('../src/api/mock/inspector');

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

  test('capture data: the inspection, its pinned checklist version and its photos', async () => {
    fetch
      .mockResolvedValueOnce(reply(200, { inspection: sampleInspection() }))
      .mockResolvedValueOnce(reply(200, { checklist: sampleChecklist(), checklist_version: 2 }))
      .mockResolvedValueOnce(
        reply(200, {
          items: [
            { item_code: 'B1', shot_code: 'WALK_FRONT', status: 'PROCESSED' },
            { item_code: 'B1', shot_code: 'WALK_REAR', status: 'REJECTED' },
          ],
        }),
      );
    const data = await inspectorApi.getCaptureData('insp_mock_m2');
    expect(call(0).url).toMatch(/\/inspections\/insp_mock_m2$/);
    expect(call(1).url).toMatch(/\/checklists\/PASSENGER\?version=2$/);
    expect(call(2).url).toMatch(/\/inspections\/insp_mock_m2\/media$/);
    expect(data.items.map(i => i.code)).not.toContain('XM2');
    expect(data.items.find(i => i.code === 'B1')).toEqual(
      // The backend says "at least 1"; the app needs every walk-around angle.
      expect.objectContaining({
        mandatory: true,
        escalates: true,
        evidence: expect.objectContaining({ kind: 'PHOTO', minCount: 8, allShots: true }),
      }),
    );
    expect(data.items.find(i => i.code === 'P2').evidence).toEqual(
      expect.objectContaining({ minCount: 1, allShots: false }), // other items keep the backend's count
    );
    expect(data.items.find(i => i.code === 'P2').evidence.kind).toBe('DOCUMENT');
    expect(data.inspection.answers.A1.severity).toBe('OK');
    expect(data.shots).toEqual({ B1: ['WALK_FRONT'] }); // rejected media doesn't count
  });

  test('answers send N/A reasons and repair cost in paise; submit returns the status', async () => {
    fetch
      .mockResolvedValueOnce(reply(200, { inspection: {} }))
      .mockResolvedValueOnce(reply(200, { inspection: {} }))
      .mockResolvedValueOnce(reply(200, { inspection: { status: 'PENDING_QC' } }));

    await inspectorApi.saveInspectorAnswer('insp_1', 'P3', { severity: 'NOT_ASSESSABLE', naReason: 'OWNER_REFUSED' });
    expect(call(0).url).toMatch(/\/inspections\/insp_1\/items\/P3$/);
    expect(call(0).init.method).toBe('PUT');
    expect(JSON.parse(call(0).init.body)).toEqual({ severity: 'NOT_ASSESSABLE', na_reason: 'OWNER_REFUSED' });

    await inspectorApi.saveInspectorAnswer('insp_1', 'B1', { severity: 'MODERATE', refurbCost: 4500, note: 'Rear dent' });
    expect(JSON.parse(call(1).init.body)).toEqual({ severity: 'MODERATE', text_note: 'Rear dent', refurb_cost_minor: 450000 });

    await expect(inspectorApi.submitForQc('insp_1')).resolves.toEqual({ status: 'PENDING_QC' });
    expect(call(2).url).toMatch(/\/inspections\/insp_1\/submit$/);
  });
});
