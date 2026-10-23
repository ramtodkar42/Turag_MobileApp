/**
 * Garage, My inspections and My offers - the pieces matched to the web:
 * Garage stages (continue a self-inspection), list filters, paying the token,
 * the transfer checklist / handover gate, and applying for a loan.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Button, CheckRow, TextField } from '../src/components';
import { mapSavedVehicle } from '../src/api/mappers/valuation';
import { phaseAction, phaseBadge } from '../src/screens/garage/garagePhase';
import useListFilters from '../src/hooks/useListFilters';
import { isHandoverReady } from '../src/screens/offers/components/useTransferChecklist';
import GarageCard from '../src/screens/garage/Garage/components/GarageCard';
import OfferDetails from '../src/screens/offers/OfferDetails/OfferDetails';
import MyOffers from '../src/screens/offers/MyOffers/MyOffers';
import TransferChecklist from '../src/screens/offers/components/TransferChecklist';
import LoanApplication from '../src/screens/offers/LoanApplication/LoanApplication';
import * as offerApi from '../src/api/services/offer.api';
import { USE_REAL_API } from '../src/api/config';
import { endSession, startSession } from '../src/api/session';
import { ROUTES } from '../src/navigation/routes';

jest.mock('../src/api/services/transfer.api', () => ({
  ...jest.requireActual('../src/api/services/transfer.api'),
  getTransferChecklist: jest.fn(),
  uploadTransferDocument: jest.fn(),
  openTransferDocument: jest.fn(async () => {}),
}));
jest.mock('../src/api/services/loan.api', () => ({
  ...jest.requireActual('../src/api/services/loan.api'),
  submitLoanApplication: jest.fn(async () => ({ applicationId: 'loan_1', status: 'NEW' })),
}));
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});

const transferApi = require('../src/api/services/transfer.api');
const loanApi = require('../src/api/services/loan.api');

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
const button = (root, title) => root.findAllByType(Button).find(b => b.props.title === title);
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;
const nav = () => ({ navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), reset: jest.fn(), setParams: jest.fn() });

afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// A checklist: Forms 29 / 30 by the seller, KYC by the buyer, the NOC not applicable.
const checklist = (form29 = 'PENDING', form30 = 'PENDING') => ({
  version: 1,
  items: [
    { code: 'FORM_29', label: 'Form 29', required: true, responsible: 'SELLER', status: form29, document: null },
    { code: 'FORM_30', label: 'Form 30', required: true, responsible: 'SELLER', status: form30, document: null },
    { code: 'FORM_35_NOC', label: 'Form 35 NOC', required: false, responsible: 'SELLER', status: 'NOT_APPLICABLE', document: null },
    {
      code: 'BUYER_KYC',
      label: 'Buyer KYC',
      required: true,
      responsible: 'BUYER',
      status: 'PROVIDED',
      document: { fileName: 'pan.pdf', contentType: 'application/pdf', size: 204800, uploadedAt: Date.parse('2026-10-20T10:00:00Z') },
    },
  ],
});

describe('Garage stages (as the web’s Garage card)', () => {
  const saved = over => ({
    id: 'sv_1',
    vehicle_id: 'veh_1',
    valuation_id: 'val_1',
    inspection_id: null,
    inspection_status: null,
    inspection_mode: null,
    inspection_eligible: false,
    listing_id: null,
    listing_status: null,
    vehicle: { make: 'Maruti Suzuki', model: 'Swift', mfg_year: 2019, fuel: 'PETROL', category: 'PASSENGER' },
    headline: { value: { amount_minor: 45000000, currency: 'INR' } },
    created_at: '2026-10-01T10:00:00Z',
    ...over,
  });
  const v = over => mapSavedVehicle(saved(over));

  test('each stage and its next step', () => {
    expect(v({}).phase).toBe('fresh');
    expect(phaseAction(v({}))).toBe('inspect');
    // An unfinished self-inspection is continued, never started again.
    const open = v({ inspection_id: 'ins_1', inspection_status: 'IN_PROGRESS', inspection_mode: 'M1' });
    expect(open.phase).toBe('resume_self');
    expect(phaseAction(open)).toBe('resume');
    expect(phaseBadge(open).labelKey).toBe('garage.phase.resumeSelf');
    // A failed photo check is continued too (retake the photos).
    expect(v({ inspection_id: 'ins_1', inspection_status: 'INTEGRITY_FAILED', inspection_mode: 'M1' }).phase).toBe('resume_self');
    // A DRAFT self-inspection can't be edited: start again (no dead end).
    expect(v({ inspection_id: 'ins_1', inspection_status: 'DRAFT', inspection_mode: 'M1' }).phase).toBe('fresh');
    // With Turag.
    const submitted = v({ inspection_id: 'ins_1', inspection_status: 'SUBMITTED', inspection_mode: 'M1' });
    expect(submitted.phase).toBe('in_review');
    expect(phaseAction(submitted)).toBe('summary');
    expect(phaseAction(v({ inspection_id: 'ins_2', inspection_status: 'PENDING_QC', inspection_mode: 'M2' }))).toBeNull();
    const rejected = v({ inspection_id: 'ins_2', inspection_status: 'QC_REJECTED', inspection_mode: 'M2' });
    expect(phaseAction(rejected)).toBe('book');
    expect(phaseBadge(rejected).labelKey).toBe('garage.phase.needsAttention');
    // Ready to list / listed.
    const ready = v({ inspection_id: 'ins_3', inspection_status: 'VERIFIED', inspection_mode: 'M2', inspection_eligible: true });
    expect(phaseAction(ready)).toBe('list');
    expect(ready.reportReady).toBe(true);
    expect(phaseAction(v({ listing_id: 'lst_1', listing_status: 'LIVE', inspection_eligible: true }))).toBe('view');
    // The report only from a finished inspection.
    expect(open.reportReady).toBe(false);
  });

  test('the card offers "Continue self-inspection"', async () => {
    const onAction = jest.fn();
    const vehicle = v({ inspection_id: 'ins_1', inspection_status: 'IN_PROGRESS', inspection_mode: 'M1' });
    const root = await render(<GarageCard vehicle={vehicle} width={160} onPress={jest.fn()} onAction={onAction} />);
    expect(hasText(root, 'Self-inspection in progress')).toBe(true);
    await act(async () => button(root, 'Continue self-inspection').props.onPress());
    expect(onAction).toHaveBeenCalledWith('resume', vehicle);
  });
});

describe('List filters (as the web’s toolbars)', () => {
  const items = [
    { id: 'a', status: 'REQUESTED', city: 'Pune', time: Date.parse('2026-10-25T06:00:00Z'), amount: 3 },
    { id: 'b', status: 'CANCELLED', city: 'PCMC', time: Date.parse('2026-10-26T06:00:00Z'), amount: 1 },
    { id: 'c', status: 'REQUESTED', city: 'PCMC', time: Date.parse('2026-10-26T08:00:00Z'), amount: 2 },
  ];
  let result;
  function Probe({ list }) {
    result = useListFilters(list, {
      statusOf: i => i.status,
      searchText: i => `${i.id} ${i.city}`,
      timeOf: i => i.time,
      sorts: [
        { value: 'newest', compare: (x, y) => y.time - x.time },
        { value: 'lowest', compare: (x, y) => x.amount - y.amount },
      ],
    });
    return null;
  }

  test('tabs with counts, search, status, day and sort', async () => {
    await render(<Probe list={items} />);
    expect(result.tabs).toEqual([
      { value: 'ALL', count: 3 },
      { value: 'REQUESTED', count: 2 },
      { value: 'CANCELLED', count: 1 },
    ]);
    expect(result.filtered.map(i => i.id)).toEqual(['c', 'b', 'a']); // newest first
    await act(async () => result.setQuery('pcmc'));
    expect(result.filtered.map(i => i.id)).toEqual(['c', 'b']);
    await act(async () => result.setStatus('REQUESTED'));
    expect(result.filtered.map(i => i.id)).toEqual(['c']);
    await act(async () => result.clear());
    await act(async () => result.setDate('2026-10-26'));
    expect(result.filtered.map(i => i.id).sort()).toEqual(['b', 'c']);
    await act(async () => result.setSort('lowest'));
    expect(result.filtered.map(i => i.id)).toEqual(['b', 'c']);
    expect(result.filtering).toBe(true);
  });

  test('a status that’s gone from the list falls back to All', async () => {
    await render(<Probe list={items} />);
    await act(async () => result.setStatus('CANCELLED'));
    await act(async () => tree.update(<SafeAreaProvider initialMetrics={metrics}><Probe list={items.slice(2)} /></SafeAreaProvider>));
    expect(result.status).toBe('ALL');
  });
});

describe('My offers', () => {
  beforeEach(() => offerApi.resetMockOffers());

  test('filters, and a card opens the offer', async () => {
    const navigation = nav();
    const root = await render(<MyOffers navigation={navigation} />);
    await wait(1000); // the sample offers, then their orders
    expect(hasText(root, 'All  3')).toBe(true);
    const search = root.findAll(n => n.props.placeholder === 'Search by vehicle or amount' && n.props.onChangeText)[0];
    await act(async () => search.props.onChangeText('zzzz'));
    expect(hasText(root, 'Nothing matches')).toBe(true);
    await act(async () => button(root, 'Clear filters').props.onPress());
    const card = root.findAll(n => n.props.accessibilityRole === 'button' && /Accepted/.test(n.props.accessibilityLabel ?? ''))[0];
    await act(async () => card.props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.OFFER_DETAILS, { offerId: 'off_mock_2' });
  });

  test('accepted offer: pay the token, then the buyer’s transfer documents', async () => {
    transferApi.getTransferChecklist.mockResolvedValue(checklist());
    const navigation = nav();
    const root = await render(<OfferDetails navigation={navigation} route={{ params: { offerId: 'off_mock_2' } }} />);
    await wait(1300);
    expect(hasText(root, 'Pay the token amount')).toBe(true);
    expect(hasText(root, 'Next: pay the token to book the vehicle')).toBe(true);

    // Apply for a loan for this vehicle.
    await act(async () => button(root, 'Apply for a loan').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(
      ROUTES.LOAN_APPLICATION,
      expect.objectContaining({ listingId: 'lst_mock_b2', orderId: 'ord_mock_1' }),
    );

    const pay = jest.spyOn(offerApi, 'payOrderToken');
    await act(async () => button(root, 'Pay token').props.onPress());
    await wait(1500);
    expect(pay).toHaveBeenCalledWith('ord_mock_1', expect.objectContaining({ prefill: expect.any(Object) }));
    // Paid: the order moved on; the buyer uploads their own documents.
    expect(button(root, 'Pay token')).toBeUndefined();
    expect(hasText(root, 'Ownership transfer')).toBe(true);
    expect(transferApi.getTransferChecklist).toHaveBeenCalledWith('ord_mock_1');
    expect(hasText(root, 'Buyer KYC')).toBe(true);
    expect(button(root, 'Replace')).toBeDefined(); // the buyer's own item, provided
    expect(hasText(root, 'Form 35 NOC')).toBe(false); // not applicable: hidden
  });

  test('token payment switched off: says so, nothing else changes', async () => {
    jest
      .spyOn(offerApi, 'payOrderToken')
      .mockRejectedValueOnce(Object.assign(new Error('Paying the token isn’t available right now.'), { code: 'PAYMENTS_UNAVAILABLE' }));
    const root = await render(<OfferDetails navigation={nav()} route={{ params: { offerId: 'off_mock_2' } }} />);
    await wait(1300);
    await act(async () => button(root, 'Pay token').props.onPress());
    await wait(50);
    expect(hasText(root, 'Paying the token isn’t available right now.')).toBe(true);
    expect(button(root, 'Pay token')).toBeUndefined();
  });
});

describe('Ownership transfer + handover gate', () => {
  test('handover needs Forms 29 and 30 (and the NOC when it applies)', () => {
    expect(isHandoverReady(checklist().items)).toBe(false);
    expect(isHandoverReady(checklist('PROVIDED', 'PENDING').items)).toBe(false);
    expect(isHandoverReady(checklist('PROVIDED', 'VERIFIED').items)).toBe(true);
    const withNoc = checklist('PROVIDED', 'PROVIDED').items.map(i =>
      i.code === 'FORM_35_NOC' ? { ...i, status: 'PENDING' } : i,
    );
    expect(isHandoverReady(withNoc)).toBe(false);
  });

  test('the seller uploads their forms; ready once both are in', async () => {
    transferApi.getTransferChecklist.mockResolvedValue(checklist());
    transferApi.uploadTransferDocument.mockResolvedValue(checklist('PROVIDED', 'PROVIDED'));
    const ready = jest.fn();
    const root = await render(<TransferChecklist orderId="ord_1" role="SELLER" onReadyChange={ready} />);
    await wait(10);
    expect(ready).toHaveBeenLastCalledWith(false);
    // Two "Upload" buttons (Forms 29 / 30); the buyer's KYC isn't the seller's to upload.
    expect(root.findAllByType(Button).filter(b => b.props.title === 'Upload')).toHaveLength(2);
    await act(async () => button(root, 'Upload').props.onPress());
    const sheet = root.findAll(n => n.props.visible === true && typeof n.props.onSelect === 'function')[0];
    jest.spyOn(require('../src/utils/pickDocument'), 'pickPdf').mockResolvedValue({ uri: 'file:///f29.pdf', type: 'application/pdf' });
    await act(async () => sheet.props.onSelect('pdf'));
    await wait(400);
    expect(transferApi.uploadTransferDocument).toHaveBeenCalledWith('ord_1', 'FORM_29', { uri: 'file:///f29.pdf', type: 'application/pdf' });
    expect(ready).toHaveBeenLastCalledWith(true);
  });

  test('purchase documents: only the ones shared, each opens', async () => {
    transferApi.getTransferChecklist.mockResolvedValue(checklist());
    const root = await render(<TransferChecklist orderId="ord_1" role="BUYER" mode="documents" />);
    await wait(10);
    expect(hasText(root, 'Purchase documents')).toBe(true);
    expect(hasText(root, 'Form 29')).toBe(false);
    await act(async () => button(root, 'Open').props.onPress());
    expect(transferApi.openTransferDocument).toHaveBeenCalledWith('ord_1', 'BUYER_KYC', expect.objectContaining({ fileName: 'pan.pdf' }));
  });
});

describe('Apply for a loan', () => {
  test('checks like the web, then sends it and thanks the user', async () => {
    const navigation = nav();
    const root = await render(
      <LoanApplication
        navigation={navigation}
        route={{ params: { listingId: 'lst_1', orderId: 'ord_1', vehicleLabel: '2019 Maruti Swift', vehiclePrice: 450000 } }}
      />,
    );
    const field = label => root.findAllByType(TextField).find(f => f.props.label === label);
    expect(field('Loan amount needed (₹)').props.value).toBe('450000');
    await act(async () => field('Full name').props.onChangeText('Ram Todkar'));
    await act(async () => field('PAN').props.onChangeText('abcde1234f'));
    expect(field('PAN').props.value).toBe('ABCDE1234F');
    await act(async () => button(root, 'Submit application').props.onPress());
    expect(hasText(root, 'Please tick the consent box to continue.')).toBe(true);
    expect(loanApi.submitLoanApplication).not.toHaveBeenCalled();

    await act(async () => root.findAllByType(CheckRow)[0].props.onToggle());
    await act(async () => button(root, 'Submit application').props.onPress());
    expect(loanApi.submitLoanApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: 'lst_1',
        orderId: 'ord_1',
        loanAmount: 450000,
        tenureMonths: 60,
        name: 'Ram Todkar',
        pan: 'ABCDE1234F',
        employmentType: 'SALARIED',
      }),
    );
    expect(hasText(root, 'Thank you')).toBe(true);
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
    USE_REAL_API.offers = true;
  });
  afterAll(() => {
    USE_REAL_API.offers = false;
  });
  beforeEach(async () => {
    global.fetch = jest.fn();
    await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
  });
  afterEach(async () => {
    await endSession();
  });

  test('token: acknowledged, test gateway completed, confirmed by the server', async () => {
    fetch
      .mockResolvedValueOnce(
        reply(201, {
          payment: {
            payment_id: 'pay_9',
            provider_order_id: 'order_stub_1',
            amount: { amount_minor: 1000000, currency: 'INR' },
            key_id: 'rzp_test_stub',
          },
        }),
      )
      .mockResolvedValueOnce(reply(200, { ok: true })) // simulate
      .mockResolvedValueOnce(reply(200, { payment: { payment_id: 'pay_9', status: 'CAPTURED' } }));
    await expect(offerApi.payOrderToken('ord_9')).resolves.toEqual({ result: 'paid', amount: 10000, paymentId: 'pay_9' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/orders\/ord_9\/token-payment$/);
    expect(JSON.parse(init.body)).toEqual({ cancellation_ack: true });
    expect(init.headers['Idempotency-Key']).toBeTruthy();
    expect(fetch.mock.calls[1][0]).toMatch(/\/orders\/ord_9\/token-payment\/simulate$/);
    expect(fetch.mock.calls[2][0]).toMatch(/\/payments\/pay_9$/);
  });

  test('token payment switched off on the server (503)', async () => {
    fetch.mockResolvedValueOnce(reply(503, { error: { code: 'PAYMENTS_UNAVAILABLE', message: 'x' } }));
    await expect(offerApi.payOrderToken('ord_9')).rejects.toMatchObject({ code: 'PAYMENTS_UNAVAILABLE' });
  });

  test('handover', async () => {
    fetch.mockResolvedValueOnce(
      reply(200, {
        order: {
          order_id: 'ord_9',
          listing_id: 'lst_1',
          offer_id: 'off_1',
          agreed_price: { amount_minor: 45000000, currency: 'INR' },
          status: 'HANDED_OVER',
          created_at: '2026-10-20T10:00:00Z',
          updated_at: '2026-10-21T10:00:00Z',
          handover_at: '2026-10-21T10:00:00Z',
        },
      }),
    );
    const order = await offerApi.handoverOrder('ord_9');
    expect(fetch.mock.calls[0][0]).toMatch(/\/orders\/ord_9\/handover$/);
    expect(order).toMatchObject({ id: 'ord_9', status: 'HANDED_OVER', agreedPrice: 450000 });
  });

  test('a transfer document goes as its raw bytes with its type and name', async () => {
    const { uploadTransferDocument } = jest.requireActual('../src/api/services/transfer.api');
    const bytes = new Blob(['%PDF-1.4']);
    fetch
      .mockResolvedValueOnce({ blob: () => Promise.resolve(bytes) }) // reading the picked file
      .mockResolvedValueOnce(reply(201, { checklist: { version: 2, items: [] } }));
    await uploadTransferDocument('ord_9', 'FORM_29', { uri: 'file:///f 29.pdf', type: 'application/pdf', fileName: 'f 29.pdf' });
    const [url, init] = fetch.mock.calls[1];
    expect(url).toMatch(/\/orders\/ord_9\/transfer-checklist\/FORM_29\/document$/);
    expect(init.body).toBe(bytes);
    expect(init.headers['Content-Type']).toBe('application/pdf');
    expect(init.headers['x-file-name']).toBe('f%2029.pdf');
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  test('loan application: the web’s body, amounts in paise', async () => {
    const { submitLoanApplication } = jest.requireActual('../src/api/services/loan.api');
    fetch.mockResolvedValueOnce(reply(201, { application_id: 'loan_1', status: 'NEW', request_id: 'r' }));
    await submitLoanApplication({
      listingId: 'lst_1',
      orderId: 'ord_1',
      vehicleLabel: '2019 Maruti Swift',
      vehiclePrice: 450000,
      loanAmount: 400000,
      tenureMonths: 60,
      name: ' Ram ',
      pan: 'abcde1234f',
      employmentType: 'SALARIED',
    });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      listing_id: 'lst_1',
      order_id: 'ord_1',
      vehicle_label: '2019 Maruti Swift',
      vehicle_price_minor: 45000000,
      loan_amount_minor: 40000000,
      down_payment_minor: null,
      tenure_months: 60,
      applicant_name: 'Ram',
      email: null,
      pan: 'ABCDE1234F',
      monthly_income_minor: null,
      employment_type: 'SALARIED',
      city: null,
      consent: true,
    });
  });
});
