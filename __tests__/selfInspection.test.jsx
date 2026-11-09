/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import fixture from './fixtures/passengerChecklistCurrent.json';
import olderFixture from './fixtures/passengerChecklist.json';
import {
  activeItemsFor,
  buildAiFinding,
  buildMissingList,
  parseOdometerKm,
  parseOwnerCount,
  partitionItems,
  photoGroups,
  photoSections,
} from '../src/vendor/selfInspectionLogic';
import { ROUTES } from '../src/navigation/routes';

// The web's current passenger checklist for self-inspection (M1), filtered as the
// web does. (fixtures/passengerChecklist.json: the older one, for inspections
// already pinned to it.)
const sectionsFor = (source, mode) =>
  source.checklist.sections
    .map(s => ({
      group_code: s.group_code,
      label: s.label,
      items: s.items.filter(it => it.applicable_modes.includes(mode) && !it.qc_answered_modes?.includes(mode) && !(it.gate && it.evidence_requirement?.shots)),
    }))
    .filter(s => s.items.length > 0);
const m1Sections = sectionsFor(fixture, 'M1');
const m1Items = m1Sections.flatMap(s => s.items);

const inspection = {
  id: 'insp_1',
  status: 'IN_PROGRESS',
  mode: 'M1',
  category: 'PASSENGER',
  checklist_version: 4,
  vehicle_id: 'veh_1',
  vehicle: { make: 'Maruti Suzuki', model: 'Swift', variant: 'VXi', mfg_year: 2019, category: 'PASSENGER', fuel: 'PETROL' },
  items: [],
};

// The test renderer's views can't be measured: the scroll itself is checked on its own.
jest.mock('../src/utils/scrollToView', () => ({ scrollToView: jest.fn() }));

jest.mock('../src/api/services/selfInspection.api', () => ({
  USABLE_MEDIA: new Set(['UPLOADED', 'PROCESSING', 'PROCESSED', 'INTEGRITY_FLAGGED', 'REDACTION_HELD']),
  analyzeMedia: jest.fn(),
  submitEngineFrames: jest.fn(async () => ({})),
  reportEngineSound: jest.fn(async () => ({})),
  getSelfInspection: jest.fn(),
  getReferenceValuation: jest.fn(async () => null),
  listSelfInspectionMedia: jest.fn(async () => []),
  recordSelfAnswer: jest.fn(async () => ({})),
  uploadSelfEvidence: jest.fn(async ({ shotCode }) => ({ mediaId: `med_${shotCode}`, status: 'UPLOADED' })),
  deleteSelfMedia: jest.fn(async () => {}),
  saveAiFinding: jest.fn(async () => ({})),
  getThumbUrl: jest.fn(async () => null),
  submitSelfInspection: jest.fn(async () => ({ status: 'SUBMITTED' })),
  reopenSelfInspection: jest.fn(async () => {}),
  estimateFinalValue: jest.fn(async () => ({ card: { valueMinor: 45000000, confidenceLevel: 'MEDIUM' }, valuation: null, reason: null })),
}));

jest.mock('../src/api/services/aiScan.api', () => ({
  scanDamagePhoto: jest.fn(async () => ({
    hasDamage: true,
    part: 'FRONT_BUMPER',
    type: 'SCRATCH',
    severity: 'MINOR',
    confidence: 82,
    partMinor: 0,
    labourMinor: 120000,
    paintMinor: 80000,
    repairCostMinor: 200000,
    reasoning: 'Light scratch on the bumper',
    cosmetic: [],
    promptVersion: 'm1-dent-v4',
  })),
  readOdometerPhoto: jest.fn(),
  readIdentityPhoto: jest.fn(),
}));

jest.mock('../src/utils/fileToBase64', () => ({ fileToBase64: jest.fn(async () => 'BASE64') }));
jest.mock('../src/utils/photoDhash', () => ({ photoDhash: jest.fn(async () => null) }));
jest.mock('../src/utils/photoQuality', () => ({ photoQualityWarnings: jest.fn(async () => []) }));
jest.mock('../src/utils/engineClip', () => ({
  extractEngineFrames: jest.fn(async () => ['data:image/jpeg;base64,AAAA']),
  measureEngineSound: jest.fn(async () => ({ durationSec: 10, loudnessDbfs: -22, stabilityCv: 0.1, transientsPerSec: 0.3 })),
}));
jest.mock('../src/utils/pickImage', () => ({ pickImageFromGallery: jest.fn(async () => null) }));

const api = require('../src/api/services/selfInspection.api');
const vision = require('../src/api/services/aiScan.api');
const { photoDhash } = require('../src/utils/photoDhash');
const { photoQualityWarnings } = require('../src/utils/photoQuality');
const engineClip = require('../src/utils/engineClip');
const { pickImageFromGallery } = require('../src/utils/pickImage');
// The jest location mock: Baner, Pune.
const BANER = { lat: 18.559, lng: 73.7868, accuracyM: 10 };
const SelfInspection = require('../src/screens/selfInspection/SelfInspection/SelfInspection').default;

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
let tree;
let navigation;
let listeners = {};

const render = async (params = {}) => {
  listeners = {};
  navigation = {
    navigate: jest.fn(),
    setParams: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn((event, cb) => {
      listeners[event] = cb;
      return () => {};
    }),
  };
  const route = { params: { inspectionId: 'insp_1', ...params } };
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <SelfInspection navigation={navigation} route={route} />
      </SafeAreaProvider>,
    );
  });
  await act(async () => {});
  return tree.root;
};

const rerender = async params => {
  await act(async () => {
    tree.update(
      <SafeAreaProvider initialMetrics={metrics}>
        <SelfInspection navigation={navigation} route={{ params: { inspectionId: 'insp_1', ...params } }} />
      </SafeAreaProvider>,
    );
  });
  await act(async () => {});
};

// Every text on screen, including text split across nested parts (a title + "· optional").
const texts = root =>
  root
    .findAll(n => typeof n.props.children === 'string' || Array.isArray(n.props.children))
    .flatMap(n => (Array.isArray(n.props.children) ? n.props.children : [n.props.children]))
    .filter(c => typeof c === 'string');
const hasText = (root, text) => texts(root).some(s => s.includes(text));
const pressable = (root, label) => root.findAll(n => n.props.accessibilityLabel === label && n.props.onPress)[0];
const tab = (root, label) => root.findAll(n => n.props.accessibilityRole === 'tab' && n.props.accessibilityLabel === label && n.props.onPress)[0];
// A pill of the Photos / Documents step, by its name.
const pill = (root, name) =>
  root.findAll(
    n =>
      n.props.accessibilityRole === 'tab' &&
      n.props.onPress &&
      n.findAll(c => typeof c.props.children !== 'undefined' && [c.props.children].flat().join('').startsWith(name)).length,
  )[0];
const openPill = async (root, name) => {
  await act(async () => pill(root, name).props.onPress());
};
const openPhotos = async (params) => {
  const root = await render(params);
  await act(async () => tab(root, 'Photos').props.onPress());
  return root;
};
const openExterior = async () => {
  const root = await openPhotos();
  await openPill(root, 'Exterior');
  return root;
};

// What the server's read saves against a walkaround photo.
const serverFinding = {
  shotCode: 'WALK_FRONT',
  v2: {
    hasDamage: true,
    part: 'FRONT_BUMPER',
    type: 'SCRATCH',
    severity: 'MINOR',
    confidence: 82,
    repairCostMinor: 200000,
    reasoning: 'Light scratch on the bumper',
    promptVersion: 'm1-dent-v4',
    cosmetic: [],
  },
  plate: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  api.getSelfInspection.mockResolvedValue({ inspection, sections: m1Sections, media: [] });
  api.analyzeMedia.mockImplementation(async id => ({ id, ai_finding: buildAiFinding(serverFinding) }));
  api.listSelfInspectionMedia.mockResolvedValue([]);
});

afterEach(() => {
  act(() => tree?.unmount());
});

describe('web logic (the same functions as turag.ai)', () => {
  test('the current checklist: documents, one page of questions, then photos with odometer and VIN', () => {
    const active = activeItemsFor(m1Items, {});
    const part = partitionItems(active);
    expect(part.documents.map(i => i.item_code)).toEqual(['P1', 'O2', 'P2', 'P3']);
    expect(part.photoDetails.map(i => i.item_code)).toEqual(['O1', 'A1']);
    // Facts first in the config; the servicing follow-ups only join after "Yes".
    expect(part.checklist.map(i => i.item_code)).toEqual([
      'RC_ORIG_M1', 'PUC_M1', 'FLOOD_M1', 'KEYS_M1', 'SVC_M1',
      'B1', 'B2', 'D1', 'D2', 'E1', 'F1', 'G1', 'H1', 'I1', 'J1', 'K1',
    ]);
    // Every photo required; underbody shows with the exterior, front seats with the interior.
    expect(photoSections(photoGroups(m1Items)).map(g => `${g.item.item_code}:${g.slots.length}/${g.minCount}`)).toEqual([
      'B1:14/14', 'XINT_M1:19/19', 'XENG:5/5', 'XTYRE:9/9', 'XEXTRA_M1:1/1', 'XDENT:6/0',
    ]);
  });

  test('servicing follow-ups apply only after a saved "Yes"', () => {
    const codes = answers => activeItemsFor(m1Items, answers).map(i => i.item_code).filter(c => c.startsWith('SVC'));
    expect(codes({})).toEqual(['SVC_M1']);
    expect(codes({ SVC_M1: { saved: true, value: 'NO' } })).toEqual(['SVC_M1']);
    expect(codes({ SVC_M1: { saved: true, value: 'YES' } })).toEqual(['SVC_M1', 'SVC_DATE_M1', 'SVC_PLACE_M1', 'SVC_RECEIPT_M1']);
  });

  test('required photos and both videos block submit even with no answer (the server gate)', () => {
    const parse = (c, r2) => (c === 'O2' ? parseOwnerCount(r2) : parseOdometerKm(r2));
    const missing = buildMissingList({ items: activeItemsFor(m1Items, {}), answers: {}, evidenceCount: {}, parseNumeric: parse });
    const photos = missing.filter(m => m.step === 'photos').map(m => m.itemCode);
    ['O1', 'A1', 'XUB_M1', 'XINT_M1', 'XSEAT_M1', 'XENG', 'XTYRE', 'XEXTRA_M1', 'XWALK_M1', 'XENGVID_M1'].forEach(code =>
      expect(photos).toContain(code),
    );
    expect(photos).not.toContain('XDENT');
  });
});

describe('removing a photo the server is still checking', () => {
  const { ApiError } = require('../src/api/client');
  const { deleteWhenReady } = require('../src/screens/selfInspection/SelfInspection/useSelfInspection');
  const processing = () => new ApiError({ status: 409, code: 'MEDIA_PROCESSING', message: 'still processing' });

  test('a "still processing" refusal is retried by itself until it works', async () => {
    jest.useFakeTimers();
    const remove = jest.fn().mockRejectedValueOnce(processing()).mockRejectedValueOnce(processing()).mockResolvedValueOnce();
    const done = deleteWhenReady('med_1', remove);
    for (let i = 0; i < 5; i += 1) {
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
    }
    await expect(done).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });

  test('other errors are not retried', async () => {
    const remove = jest.fn().mockRejectedValue(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' }));
    await expect(deleteWhenReady('med_1', remove)).rejects.toMatchObject({ status: 403 });
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe('Self-inspection screen', () => {
  test('opens on Documents; the 4 steps in the new order; RC first', async () => {
    const root = await render();
    ['Documents', 'Checklist', 'Photos', 'Estimate'].forEach(label => expect(tab(root, label)).toBeTruthy());
    expect(hasText(root, 'Document 1 of 4')).toBe(true);
    expect(hasText(root, 'Registration certificate (RC)')).toBe(true);
    expect(hasText(root, 'Step 1 of 4')).toBe(true);
  });

  test('photos: odometer and VIN first, then groups with underbody and seats merged', async () => {
    const root = await openPhotos();
    ['Odometer', 'VIN', 'Exterior', 'Interior', 'Engine', 'Tyres', 'Walkaround video', 'Engine video', '0/14', '0/19', '0/5', '0/9'].forEach(text =>
      expect(hasText(root, text)).toBe(true),
    );
    await openPill(root, 'Exterior');
    expect(hasText(root, 'Photo 1 of 14')).toBe(true);
    expect(hasText(root, 'Front')).toBe(true);
    expect(root.findAll(n => n.props.title === 'Take photo' && n.props.onPress).length).toBe(1);
  });

  test('after a photo uploads it moves on to the next angle by itself', async () => {
    const root = await openExterior();
    await act(async () => pressable(root, 'Add Front photo').props.onPress());
    await rerender({ captured: { key: 'B1:WALK_FRONT', file: { uri: 'file:///f.jpg', type: 'image/jpeg' } } });
    expect(hasText(root, 'Photo 2 of 14')).toBe(true);
    expect(hasText(root, 'Front-left corner')).toBe(true);
  });

  test('a retake while the old photo is still being checked uploads anyway; the old one goes later', async () => {
    const { ApiError } = require('../src/api/client');
    api.getSelfInspection.mockResolvedValue({
      inspection,
      sections: m1Sections,
      media: [{ id: 'med_old', item_code: 'B1', shot_code: 'WALK_FRONT', kind: 'PHOTO', status: 'PROCESSING', derivatives: [], created_at: '2026-10-19T10:00:00Z' }],
    });
    api.deleteSelfMedia.mockRejectedValue(new ApiError({ status: 409, code: 'INVALID_TRANSITION', message: 'processing' }));
    const root = await openExterior();
    const front = root.findAll(n => n.props.accessibilityLabel === 'Front' && n.props.onPress)[0];
    await act(async () => front.props.onPress());
    await act(async () => pressable(root, 'Retake Front photo').props.onPress());
    // Retake goes straight to the camera (photos are camera only).
    expect(navigation.navigate).toHaveBeenLastCalledWith(ROUTES.VEHICLE_CAMERA, {
      shot: { key: 'B1:WALK_FRONT', title: 'Front' },
      returnTo: ROUTES.SELF_INSPECTION,
    });
    await rerender({ captured: { key: 'B1:WALK_FRONT', file: { uri: 'file:///new.jpg', type: 'image/jpeg' } } });
    // Tried once, refused (still checking) -> the new photo is uploaded anyway, no error shown.
    expect(api.deleteSelfMedia).toHaveBeenCalledWith('med_old');
    expect(api.uploadSelfEvidence).toHaveBeenCalledWith(expect.objectContaining({ shotCode: 'WALK_FRONT' }));
    expect(hasText(root, 'still checking')).toBe(false);
  });

  test('a tile opens the camera; the photo is uploaded and the server checks walkaround photos', async () => {
    const root = await openExterior();
    await act(async () => pressable(root, 'Add Front photo').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.VEHICLE_CAMERA, {
      shot: { key: 'B1:WALK_FRONT', title: 'Front' },
      returnTo: ROUTES.SELF_INSPECTION,
    });
    const file = { uri: 'file:///front.jpg', type: 'image/jpeg', fileSize: 1000 };
    await rerender({ captured: { key: 'B1:WALK_FRONT', file } });
    expect(api.uploadSelfEvidence).toHaveBeenCalledWith({
      inspectionId: 'insp_1',
      itemCode: 'B1',
      shotCode: 'WALK_FRONT',
      kind: 'PHOTO',
      file,
      gps: BANER, // where it was taken (best effort, as the web)
      onProgress: expect.any(Function), // where the upload is, for the screen
    });
    // The server reads the stored photo and saves the result: no image or result leaves the app.
    expect(api.analyzeMedia).toHaveBeenCalledWith('med_WALK_FRONT');
    expect(vision.scanDamagePhoto).not.toHaveBeenCalled();
    expect(api.saveAiFinding).not.toHaveBeenCalled();
    // Its finding shows on the photo.
    await act(async () => root.findAll(n => n.props.accessibilityLabel === 'Front' && n.props.onPress)[0].props.onPress());
    expect(hasText(root, 'Damage spotted')).toBe(true);
  });

  test('a failed server read holds nothing up: the photo stays, marked as not checked', async () => {
    api.analyzeMedia.mockRejectedValueOnce(new Error('503'));
    const root = await openExterior();
    await act(async () => pressable(root, 'Add Front photo').props.onPress());
    await rerender({ captured: { key: 'B1:WALK_FRONT', file: { uri: 'file:///f.jpg', type: 'image/jpeg' } } });
    expect(hasText(root, 'Photo 2 of 14')).toBe(true);
    await act(async () => root.findAll(n => n.props.accessibilityLabel === 'Front' && n.props.onPress)[0].props.onPress());
    expect(hasText(root, 'AI check unavailable')).toBe(true);
  });

  test('photos are camera only: no Gallery option, Take photo opens the camera', async () => {
    const root = await openExterior();
    expect(root.findAll(n => n.props.title === 'Gallery').length).toBe(0);
    const take = root.findAll(n => n.props.title === 'Take photo' && n.props.onPress)[0];
    await act(async () => take.props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.VEHICLE_CAMERA, {
      shot: { key: 'B1:WALK_FRONT', title: 'Front' },
      returnTo: ROUTES.SELF_INSPECTION,
    });
    expect(pickImageFromGallery).not.toHaveBeenCalled();
  });

  test('a photo that looks like another angle gets a hint and stays on that angle', async () => {
    photoDhash.mockResolvedValue('ffff0000ffff0000');
    const root = await openExterior();
    await act(async () => pressable(root, 'Add Front photo').props.onPress());
    await rerender({ captured: { key: 'B1:WALK_FRONT', file: { uri: 'file:///a.jpg', type: 'image/jpeg' } } });
    // The first photo has nothing to look like: moved on.
    expect(hasText(root, 'Front-left corner')).toBe(true);
    await act(async () => pressable(root, 'Add Front-left corner photo').props.onPress());
    await rerender({ captured: { key: 'B1:WALK_FRONT_LEFT', file: { uri: 'file:///b.jpg', type: 'image/jpeg' } } });
    // Uploaded anyway (advisory only), but the hint is shown and it waits there.
    expect(api.uploadSelfEvidence).toHaveBeenCalledTimes(2);
    expect(hasText(root, 'This looks a lot like your Front photo')).toBe(true);
    expect(hasText(root, 'Photo 2 of 14')).toBe(true);
    photoDhash.mockResolvedValue(null);
  });

  const radio = (root, label, within) =>
    (within ?? root).findAll(n => n.props.accessibilityRole === 'radio' && n.props.onPress).find(n => n.findAll(c => c.props.children === label).length);
  // The card of one question on the checklist page.
  const question = (root, title) =>
    root
      .findAll(n => n.props.collapsable === false && n.findAll(c => [c.props.children].flat().includes(title)).length)
      .slice(-1)[0];

  test('checklist: every question on one page, facts first; an answer saves with the web body', async () => {
    const root = await render();
    await act(async () => tab(root, 'Checklist').props.onPress());
    ['About your vehicle', 'Condition check', 'Has the vehicle ever been flooded?', 'Body panel condition', 'Interior condition'].forEach(text =>
      expect(hasText(root, text)).toBe(true),
    );
    expect(hasText(root, 'Last servicing date')).toBe(false); // only after "Yes"
    await act(async () => radio(root, 'Good', question(root, 'Body panel condition')).props.onPress());
    expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'B1', { severity: 'OK' });
  });

  test('Yes / No facts save as OK / MAJOR, with no grade and no "can\'t check"', async () => {
    const root = await render();
    await act(async () => tab(root, 'Checklist').props.onPress());
    const card = question(root, 'Is the PUC document available?');
    expect(radio(root, 'Good', card)).toBeUndefined();
    await act(async () => radio(root, 'No', card).props.onPress());
    expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'PUC_M1', { severity: 'MAJOR' });
    await act(async () => radio(root, 'Yes', question(root, 'Is the PUC document available?')).props.onPress());
    expect(api.recordSelfAnswer).toHaveBeenLastCalledWith('insp_1', 'PUC_M1', { severity: 'OK' });
  });

  test('an answer moves on by itself: the page glides to the next open question and outlines it', async () => {
    const { scrollToView } = require('../src/utils/scrollToView');
    const { StyleSheet } = require('react-native');
    const { colors } = require('../src/theme');
    const root = await render();
    await act(async () => tab(root, 'Checklist').props.onPress());
    const outlined = title => StyleSheet.flatten(question(root, title).props.style).borderColor === colors.primary;
    const settle = () => act(async () => new Promise(resolve => setTimeout(resolve, 400)));
    const rc = 'Is the physical original RC (hard copy) available with you?';
    scrollToView.mockClear();

    await act(async () => radio(root, 'No', question(root, rc)).props.onPress());
    await settle();
    expect(scrollToView).toHaveBeenCalledTimes(1);
    expect(outlined('Is the PUC document available?')).toBe(true);

    await act(async () => radio(root, 'Yes', question(root, 'Is the PUC document available?')).props.onPress());
    await settle();
    expect(outlined('Has the vehicle ever been flooded?')).toBe(true);
    expect(outlined('Is the PUC document available?')).toBe(false);

    // Changing an answer already given stays where it is.
    scrollToView.mockClear();
    await act(async () => radio(root, 'Yes', question(root, rc)).props.onPress());
    await settle();
    expect(scrollToView).not.toHaveBeenCalled();
  });

  test('an answer that asks for more (a repair cost, why it can\'t be checked) waits for it', async () => {
    const { scrollToView } = require('../src/utils/scrollToView');
    const root = await render();
    await act(async () => tab(root, 'Checklist').props.onPress());
    const settle = () => act(async () => new Promise(resolve => setTimeout(resolve, 400)));
    scrollToView.mockClear();
    const body = () => question(root, 'Body panel condition');
    const choices = within => within.findAll(n => n.props.accessibilityRole === 'radio' && n.props.onPress);
    // The worst grades ask for a repair cost: nothing moves yet.
    await act(async () => choices(body()).slice(-2)[0].props.onPress());
    await settle();
    expect(scrollToView).not.toHaveBeenCalled();
  });

  test('flood "Yes" waits for its details and saves them with the value; "No" saves at once', async () => {
    const root = await render();
    await act(async () => tab(root, 'Checklist').props.onPress());
    const title = 'Has the vehicle ever been flooded?';
    await act(async () => radio(root, 'Yes', question(root, title)).props.onPress());
    expect(api.recordSelfAnswer).not.toHaveBeenCalled();
    const save = () => root.findAll(n => n.props.title === 'Save answer' && n.props.onPress)[0];
    expect(save().props.disabled).toBe(true);
    const details = root.findAll(n => n.props.label === 'Please describe what happened' && n.props.onChangeText)[0];
    await act(async () => details.props.onChangeText('Water up to the seats in 2023'));
    await act(async () => save().props.onPress());
    expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'FLOOD_M1', {
      severity: 'OK',
      text_note: 'Water up to the seats in 2023',
      value_text: 'YES',
    });
    await act(async () => radio(root, 'No', question(root, title)).props.onPress());
    expect(api.recordSelfAnswer).toHaveBeenLastCalledWith('insp_1', 'FLOOD_M1', { severity: 'OK', value_text: 'NO' });
  });

  test('servicing "Yes" brings its follow-ups: date (value_text), place, optional receipt', async () => {
    const { DatePickerField } = require('../src/components');
    const root = await render();
    await act(async () => tab(root, 'Checklist').props.onPress());
    await act(async () => radio(root, 'Yes', question(root, 'Has the vehicle been serviced recently?')).props.onPress());
    expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'SVC_M1', { severity: 'OK', value_text: 'YES' });
    ['Last servicing date', 'Where was it serviced?', 'Servicing receipt'].forEach(text => expect(hasText(root, text)).toBe(true));
    await act(async () => root.findByType(DatePickerField).props.onChange('2026-09-15'));
    expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'SVC_DATE_M1', { severity: 'OK', value_text: '2026-09-15' });
    await act(async () => radio(root, 'Showroom').props.onPress());
    expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'SVC_PLACE_M1', { severity: 'OK', value_text: 'SHOWROOM' });
  });

  test('the number of keys: a quick pick saves as a number', async () => {
    const root = await render();
    await act(async () => tab(root, 'Checklist').props.onPress());
    await act(async () => radio(root, '2', question(root, 'How many keys are available with the vehicle?')).props.onPress());
    expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'KEYS_M1', { severity: 'OK', numeric_value: 2 });
  });

  test('a saved answer comes back from the server (value_text) and follow-ups show', async () => {
    api.getSelfInspection.mockResolvedValue({
      inspection: { ...inspection, items: [{ item_code: 'SVC_M1', severity: 'OK', value_text: 'YES' }] },
      sections: m1Sections,
      media: [],
    });
    const root = await render();
    await act(async () => tab(root, 'Checklist').props.onPress());
    expect(hasText(root, 'Last servicing date')).toBe(true);
  });

  test('documents one at a time: RC, owners, papers; no PUC, odometer or VIN here', async () => {
    const root = await render();
    expect(hasText(root, 'Document 1 of 4')).toBe(true);
    expect(pill(root, 'Odometer')).toBeUndefined();
    expect(pill(root, 'PUC')).toBeUndefined();
    await act(async () => root.findAll(n => n.props.title === 'Next document' && n.props.onPress)[0].props.onPress());
    expect(hasText(root, 'Document 2 of 4')).toBe(true);
    expect(hasText(root, 'How many owners has this vehicle had before you?')).toBe(true);
  });

  test('owners come from the RC record: saved by themselves, nothing to type', async () => {
    api.getSelfInspection.mockResolvedValue({
      inspection: { ...inspection, vehicle: { ...inspection.vehicle, registry_owner_count: 2 } },
      sections: m1Sections,
      media: [],
    });
    const root = await render();
    await act(async () => {});
    expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'O2', { severity: 'OK', numeric_value: 1 });
    await openPill(root, 'Owners');
    expect(hasText(root, '1 previous owner(s)')).toBe(true);
    expect(root.findAll(n => n.props.placeholder === 'Number of previous owners' && n.props.onChangeText).length).toBe(0);
  });

  test('an uploaded document is its own answer: no condition choices, saved as OK', async () => {
    const root = await render();
    await openPill(root, 'Insurance');
    expect(radio(root, 'Good')).toBeUndefined();
    const EvidenceList = require('../src/screens/selfInspection/SelfInspection/components/EvidenceList').default;
    await act(async () => root.findByType(EvidenceList).props.onAdd('camera'));
    const { key } = navigation.navigate.mock.calls.at(-1)[1].shot;
    await rerender({ captured: { key, file: { uri: 'file:///policy.jpg', type: 'image/jpeg' } } });
    expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'P3', { severity: 'OK' });
  });

  test('the phone back button steps back through the process instead of closing it', async () => {
    const root = await render();
    const back = async () => {
      const event = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
      await act(async () => listeners.beforeRemove(event));
      return event;
    };
    // Estimate -> Photos -> Checklist -> Documents -> previous document -> leaves.
    await act(async () => tab(root, 'Estimate').props.onPress());
    expect((await back()).preventDefault).toHaveBeenCalled();
    expect(hasText(root, 'One photo at a time')).toBe(true);
    await back();
    expect(hasText(root, 'About your vehicle')).toBe(true);
    await back();
    expect(hasText(root, 'Document 1 of 4')).toBe(true);
    // On the first document, back really leaves (the action is let through).
    expect(navigation.dispatch).not.toHaveBeenCalled();
    await back();
    expect(navigation.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
  });

  test('where to find it again: "saved as you go" on the screen, and "Saved in your Garage" on leaving', async () => {
    const bannerStore = require('../src/push/bannerStore');
    const show = jest.spyOn(bannerStore, 'showBanner');
    const root = await render();
    expect(hasText(root, 'Saved as you go. Continue anytime from your Garage.')).toBe(true);
    expect(show).not.toHaveBeenCalled();

    await act(async () => listeners.beforeRemove({ preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } }));
    expect(navigation.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Saved in your Garage',
        body: 'Continue your AI Self Inspection anytime, right where you left off.',
        icon: 'check',
        tone: 'success',
        onPress: expect.any(Function),
      }),
    );
    show.mockRestore();
  });

  test('continuing one already in progress (instead of a second one) says so, once', async () => {
    const bannerStore = require('../src/push/bannerStore');
    const show = jest.spyOn(bannerStore, 'showBanner');
    await render({ resumed: true });
    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Continuing your inspection',
        body: 'You already started one for this vehicle. All you added is still here.',
      }),
    );
    expect(navigation.setParams).toHaveBeenCalledWith({ resumed: undefined });
    show.mockRestore();
  });

  test('from Estimate, a "what\'s left" item opens there and back returns to Estimate', async () => {
    const root = await render();
    const back = async () => {
      await act(async () => listeners.beforeRemove({ preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } }));
    };
    const entry = label =>
      root.findAll(n => n.props.accessibilityRole === 'button' && n.props.onPress && n.findAll(c => c.props.children === label).length)[0];
    const settle = async () => {
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });
    };
    await act(async () => tab(root, 'Estimate').props.onPress());

    // A missing photo group opens that group (Interior, with the front seats), not the first one.
    await act(async () => entry('Add photos for Interior photos').props.onPress());
    await settle();
    expect(hasText(root, 'Photo 1 of 19')).toBe(true);
    await back();
    expect(hasText(root, 'Before you can submit (')).toBe(true);
    expect(navigation.dispatch).not.toHaveBeenCalled(); // didn't leave the screen

    // Front seats sit inside Interior: their entry opens the same group.
    await act(async () => entry('Add photos for Front seat photos').props.onPress());
    await settle();
    expect(hasText(root, 'Photo 1 of 19')).toBe(true);
    await back();

    // A missing document opens that document; back returns to Estimate too.
    await act(async () => entry('Number of previous owners').props.onPress());
    await settle();
    expect(hasText(root, 'Document 2 of 4')).toBe(true);
    await back();
    expect(hasText(root, 'Before you can submit (')).toBe(true);
  });

  test('photos: the odometer is first there and saves as a number with OK', async () => {
    const root = await openPhotos();
    const field = root.findAll(n => n.props.placeholder === 'Kilometres, e.g. 52340' && n.props.onChangeText)[0];
    await act(async () => field.props.onChangeText('52340'));
    await act(async () => field.props.onBlur());
    expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'O1', { severity: 'OK', numeric_value: 52340 });
  });

  describe('guided videos', () => {
    const openWalkaround = async () => {
      const root = await openPhotos();
      await openPill(root, 'Walkaround video');
      return root;
    };
    const walk = { key: 'XWALK_M1:WALK_INT_EXT_VIDEO', minS: undefined, maxS: 120 };
    const clip = duration => ({ uri: 'file:///walk.mp4', type: 'video/mp4', fileName: 'walk.mp4', duration });

    test('what to film, the length, and Record opens the in-app recorder', async () => {
      const root = await openWalkaround();
      expect(hasText(root, 'Start outside: walk slowly around the car')).toBe(true);
      expect(hasText(root, 'Maximum length: 120 seconds')).toBe(true);
      await act(async () => root.findAll(n => n.props.title === 'Record video' && n.props.onPress)[0].props.onPress());
      expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.VIDEO_RECORDER, {
        slot: { key: walk.key, title: 'Interior & exterior walkaround video', minS: undefined, maxS: 120 },
        returnTo: ROUTES.SELF_INSPECTION,
      });
    });

    test('nothing is sent until the clip is accepted; then it uploads as a VIDEO', async () => {
      const root = await openWalkaround();
      await rerender({ recorded: { ...walk, file: clip(90) } });
      expect(api.uploadSelfEvidence).not.toHaveBeenCalled();
      expect(hasText(root, 'Watch your video, then use it or retake it.')).toBe(true);
      expect(hasText(root, 'A Turag reviewer will check')).toBe(true);
      await act(async () => root.findAll(n => n.props.title === 'Use this video' && n.props.onPress)[0].props.onPress());
      expect(api.uploadSelfEvidence).toHaveBeenCalledWith(
        expect.objectContaining({ itemCode: 'XWALK_M1', shotCode: 'WALK_INT_EXT_VIDEO', kind: 'VIDEO' }),
      );
      expect(hasText(root, 'Video saved')).toBe(true);
    });

    describe('the engine clip, read for QC', () => {
      const engine = { key: 'XENGVID_M1:ENG_START_VIDEO', minS: 30, maxS: 45 };
      const useEngineClip = async () => {
        const root = await openPhotos();
        await openPill(root, 'Engine video');
        await rerender({ recorded: { ...engine, file: { ...clip(40), uri: 'file:///engine.mp4' } } });
        await act(async () => root.findAll(n => n.props.title === 'Use this video' && n.props.onPress)[0].props.onPress());
        await act(async () => {});
        return root;
      };

      test('after it uploads: stills for the server, then the measured sound', async () => {
        await useEngineClip();
        expect(engineClip.extractEngineFrames).toHaveBeenCalledWith(expect.objectContaining({ uri: 'file:///engine.mp4', duration: 40 }));
        expect(api.submitEngineFrames).toHaveBeenCalledWith('insp_1', ['data:image/jpeg;base64,AAAA']);
        expect(api.reportEngineSound).toHaveBeenCalledWith('insp_1', {
          durationSec: 10,
          loudnessDbfs: -22,
          stabilityCv: 0.1,
          transientsPerSec: 0.3,
        });
      });

      test('nothing readable: no stills sent, and the sound is reported as not measured', async () => {
        engineClip.extractEngineFrames.mockResolvedValueOnce([]);
        engineClip.measureEngineSound.mockRejectedValueOnce(new Error('decoder'));
        await useEngineClip();
        expect(api.submitEngineFrames).not.toHaveBeenCalled();
        expect(api.reportEngineSound).toHaveBeenCalledWith('insp_1', null);
      });

      test('a failure is never shown, and the stills failing still measures the sound', async () => {
        engineClip.extractEngineFrames.mockRejectedValueOnce(new Error('no frames'));
        api.reportEngineSound.mockRejectedValueOnce(new Error('offline'));
        const root = await useEngineClip();
        expect(api.reportEngineSound).toHaveBeenCalledTimes(1);
        expect(hasText(root, 'offline')).toBe(false);
        expect(hasText(root, 'Video saved')).toBe(true);
      });

      test('the walkaround video is not read', async () => {
        const root = await openWalkaround();
        await rerender({ recorded: { ...walk, file: clip(90) } });
        await act(async () => root.findAll(n => n.props.title === 'Use this video' && n.props.onPress)[0].props.onPress());
        expect(api.uploadSelfEvidence).toHaveBeenCalled();
        expect(engineClip.extractEngineFrames).not.toHaveBeenCalled();
        expect(api.reportEngineSound).not.toHaveBeenCalled();
      });
    });

    test('a clip that is too long or too short is refused, with the reason', async () => {
      const root = await openPhotos();
      await openPill(root, 'Engine video');
      await rerender({ recorded: { key: 'XENGVID_M1:ENG_START_VIDEO', minS: 30, maxS: 45, file: { ...clip(10), uri: 'file:///e.mp4' } } });
      expect(hasText(root, 'This video is only 10 seconds long. Please record at least 30 seconds.')).toBe(true);
      expect(root.findAll(n => n.props.title === 'Use this video').length).toBe(0);
      await rerender({ recorded: { key: 'XENGVID_M1:ENG_START_VIDEO', minS: 30, maxS: 45, file: { ...clip(80), uri: 'file:///e2.mp4' } } });
      expect(hasText(root, 'This video is 80 seconds long. Please record it again in 45 seconds or less.')).toBe(true);
    });
  });

  test('the live estimate is the value from Evaluate', async () => {
    api.getReferenceValuation.mockResolvedValueOnce(45000000);
    const root = await render();
    await act(async () => {});
    expect(api.getReferenceValuation).toHaveBeenCalledWith('insp_1');
    expect(hasText(root, '₹4,50,000')).toBe(true);
  });

  test('an inspection pinned to the older checklist still opens (PUC upload, dashboard video)', async () => {
    const older = sectionsFor(olderFixture, 'M1');
    api.getSelfInspection.mockResolvedValue({ inspection, sections: older, media: [] });
    const root = await render();
    expect(pill(root, 'PUC')).toBeTruthy();
    await act(async () => tab(root, 'Photos').props.onPress());
    await openPill(root, 'Video');
    expect(root.findAll(n => n.props.title === 'Record video').length).toBe(0);
    expect(hasText(root, 'Tap to add a short dashboard video')).toBe(true);
  });

  test('estimate: lists what is left and keeps Submit disabled', async () => {
    const root = await render();
    await act(async () => tab(root, 'Estimate').props.onPress());
    expect(hasText(root, 'Before you can submit (')).toBe(true);
    const submit = root.findAll(n => n.props.title === 'Submit AI Self Inspection' && n.props.onPress)[0];
    expect(submit.props.disabled).toBe(true);
  });

  test('submitted: shows the final value from the backend', async () => {
    api.getSelfInspection.mockResolvedValue({ inspection: { ...inspection, status: 'SUBMITTED' }, sections: m1Sections, media: [] });
    const root = await render();
    await act(async () => {});
    expect(hasText(root, 'AI Self Inspection submitted')).toBe(true);
    expect(api.estimateFinalValue).toHaveBeenCalledWith({ vehicle_id: 'veh_1', stage: 'DECLARED', inspection_id: 'insp_1' });
    expect(hasText(root, 'Dealer will pay about')).toBe(true);
    expect(hasText(root, '₹4,50,000')).toBe(true);
  });
});

describe('a self-inspection follows the new server rules', () => {
  const valuationApi = require('../src/api/services/valuation.api');
  const reportApi = require('../src/api/services/report.api');
  const { launchCamera } = require('react-native-image-picker');
  const VIN = 'MA3JMT12345678901';
  const button = (root, title) => root.findAll(n => n.props.title === title && n.props.onPress)[0];
  const settle = (ms = 20) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
  let verify;
  let read;

  beforeEach(() => {
    verify = jest.spyOn(valuationApi, 'verifyInspectionIdentity').mockResolvedValue({ vin: 'MATCH', registration_number: 'MATCH' });
    read = jest.spyOn(valuationApi, 'extractInspectionIdentity').mockResolvedValue({ isVinPlate: true, vin: VIN, engineNumber: null });
    api.deleteSelfMedia.mockResolvedValue();
  });
  afterEach(() => {
    verify.mockRestore();
    read.mockRestore();
  });

  // On the VIN card: takes the photo, confirms the read, and saves.
  const scanVin = async root => {
    launchCamera.mockResolvedValueOnce({ assets: [{ uri: 'file:///vin.jpg', base64: 'B64', type: 'image/jpeg', fileSize: 900 }] });
    await act(async () => button(root, 'Add VIN photo').props.onPress());
    await settle();
    await act(async () => button(root, 'Yes').props.onPress());
    await act(async () => button(root, 'Engine not visible').props.onPress());
    await act(async () => button(root, 'Confirm & save').props.onPress());
    await settle();
  };
  const openVin = async params => {
    const root = await openPhotos(params);
    await openPill(root, 'VIN');
    return root;
  };

  describe('RC and VIN notes', () => {
    test('the VIN note holds the value, in the format the server reads', async () => {
      const root = await openVin();
      await scanVin(root);
      expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'A1', { severity: 'OK', text_note: `VIN ${VIN}` });
    });

    test('an inspector keeps the masked note', async () => {
      api.getSelfInspection.mockResolvedValue({ inspection: { ...inspection, mode: 'M2' }, sections: sectionsFor(fixture, 'M2'), media: [] });
      const root = await openVin({ bookingId: 'bkg_1' });
      await scanVin(root);
      expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'A1', {
        severity: 'OK',
        text_note: 'VIN read confirmed from plate photo (value withheld — verified against RC baseline)',
      });
    });
  });

  describe('scan photos', () => {
    test('a confirmed VIN scan keeps its photo and asks the server to read it', async () => {
      const root = await openVin();
      await scanVin(root);
      expect(api.uploadSelfEvidence).toHaveBeenCalledTimes(1);
      const sent = api.uploadSelfEvidence.mock.calls[0][0];
      expect(sent).toMatchObject({ inspectionId: 'insp_1', itemCode: 'A1', shotCode: 'VIN_PLATE', kind: 'PHOTO' });
      expect(sent.file).toMatchObject({ uri: 'file:///vin.jpg' });
      expect(sent.file.base64).toBeUndefined();
      expect(api.analyzeMedia).toHaveBeenCalledWith('med_VIN_PLATE');
    });

    test('the same photo confirmed again is only read again', async () => {
      const root = await openVin();
      await scanVin(root);
      await act(async () => root.findAll(n => n.props.accessibilityRole === 'button' && n.props.onPress && n.findAll(c => c.props.children === 'Change').length)[0].props.onPress());
      await act(async () => button(root, 'Confirm & save').props.onPress());
      await settle();
      expect(api.uploadSelfEvidence).toHaveBeenCalledTimes(1);
      expect(api.analyzeMedia).toHaveBeenCalledTimes(2);
    });

    test('a typed VIN has no photo to keep', async () => {
      const root = await openVin();
      await act(async () => button(root, 'Enter manually').props.onPress());
      const field = root.findAll(n => n.props.onChangeText && n.props.label === 'VIN / chassis number')[0];
      await act(async () => field.props.onChangeText(VIN));
      await act(async () => button(root, 'Engine not visible').props.onPress());
      await act(async () => button(root, 'Confirm & save').props.onPress());
      await settle();
      expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'A1', { severity: 'OK', text_note: `VIN ${VIN}` });
      expect(api.uploadSelfEvidence).not.toHaveBeenCalled();
    });

    test('a failed upload is silent: the answer stays saved', async () => {
      api.uploadSelfEvidence.mockRejectedValueOnce(new Error('offline'));
      const root = await openVin();
      await scanVin(root);
      expect(api.analyzeMedia).not.toHaveBeenCalled();
      expect(hasText(root, 'offline')).toBe(false);
    });

    test('an odometer scan keeps its photo too', async () => {
      vision.readOdometerPhoto.mockResolvedValueOnce(42000);
      launchCamera.mockResolvedValueOnce({ assets: [{ uri: 'file:///odo.jpg', base64: 'B64', type: 'image/jpeg' }] });
      const root = await openPhotos();
      await act(async () => button(root, 'Read it from a photo').props.onPress());
      // Camera only (as the web): no gallery choice for the odometer evidence.
      expect(root.findAll(n => n.props.onSelect && n.props.options && n.props.title === 'Add odometer photo')).toHaveLength(0);
      await act(async () => button(root, 'Add odometer photo').props.onPress());
      await settle(400);
      await act(async () => button(root, 'Confirm').props.onPress());
      await settle();
      expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'O1', { severity: 'OK', numeric_value: 42000 });
      expect(api.uploadSelfEvidence).toHaveBeenCalledWith(expect.objectContaining({ itemCode: 'O1', shotCode: 'ODOMETER', kind: 'PHOTO' }));
      expect(api.analyzeMedia).toHaveBeenCalledWith('med_ODOMETER');
    });

    test('nothing is kept on an inspector inspection, or one pinned to an older checklist', async () => {
      api.getSelfInspection.mockResolvedValue({ inspection: { ...inspection, mode: 'M2' }, sections: sectionsFor(fixture, 'M2'), media: [] });
      let root = await openVin({ bookingId: 'bkg_1' });
      await scanVin(root);
      expect(api.uploadSelfEvidence).not.toHaveBeenCalled();
      act(() => tree.unmount());
      api.getSelfInspection.mockResolvedValue({ inspection: { ...inspection, checklist_version: 2 }, sections: sectionsFor(olderFixture, 'M1'), media: [] });
      root = await openVin();
      await scanVin(root);
      expect(api.uploadSelfEvidence).not.toHaveBeenCalled();
    });

    const flaggedScan = { id: 'med_scan', item_code: 'A1', shot_code: 'VIN_PLATE', kind: 'PHOTO', status: 'PROCESSED', derivatives: [], integrity: { risk_score: 90, signals: [] } };

    test('a flagged scan photo is dropped on reopening: the user is never told to retake it', async () => {
      api.getSelfInspection.mockResolvedValue({ inspection, sections: m1Sections, media: [flaggedScan] });
      const root = await render();
      expect(api.deleteSelfMedia).toHaveBeenCalledWith('med_scan');
      expect(hasText(root, 'Take this photo again')).toBe(false);
    });

    test('it is not listed among the photos to retake after a failed check', async () => {
      api.getSelfInspection.mockResolvedValue({ inspection: { ...inspection, status: 'INTEGRITY_FAILED' }, sections: m1Sections, media: [flaggedScan] });
      const root = await render();
      expect(hasText(root, 'Retake photos')).toBe(true);
      expect(hasText(root, 'Chassis')).toBe(false);
      // Not while it's submitted: only after reopening.
      expect(api.deleteSelfMedia).not.toHaveBeenCalled();
    });
  });

  describe('tyre tread photos', () => {
    const takeTyre = async (root, index, shotCode) => {
      const thumbs = root.findAll(n => n.props.accessibilityState?.selected !== undefined && n.props.accessibilityRole === 'button' && n.props.onPress);
      await act(async () => thumbs[index].props.onPress());
      await act(async () => button(root, 'Take photo').props.onPress());
      await rerender({ captured: { key: `XTYRE:${shotCode}`, file: { uri: `file:///${shotCode}.jpg`, type: 'image/jpeg' } } });
    };

    test('a tread photo goes to the server read; a rim photo does not', async () => {
      const root = await openPhotos();
      await openPill(root, 'Tyres');
      await takeTyre(root, 4, 'TYRE_RIGHT_FRONT_TREAD');
      expect(api.analyzeMedia).toHaveBeenCalledWith('med_TYRE_RIGHT_FRONT_TREAD');
      api.analyzeMedia.mockClear();
      await takeTyre(root, 0, 'WHEEL_RIGHT_FRONT_RIM');
      expect(api.uploadSelfEvidence).toHaveBeenCalledWith(expect.objectContaining({ shotCode: 'WHEEL_RIGHT_FRONT_RIM' }));
      expect(api.analyzeMedia).not.toHaveBeenCalled();
    });
  });

  describe('the identity warning', () => {
    const TITLE = 'This document may belong to a different vehicle';
    const saved = (rc, vin) => ({
      ...inspection,
      items: [
        { item_code: 'P1', severity: 'OK', text_note: rc },
        { item_code: 'A1', severity: 'OK', text_note: vin },
      ],
    });
    const RC = `RC: Reg MH12AB1234 | Chassis ${VIN} | Engine K12M123456 | Maruti Suzuki Swift`;

    test('the saved reads go to the registry check; a mismatch warns and can be checked', async () => {
      api.getSelfInspection.mockResolvedValue({ inspection: saved(RC, `VIN ${VIN}`), sections: m1Sections, media: [] });
      verify.mockResolvedValue({ vin: 'MATCH', registration_number: 'MISMATCH' });
      const root = await render();
      await settle();
      expect(verify).toHaveBeenCalledWith('insp_1', { vin: VIN, engineNumber: 'K12M123456', frontPlate: 'MH12AB1234' });
      expect(hasText(root, TITLE)).toBe(true);
      expect(hasText(root, 'Registration on the captured document does not match Maruti Suzuki Swift')).toBe(true);
      // Never blocks: only a way back to the card.
      await act(async () => tab(root, 'Photos').props.onPress());
      await act(async () => button(root, 'Check details').props.onPress());
      await settle(500);
      expect(hasText(root, 'Document 1 of 4')).toBe(true);
    });

    test('a chassis mismatch opens the VIN card', async () => {
      api.getSelfInspection.mockResolvedValue({ inspection: saved(RC, `VIN ${VIN}`), sections: m1Sections, media: [] });
      verify.mockResolvedValue({ vin: 'MISMATCH', registration_number: 'MATCH' });
      const root = await render();
      await settle();
      expect(hasText(root, 'VIN / chassis on the captured document does not match')).toBe(true);
      await act(async () => button(root, 'Check details').props.onPress());
      await settle(500);
      expect(hasText(root, 'Chassis / VIN number')).toBe(true);
    });

    test('the plate and the RC disagreeing warns even if the check fails', async () => {
      api.getSelfInspection.mockResolvedValue({ inspection: saved(RC, 'VIN MA3JMT99999999999'), sections: m1Sections, media: [] });
      verify.mockRejectedValue(new Error('offline'));
      const root = await render();
      await settle();
      expect(hasText(root, TITLE)).toBe(true);
    });

    test('all matching: no warning', async () => {
      api.getSelfInspection.mockResolvedValue({ inspection: saved(RC, `VIN ${VIN}`), sections: m1Sections, media: [] });
      const root = await render();
      await settle();
      expect(hasText(root, TITLE)).toBe(false);
    });

    test('masked notes from before hold no values: no check, no warning', async () => {
      api.getSelfInspection.mockResolvedValue({
        inspection: saved('RC: Maruti Swift · Petrol (ID numbers withheld)', 'VIN read confirmed from plate photo (value withheld)'),
        sections: m1Sections,
        media: [],
      });
      const root = await render();
      await settle();
      expect(verify).not.toHaveBeenCalled();
      expect(hasText(root, TITLE)).toBe(false);
    });

    test('an inspector inspection is not checked from its saved notes (it checks its own reads)', async () => {
      api.getSelfInspection.mockResolvedValue({ inspection: { ...saved(RC, `VIN ${VIN}`), mode: 'M2' }, sections: sectionsFor(fixture, 'M2'), media: [] });
      await render({ bookingId: 'bkg_1' });
      await settle();
      expect(verify).not.toHaveBeenCalled();
    });
  });

  describe('a photo flagged just after upload', () => {
    const front = root => root.findAll(n => n.props.accessibilityLabel === 'Front' && n.props.onPress)[0];
    const upload = async root => {
      await act(async () => pressable(root, 'Add Front photo').props.onPress());
      await rerender({ captured: { key: 'B1:WALK_FRONT', file: { uri: 'file:///f.jpg', type: 'image/jpeg' } } });
    };
    const flagged = risk => [{ id: 'med_WALK_FRONT', item_code: 'B1', shot_code: 'WALK_FRONT', kind: 'PHOTO', integrity: { risk_score: risk, signals: [] } }];

    test('named in the banner with a note under it; Submit is not held up; a retake replaces it', async () => {
      api.listSelfInspectionMedia.mockResolvedValue(flagged(90));
      const root = await openExterior();
      await upload(root);
      await settle(1700);
      expect(hasText(root, 'Take this photo again')).toBe(true);
      await act(async () => front(root).props.onPress());
      expect(hasText(root, "We couldn't verify this upload")).toBe(true);
      await act(async () => pressable(root, 'Retake Front photo').props.onPress());
      api.listSelfInspectionMedia.mockResolvedValue([]);
      await rerender({ captured: { key: 'B1:WALK_FRONT', file: { uri: 'file:///f2.jpg', type: 'image/jpeg' } } });
      expect(api.deleteSelfMedia).toHaveBeenCalledWith('med_WALK_FRONT');
      expect(hasText(root, 'Take this photo again')).toBe(false);
    });

    test('a clean photo gets no warning, and the check stops', async () => {
      api.listSelfInspectionMedia.mockResolvedValue(flagged(10));
      const root = await openExterior();
      await upload(root);
      await settle(1700);
      expect(hasText(root, 'Take this photo again')).toBe(false);
      expect(api.listSelfInspectionMedia).toHaveBeenCalledTimes(1);
    });

    test('removing the flagged photo clears the banner', async () => {
      api.listSelfInspectionMedia.mockResolvedValue(flagged(90));
      const root = await openExterior();
      await upload(root);
      await settle(1700);
      await act(async () => front(root).props.onPress());
      await act(async () => button(root, 'Remove').props.onPress());
      await settle();
      expect(hasText(root, 'Take this photo again')).toBe(false);
    });
  });

  describe('photo quality', () => {
    test('a dark photo gets a note and waits there; it can be kept', async () => {
      photoQualityWarnings.mockResolvedValueOnce(['DARK']);
      const root = await openExterior();
      await act(async () => pressable(root, 'Add Front photo').props.onPress());
      await rerender({ captured: { key: 'B1:WALK_FRONT', file: { uri: 'file:///f.jpg', type: 'image/jpeg' } } });
      expect(api.uploadSelfEvidence).toHaveBeenCalledTimes(1);
      expect(hasText(root, 'This photo looks dark')).toBe(true);
      expect(hasText(root, 'Photo 1 of 14')).toBe(true);
      expect(button(root, 'Next photo')).toBeDefined();
    });

    test('a look-alike and a quality note show together', async () => {
      photoDhash.mockResolvedValue('ffff0000ffff0000');
      const root = await openExterior();
      await act(async () => pressable(root, 'Add Front photo').props.onPress());
      await rerender({ captured: { key: 'B1:WALK_FRONT', file: { uri: 'file:///a.jpg', type: 'image/jpeg' } } });
      photoQualityWarnings.mockResolvedValueOnce(['BLURRY']);
      await act(async () => pressable(root, 'Add Front-left corner photo').props.onPress());
      await rerender({ captured: { key: 'B1:WALK_FRONT_LEFT', file: { uri: 'file:///b.jpg', type: 'image/jpeg' } } });
      expect(hasText(root, 'This looks a lot like your Front photo')).toBe(true);
      expect(hasText(root, 'This photo may be blurry')).toBe(true);
      photoDhash.mockResolvedValue(null);
    });

    test('an inspector inspection is not measured', async () => {
      api.getSelfInspection.mockResolvedValue({ inspection: { ...inspection, mode: 'M2' }, sections: sectionsFor(fixture, 'M2'), media: [] });
      const root = await openPhotos({ bookingId: 'bkg_1' });
      await openPill(root, 'Exterior');
      await act(async () => pressable(root, 'Add Front photo').props.onPress());
      await rerender({ bookingId: 'bkg_1', captured: { key: 'B1:WALK_FRONT', file: { uri: 'file:///f.jpg', type: 'image/jpeg' } } });
      expect(api.uploadSelfEvidence).toHaveBeenCalledTimes(1);
      expect(photoQualityWarnings).not.toHaveBeenCalled();
    });
  });

  describe('after QC approval', () => {
    const open = async (status = 'VERIFIED', mode = 'M1') => {
      api.getSelfInspection.mockResolvedValue({ inspection: { ...inspection, status, mode }, sections: sectionsFor(fixture, mode), media: [] });
      const root = await render(mode === 'M2' ? { bookingId: 'bkg_1' } : {});
      await settle();
      return root;
    };
    let report;
    beforeEach(() => {
      report = jest.spyOn(reportApi, 'getInspectionReport').mockResolvedValue({
        valuationCard: { valueMinor: 41000000, confidenceLevel: 'HIGH' },
        valuation: { estimatedValue: 410000 },
        valuationReason: null,
        valuationAdjusted: true,
      });
    });
    afterEach(() => report.mockRestore());

    test('the saved value, and why it changed: no new estimate', async () => {
      const root = await open();
      expect(report).toHaveBeenCalledWith('insp_1');
      expect(api.estimateFinalValue).not.toHaveBeenCalled();
      expect(hasText(root, '₹4,10,000')).toBe(true);
      expect(hasText(root, 'This value was updated after our team reviewed your photos')).toBe(true);
    });

    test('not changed: the usual footnote', async () => {
      report.mockResolvedValue({ valuationCard: { valueMinor: 41000000, confidenceLevel: 'HIGH' }, valuation: null, valuationReason: null, valuationAdjusted: false });
      const root = await open('PUBLISHED');
      expect(hasText(root, 'This value was updated')).toBe(false);
      expect(hasText(root, "Final estimated value from Turag's valuation engine")).toBe(true);
    });

    test('no value on the report: says why; a failed load says so too', async () => {
      report.mockResolvedValueOnce({ valuationCard: null, valuation: null, valuationReason: 'Not enough data', valuationAdjusted: false });
      let root = await open();
      expect(hasText(root, 'Not enough data')).toBe(true);
      act(() => tree.unmount());
      report.mockRejectedValueOnce(new Error('Could not load the report'));
      root = await open();
      expect(hasText(root, 'Could not load the report')).toBe(true);
    });

    test('still with QC: the estimate as before', async () => {
      await open('PENDING_QC');
      expect(report).not.toHaveBeenCalled();
      expect(api.estimateFinalValue).toHaveBeenCalledTimes(1);
    });

    test('an inspector inspection keeps the estimate', async () => {
      await open('VERIFIED', 'M2');
      expect(report).not.toHaveBeenCalled();
      expect(api.estimateFinalValue).toHaveBeenCalledTimes(1);
    });
  });
});

// The inspection officer's doorstep inspection (M2) uses the same screen, as
// the web's inspector capture is the M1 flow's M2 equivalent.
describe('inspector (M2) on the same capture screen', () => {
  const m2Sections = sectionsFor(fixture, 'M2');
  const m2 = { ...inspection, mode: 'M2' };

  test('no Garage messages for the officer (an inspector job is not in their Garage)', async () => {
    const bannerStore = require('../src/push/bannerStore');
    const show = jest.spyOn(bannerStore, 'showBanner');
    api.getSelfInspection.mockResolvedValue({ inspection: m2, sections: m2Sections, media: [] });
    const root = await render({ bookingId: 'bkg_1' });
    expect(hasText(root, 'Saved as you go')).toBe(false);
    await act(async () => listeners.beforeRemove({ preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } }));
    expect(navigation.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
    expect(show).not.toHaveBeenCalled();
    show.mockRestore();
  });

  test('the AI read stays on the phone, and its result is saved from here', async () => {
    api.getSelfInspection.mockResolvedValue({ inspection: m2, sections: m2Sections, media: [] });
    const root = await render({ bookingId: 'bkg_1' });
    await act(async () => tab(root, 'Photos').props.onPress());
    await openPill(root, 'Exterior');
    await act(async () => pressable(root, 'Add Front photo').props.onPress());
    await rerender({ bookingId: 'bkg_1', captured: { key: 'B1:WALK_FRONT', file: { uri: 'file:///front.jpg', type: 'image/jpeg' } } });
    expect(vision.scanDamagePhoto).toHaveBeenCalledWith('BASE64', expect.objectContaining({ itemCode: 'B1' }));
    expect(api.saveAiFinding).toHaveBeenCalledWith(
      'med_WALK_FRONT',
      expect.objectContaining({ shot_code: 'WALK_FRONT', has_damage: true, damage_type: 'SCRATCH', repair_cost_minor: 200000 }),
    );
    expect(api.analyzeMedia).not.toHaveBeenCalled();
  });

  test('the condition level from the photos and answers goes with the final value, and shows on review', async () => {
    const finding = {
      ...serverFinding,
      v2: { ...serverFinding.v2, cosmetic: [{ area: 'PAINT', observation: 'Faded roof paint', severity: 'MAJOR' }] },
    };
    const media = m2Sections
      .flatMap(sec => sec.items)
      .find(item => item.item_code === 'B1')
      .evidence_requirement.shot_codes.map(shot => ({
        id: `med_${shot}`,
        item_code: 'B1',
        shot_code: shot,
        kind: 'PHOTO',
        status: 'PROCESSED',
        derivatives: [],
        ai_finding: shot === 'WALK_FRONT' ? buildAiFinding(finding) : buildAiFinding({ ...serverFinding, shotCode: shot, v2: { ...serverFinding.v2, hasDamage: false } }),
      }));
    api.getSelfInspection.mockResolvedValue({ inspection: m2, sections: m2Sections, media });
    let root = await render({ bookingId: 'bkg_1' });
    await act(async () => tab(root, 'Estimate').props.onPress());
    expect(hasText(root, 'Visual condition')).toBe(true);
    expect(hasText(root, 'Poor')).toBe(true);
    act(() => tree.unmount());

    api.getSelfInspection.mockResolvedValue({ inspection: { ...m2, status: 'PENDING_QC' }, sections: m2Sections, media });
    root = await render({ bookingId: 'bkg_1' });
    expect(api.estimateFinalValue).toHaveBeenCalledWith({
      vehicle_id: 'veh_1',
      stage: 'DECLARED',
      inspection_id: 'insp_1',
      declared_condition: 'POOR',
    });
  });

  test('no photos yet: the condition is capped, and the unseen angles are counted', async () => {
    api.getSelfInspection.mockResolvedValue({ inspection: m2, sections: m2Sections, media: [] });
    const root = await render({ bookingId: 'bkg_1' });
    await act(async () => tab(root, 'Estimate').props.onPress());
    expect(hasText(root, 'Fair')).toBe(true);
    expect(hasText(root, "angles couldn't be judged")).toBe(true);
  });

  test('inspector wording: title and badge', async () => {
    api.getSelfInspection.mockResolvedValue({ inspection: m2, sections: m2Sections, media: [] });
    const root = await render({ bookingId: 'bkg_1' });
    expect(hasText(root, 'Vehicle inspection')).toBe(true);
    expect(hasText(root, 'Turag inspection')).toBe(true);
    expect(hasText(root, 'AI Self Inspection')).toBe(false);
  });

  test('after submit: sent to QC, and "Back to jobs" (no Garage)', async () => {
    api.getSelfInspection.mockResolvedValue({ inspection: { ...m2, status: 'PENDING_QC' }, sections: m2Sections, media: [] });
    const root = await render({ bookingId: 'bkg_1' });
    expect(hasText(root, 'Inspection submitted')).toBe(true);
    expect(root.findAll(n => n.props.title === 'Go to your garage').length).toBe(0);
    const back = root.findAll(n => n.props.title === 'Back to jobs' && n.props.onPress)[0];
    await act(async () => back.props.onPress());
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: ROUTES.INSPECTOR_TABS, params: { screen: ROUTES.INSPECTIONS } }],
    });
  });

  test('answers: inspector severity words and all 10 "can\'t check" reasons', async () => {
    const AnswerControls = require('../src/screens/selfInspection/SelfInspection/components/AnswerControls').default;
    const { InspectorModeContext } = require('../src/screens/selfInspection/SelfInspection/inspectorMode');
    const { ChoiceChip, SelectField } = require('../src/components');
    await act(async () => {
      tree = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={metrics}>
          <InspectorModeContext.Provider value>
            <AnswerControls label="Engine" state={{ severity: 'NOT_ASSESSABLE', note: '', cost: '', num: '', naReason: '' }} />
          </InspectorModeContext.Provider>
        </SafeAreaProvider>,
      );
    });
    expect(tree.root.findAllByType(ChoiceChip).map(c => c.props.label)).toEqual([
      'OK',
      'Minor',
      'Moderate',
      'Major',
      'Critical',
      'N/A',
    ]);
    const reasons = tree.root.findByType(SelectField).props.options.map(o => o.value);
    expect(reasons).toHaveLength(10);
    expect(reasons).toEqual(expect.arrayContaining(['VEHICLE_STATIC', 'OWNER_REFUSED']));
  });
});

describe('as the web: the inspector grades, the owner answers', () => {
  const m2Sections = sectionsFor(fixture, 'M2');
  const m2 = { ...inspection, mode: 'M2' };
  const settle = (ms = 20) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
  const radio = (root, label, within) =>
    (within ?? root).findAll(n => n.props.accessibilityRole === 'radio' && n.props.onPress).find(n => n.findAll(c => c.props.children === label).length);
  const question = (root, title) =>
    root
      .findAll(n => n.props.collapsable === false && n.findAll(c => [c.props.children].flat().includes(title)).length)
      .slice(-1)[0];
  const answersFor = code => api.recordSelfAnswer.mock.calls.filter(([, item]) => item === code).map(([, , body]) => body);

  beforeEach(() => {
    api.deleteSelfMedia.mockResolvedValue();
    api.listSelfInspectionMedia.mockResolvedValue([]);
  });

  test('the inspector grades the VIN plate: a grade, or N/A with a reason, without a scan', async () => {
    api.getSelfInspection.mockResolvedValue({ inspection: m2, sections: m2Sections, media: [] });
    const root = await openPhotos({ bookingId: 'bkg_1' });
    await openPill(root, 'VIN');
    await act(async () => radio(root, 'Major').props.onPress());
    expect(answersFor('A1')).toContainEqual({ severity: 'MAJOR' });

    await act(async () => radio(root, 'N/A').props.onPress());
    const why = root.findAll(n => n.props.options && n.props.onChange && n.props.label === "Why can't you check it?")[0];
    await act(async () => why.props.onChange('NO_KEY'));
    expect(answersFor('A1')).toContainEqual({ severity: 'NOT_ASSESSABLE', na_reason: 'NO_KEY' });
  });

  test('the owner VIN is answered by its scan only (no grades)', async () => {
    api.getSelfInspection.mockResolvedValue({ inspection, sections: m1Sections, media: [] });
    const root = await openPhotos();
    await openPill(root, 'VIN');
    expect(radio(root, 'Major')).toBeUndefined();
  });

  test('the inspector grades tyre tread with its depth; the owner only types the depth', async () => {
    api.getSelfInspection.mockResolvedValue({ inspection: m2, sections: m2Sections, media: [] });
    let root = await render({ bookingId: 'bkg_1' });
    await act(async () => tab(root, 'Checklist').props.onPress());
    const tread = () => question(root, 'Tyre tread depth');
    await act(async () => radio(root, 'Major', tread()).props.onPress());
    expect(answersFor('H1')).toContainEqual({ severity: 'MAJOR' });
    const depth = tread().findAll(n => n.props.keyboardType === 'number-pad' && n.props.onChangeText)[0];
    await act(async () => depth.props.onChangeText('2'));
    await settle(900);
    expect(answersFor('H1')).toContainEqual({ severity: 'MAJOR', numeric_value: 2 });
    act(() => tree.unmount());

    api.getSelfInspection.mockResolvedValue({ inspection, sections: m1Sections, media: [] });
    root = await render();
    await act(async () => tab(root, 'Checklist').props.onPress());
    expect(radio(root, 'Major', question(root, 'Tyre tread depth'))).toBeUndefined();
  });

  test('the inspector types previous owners (the RC count is the owner flow only)', async () => {
    api.getSelfInspection.mockResolvedValue({
      inspection: { ...m2, vehicle: { ...m2.vehicle, registry_owner_count: 2 } },
      sections: m2Sections,
      media: [],
    });
    const root = await render({ bookingId: 'bkg_1' });
    await settle();
    expect(answersFor('O2')).toEqual([]);
    await act(async () => tab(root, 'Documents').props.onPress());
    await openPill(root, 'Owners');
    expect(hasText(root, 'before the current owner')).toBe(true);
  });

  test('the inspector extra photos of one angle are kept (the owner ones are tidied to one)', async () => {
    const two = [
      { id: 'med_old', item_code: 'B1', shot_code: 'WALK_FRONT', kind: 'PHOTO', status: 'PROCESSED', derivatives: [], created_at: '2026-11-07T10:00:00Z' },
      { id: 'med_new', item_code: 'B1', shot_code: 'WALK_FRONT', kind: 'PHOTO', status: 'PROCESSED', derivatives: [], created_at: '2026-11-07T10:01:00Z' },
    ];
    jest.useFakeTimers();
    try {
      api.getSelfInspection.mockResolvedValue({ inspection: m2, sections: m2Sections, media: two });
      await render({ bookingId: 'bkg_1' });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(6000);
      });
      expect(api.deleteSelfMedia).not.toHaveBeenCalled();
      act(() => tree.unmount());

      api.getSelfInspection.mockResolvedValue({ inspection, sections: m1Sections, media: two });
      await render();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(6000);
      });
      expect(api.deleteSelfMedia).toHaveBeenCalledWith('med_old');
    } finally {
      jest.useRealTimers();
    }
  });

  test('the inspector photos get the live photo check too', async () => {
    api.getSelfInspection.mockResolvedValue({ inspection: m2, sections: m2Sections, media: [] });
    api.listSelfInspectionMedia.mockResolvedValue([
      { id: 'med_WALK_FRONT', item_code: 'B1', shot_code: 'WALK_FRONT', kind: 'PHOTO', status: 'PROCESSED', integrity: { risk_score: 90, signals: [{ key: 'exact_duplicate', status: 'FAIL' }] } },
    ]);
    const root = await render({ bookingId: 'bkg_1' });
    await act(async () => tab(root, 'Photos').props.onPress());
    await openPill(root, 'Exterior');
    await act(async () => pressable(root, 'Add Front photo').props.onPress());
    await rerender({ bookingId: 'bkg_1', captured: { key: 'B1:WALK_FRONT', file: { uri: 'file:///front.jpg', type: 'image/jpeg' } } });
    await settle(1700);
    expect(api.listSelfInspectionMedia).toHaveBeenCalledWith('insp_1');
    expect(hasText(root, 'Take this photo again')).toBe(true);
  });

  test('inspector wording on the checklist: about the vehicle, not your vehicle', async () => {
    api.getSelfInspection.mockResolvedValue({ inspection: m2, sections: m2Sections, media: [] });
    const root = await render({ bookingId: 'bkg_1' });
    await act(async () => tab(root, 'Checklist').props.onPress());
    expect(hasText(root, 'About the vehicle')).toBe(true);
    expect(hasText(root, 'About your vehicle')).toBe(false);
  });

  test('the owner emptied number is no answer: never saved as OK without it', async () => {
    api.getSelfInspection.mockResolvedValue({ inspection, sections: m1Sections, media: [] });
    const root = await render();
    await act(async () => tab(root, 'Checklist').props.onPress());
    const keys = () => question(root, 'How many keys are available with the vehicle?');
    const other = () => keys().findAll(n => n.props.keyboardType === 'number-pad' && n.props.onChangeText)[0];
    await act(async () => other().props.onChangeText('5'));
    await settle(900);
    expect(answersFor('KEYS_M1')).toEqual([{ severity: 'OK', numeric_value: 5 }]);
    await act(async () => other().props.onChangeText(''));
    await settle(900);
    // Nothing new was saved: the server keeps 5, and the question shows as not done.
    expect(answersFor('KEYS_M1')).toEqual([{ severity: 'OK', numeric_value: 5 }]);
  });
});

describe('the inspector notes and checks, word for word the web', () => {
  const { formatMaskedRcNote, formatMaskedVinNote } = require('../src/screens/selfInspection/SelfInspection/identity/identityNote');
  const { inspectorMismatchFields } = require('../src/screens/selfInspection/SelfInspection/useSelfInspection');
  const { crossValidateVehicle } = require('../src/vendor/selfInspectionLogic');

  test('the masked RC note keeps the web parts that QC reads', () => {
    expect(formatMaskedRcNote({ make: 'Maruti', model: 'Swift', variant: 'VXI', fuel: 'PETROL', mfgYear: 2019, regDate: '12-03-2019' })).toBe(
      'RC: Maruti Swift VXI | PETROL | MFG 2019 | Reg dt 12-03-2019 | VIN/engine/reg values withheld — verified against RC baseline',
    );
    expect(formatMaskedRcNote({})).toBe('RC: VIN/engine/reg values withheld — verified against RC baseline');
    expect(formatMaskedVinNote(true)).toBe('VIN + engine read confirmed from plate photo (values withheld — verified against RC baseline)');
  });

  test('the inspector warning names the fields whose confirmed read does not match this vehicle', () => {
    const check = crossValidateVehicle({
      rc: { make: 'Hyundai', model: 'Creta', vin: 'MA3AAA11111111111', chassisNumber: 'MA3AAA11111111111' },
      vinPhoto: { vin: 'MA3BBB22222222222', engineNumber: null },
      frontPlate: null,
      rearPlate: null,
      vehicle: { make: 'Maruti Suzuki', model: 'Swift', variant: null },
    });
    expect(inspectorMismatchFields(check)).toEqual(['MAKE', 'MODEL', 'CHASSIS']);
    expect(inspectorMismatchFields(undefined)).toEqual([]);
  });
});

describe('a retake while the old photo is still being checked', () => {
  const { ApiError } = require('../src/api/client');
  const settle = (ms = 20) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
  const shots = m1Items.find(i => i.item_code === 'B1').evidence_requirement.shot_codes;

  test('the old copy stops counting at once, so a missing angle still shows as missing', async () => {
    // Ten of the eleven walkaround angles: the roof is still missing.
    const media = shots.slice(0, -1).map(shot => ({
      id: `old_${shot}`, item_code: 'B1', shot_code: shot, kind: 'PHOTO', status: 'PROCESSED', derivatives: [],
    }));
    // The condition is answered, so only the photo count can keep it on the list.
    const answered = { ...inspection, items: [{ item_code: 'B1', severity: 'OK' }] };
    api.getSelfInspection.mockResolvedValue({ inspection: answered, sections: m1Sections, media });
    api.listSelfInspectionMedia.mockResolvedValue([]);
    api.deleteSelfMedia.mockImplementation(async id => {
      if (id === 'old_WALK_FRONT') throw new ApiError({ status: 409, code: 'MEDIA_PROCESSING', message: 'still processing' });
    });
    const root = await openExterior();
    const front = root.findAll(n => n.props.accessibilityLabel === 'Front' && n.props.onPress)[0];
    await act(async () => front.props.onPress());
    await act(async () => pressable(root, 'Retake Front photo').props.onPress());
    await rerender({ captured: { key: 'B1:WALK_FRONT', file: { uri: 'file:///front2.jpg', type: 'image/jpeg' } } });
    await settle();
    await act(async () => tab(root, 'Estimate').props.onPress());
    // Before the fix the old front still counted (11 of 11) and the roof looked done.
    const left = root.findAll(n => Array.isArray(n.props.entries) && n.props.onGo)[0].props.entries;
    expect(left.some(entry => entry.itemCode === 'B1')).toBe(true);
    api.deleteSelfMedia.mockReset();
    api.deleteSelfMedia.mockResolvedValue();
  });
});

describe('a video upload says where it is', () => {
  const recordAndUse = async () => {
    const root = await openPhotos();
    await openPill(root, 'Engine video');
    await rerender({
      recorded: {
        key: 'XENGVID_M1:ENG_START_VIDEO',
        minS: 30,
        maxS: 45,
        file: { uri: 'file:///engine.mp4', type: 'video/mp4', duration: 40, fileSize: 20 * 1024 * 1024 },
      },
    });
    await act(async () => {
      root.findAll(n => n.props.title === 'Use this video' && n.props.onPress)[0].props.onPress();
    });
    await act(async () => {});
    return root;
  };
  const buttons = root => root.findAll(n => ['Use this video', 'Retake video'].includes(n.props.title) && n.props.onPress);

  test('one panel where the buttons were: preparing, the percent, saving at 100%, the check; then the buttons come back', async () => {
    api.getSelfInspection.mockResolvedValue({ inspection, sections: m1Sections, media: [] });
    let report;
    let finish;
    api.uploadSelfEvidence.mockImplementationOnce(({ shotCode, onProgress }) => {
      report = onProgress;
      return new Promise(resolve => {
        finish = () => resolve({ mediaId: `med_${shotCode}`, status: 'UPLOADED' });
      });
    });
    const root = await recordAndUse();
    // Preparing before the first step is even reported - and no buttons, so no second spinner.
    expect(hasText(root, 'Preparing the video…')).toBe(true);
    expect(buttons(root)).toHaveLength(0);
    expect(root.findAll(n => n.props.loading === true)).toHaveLength(0);

    await act(async () => report({ stage: 'uploading', fraction: 0.42 }));
    expect(hasText(root, 'Uploading the video…')).toBe(true);
    expect(hasText(root, '42%')).toBe(true);
    expect(hasText(root, 'Please keep the app open until this finishes')).toBe(true);

    // Every byte gone: the store is saving it (no "100%" left hanging).
    await act(async () => report({ stage: 'uploading', fraction: 1 }));
    expect(hasText(root, 'Saving the video…')).toBe(true);
    expect(hasText(root, '100%')).toBe(false);

    await act(async () => report({ stage: 'finishing' }));
    expect(hasText(root, 'Almost done: checking the video…')).toBe(true);

    await act(async () => finish());
    await act(async () => {});
    expect(hasText(root, 'Almost done')).toBe(false);
    // Saved, plainly: a green "Video saved", and the way on to the next group.
    expect(hasText(root, 'Video saved')).toBe(true);
    expect(hasText(root, "It's saved with your inspection.")).toBe(true);
    expect(root.findAll(n => n.props.title === 'Retake video' && n.props.onPress)).toHaveLength(1);
    expect(root.findAll(n => n.props.title === 'Use this video')).toHaveLength(0);
    const next = root.findAll(n => typeof n.props.title === 'string' && n.props.title.startsWith('Next: ') && n.props.onPress)[0];
    expect(next).toBeTruthy();
    await act(async () => next.props.onPress());
    expect(hasText(root, 'Video saved')).toBe(false);
  });

  test('a failure says so plainly, with what to do; "Try again" sends the same recording again', async () => {
    api.getSelfInspection.mockResolvedValue({ inspection, sections: m1Sections, media: [] });
    const { ApiError } = require('../src/api/client');
    api.uploadSelfEvidence.mockImplementationOnce(async ({ onProgress }) => {
      onProgress({ stage: 'preparing' });
      onProgress({ stage: 'uploading', fraction: 0.6 });
      throw new ApiError({ code: 'NETWORK_ERROR', message: "Can't reach Turag. Check your internet connection and try again." });
    });
    const root = await recordAndUse();
    expect(hasText(root, 'Video not uploaded')).toBe(true);
    expect(hasText(root, 'Please check your internet connection and tap "Try again". Your recording is still here.')).toBe(true);
    // No technical details, and the panel has gone.
    expect(hasText(root, 'Details for testing')).toBe(false);
    expect(hasText(root, 'Uploading the video…')).toBe(false);
    const again = root.findAll(n => n.props.title === 'Try again' && n.props.onPress)[0];
    expect(again).toBeTruthy();
    expect(root.findAll(n => n.props.title === 'Retake video' && n.props.onPress)).toHaveLength(1);

    await act(async () => again.props.onPress());
    await act(async () => {});
    expect(api.uploadSelfEvidence).toHaveBeenLastCalledWith(
      expect.objectContaining({ shotCode: 'ENG_START_VIDEO', kind: 'VIDEO', file: expect.objectContaining({ uri: 'file:///engine.mp4' }) }),
    );
    expect(hasText(root, 'Video not uploaded')).toBe(false);
    expect(hasText(root, 'Video saved')).toBe(true);
  });
});
