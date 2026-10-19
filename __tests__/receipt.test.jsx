/**
 * Booking receipt (as the web's): View receipt from My inspections / the
 * booking page, and Download receipt -> a PDF the user saves.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { generatePDF } from 'react-native-html-to-pdf';
import { saveDocuments } from '@react-native-documents/picker';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import MyBookings from '../src/screens/account/MyBookings/MyBookings';
import BookingReceipt from '../src/screens/account/BookingReceipt/BookingReceipt';
import { Button } from '../src/components';
import * as bookingApi from '../src/api/services/booking.api';
import { savePaymentRef } from '../src/api/paymentRefs';
import { ROUTES } from '../src/navigation/routes';

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
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>);
  });
  return tree.root;
};
const advance = async ms => {
  for (let passed = 0; passed < ms; passed += 100) {
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
  }
};
const button = (root, title) => root.findAllByType(Button).find(b => b.props.title === title);
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;
const nav = () => ({ navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() });

const paid = {
  id: 'bkg_7',
  status: 'ASSIGNED',
  category: 'PASSENGER',
  feePaid: true,
  feePaidAt: Date.parse('2026-10-08T16:17:00.000Z'),
  slotAt: Date.parse('2026-10-09T06:30:00.000Z'),
  address: 'Karve Road, Deccan Gymkhana',
  building: 'Garware College',
  landmark: 'near the main gate',
  cityCode: 'PUNE',
  pincode: '411004',
  price: 799,
};

beforeEach(async () => {
  jest.useFakeTimers();
  bookingApi.resetMockBookings();
  await createAsyncStorage('turag-prefs').clear();
  generatePDF.mockClear();
  saveDocuments.mockClear();
});
afterEach(() => {
  act(() => tree?.unmount());
  jest.useRealTimers();
});

test('My inspections: "View receipt" only on paid bookings; it opens the receipt', async () => {
  const navigation = nav();
  const root = await render(<MyBookings navigation={navigation} />);
  await advance(600);
  const rows = root.findAll(n => n.props.booking && n.props.onReceipt);
  const unpaid = rows.find(r => r.props.booking.id === 'bkg_mock_1');
  const done = rows.find(r => r.props.booking.id === 'bkg_mock_2');
  expect(unpaid.findAllByType(Button).some(b => b.props.title === 'View receipt')).toBe(false);
  const view = done.findAllByType(Button).find(b => b.props.title === 'View receipt');
  await act(async () => view.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.BOOKING_RECEIPT, {
    booking: expect.objectContaining({ id: 'bkg_mock_2', feePaid: true }),
  });
});

test('Receipt: the web’s lines; the payment reference when this phone knows it', async () => {
  await savePaymentRef('bkg_7', 'pay_01M4E4VXCZCVAF6GFS2A7P01EB');
  const root = await render(<BookingReceipt navigation={nav()} route={{ params: { booking: paid } }} />);
  await advance(100);
  expect(hasText(root, 'Booking receipt')).toBe(true);
  expect(hasText(root, 'Car')).toBe(true);
  expect(hasText(root, 'Garware College, Karve Road, Deccan Gymkhana, Pune - 411004 (near the main gate)')).toBe(true);
  expect(hasText(root, 'pay_01M4E4VXCZCVAF6GFS2A7P01EB')).toBe(true);
  expect(hasText(root, 'Payment received · Receipt generated')).toBe(true);
});

test('Receipt without a known payment reference leaves that line out', async () => {
  const root = await render(<BookingReceipt navigation={nav()} route={{ params: { booking: paid } }} />);
  await advance(100);
  expect(hasText(root, 'Payment reference')).toBe(false);
  expect(hasText(root, 'Paid on')).toBe(true);
});

test('Download receipt: a PDF of the receipt, then "Save to…"; says it is saved', async () => {
  await savePaymentRef('bkg_7', 'pay_9');
  const root = await render(<BookingReceipt navigation={nav()} route={{ params: { booking: paid } }} />);
  await advance(100);
  await act(async () => button(root, 'Download receipt').props.onPress());
  await advance(100);

  const { html, fileName } = generatePDF.mock.calls[0][0];
  expect(fileName).toBe('Turag-receipt-bkg_7');
  expect(html).toContain('TURAG');
  expect(html).toContain('bkg_7');
  expect(html).toContain('pay_9');
  expect(html).toContain('₹799');
  expect(saveDocuments).toHaveBeenCalledWith(
    expect.objectContaining({
      sourceUris: ['file:///data/cache/Turag-receipt-bkg_7.pdf'],
      fileName: 'Turag-receipt-bkg_7.pdf',
      mimeType: 'application/pdf',
    }),
  );
  expect(hasText(root, 'Receipt saved.')).toBe(true);
});

test('Download: closing the "Save to…" screen is not an error', async () => {
  saveDocuments.mockRejectedValueOnce({ code: 'OPERATION_CANCELED' });
  const root = await render(<BookingReceipt navigation={nav()} route={{ params: { booking: paid } }} />);
  await advance(100);
  await act(async () => button(root, 'Download receipt').props.onPress());
  await advance(100);
  expect(hasText(root, 'Couldn’t create the receipt.')).toBe(false);
  expect(hasText(root, 'Receipt saved.')).toBe(false);
});

test('Download: making the PDF fails -> a clear message', async () => {
  generatePDF.mockRejectedValueOnce(new Error('no space'));
  const root = await render(<BookingReceipt navigation={nav()} route={{ params: { booking: paid } }} />);
  await advance(100);
  await act(async () => button(root, 'Download receipt').props.onPress());
  await advance(100);
  expect(hasText(root, 'Couldn’t create the receipt. Please try again.')).toBe(true);
});
