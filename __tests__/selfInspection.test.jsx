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
      items: s.items.filter(it => it.applicable_modes.includes(mode) && !(it.gate && it.evidence_requirement?.shots)),
    }))
    .filter(s => s.items.length > 0);
const m1Sections = sectionsFor(fixture, 'M1');
const m1Items = m1Sections.flatMap(s => s.items);

const inspection = {
  id: 'insp_1',
  status: 'IN_PROGRESS',
  mode: 'M1',
  category: 'PASSENGER',
  checklist_version: 2,
  vehicle_id: 'veh_1',
  vehicle: { make: 'Maruti Suzuki', model: 'Swift', variant: 'VXi', mfg_year: 2019, category: 'PASSENGER', fuel: 'PETROL' },
  items: [],
};

jest.mock('../src/api/services/selfInspection.api', () => ({
  USABLE_MEDIA: new Set(['UPLOADED', 'PROCESSING', 'PROCESSED', 'INTEGRITY_FLAGGED', 'REDACTION_HELD']),
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
jest.mock('../src/utils/pickImage', () => ({ pickImageFromGallery: jest.fn(async () => null) }));

const api = require('../src/api/services/selfInspection.api');
const vision = require('../src/api/services/aiScan.api');
const { photoDhash } = require('../src/utils/photoDhash');
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

beforeEach(() => {
  jest.clearAllMocks();
  api.getSelfInspection.mockResolvedValue({ inspection, sections: m1Sections, media: [] });
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

  test('a tile opens the camera; the photo is uploaded and the AI checks walkaround photos', async () => {
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
    });
    expect(vision.scanDamagePhoto).toHaveBeenCalledWith('BASE64', expect.objectContaining({ itemCode: 'B1', shotHint: 'WALK_FRONT' }));
    expect(api.saveAiFinding).toHaveBeenCalledWith(
      'med_WALK_FRONT',
      expect.objectContaining({ shot_code: 'WALK_FRONT', has_damage: true, damage_type: 'SCRATCH', repair_cost_minor: 200000 }),
    );
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
      expect(hasText(root, 'Your saved video')).toBe(true);
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

// The inspection officer's doorstep inspection (M2) uses the same screen, as
// the web's inspector capture is the M1 flow's M2 equivalent.
describe('inspector (M2) on the same capture screen', () => {
  const m2Sections = sectionsFor(fixture, 'M2');
  const m2 = { ...inspection, mode: 'M2' };

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
