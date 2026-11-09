/**
 * The app vs web parity fixes (2026-11-07): number plates the backend accepts, 0 km,
 * launch-preview (SOLD) and reserved listings, your own listing, offer and sign-in
 * errors in the user's words, a JPEG profile photo, identity-check notifications,
 * a Google-verified email, the report's final value and photo-checked items, and
 * an estimate reaching a car already in the Garage.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { AppText, Badge, Button } from '../src/components';
import VehicleGridCard from '../src/components/vehicle/VehicleGridCard';
import ChatInput from '../src/screens/chat/Chat/components/ChatInput';
import AnswerInput from '../src/screens/valuation/EvaluateChat/components/AnswerInput';
import SaveVehicleButton from '../src/screens/valuation/components/SaveVehicleButton';
import VehicleListing from '../src/screens/marketplace/VehicleListing/VehicleListing';
import InspectionReport from '../src/screens/account/InspectionReport/InspectionReport';
import notificationTarget from '../src/screens/notifications/notificationTarget';
import completeSignUp from '../src/screens/auth/CompleteProfile/completeSignUp';
import { formatRegNumber, isValidRegNumber, REG_NUMBER_MAX_LENGTH } from '../src/utils/validators';
import { errorText, OFFER_ERROR_KEYS, OTP_ERROR_KEYS } from '../src/utils/errorText';
import { pickProfilePhoto } from '../src/utils/pickImage';
import { ApiError } from '../src/api/client';
import { mapListingSummary } from '../src/api/mappers/listing';
import { mapReport } from '../src/api/mappers/booking';
import * as vehicleApi from '../src/api/services/vehicle.api';
import * as sellerListingApi from '../src/api/services/sellerListing.api';
import * as profileApi from '../src/api/services/profile.api';
import * as reportApi from '../src/api/services/report.api';
import { clearGarage, saveToGarage } from '../src/store/garageStore';
import { clearUser, setUser } from '../src/store/userStore';
import { ROUTES } from '../src/navigation/routes';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});

// The native image library: "saves" the picked photo again as a JPEG.
jest.mock('react-native-nitro-image', () => ({
  loadImage: jest.fn(async () => ({
    width: 512,
    height: 512,
    saveToTemporaryFileAsync: jest.fn(async () => '/tmp/nitro/abc.jpg'),
  })),
}));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={METRICS}>{element}</SafeAreaProvider>);
  });
  await act(async () => {});
  return tree.root;
};
const texts = root =>
  root
    .findAllByType(AppText)
    .map(n => [].concat(n.props.children).join(''))
    .filter(Boolean);
const hasText = (root, text) => texts(root).some(s => s.includes(text));
const buttonTitles = root => root.findAllByType(Button).map(b => b.props.title);

afterEach(() => {
  if (tree) {
    act(() => tree.unmount());
    tree = null;
  }
  jest.restoreAllMocks();
});

describe('number plates, as the backend accepts them', () => {
  test('standard plates, up to 11 characters, and the Bharat (BH) series', () => {
    expect(isValidRegNumber('MH12CT4590')).toBe(true);
    expect(isValidRegNumber('DL 10 CAB 1234')).toBe(true); // 11 characters
    expect(isValidRegNumber('22BH1234AA')).toBe(true);
    expect(isValidRegNumber('22 bh 1234 a')).toBe(true);
    expect(REG_NUMBER_MAX_LENGTH).toBe(11);
    expect(formatRegNumber('22BH1234AA')).toBe('22 BH 1234 AA');
    expect(formatRegNumber('DL10CAB1234')).toBe('DL 10 CAB 1234');
  });

  test('what the backend refuses is refused here too', () => {
    expect(isValidRegNumber('MH121234')).toBe(false); // no series letters
    expect(isValidRegNumber('22BH1234')).toBe(false);
    expect(isValidRegNumber('')).toBe(false);
    expect(isValidRegNumber(null)).toBe(false);
  });

  test('Evaluate takes a BH plate and an 11-character one, and 0 km', async () => {
    const onSubmit = jest.fn();
    let root = await render(<AnswerInput kind="reg" onSubmit={onSubmit} />);
    const type = async text => act(async () => root.findByType(ChatInput).props.onChangeText(text));
    await type('22 BH 1234 AA');
    expect(root.findByType(ChatInput).props.canSend).toBe(true);
    await type('DL10CAB1234');
    expect(root.findByType(ChatInput).props.value).toBe('DL10CAB1234');
    expect(root.findByType(ChatInput).props.canSend).toBe(true);
    act(() => tree.unmount());

    root = await render(<AnswerInput kind="km" onSubmit={onSubmit} />);
    await act(async () => root.findByType(ChatInput).props.onChangeText('0'));
    expect(root.findByType(ChatInput).props.canSend).toBe(true);
    await act(async () => root.findByType(ChatInput).props.onSend());
    expect(onSubmit).toHaveBeenCalledWith(0);
  });
});

describe('listings: sold (launch preview), reserved, and your own', () => {
  const raw = {
    listing_id: 'lst_1',
    make: 'KIA',
    model: 'Seltos',
    mfg_year: 2023,
    fuel: 'PETROL',
    city: 'PUNE',
    ask_price: { amount_minor: 120000000, currency: 'INR' },
    status: 'LIVE',
    verification_label: 'TURAG_VERIFIED',
  };

  test('the card shows SOLD (instead of Verified) or Reserved, as the web', async () => {
    expect(mapListingSummary({ ...raw, is_showcase: true }).sold).toBe(true);
    expect(mapListingSummary(raw).sold).toBe(false);

    let root = await render(<VehicleGridCard vehicle={mapListingSummary({ ...raw, is_showcase: true })} width={160} />);
    expect(root.findAllByType(Badge).map(b => [b.props.label, b.props.tone])).toEqual([['SOLD', 'sold']]);
    act(() => tree.unmount());

    root = await render(<VehicleGridCard vehicle={mapListingSummary({ ...raw, status: 'RESERVED' })} width={160} />);
    expect(root.findAllByType(Badge)[0].props.label).toBe('Reserved');
    act(() => tree.unmount());

    root = await render(<VehicleGridCard vehicle={mapListingSummary(raw)} width={160} />);
    expect(root.findAllByType(Badge)[0].props.label).toBe('Verified');
  });

  const openPage = async ({ sold = false, mine = false } = {}) => {
    const vehicle = mapListingSummary({ ...raw, is_showcase: sold });
    jest.spyOn(vehicleApi, 'getVehicleDetails').mockResolvedValue({ ...vehicle, eligible: true });
    jest
      .spyOn(sellerListingApi, 'getMyListing')
      .mockImplementation(async () => {
        if (!mine) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
        return { listing: { id: 'lst_1' }, offers: [] };
      });
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    const root = await render(<VehicleListing navigation={navigation} route={{ params: { vehicle } }} />);
    await act(async () => {});
    return { root, navigation };
  };

  beforeEach(() => setUser({ fullName: 'Asha', role: 'individual' }));
  afterEach(() => act(() => clearUser()));

  test('a launch-preview listing is SOLD and takes no offers', async () => {
    const { root } = await openPage({ sold: true });
    expect(hasText(root, 'SOLD')).toBe(true);
    expect(hasText(root, "isn’t available for offers")).toBe(true);
    expect(buttonTitles(root)).not.toContain('Make an offer');
  });

  test('your own listing: Manage listing instead of an offer, and no Save', async () => {
    const { root, navigation } = await openPage({ mine: true });
    expect(buttonTitles(root)).toContain('Manage listing');
    expect(buttonTitles(root)).not.toContain('Make an offer');
    expect(root.findAll(n => n.props.accessibilityLabel === 'Save vehicle')).toHaveLength(0);
    await act(async () => root.findAllByType(Button).find(b => b.props.title === 'Manage listing').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.MY_LISTING, { listingId: 'lst_1' });
  });

  test("someone else's listing: Make an offer, as before", async () => {
    const { root } = await openPage();
    expect(buttonTitles(root)).toContain('Make an offer');
  });
});

describe("errors in the user's words, as the web", () => {
  const apiError = (code, message = 'Server says no') => new ApiError({ status: 409, code, message });

  test('making an offer', () => {
    expect(errorText(apiError('OWN_LISTING'), OFFER_ERROR_KEYS, 'marketplace.offer.sendError')).toBe(
      'This is your own listing. You can manage it but not make an offer on it.',
    );
    expect(errorText(apiError('OFFER_ALREADY_ACTIVE'), OFFER_ERROR_KEYS, 'marketplace.offer.sendError')).toMatch(
      /already have an active offer/,
    );
    expect(errorText(apiError('LISTING_NOT_AVAILABLE'), OFFER_ERROR_KEYS, 'marketplace.offer.sendError')).toBe(
      'This vehicle is no longer available for offers.',
    );
    // A code the app doesn't know: the server's message; nothing at all: the app's own.
    expect(errorText(apiError('SOMETHING_NEW'), OFFER_ERROR_KEYS, 'marketplace.offer.sendError')).toBe('Server says no');
  });

  test('signing in with a code', () => {
    expect(errorText(apiError('AUTH_OTP_EXPIRED'), OTP_ERROR_KEYS, 'auth.verify.invalid')).toBe(
      'That code has expired. Request a new one.',
    );
    expect(errorText(apiError('AUTH_OTP_INVALID'), OTP_ERROR_KEYS, 'auth.verify.invalid')).toBe(
      'That code is incorrect. Please try again.',
    );
    expect(errorText({}, OTP_ERROR_KEYS, 'auth.verify.invalid')).toBe('Invalid OTP. Please try again.');
  });
});

describe('profile photo', () => {
  test('a PNG from the gallery is saved again as a JPEG (the account keeps only JPEGs)', async () => {
    launchImageLibrary.mockResolvedValueOnce({
      assets: [{ uri: 'file:///cache/screenshot.png', type: 'image/png', fileName: 'screenshot.png', fileSize: 90000 }],
    });
    const photo = await pickProfilePhoto('gallery');
    expect(photo).toEqual(
      expect.objectContaining({ uri: 'file:///tmp/nitro/abc.jpg', type: 'image/jpeg', fileName: 'screenshot.jpg' }),
    );
  });

  test('if it can\'t be converted, the picked photo is kept', async () => {
    const nitro = require('react-native-nitro-image');
    nitro.loadImage.mockRejectedValueOnce(new Error('no native module'));
    launchImageLibrary.mockResolvedValueOnce({ assets: [{ uri: 'file:///cache/me.jpg', type: 'image/jpeg' }] });
    expect(await pickProfilePhoto('gallery')).toEqual(expect.objectContaining({ uri: 'file:///cache/me.jpg' }));
  });
});

test('an identity-check result notification opens the identity check page', () => {
  expect(notificationTarget('/account/verification')).toEqual({ route: ROUTES.IDENTITY_VERIFICATION, params: {} });
});

describe('signing up after Google', () => {
  let saveEmail;
  beforeEach(() => {
    setUser({ contact: '9876543210' });
    jest.spyOn(profileApi, 'updateMyName').mockResolvedValue({ fullName: 'Asha', email: 'asha@gmail.com', emailVerified: true });
    saveEmail = jest.spyOn(profileApi, 'saveMyEmail').mockResolvedValue({});
  });
  afterEach(() => clearUser());
  const signUp = (email, verifiedEmail) =>
    completeSignUp({ needsProfile: true, needsConsent: false, values: { fullName: 'Asha', email }, consents: {}, verifiedEmail });

  test('the Google-verified email: no link is sent, and it stays verified', async () => {
    const { user, emailNotice } = await signUp('Asha@Gmail.com', 'asha@gmail.com');
    expect(saveEmail).not.toHaveBeenCalled();
    expect(emailNotice).toBeNull();
    expect(user.emailVerified).toBe(true);
  });

  test('any other email still gets a link to confirm it', async () => {
    const { emailNotice } = await signUp('asha@work.com', 'asha@gmail.com');
    expect(saveEmail).toHaveBeenCalledWith('asha@work.com');
    expect(emailNotice).toEqual({ email: 'asha@work.com', sent: true });
  });
});

describe('the report', () => {
  const base = {
    identity: { inspection_id: 'i1' },
    vehicle: { make: 'Honda', model: 'City', mfg_year: 2020 },
    assessment: { grade: 'A', overall_score: 80, coverage_pct: 90 },
    verification: { verification_label: 'TURAG_VERIFIED', turag_verified: true },
    findings: [{ item_code: 'B1', group: 'Exterior', label: 'Body panels', severity: 'MINOR', rectification_cost_minor: 0 }],
    checklist: [
      { item_code: 'B1', label: 'Body panels', severity: 'MINOR', reviewed_from_photos: false },
      { item_code: 'C1', label: 'Chassis number', severity: 'OK', reviewed_from_photos: true },
      { item_code: 'R1', label: 'Pillars', severity: 'OK', reviewed_from_photos: true },
      { item_code: 'E1', label: 'Engine', severity: 'OK' },
    ],
    documents: [],
  };

  test('maps the final value and the items checked from photos', () => {
    const ready = mapReport({ ...base, valuation: { status: 'READY', headline: { value: 41000000 }, confidence: { level: 'HIGH' } } });
    expect(ready.finalValue).toBe(410000);
    expect(ready.photoReviewed).toEqual([
      { code: 'C1', label: 'Chassis number', severity: 'OK' },
      { code: 'R1', label: 'Pillars', severity: 'OK' },
    ]);
    expect(mapReport({ ...base, valuation: { status: 'NOT_READY' } }).finalValue).toBeNull();
  });

  const open = async valuation => {
    jest.spyOn(reportApi, 'getInspectionReport').mockResolvedValue(mapReport({ ...base, valuation }));
    return render(
      <InspectionReport navigation={{ goBack: jest.fn(), navigate: jest.fn() }} route={{ params: { inspectionId: 'i1' } }} />,
    );
  };

  test('only the final estimated value (no price bands), and the OK items checked from photos', async () => {
    const root = await open({ status: 'READY', headline: { value: 41000000 } });
    expect(hasText(root, 'Final estimated value')).toBe(true);
    expect(hasText(root, '₹4,10,000')).toBe(true);
    expect(hasText(root, 'Distress')).toBe(false);
    expect(hasText(root, 'Checked from photos')).toBe(true);
    expect(hasText(root, 'Chassis number')).toBe(true);
    expect(hasText(root, 'Not a physical check')).toBe(true);
  });

  test('no value yet: says the valuation is pending', async () => {
    const root = await open({ status: 'NOT_READY' });
    expect(hasText(root, 'Valuation pending')).toBe(true);
    expect(hasText(root, 'Final estimated value')).toBe(false);
  });
});

describe('an estimate for a car already in the Garage', () => {
  const vehicle = { vehicleId: 'veh_1', registrationNumber: 'MH12AB1234', make: 'Honda', model: 'City' };
  afterEach(() => act(() => clearGarage()));

  test('saved earlier without a value: Save Vehicle gives it this estimate, then View in Garage', async () => {
    await act(async () => {
      await saveToGarage({ vehicle, valuation: null });
    });
    const valuation = { valuationId: 'val_2', estimatedValue: 500000 };
    const root = await render(<SaveVehicleButton navigation={{ navigate: jest.fn() }} vehicle={vehicle} valuation={valuation} />);
    expect(root.findByType(Button).props.title).toBe('Save Vehicle');
    await act(async () => {
      root.findByType(Button).props.onPress();
      await new Promise(r => setTimeout(r, 700));
    });
    expect(root.findByType(Button).props.title).toBe('View in Garage');
  });

  test('saved with a value already: View in Garage straight away', async () => {
    await act(async () => {
      await saveToGarage({ vehicle, valuation: { valuationId: 'val_1', estimatedValue: 480000 } });
    });
    const root = await render(
      <SaveVehicleButton navigation={{ navigate: jest.fn() }} vehicle={vehicle} valuation={{ valuationId: 'val_2' }} />,
    );
    expect(root.findByType(Button).props.title).toBe('View in Garage');
  });
});
