/**
 * Booking extras that match the web: "Verify your identity" before paying,
 * "Pay now" on an unpaid booking, and the chosen way to pay opening straight in
 * Razorpay.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Button, CheckRow, ChoiceChip, TextField } from '../src/components';
import VerifyIdentity from '../src/screens/booking/VerifyIdentity/VerifyIdentity';
import BookingDetails from '../src/screens/account/BookingDetails/BookingDetails';
import { ApiError } from '../src/api/client';
import { ROUTES } from '../src/navigation/routes';

jest.mock('../src/api/services/verification.api', () => ({
  ...jest.requireActual('../src/api/services/verification.api'),
  getMyVerification: jest.fn(async () => null),
  submitVerification: jest.fn(async () => ({ id: 'ver_1', status: 'PENDING_REVIEW', docType: 'AADHAAR' })),
}));
jest.mock('../src/utils/pickImage', () => ({
  takePhoto: jest.fn(async () => ({ uri: 'file:///selfie.jpg', type: 'image/jpeg' })),
  pickImageFromGallery: jest.fn(async () => ({ uri: 'file:///aadhaar.jpg', type: 'image/jpeg' })),
}));
jest.mock('../src/api/services/booking.api', () => ({
  ...jest.requireActual('../src/api/services/booking.api'),
  getMyBooking: jest.fn(),
  payForBooking: jest.fn(async () => ({ paymentId: 'pay_1', confirmed: true })),
}));
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});

const verificationApi = require('../src/api/services/verification.api');
const pickImage = require('../src/utils/pickImage');
const bookingApi = require('../src/api/services/booking.api');

const metrics = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>);
  });
  await act(async () => {});
  return tree.root;
};
const flush = async (ms = 0) => {
  await act(async () => {
    await new Promise(r => setTimeout(r, ms));
  });
};
const button = (root, title) => root.findAllByType(Button).find(b => b.props.title === title);
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;
const nav = () => ({ navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), reset: jest.fn(), setParams: jest.fn() });

beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
});

describe('Verify your identity (before paying, as the web)', () => {
  const booking = { id: 'bkg_1', status: 'PENDING_PAYMENT', price: 799 };

  test('number rules, selfie, document photo and consent; then payment opens', async () => {
    const navigation = nav();
    const root = await render(<VerifyIdentity navigation={navigation} route={{ params: { booking } }} />);
    const submit = () => button(root, 'Submit for verification');
    expect(root.findAllByType(ChoiceChip).map(c => c.props.label)).toEqual(['Aadhaar', 'PAN', 'Driving Licence']);
    expect(submit().props.disabled).toBe(true);

    const number = () => root.findAllByType(TextField)[0];
    // Grouped as it's typed; an Aadhaar can't start with 0 or 1.
    await act(async () => number().props.onChangeText('123456789012'));
    expect(number().props.value).toBe('1234 5678 9012');
    expect(hasText(root, 'Enter a valid Aadhaar number.')).toBe(true);
    await act(async () => number().props.onChangeText('234567890123'));
    expect(number().props.value).toBe('2345 6789 0123');
    expect(number().props.valid).toBe(true);

    // Selfie: the front camera.
    await act(async () => button(root, 'Open camera').props.onPress());
    await flush();
    expect(pickImage.takePhoto).toHaveBeenCalledWith({ front: true });
    expect(button(root, 'Retake')).toBeDefined();

    // Document photo: camera or gallery from a sheet.
    const drop = root.findAll(n => n.props.accessibilityLabel === 'Tap to upload or take a photo' && n.props.onPress)[0];
    await act(async () => drop.props.onPress());
    const sheet = root.findAll(n => n.props.visible === true && typeof n.props.onSelect === 'function')[0];
    await act(async () => sheet.props.onSelect('gallery'));
    await flush(400);
    expect(pickImage.pickImageFromGallery).toHaveBeenCalled();
    expect(button(root, 'Change')).toBeDefined();

    expect(submit().props.disabled).toBe(true); // consent still missing
    await act(async () => root.findAllByType(CheckRow)[0].props.onToggle());
    expect(submit().props.disabled).toBe(false);

    await act(async () => submit().props.onPress());
    await flush();
    expect(verificationApi.submitVerification).toHaveBeenCalledWith({
      docType: 'AADHAAR',
      docNumber: '2345 6789 0123',
      selfie: { uri: 'file:///selfie.jpg', type: 'image/jpeg' },
      docImage: { uri: 'file:///aadhaar.jpg', type: 'image/jpeg' },
    });
    // Payment takes this screen's place, with the chosen way to pay.
    expect(navigation.replace).toHaveBeenCalledWith(ROUTES.PAYMENT_STATUS, { booking });
  });

  test('changing the document clears the number; PAN is upper case', async () => {
    const root = await render(<VerifyIdentity navigation={nav()} route={{ params: { booking } }} />);
    const number = () => root.findAllByType(TextField)[0];
    await act(async () => number().props.onChangeText('2345'));
    await act(async () => root.findAllByType(ChoiceChip)[1].props.onPress());
    expect(number().props.value).toBe('');
    await act(async () => number().props.onChangeText('abcde1234f'));
    expect(number().props.value).toBe('ABCDE1234F');
    expect(number().props.valid).toBe(true);
  });

  test('a server error is shown and nothing moves on', async () => {
    verificationApi.submitVerification.mockRejectedValueOnce(
      new ApiError({ status: 422, code: 'KYC_IMAGE_INVALID', message: 'Both a selfie and a document photo are required.' }),
    );
    const navigation = nav();
    const root = await render(<VerifyIdentity navigation={navigation} route={{ params: { booking } }} />);
    await act(async () => root.findAllByType(TextField)[0].props.onChangeText('234567890123'));
    await act(async () => button(root, 'Open camera').props.onPress());
    await flush();
    const drop = root.findAll(n => n.props.accessibilityLabel === 'Tap to upload or take a photo' && n.props.onPress)[0];
    await act(async () => drop.props.onPress());
    const sheet = root.findAll(n => n.props.visible === true && typeof n.props.onSelect === 'function')[0];
    await act(async () => sheet.props.onSelect('camera'));
    await flush(400);
    await act(async () => root.findAllByType(CheckRow)[0].props.onToggle());
    await act(async () => button(root, 'Submit for verification').props.onPress());
    await flush();
    expect(hasText(root, 'Both a selfie and a document photo are required.')).toBe(true);
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});

describe('"Pay now" on an unpaid booking (as the web’s booking page)', () => {
  const unpaid = {
    id: 'bkg_7',
    status: 'REQUESTED',
    category: 'PASSENGER',
    slotAt: Date.parse('2026-10-25T04:30:00.000Z'),
    address: 'Baner Road, Baner',
    building: 'Flat 402, Sunshine Society',
    landmark: 'near X Mall',
    pincode: '411045',
    cityCode: 'PUNE',
    price: 799,
    feePaid: false,
    inspectorAssigned: false,
    canCancel: true,
    chatOpen: false,
  };

  test('pays here and reloads the booking once the server confirms it', async () => {
    bookingApi.getMyBooking
      .mockResolvedValueOnce(unpaid)
      .mockResolvedValueOnce({ ...unpaid, feePaid: true, status: 'ASSIGNED', inspectorAssigned: true });
    const root = await render(<BookingDetails navigation={nav()} route={{ params: { bookingId: 'bkg_7' } }} />);
    // Building, address, city - pincode (landmark), as the web's receipt.
    expect(hasText(root, 'Flat 402, Sunshine Society, Baner Road, Baner, Pune - 411045 (near X Mall)')).toBe(true);
    const pay = button(root, 'Pay now · ₹799');
    expect(pay).toBeDefined();
    await act(async () => pay.props.onPress());
    await flush();
    expect(bookingApi.payForBooking).toHaveBeenCalledWith(
      'bkg_7',
      expect.objectContaining({ amountMinor: 79900, label: 'Doorstep inspection fee' }),
    );
    expect(bookingApi.getMyBooking).toHaveBeenCalledTimes(2);
    expect(button(root, 'Pay now · ₹799')).toBeUndefined(); // paid now
  });

  test('a cancelled payment: the message, and "Retry payment"', async () => {
    bookingApi.getMyBooking.mockResolvedValue(unpaid);
    bookingApi.payForBooking.mockRejectedValueOnce(
      new ApiError({ code: 'PAYMENT_CANCELLED', message: 'Payment cancelled by user' }),
    );
    const root = await render(<BookingDetails navigation={nav()} route={{ params: { bookingId: 'bkg_7' } }} />);
    await act(async () => button(root, 'Pay now · ₹799').props.onPress());
    await flush();
    expect(hasText(root, 'Payment cancelled by user')).toBe(true);
    expect(button(root, 'Retry payment')).toBeDefined();
  });

  test('just paid but not confirmed yet (not listed by the backend): the booking still opens with "Pay now"', async () => {
    bookingApi.getMyBooking.mockRejectedValue(
      new ApiError({ status: 404, code: 'BOOKING_NOT_FOUND', message: 'not found' }),
    );
    const pending = { ...unpaid, status: 'PENDING_PAYMENT', canCancel: false };
    const root = await render(
      <BookingDetails navigation={nav()} route={{ params: { bookingId: 'bkg_7', booking: pending } }} />,
    );
    expect(hasText(root, 'Booking not found')).toBe(false);
    expect(button(root, 'Pay now · ₹799')).toBeDefined();
  });

  test('paid or cancelled bookings have no "Pay now"', async () => {
    bookingApi.getMyBooking.mockResolvedValueOnce({ ...unpaid, feePaid: true });
    let root = await render(<BookingDetails navigation={nav()} route={{ params: { bookingId: 'bkg_7' } }} />);
    expect(button(root, 'Pay now · ₹799')).toBeUndefined();
    act(() => tree.unmount());
    bookingApi.getMyBooking.mockResolvedValueOnce({ ...unpaid, status: 'CANCELLED', canCancel: false });
    root = await render(<BookingDetails navigation={nav()} route={{ params: { bookingId: 'bkg_7' } }} />);
    expect(button(root, 'Pay now · ₹799')).toBeUndefined();
  });
});
