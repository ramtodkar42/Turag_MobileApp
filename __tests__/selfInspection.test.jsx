/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import fixture from './fixtures/passengerChecklist.json';
import {
  buildMissingList,
  buildProgress,
  parseOdometerKm,
  parseOwnerCount,
  partitionItems,
  photoGroups,
} from '../src/vendor/selfInspectionLogic';
import { ROUTES } from '../src/navigation/routes';

// The real passenger checklist (version 2) for self-inspection (M1), filtered
// as the web does.
const m1Sections = fixture.checklist.sections
  .map(s => ({
    group_code: s.group_code,
    label: s.label,
    items: s.items.filter(it => it.applicable_modes.includes('M1') && !(it.gate && it.evidence_requirement?.shots)),
  }))
  .filter(s => s.items.length > 0);
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

jest.mock('../src/api/services/visionScan', () => ({
  analyzeDamageWithOpenAI: jest.fn(async () => ({
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
  analyzeOdometerWithOpenAI: jest.fn(),
  scanIdentityWithOpenAI: jest.fn(),
}));

jest.mock('../src/utils/fileToBase64', () => ({ fileToBase64: jest.fn(async () => 'BASE64') }));

const api = require('../src/api/services/selfInspection.api');
const vision = require('../src/api/services/visionScan');
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

beforeEach(() => {
  jest.clearAllMocks();
  api.getSelfInspection.mockResolvedValue({ inspection, sections: m1Sections, media: [] });
});

afterEach(() => {
  act(() => tree?.unmount());
});

describe('web logic (the same functions as turag.ai)', () => {
  test('51 tasks: 33 required photos + 7 documents + 11 questions', () => {
    const p = buildProgress(m1Items, {}, {});
    expect(p.photos.total).toBe(33);
    expect(p.documents.total).toBe(7);
    expect(p.checklist.total).toBe(11);
    const part = partitionItems(m1Items);
    expect(part.documents.map(i => i.item_code)).toEqual(['P1', 'A1', 'O1', 'O2', 'P2', 'P3', 'P4']);
    // Photo-only items (interior, engine, tyres ...) are NOT condition questions.
    expect(part.checklist.map(i => i.item_code)).toEqual(['B1', 'B2', 'D1', 'D2', 'E1', 'F1', 'G1', 'H1', 'I1', 'J1', 'K1']);
    expect(photoGroups(m1Items).map(g => `${g.item.item_code}:${g.slots.length}/${g.minCount}`)).toEqual([
      'B1:11/11', 'XINT_M1:15/8', 'XENG:5/5', 'XTYRE:9/9', 'XEXTRA_M1:4/0', 'XDENT:6/0',
    ]);
  });

  test('required photos block submit even with no answer (the server gate)', () => {
    const parse = (c, r) => (c === 'O2' ? parseOwnerCount(r) : parseOdometerKm(r));
    const missing = buildMissingList({ items: m1Items, answers: {}, evidenceCount: {}, parseNumeric: parse });
    expect(missing.filter(m => m.step === 'photos').map(m => m.itemCode)).toEqual(['XINT_M1', 'XENG', 'XTYRE']);
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
  test('header shows "0 of 51 done", the 4 steps; photos one at a time, by group', async () => {
    const root = await render();
    expect(hasText(root, '0 of 51 done')).toBe(true);
    ['Photos', 'Documents', 'Checklist', 'Estimate'].forEach(label => expect(tab(root, label)).toBeTruthy());
    // Group pills (required first, with min counts), then the current angle.
    ['Exterior', 'Interior', 'Engine', 'Tyres', '0/11', '0/8', '0/5', '0/9'].forEach(text => expect(hasText(root, text)).toBe(true));
    expect(hasText(root, 'Photo 1 of 11')).toBe(true);
    expect(hasText(root, 'Front')).toBe(true);
    expect(root.findAll(n => n.props.title === 'Take photo' && n.props.onPress).length).toBe(1);
    expect(hasText(root, 'Step 1 of 4')).toBe(true);
  });

  test('after a photo uploads it moves on to the next angle by itself', async () => {
    const root = await render();
    await act(async () => pressable(root, 'Add Front photo').props.onPress());
    await rerender({ captured: { key: 'B1:WALK_FRONT', file: { uri: 'file:///f.jpg', type: 'image/jpeg' } } });
    expect(hasText(root, 'Photo 2 of 11')).toBe(true);
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
    const root = await render();
    const front = root.findAll(n => n.props.accessibilityLabel === 'Front' && n.props.onPress)[0];
    await act(async () => front.props.onPress());
    await act(async () => pressable(root, 'Retake Front photo').props.onPress());
    await rerender({ captured: { key: 'B1:WALK_FRONT', file: { uri: 'file:///new.jpg', type: 'image/jpeg' } } });
    // Tried once, refused (still checking) -> the new photo is uploaded anyway, no error shown.
    expect(api.deleteSelfMedia).toHaveBeenCalledWith('med_old');
    expect(api.uploadSelfEvidence).toHaveBeenCalledWith(expect.objectContaining({ shotCode: 'WALK_FRONT' }));
    expect(hasText(root, 'still checking')).toBe(false);
  });

  test('a tile opens the camera; the photo is uploaded and the AI checks walkaround photos', async () => {
    const root = await render();
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
    });
    expect(vision.analyzeDamageWithOpenAI).toHaveBeenCalledWith('BASE64', expect.objectContaining({ itemCode: 'B1', shotHint: 'WALK_FRONT' }));
    expect(api.saveAiFinding).toHaveBeenCalledWith(
      'med_WALK_FRONT',
      expect.objectContaining({ shot_code: 'WALK_FRONT', has_damage: true, damage_type: 'SCRATCH', repair_cost_minor: 200000 }),
    );
    expect(hasText(tree.root, '1 of 51 done')).toBe(true);
  });

  test('checklist: 11 questions; an answer saves with the web body', async () => {
    const root = await render();
    await act(async () => tab(root, 'Checklist').props.onPress());
    expect(hasText(root, 'Question 1 of 11')).toBe(true);
    const good = root.findAll(n => n.props.accessibilityRole === 'radio' && n.props.onPress).find(n => n.findAll(c => c.props.children === 'Good').length);
    await act(async () => good.props.onPress());
    expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'B1', { severity: 'OK' });
  });

  test('documents one at a time: RC first, Next moves on, pills jump', async () => {
    const root = await render();
    await act(async () => tab(root, 'Documents').props.onPress());
    expect(hasText(root, 'Document 1 of 7')).toBe(true);
    expect(hasText(root, 'Registration certificate (RC)')).toBe(true);
    expect(hasText(root, 'Chassis / VIN number')).toBe(false); // only the current one is shown
    await act(async () => root.findAll(n => n.props.title === 'Next document' && n.props.onPress)[0].props.onPress());
    expect(hasText(root, 'Document 2 of 7')).toBe(true);
    expect(hasText(root, 'Chassis / VIN number')).toBe(true);
  });

  test('the phone back button steps back through the process instead of closing it', async () => {
    const root = await render();
    const back = async () => {
      const event = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
      await act(async () => listeners.beforeRemove(event));
      return event;
    };
    // Checklist question 2 -> question 1 -> Documents -> previous document ... -> Photos -> leaves.
    await act(async () => tab(root, 'Checklist').props.onPress());
    await act(async () => root.findAll(n => n.props.title === 'Next question' && n.props.onPress)[0].props.onPress());
    expect(hasText(root, 'Question 2 of 11')).toBe(true);
    expect((await back()).preventDefault).toHaveBeenCalled();
    expect(hasText(root, 'Question 1 of 11')).toBe(true);
    await back();
    expect(hasText(root, 'Document 1 of 7')).toBe(true);
    await back();
    expect(hasText(root, 'Photo 1 of 11')).toBe(true);
    // On Photos, back really leaves (the action is let through).
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
    await act(async () => tab(root, 'Estimate').props.onPress());

    // A missing photo group opens that group (Interior), not the first one.
    await act(async () => entry('Add photos for Interior photos').props.onPress());
    expect(hasText(root, 'Photo 1 of 15')).toBe(true);
    await back();
    expect(hasText(root, 'Before you can submit (')).toBe(true);
    expect(navigation.dispatch).not.toHaveBeenCalled(); // didn't leave the screen

    // A missing document opens that document; back returns to Estimate too.
    await act(async () => entry('Number of previous owners').props.onPress());
    expect(hasText(root, 'Document 4 of 7')).toBe(true);
    await back();
    expect(hasText(root, 'Before you can submit (')).toBe(true);
  });

  test('documents: the odometer saves as a number with OK', async () => {
    const root = await render();
    await act(async () => tab(root, 'Documents').props.onPress());
    const odometerPill = root.findAll(
      n => n.props.accessibilityRole === 'tab' && n.props.onPress && n.findAll(c => c.props.children === 'Odometer').length,
    )[0];
    await act(async () => odometerPill.props.onPress());
    const field = root.findAll(n => n.props.placeholder === 'Kilometres, e.g. 52340' && n.props.onChangeText)[0];
    await act(async () => field.props.onChangeText('52340'));
    await act(async () => field.props.onBlur());
    expect(api.recordSelfAnswer).toHaveBeenCalledWith('insp_1', 'O1', { severity: 'OK', numeric_value: 52340 });
  });

  test('estimate: lists what is left and keeps Submit disabled', async () => {
    const root = await render();
    await act(async () => tab(root, 'Estimate').props.onPress());
    expect(hasText(root, 'Before you can submit (')).toBe(true);
    const submit = root.findAll(n => n.props.title === 'Submit self-inspection' && n.props.onPress)[0];
    expect(submit.props.disabled).toBe(true);
  });

  test('submitted: shows the final value from the backend', async () => {
    api.getSelfInspection.mockResolvedValue({ inspection: { ...inspection, status: 'SUBMITTED' }, sections: m1Sections, media: [] });
    const root = await render();
    await act(async () => {});
    expect(hasText(root, 'Self-inspection submitted')).toBe(true);
    expect(api.estimateFinalValue).toHaveBeenCalledWith({ vehicle_id: 'veh_1', stage: 'DECLARED', inspection_id: 'insp_1' });
    expect(hasText(root, '₹4,50,000')).toBe(true);
  });
});
