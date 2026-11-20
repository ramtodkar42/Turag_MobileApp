/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Button, ChoiceChip, MenuRow, OptionSheet, TextField } from '../src/components';
import DealerApply from '../src/screens/business/DealerApply/DealerApply';
import AuthSuccess from '../src/screens/auth/AuthSuccess/AuthSuccess';
import Profile from '../src/screens/profile/Profile/Profile';
import { checkForm } from '../src/screens/business/DealerApply/dealerApplyForm';
import { dealerApplyErrorText } from '../src/screens/business/DealerApply/useDealerApply';
import * as dealerApi from '../src/api/services/dealerApplication.api';
import { ApiError } from '../src/api/client';
import { USE_REAL_API } from '../src/api/config';
import { endSession, startSession } from '../src/api/session';
import { clearUser, setUser } from '../src/store/userStore';
import { ROUTES } from '../src/navigation/routes';

// Pages reload when they come back into view; here, once after mounting.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});

jest.mock('../src/utils/pickImage', () => ({
  takePhoto: jest.fn(async () => ({ uri: 'file:///doc.jpg', type: 'image/jpeg', fileName: 'doc.jpg', fileSize: 400000 })),
  pickImageFromGallery: jest.fn(async () => null),
}));
jest.mock('../src/utils/pickDocument', () => ({
  pickPdf: jest.fn(async () => ({ uri: 'file:///doc.pdf', type: 'application/pdf', fileName: 'doc.pdf', fileSize: 6 * 1024 * 1024 })),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>);
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
const nav = () => ({ navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), reset: jest.fn(), canGoBack: () => false });
const button = (root, title) => root.findAllByType(Button).find(b => b.props.title === title);
const buttons = (root, title) => root.findAllByType(Button).filter(b => b.props.title === title);
const field = (root, label) => root.findAllByType(TextField).find(f => f.props.label === label);
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;
const type = async (root, label, value) => act(async () => field(root, label).props.onChangeText(value));

const goodForm = {
  businessName: 'Ravi Motors',
  ownerName: 'Ravi Kumar',
  email: 'ravi@motors.in',
  addressLine: '',
  city: 'Pune',
  state: 'Maharashtra',
  pinCode: '411045',
  pan: 'abcde1234f',
  gstin: '',
  registrationType: 'SHOP_ACT',
  registrationNumber: 'pmc/123/2024',
  aadhaarNumber: '2345 6789 0123',
};

beforeEach(() => {
  jest.useFakeTimers();
  dealerApi.resetMockDealerApplication();
  setUser({ fullName: 'Ravi Kumar', email: 'ravi@motors.in', role: 'individual', purpose: 'dealer' });
});
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  clearUser();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the form checks (the server’s rules)', () => {
  test('a good form is tidied for sending', () => {
    const { details, errors } = checkForm(goodForm);
    expect(errors).toEqual({});
    expect(details).toMatchObject({ pan: 'ABCDE1234F', aadhaarNumber: '234567890123', registrationNumber: 'PMC/123/2024' });
  });

  test('each wrong field says what is wrong', () => {
    const { errors } = checkForm({
      ...goodForm,
      businessName: ' ',
      email: 'ravi@',
      pinCode: '41104',
      pan: 'ABCD1234F',
      registrationType: 'UDYAM',
      registrationNumber: 'UDYAM-MH-1-12',
      aadhaarNumber: '1234 5678 9012', // can't start with 0 or 1
    });
    expect(errors).toEqual({
      businessName: 'dealerApply.error.required',
      email: 'errors.email',
      pinCode: 'dealerApply.error.pinCode',
      pan: 'dealerApply.error.pan',
      registrationNumber: 'dealerApply.error.udyam',
      aadhaarNumber: 'dealerApply.error.aadhaar',
    });
  });

  test('a GSTIN must carry the same PAN', () => {
    expect(checkForm({ ...goodForm, gstin: '27ZZZZZ9999Z1Z5' }).errors).toEqual({ pan: 'dealerApply.error.panGstin' });
    expect(checkForm({ ...goodForm, gstin: '27abcde1234f1z5' }).errors).toEqual({});
  });

  test('server refusals in plain words', () => {
    const invalid = reason => new ApiError({ status: 422, code: 'DEALER_APPLICATION_INVALID_ACTION', details: { reason } });
    expect(dealerApplyErrorText(invalid('DOCUMENTS_MISSING'))).toBe('Upload all the documents before you submit.');
    expect(dealerApplyErrorText(invalid('INVALID_TRANSITION'))).toBe('Your application is under review and can’t be changed now.');
    expect(dealerApplyErrorText(new ApiError({ status: 413, code: 'VALIDATION_ERROR' }))).toBe('The file is too large (max 5 MB).');
  });
});

describe('Become a dealer (screen)', () => {
  test('details, then the 3 documents, then Submit: it goes for review', async () => {
    const root = await render(<DealerApply navigation={nav()} />);
    await advance(400);

    // The account's name and email to start with; documents wait for the details.
    expect(field(root, 'Owner name').props.value).toBe('Ravi Kumar');
    expect(field(root, 'Email (for your dealer login)').props.value).toBe('ravi@motors.in');
    expect(hasText(root, 'Save your details first, then upload your documents.')).toBe(true);
    expect(buttons(root, 'Upload').every(b => b.props.disabled)).toBe(true);
    expect(button(root, 'Submit for review').props.disabled).toBe(true);

    // A wrong field is marked, nothing is sent.
    const save = jest.spyOn(dealerApi, 'saveDealerApplication');
    await act(async () => button(root, 'Save details').props.onPress());
    expect(save).not.toHaveBeenCalled();
    expect(hasText(root, 'Please check the details marked in red.')).toBe(true);
    expect(field(root, 'PAN').props.error).toBe('Enter a valid 10-character PAN (like ABCDE1234F).');

    await type(root, 'Business / showroom name', 'Ravi Motors');
    await type(root, 'City', 'Pune');
    await type(root, 'State', 'Maharashtra');
    await type(root, 'PIN code', '411045');
    await type(root, 'PAN', 'abcde1234f');
    await type(root, 'Registration number', 'PMC/123/2024');
    await type(root, 'Aadhaar number', '2345 6789 0123');
    await act(async () => {
      button(root, 'Save details').props.onPress();
    });
    await advance(500);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ pan: 'ABCDE1234F', registrationType: 'SHOP_ACT' }));
    expect(hasText(root, 'Details saved.')).toBe(true);
    expect(hasText(root, 'On file: XXXX XXXX 0123. Enter it again when you save your details.')).toBe(true);

    // Each document: camera, gallery or a PDF.
    const upload = jest.spyOn(dealerApi, 'uploadDealerDocument');
    for (let i = 0; i < 3; i += 1) {
      await act(async () => buttons(root, 'Upload')[0].props.onPress());
      const sheet = root.findByType(OptionSheet);
      expect(sheet.props.options.map(o => o.label)).toEqual(['Take a photo', 'Choose from gallery', 'Choose a PDF']);
      await act(async () => sheet.props.onSelect('camera'));
      await act(async () => sheet.props.onClose());
      await advance(1000);
    }
    expect(upload.mock.calls.map(c => c[0])).toEqual(['PAN', 'AADHAAR', 'SHOP_ACT']);
    expect(hasText(root, 'Uploaded, waiting for review')).toBe(true);
    expect(buttons(root, 'Replace')).toHaveLength(3);

    await act(async () => {
      button(root, 'Submit for review').props.onPress();
    });
    await advance(500);
    expect(hasText(root, 'Your application is under review. We’ll email you once it’s decided.')).toBe(true);
    expect(field(root, 'PAN')).toBeUndefined();
    expect(button(root, 'Submit for review')).toBeUndefined();
  });

  test('Udyam: its certificate is asked for; a PDF over 5 MB says so', async () => {
    await act(async () => {
      dealerApi.saveDealerApplication({ ...checkForm({ ...goodForm, registrationType: 'UDYAM', registrationNumber: 'UDYAM-MH-26-1234567' }).details });
    });
    await advance(500);
    const root = await render(<DealerApply navigation={nav()} />);
    await advance(400);
    expect(root.findAllByType(ChoiceChip).find(c => c.props.selected).props.label).toBe('Udyam');
    expect(hasText(root, 'Udyam certificate')).toBe(true);
    expect(hasText(root, 'Shop Act licence')).toBe(true); // the chip, not a document row

    await act(async () => buttons(root, 'Upload')[0].props.onPress());
    await act(async () => root.findByType(OptionSheet).props.onSelect('pdf'));
    await advance(1000);
    expect(hasText(root, 'The file is too large (max 5 MB).')).toBe(true);
  });

  test('changes needed: says why, and the form is open again', async () => {
    jest.spyOn(dealerApi, 'getMyDealerApplication').mockResolvedValue({
      ...dealerApi.mapDealerApplication({
        id: 'dapp_1',
        status: 'CHANGES_NEEDED',
        version: 3,
        status_reason: 'PAN photo is blurred',
        business_name: 'Ravi Motors',
        registration_type: 'SHOP_ACT',
        aadhaar_masked: 'XXXX XXXX 0123',
        documents: [{ id: 'd1', doc_type: 'PAN', content_type: 'image/jpeg', decision: 'REJECTED', decision_reason: 'Blurred', uploaded_at: '2026-11-20T10:00:00Z' }],
        editable: true,
      }),
    });
    const root = await render(<DealerApply navigation={nav()} />);
    await advance(400);
    expect(hasText(root, 'Changes needed. Please fix and submit again.')).toBe(true);
    expect(hasText(root, 'PAN photo is blurred')).toBe(true);
    expect(hasText(root, 'Rejected: Blurred')).toBe(true);
    expect(field(root, 'Business / showroom name').props.value).toBe('Ravi Motors');
  });
});

describe('where it opens from', () => {
  test('after a dealer signs up: "Add your documents" or "Continue to Turag" (no moving on by itself)', async () => {
    const navigation = nav();
    const root = await render(
      <AuthSuccess navigation={navigation} route={{ params: { titleKey: 'auth.accountCreated', next: ROUTES.MAIN_TABS, dealerApply: true } }} />,
    );
    await advance(8000);
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(hasText(root, 'To become a dealer, add your business details and documents.')).toBe(true);
    await act(async () => button(root, 'Add your documents').props.onPress());
    expect(navigation.reset).toHaveBeenCalledWith({ index: 1, routes: [{ name: ROUTES.MAIN_TABS }, { name: ROUTES.DEALER_APPLY }] });
  });

  test('Profile: "Dealer application" for someone who signed up as a dealer, with where it stands', async () => {
    const root = await render(<Profile navigation={nav()} />);
    await advance(600);
    const row = () => root.findAllByType(MenuRow).find(r => r.props.label === 'Dealer application');
    expect(row()).toBeDefined();
    expect(row().props.value).toBeUndefined(); // not started yet
    act(() => tree.unmount());

    jest.spyOn(dealerApi, 'getMyDealerApplication').mockResolvedValue({ status: 'PENDING_REVIEW', documents: [] });
    const again = await render(<Profile navigation={nav()} />);
    await advance(600);
    expect(again.findAllByType(MenuRow).find(r => r.props.label === 'Dealer application').props.value).toBe('In review');
  });

  test('Profile: no row for someone who never asked to be a dealer', async () => {
    act(() => {
      clearUser();
      setUser({ fullName: 'Asha', role: 'individual' });
    });
    const root = await render(<Profile navigation={nav()} />);
    await advance(600);
    expect(root.findAllByType(MenuRow).find(r => r.props.label === 'Dealer application')).toBeUndefined();
  });
});

describe('real backend', () => {
  const reply = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify(body)),
    blob: () => Promise.resolve({ size: 1000 }),
  });
  const view = (extra = {}) => ({ id: 'dapp_1', status: 'DRAFT', version: 1, documents: [], editable: true, ...extra });
  const authBefore = USE_REAL_API.auth;
  let originalFetch;

  beforeEach(async () => {
    jest.useRealTimers();
    originalFetch = global.fetch;
    global.fetch = jest.fn();
    USE_REAL_API.auth = true;
    await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
  });
  afterEach(async () => {
    global.fetch = originalFetch;
    USE_REAL_API.auth = authBefore;
    await endSession();
  });

  test('get, save (the web’s body), upload the raw file, submit', async () => {
    global.fetch
      .mockResolvedValueOnce(reply(200, { application: null }))
      .mockResolvedValueOnce(reply(200, { application: view({ business_name: 'Ravi Motors', aadhaar_masked: 'XXXX XXXX 0123' }) }))
      .mockResolvedValueOnce(reply(200, {})) // reading the picked file
      .mockResolvedValueOnce(reply(200, { application: view({ documents: [{ id: 'd1', doc_type: 'PAN', content_type: 'image/jpeg', decision: null }] }) }))
      .mockResolvedValueOnce(reply(200, { application: view({ status: 'PENDING_REVIEW', editable: false }) }));

    expect(await dealerApi.getMyDealerApplication()).toBeNull();
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/me\/dealer-application$/);

    const saved = await dealerApi.saveDealerApplication(checkForm(goodForm).details);
    const [saveUrl, saveInit] = global.fetch.mock.calls[1];
    expect(saveUrl).toMatch(/\/me\/dealer-application$/);
    expect(saveInit.method).toBe('PUT');
    expect(JSON.parse(saveInit.body)).toEqual({
      business_name: 'Ravi Motors',
      owner_name: 'Ravi Kumar',
      email: 'ravi@motors.in',
      address_line: null,
      city: 'Pune',
      state: 'Maharashtra',
      pin_code: '411045',
      pan: 'ABCDE1234F',
      gstin: null,
      registration_type: 'SHOP_ACT',
      registration_number: 'PMC/123/2024',
      aadhaar_number: '234567890123',
    });
    expect(saved).toMatchObject({ businessName: 'Ravi Motors', aadhaarMasked: 'XXXX XXXX 0123', editable: true });

    const uploaded = await dealerApi.uploadDealerDocument('PAN', { uri: 'file:///pan.jpg', type: 'image/jpeg', fileSize: 1000 });
    const [upUrl, upInit] = global.fetch.mock.calls[3];
    expect(upUrl).toMatch(/\/me\/dealer-application\/documents\/PAN$/);
    expect(upInit.method).toBe('POST');
    expect(upInit.headers['Content-Type']).toBe('image/jpeg');
    expect(uploaded.documents).toEqual([expect.objectContaining({ docType: 'PAN', decision: null })]);

    const sent = await dealerApi.submitDealerApplication();
    expect(global.fetch.mock.calls[4][0]).toMatch(/\/me\/dealer-application\/submit$/);
    expect(sent).toMatchObject({ status: 'PENDING_REVIEW', editable: false });
  });
});
