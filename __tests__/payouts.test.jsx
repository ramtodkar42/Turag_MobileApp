/**
 * Seller payouts (as the web's /sell/payouts and /sell/settlements): payout
 * accounts (list, add with proof, upload proof, make active) and the
 * settlement ledger (summary, statuses, empty state) - against a fake
 * backend (fetch is mocked).
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Badge, Button, OptionSheet, TextField } from '../src/components';
import PayoutAccounts from '../src/screens/selling/PayoutAccounts/PayoutAccounts';
import Settlements from '../src/screens/selling/Settlements/Settlements';
import { settlementSummary } from '../src/screens/selling/Settlements/useSettlements';
import * as payoutApi from '../src/api/services/payout.api';
import { endSession, startSession } from '../src/api/session';
import enPayouts from '../src/i18n/locales/en/payouts';
import hiPayouts from '../src/i18n/locales/hi/payouts';
import mrPayouts from '../src/i18n/locales/mr/payouts';

jest.mock('../src/utils/pickDocument', () => ({
  pickPdf: jest.fn(async () => ({
    uri: 'file:///cache/pass book.pdf',
    type: 'application/pdf',
    fileName: 'pass book.pdf',
    fileSize: 120000,
  })),
}));
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});

const { pickPdf } = require('../src/utils/pickDocument');

const metrics = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>);
  });
  return tree.root;
};
const wait = async ms => {
  await act(async () => {
    await new Promise(r => setTimeout(r, ms));
  });
};
const nav = () => ({ navigate: jest.fn(), goBack: jest.fn() });
const button = (root, title) => root.findAllByType(Button).find(b => b.props.title === title);
const buttons = (root, title) => root.findAllByType(Button).filter(b => b.props.title === title);
const field = (root, label) => root.findAllByType(TextField).find(f => f.props.label === label);
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;
const badges = root => root.findAllByType(Badge).map(b => b.props.label);
const press = async b => {
  await act(async () => {
    b.props.onPress();
  });
};
// Picks a source in the open proof sheet (the sheet closes itself after onSelect).
const chooseSource = async (root, source) => {
  const sheet = root.findAllByType(OptionSheet).find(s => s.props.visible);
  await act(async () => {
    sheet.props.onSelect(source);
    sheet.props.onClose();
  });
  await wait(400); // the picker opens after the sheet has closed
};

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: () => Promise.resolve(JSON.stringify(body)),
});
const paise = rupees => ({ amount_minor: rupees * 100, currency: 'INR' });

const account = (extra = {}) => ({
  account_id: 'pa_1',
  status: 'DRAFT',
  holder_name: 'Ravi Kumar',
  bank_name: 'HDFC Bank',
  ifsc: 'HDFC0001234',
  account_number_masked: '••••9012',
  proof: null,
  rejection_reason: null,
  verified_at: null,
  activated_at: null,
  created_at: '2026-10-01T10:00:00Z',
  ...extra,
});
const proof = { file_name: 'passbook.pdf', content_type: 'application/pdf', size_bytes: 1000 };

const settlement = (extra = {}) => ({
  settlement_id: 'stl_1',
  order_id: 'ord_1',
  vehicle: { make: 'Hyundai', model: 'Creta', mfg_year: 2022 },
  amount: paise(1000),
  breakdown: { base: paise(1200), commission: paise(170), gst: paise(30) },
  account: { holder_name: 'Ravi Kumar', bank_name: 'HDFC Bank', ifsc: 'HDFC0001234', account_number_masked: '••••9012' },
  status: 'PAID',
  provider_payout_ref: 'UTR12345678',
  settled_at: '2026-10-05T10:00:00Z',
  has_receipt: true,
  failure_reason: null,
  created_at: '2026-10-02T10:00:00Z',
  ...extra,
});

// A fake backend: `routes` maps "METHOD /path" to a reply (or a function of init).
// Reading a picked file (file://) returns its bytes.
const bytes = new Blob(['%PDF-1.4']);
const backend = routes => {
  global.fetch = jest.fn(async (url, init = {}) => {
    if (String(url).startsWith('file://')) return { blob: () => Promise.resolve(bytes) };
    const path = String(url).replace(/^.*\/api\/v1/, '');
    const handler = routes[`${init.method || 'GET'} ${path}`];
    if (!handler) return reply(404, { error: { code: 'NOT_FOUND', message: `No route ${path}` } });
    return typeof handler === 'function' ? handler(init) : handler;
  });
};
const calls = (method, pathEnd) =>
  fetch.mock.calls
    .filter(([url, init = {}]) => (init.method || 'GET') === method && String(url).endsWith(pathEnd))
    .map(([url, init]) => ({ url, init }));

beforeEach(async () => {
  await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
});
afterEach(async () => {
  act(() => tree?.unmount());
  tree = null;
  jest.clearAllMocks();
  jest.restoreAllMocks();
  await endSession();
});

describe('translations', () => {
  const placeholders = text => (String(text).match(/\{\w+\}/g) ?? []).sort().join(',');
  test.each([
    ['hi', hiPayouts],
    ['mr', mrPayouts],
  ])('every payouts key exists in %s with the same {placeholders}', (code, dict) => {
    expect(Object.keys(dict).sort()).toEqual(Object.keys(enPayouts).sort());
    expect(Object.keys(enPayouts).filter(k => placeholders(dict[k]) !== placeholders(enPayouts[k]))).toEqual([]);
    expect(Object.keys(enPayouts).every(k => k.startsWith('payouts.'))).toBe(true);
  });
});

describe('Payout accounts', () => {
  test('lists the accounts with the web’s labels, notes and actions', async () => {
    backend({
      'GET /payout-accounts': reply(200, {
        accounts: [
          account({ account_id: 'pa_draft' }),
          account({ account_id: 'pa_review', status: 'PENDING_VERIFICATION', proof }),
          account({ account_id: 'pa_ok', status: 'VERIFIED', proof }),
          account({ account_id: 'pa_no', status: 'REJECTED', rejection_reason: 'Name does not match', proof }),
        ],
      }),
    });
    const root = await render(<PayoutAccounts navigation={nav()} />);
    await wait(0);

    expect(badges(root)).toEqual(['Proof needed', 'Under review', 'Verified', 'Rejected']);
    expect(hasText(root, '••••9012 · HDFC0001234')).toBe(true);
    expect(hasText(root, 'Ravi Kumar')).toBe(true);
    expect(hasText(root, 'Add an account and we will verify it')).toBe(true); // no active account yet
    expect(hasText(root, 'Our team is checking these details against your proof.')).toBe(true);
    expect(
      hasText(root, 'Why it was rejected: Name does not match. Add the account again with corrected details.'),
    ).toBe(true);
    expect(buttons(root, 'Upload proof')).toHaveLength(1); // DRAFT only
    expect(buttons(root, 'Use for payouts')).toHaveLength(1); // VERIFIED
    expect(buttons(root, 'View proof')).toHaveLength(3); // every account with a proof
    expect(hasText(root, 'Add a bank account')).toBe(true);
  });

  test('the add form checks the fields with the web’s messages and sends nothing', async () => {
    backend({ 'GET /payout-accounts': reply(200, { accounts: [] }) });
    const root = await render(<PayoutAccounts navigation={nav()} />);
    await wait(0);
    const submit = () => press(button(root, 'Submit for verification'));

    await submit();
    expect(hasText(root, 'Fill in every field.')).toBe(true);

    await act(async () => field(root, 'Account holder name').props.onChangeText('Ravi Kumar'));
    await act(async () => field(root, 'Bank name').props.onChangeText('HDFC Bank'));
    await act(async () => field(root, 'IFSC code').props.onChangeText('hdfc0001234'));
    expect(field(root, 'IFSC code').props.value).toBe('HDFC0001234'); // upper case as typed
    await act(async () => field(root, 'Account number').props.onChangeText('1234 5678 9012'));
    await act(async () => field(root, 'Re-enter account number').props.onChangeText('123456789099'));
    await submit();
    expect(hasText(root, 'The two account numbers do not match.')).toBe(true);

    await act(async () => field(root, 'Re-enter account number').props.onChangeText('1234-5678-9012'));
    await act(async () => field(root, 'IFSC code').props.onChangeText('HDFC000'));
    await submit();
    expect(hasText(root, 'The IFSC code must be 11 characters.')).toBe(true);

    await act(async () => field(root, 'IFSC code').props.onChangeText('HDFC0001234'));
    await submit();
    expect(hasText(root, 'Attach a photo or PDF of your passbook or a cancelled cheque.')).toBe(true);

    pickPdf.mockResolvedValueOnce({ uri: 'file:///big.pdf', type: 'application/pdf', fileName: 'big.pdf', fileSize: 21 * 1024 * 1024 });
    await press(button(root, 'Choose file'));
    await chooseSource(root, 'pdf');
    expect(hasText(root, 'The file is too large (max 20 MB).')).toBe(true);

    expect(calls('POST', '/payout-accounts')).toHaveLength(0);
  });

  test('saves the account, then uploads the proof as raw bytes with its name, then reloads', async () => {
    let listed = [];
    backend({
      'GET /payout-accounts': () => reply(200, { accounts: listed }),
      'POST /payout-accounts': reply(201, { account: account({ account_id: 'pa_new' }) }),
      'POST /payout-accounts/pa_new/proof': () => {
        listed = [account({ account_id: 'pa_new', status: 'PENDING_VERIFICATION', proof })];
        return reply(200, { account: listed[0] });
      },
    });
    const root = await render(<PayoutAccounts navigation={nav()} />);
    await wait(0);

    await act(async () => field(root, 'Account holder name').props.onChangeText('  Ravi Kumar '));
    await act(async () => field(root, 'Bank name').props.onChangeText('HDFC Bank'));
    await act(async () => field(root, 'IFSC code').props.onChangeText('hdfc0001234'));
    await act(async () => field(root, 'Account number').props.onChangeText('1234 5678 9012'));
    await act(async () => field(root, 'Re-enter account number').props.onChangeText('123456789012'));
    await press(button(root, 'Choose file'));
    await chooseSource(root, 'pdf');
    expect(hasText(root, 'pass book.pdf')).toBe(true);

    await press(button(root, 'Submit for verification'));
    await wait(0);

    const [create] = calls('POST', '/payout-accounts');
    expect(create.init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(create.init.body)).toEqual({
      holder_name: 'Ravi Kumar',
      bank_name: 'HDFC Bank',
      ifsc: 'HDFC0001234',
      account_number: '123456789012',
    });

    const [upload] = calls('POST', '/payout-accounts/pa_new/proof');
    expect(upload.init.body).toBe(bytes);
    expect(upload.init.headers['Content-Type']).toBe('application/pdf');
    expect(upload.init.headers['x-file-name']).toBe('pass%20book.pdf');
    expect(upload.init.headers.Authorization).toBe('Bearer access-1');

    expect(badges(root)).toEqual(['Under review']);
    expect(field(root, 'Account holder name').props.value).toBe(''); // form cleared
  });

  test('saved but the proof did not upload: says so and shows the draft to retry', async () => {
    let listed = [];
    backend({
      'GET /payout-accounts': () => reply(200, { accounts: listed }),
      'POST /payout-accounts': () => {
        listed = [account({ account_id: 'pa_new' })];
        return reply(201, { account: listed[0] });
      },
      'POST /payout-accounts/pa_new/proof': reply(415, {
        error: { code: 'PAYOUT_DOCUMENT_TYPE', message: 'That file type is not accepted' },
      }),
    });
    const root = await render(<PayoutAccounts navigation={nav()} />);
    await wait(0);

    await act(async () => field(root, 'Account holder name').props.onChangeText('Ravi Kumar'));
    await act(async () => field(root, 'Bank name').props.onChangeText('HDFC Bank'));
    await act(async () => field(root, 'IFSC code').props.onChangeText('HDFC0001234'));
    await act(async () => field(root, 'Account number').props.onChangeText('123456789012'));
    await act(async () => field(root, 'Re-enter account number').props.onChangeText('123456789012'));
    await press(button(root, 'Choose file'));
    await chooseSource(root, 'pdf');
    await press(button(root, 'Submit for verification'));
    await wait(0);

    expect(
      hasText(
        root,
        'Your account was saved but the proof did not upload (That file type is not accepted). Use "Upload proof" on the account below.',
      ),
    ).toBe(true);
    expect(badges(root)).toEqual(['Proof needed']);
    expect(button(root, 'Upload proof')).toBeDefined();
  });

  test('"Upload proof" on a draft sends the picked file; "Use for payouts" activates', async () => {
    let listed = [account({ account_id: 'pa_draft' }), account({ account_id: 'pa_ok', status: 'VERIFIED', proof })];
    backend({
      'GET /payout-accounts': () => reply(200, { accounts: listed }),
      'POST /payout-accounts/pa_draft/proof': () => {
        listed = [account({ account_id: 'pa_draft', status: 'PENDING_VERIFICATION', proof }), listed[1]];
        return reply(200, { account: listed[0] });
      },
      'POST /payout-accounts/pa_ok/activate': () => {
        listed = [listed[0], account({ account_id: 'pa_ok', status: 'ACTIVE', proof })];
        return reply(200, { account: listed[1] });
      },
    });
    const root = await render(<PayoutAccounts navigation={nav()} />);
    await wait(0);

    await press(button(root, 'Upload proof'));
    await chooseSource(root, 'pdf');
    await wait(0);
    const [upload] = calls('POST', '/payout-accounts/pa_draft/proof');
    expect(upload.init.body).toBe(bytes);
    expect(upload.init.headers['x-file-name']).toBe('pass%20book.pdf');
    expect(badges(root)).toEqual(['Under review', 'Verified']);

    await press(button(root, 'Use for payouts'));
    await wait(0);
    const [activate] = calls('POST', '/payout-accounts/pa_ok/activate');
    expect(JSON.parse(activate.init.body)).toEqual({});
    expect(badges(root)).toEqual(['Under review', 'Active for payouts']);
    expect(hasText(root, 'Your next payout will be sent here.')).toBe(true);
    expect(hasText(root, 'Your active account is shown below.')).toBe(true);
  });

  test('a failed action shows the server’s message on that card', async () => {
    backend({
      'GET /payout-accounts': reply(200, { accounts: [account({ account_id: 'pa_ok', status: 'INACTIVE', proof })] }),
      'POST /payout-accounts/pa_ok/activate': reply(409, {
        error: { code: 'PAYOUT_ACCOUNT_CONFLICT_STATE', message: 'This account cannot be used right now.' },
      }),
    });
    const root = await render(<PayoutAccounts navigation={nav()} />);
    await wait(0);
    await press(button(root, 'Use for payouts'));
    await wait(0);
    expect(hasText(root, 'This account cannot be used right now.')).toBe(true);
  });
});

describe('Settlements', () => {
  test('summary sums PAID and PENDING in paise; count is every entry', () => {
    const list = [
      { status: 'PAID', amountMinor: 100050 },
      { status: 'PAID', amountMinor: 50 },
      { status: 'PENDING', amountMinor: 25000 },
      { status: 'AWAITING_ACCOUNT', amountMinor: 99999 },
      { status: 'AWAITING_CONFIG', amountMinor: null },
    ];
    expect(settlementSummary(list)).toEqual({ paidMinor: 100100, heldMinor: 25000, count: 5 });
  });

  test('ledger cards: amounts, breakdown, account or link, reference + receipt, status and date', async () => {
    backend({
      'GET /settlements': reply(200, {
        data: [
          settlement(),
          settlement({ settlement_id: 'stl_2', amount: paise(500), breakdown: null, has_receipt: false }),
          settlement({
            settlement_id: 'stl_3',
            status: 'PENDING',
            amount: paise(250),
            provider_payout_ref: null,
            settled_at: null,
            has_receipt: false,
          }),
          settlement({
            settlement_id: 'stl_4',
            status: 'AWAITING_ACCOUNT',
            vehicle: null,
            order_id: 'ord_4',
            amount: paise(800),
            account: null,
            provider_payout_ref: null,
            settled_at: null,
            has_receipt: false,
          }),
          settlement({
            settlement_id: 'stl_5',
            status: 'AWAITING_CONFIG',
            amount: null,
            breakdown: null,
            account: null,
            provider_payout_ref: null,
            settled_at: null,
            has_receipt: false,
          }),
          settlement({ settlement_id: 'stl_6', status: 'FAILED', provider_payout_ref: null, settled_at: null, has_receipt: false }),
        ],
      }),
    });
    const receipt = jest.spyOn(payoutApi, 'openSettlementReceipt').mockResolvedValue();
    const navigation = nav();
    const root = await render(<Settlements navigation={navigation} />);
    await wait(0);

    // Summary: paid 1000 + 500, held 250, six entries.
    expect(hasText(root, 'Paid to you')).toBe(true);
    expect(hasText(root, '₹1,500')).toBe(true);
    expect(hasText(root, '₹250')).toBe(true);
    expect(root.findAll(n => n.props.children === '6').length).toBeGreaterThan(0);

    expect(badges(root)).toEqual(['Settled', 'Settled', 'Payout pending', 'Add a bank account', 'Being prepared', 'Failed']);
    expect(hasText(root, 'Hyundai Creta 2022')).toBe(true);
    expect(hasText(root, 'ord_4')).toBe(true); // no vehicle: the order id
    expect(hasText(root, 'Token ₹1,200 − Commission ₹170 − GST ₹30')).toBe(true);
    expect(hasText(root, '••••9012')).toBe(true);
    expect(hasText(root, 'UTR12345678')).toBe(true);
    expect(hasText(root, '05 Oct 2026')).toBe(true); // settled_at
    expect(hasText(root, '02 Oct 2026')).toBe(true); // created_at when not settled

    // No amount yet (AWAITING_CONFIG): a dash, never a guess.
    const card = id => root.findAll(n => n.props.settlement?.id === id)[0];
    expect(card('stl_5').findAll(n => n.props.children === '—').length).toBeGreaterThan(0);

    const links = root.findAll(n => n.props.accessibilityRole === 'link' && n.props.onPress);
    const linkTitled = text => links.find(l => l.findAll(n => n.props.children === text).length > 0);
    expect(links).toHaveLength(2); // one Receipt (stl_1), one Add a payout account (stl_4)

    await act(async () => linkTitled('Receipt').props.onPress());
    expect(receipt).toHaveBeenCalledWith('stl_1');

    await act(async () => linkTitled('Add a payout account').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith('PayoutAccounts');
    await press(button(root, 'Payout accounts'));
    expect(navigation.navigate).toHaveBeenCalledTimes(2);

    expect(hasText(root, 'Every line is an immutable ledger entry.')).toBe(true);
    const [list] = calls('GET', '/settlements');
    expect(list.init.headers.Authorization).toBe('Bearer access-1');
  });

  test('no settlements: the empty state with My listings', async () => {
    backend({ 'GET /settlements': reply(200, { data: [] }) });
    const navigation = nav();
    const root = await render(<Settlements navigation={navigation} />);
    await wait(0);

    expect(hasText(root, 'You have no settlements yet')).toBe(true);
    expect(hasText(root, 'Your payouts will appear here after a sale is handed over.')).toBe(true);
    expect(hasText(root, 'Paid to you')).toBe(false);
    await press(button(root, 'My listings'));
    expect(navigation.navigate).toHaveBeenCalledWith('MyListings');
  });

  test('a failed load shows the error with a retry', async () => {
    backend({ 'GET /settlements': reply(500, {}) });
    const root = await render(<Settlements navigation={nav()} />);
    await wait(0);
    expect(hasText(root, "We couldn't load your settlements")).toBe(true);
    expect(button(root, 'Try again')).toBeDefined();
  });
});
