/**
 * The web's newest flows on the app: "List a vehicle" straight to AI Self Inspection,
 * a listing sent back for changes, choosing a dealership, and the optional questions.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ListVehicleStart from '../src/screens/selling/ListVehicleStart/ListVehicleStart';
import MyListing from '../src/screens/selling/MyListing/MyListing';
import HomeInsightsCard from '../src/screens/insights/HomeInsightsCard';
import NpsCard from '../src/screens/insights/NpsCard';
import ValueAccuracyPrompt from '../src/screens/insights/ValueAccuracyPrompt';
import CancelReasonPicker, { sendCancelReason } from '../src/screens/insights/CancelReasonPicker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { InspectionConsent, TierBadge } from '../src/components';
import AboutYou from '../src/screens/auth/AboutYou/AboutYou';
import IdentityExtractCard from '../src/screens/selfInspection/SelfInspection/identity/IdentityExtractCard';
import TierPreview, { TierNote } from '../src/screens/valuation/components/TierPreview';
import ListingReportSummary from '../src/screens/listing/CreateListing/components/ListingReportSummary';
import Profile from '../src/screens/profile/Profile/Profile';
import * as reportApi from '../src/api/services/report.api';
import { mapReport } from '../src/api/mappers/booking';
import { ROUTES } from '../src/navigation/routes';
import { mapMyListing } from '../src/api/mappers/offer';
import { mapNotification } from '../src/api/mappers/notification';
import notificationTarget from '../src/screens/notifications/notificationTarget';
import { LISTING_STATUS } from '../src/screens/account/statuses';
import { clearUser, setUser } from '../src/store/userStore';
import * as valuationApi from '../src/api/services/valuation.api';
import * as sellerListingApi from '../src/api/services/sellerListing.api';
import * as insightsApi from '../src/api/services/insights.api';
import * as garageStore from '../src/store/garageStore';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>);
  });
  await act(async () => {});
  return tree.root;
};
const button = (root, title) => root.findAll(n => n.props.title === title && n.props.onPress)[0];
const hasText = (root, text) =>
  root
    .findAll(n => typeof n.props.children === 'string' || Array.isArray(n.props.children))
    .flatMap(n => [n.props.children].flat())
    .some(c => typeof c === 'string' && c.includes(text));
const chip = (root, label) =>
  root.findAll(n => n.props.accessibilityRole === 'radio' && n.props.onPress).find(n => n.findAll(c => c.props.children === label).length);

beforeEach(() => setUser({ fullName: 'Test User', role: 'individual' }));
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  clearUser();
  jest.restoreAllMocks();
});

describe('List a vehicle', () => {
  const car = { registrationNumber: 'MH12DX5087', vehicleId: 'veh_1', category: 'PASSENGER', make: 'Maruti', model: 'Swift', year: 2020 };
  const nav = () => ({ navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() });
  const find = async (root, plate = 'mh12dx5087') => {
    const field = root.findAll(n => n.props.placeholder === 'e.g. MH12AB1234' && n.props.onChangeText)[0];
    await act(async () => field.props.onChangeText(plate));
    await act(async () => button(root, 'Find my vehicle').props.onPress());
  };

  test('the number, the vehicle, then the inspection: no valuation first', async () => {
    jest.spyOn(valuationApi, 'proposeVehicle').mockResolvedValue(car);
    jest.spyOn(valuationApi, 'confirmVehicle').mockResolvedValue(car);
    const estimate = jest.spyOn(valuationApi, 'estimateValuation');
    const save = jest.spyOn(garageStore, 'saveToGarage').mockResolvedValue({});
    const begin = jest.spyOn(valuationApi, 'startSelfInspection').mockResolvedValue({ inspectionId: 'ins_1' });
    const navigation = nav();
    const root = await render(<ListVehicleStart navigation={navigation} />);

    await find(root);
    expect(hasText(root, 'Is this your vehicle?')).toBe(true);
    // Consent first; the ticked value is what's sent.
    expect(button(root, 'AI Self Inspection').props.disabled).toBe(true);
    await act(async () => root.findByType(InspectionConsent).props.onToggle());
    await act(async () => button(root, 'AI Self Inspection').props.onPress());

    expect(save).toHaveBeenCalledWith({ vehicle: car, valuation: null });
    expect(begin).toHaveBeenCalledWith({ vehicleId: 'veh_1', category: 'PASSENGER', consent: true });
    expect(estimate).not.toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith(ROUTES.SELF_INSPECTION, { inspectionId: 'ins_1', vehicle: car, valuation: null });
  });

  test('saving to the Garage failing does not stop the inspection', async () => {
    jest.spyOn(valuationApi, 'proposeVehicle').mockResolvedValue(car);
    jest.spyOn(valuationApi, 'confirmVehicle').mockResolvedValue(car);
    jest.spyOn(garageStore, 'saveToGarage').mockRejectedValue(new Error('busy'));
    jest.spyOn(valuationApi, 'startSelfInspection').mockResolvedValue({ inspectionId: 'ins_1' });
    const navigation = nav();
    const root = await render(<ListVehicleStart navigation={navigation} />);
    await find(root);
    await act(async () => root.findByType(InspectionConsent).props.onToggle());
    await act(async () => button(root, 'AI Self Inspection').props.onPress());
    expect(navigation.replace).toHaveBeenCalled();
  });

  test('a bad number is refused here; an unknown one offers entering details', async () => {
    const propose = jest.spyOn(valuationApi, 'proposeVehicle');
    const root = await render(<ListVehicleStart navigation={nav()} />);
    await find(root, 'HELLO');
    expect(propose).not.toHaveBeenCalled();
    propose.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 404 }));
    await find(root);
    expect(hasText(root, 'enter the details manually')).toBe(true);
  });

  test('Book an inspector says it is coming soon; "Not my vehicle" goes back', async () => {
    jest.spyOn(valuationApi, 'proposeVehicle').mockResolvedValue(car);
    const navigation = nav();
    const root = await render(<ListVehicleStart navigation={navigation} />);
    await find(root);
    await act(async () => button(root, 'Book an inspector').props.onPress());
    expect(navigation.navigate).not.toHaveBeenCalled();
    // A popup, not a note on the card; OK closes it.
    expect(hasText(root, 'Booking an inspector is coming soon')).toBe(true);
    expect(hasText(root, 'For now, use AI Self Inspection to check your vehicle.')).toBe(true);
    await act(async () => button(root, 'OK').props.onPress());
    expect(hasText(root, 'Booking an inspector is coming soon')).toBe(false);
    const back = root.findAll(n => n.props.accessibilityRole === 'button' && n.props.onPress && n.findAll(c => c.props.children === 'Not my vehicle? Change the number').length)[0];
    await act(async () => back.props.onPress());
    expect(button(root, 'Find my vehicle')).toBeDefined();
  });
});

describe('a listing sent back for changes', () => {
  const raw = {
    listing_id: 'lst_1',
    status: 'CHANGES_REQUESTED',
    vehicle: { make: 'Maruti', model: 'Swift', mfg_year: 2020 },
    ask_price: { amount_minor: 90000000, currency: 'INR' },
    moderation: { reason: 'Price too high' },
    valuation_context: { status: 'READY', headline: { value: 50000000 } },
    version: 3,
  };

  test('the mapper: price editable, withdrawable, resubmittable, not a draft', () => {
    const listing = mapMyListing(raw);
    expect(listing).toMatchObject({ canEditPrice: true, canWithdraw: true, canResubmit: true, canSubmit: false, moderationReason: 'Price too high' });
    expect(LISTING_STATUS.CHANGES_REQUESTED.tone).toBe('warning');
    expect(mapMyListing({ ...raw, status: 'REJECTED' })).toMatchObject({ canEditPrice: false, canResubmit: false, canWithdraw: false });
  });

  test('the page shows why, Turag\'s value, and Resubmit sends it back for review', async () => {
    const listing = mapMyListing(raw);
    jest.spyOn(sellerListingApi, 'getMyListing').mockResolvedValue({ listing, offers: [] });
    const submit = jest.spyOn(sellerListingApi, 'submitListing').mockResolvedValue({ ...listing, status: 'PENDING_REVIEW', canResubmit: false });
    const root = await render(<MyListing navigation={{ navigate: jest.fn(), goBack: jest.fn() }} route={{ params: { listingId: 'lst_1' } }} />);
    ['Turag asked for changes', 'Reason: Price too high', 'Turag valuation:'].forEach(text => expect(hasText(root, text)).toBe(true));
    await act(async () => button(root, 'Resubmit for review').props.onPress());
    expect(submit).toHaveBeenCalledWith('lst_1');
  });

  test('its notifications open the listing', () => {
    expect(mapNotification({ id: 'n1', type: 'listing_needs_changes', created_at: '2026-11-01T00:00:00Z' })).toMatchObject({ category: 'offers' });
    expect(mapNotification({ id: 'n2', type: 'listing_rejected', created_at: '2026-11-01T00:00:00Z' })).toMatchObject({ category: 'offers' });
    expect(notificationTarget('/sell/lst_1')).toEqual({ route: ROUTES.MY_LISTING, params: { listingId: 'lst_1' } });
  });
});

describe('the rest of the web parity', () => {
  test('RC and VIN scans open the camera, not the gallery', async () => {
    launchCamera.mockResolvedValueOnce({ didCancel: true });
    launchImageLibrary.mockClear();
    const root = await render(<IdentityExtractCard embedded inspectionId="ins_1" kind="RC" onConfirm={jest.fn()} />);
    await act(async () => button(root, 'Add RC photo').props.onPress());
    expect(launchCamera).toHaveBeenCalledWith(expect.objectContaining({ mediaType: 'photo', includeBase64: true }));
    expect(launchImageLibrary).not.toHaveBeenCalled();
  });

  test('the tier preview: Budget today, and what Premium needs at this value', async () => {
    let root = await render(<TierPreview />);
    expect(root.findByType(TierBadge).props.tier).toBe('BUDGET');
    act(() => tree.unmount());
    root = await render(<TierNote value={500000} />);
    expect(hasText(root, 'an asking price of Rs 10 lakh or more')).toBe(true);
    act(() => tree.unmount());
    root = await render(<TierNote value={1500000} />);
    expect(hasText(root, 'At this value, grade A')).toBe(true);
  });

  test('About and Turag Verified open from Help; Pricing stays out (a draft on the web)', async () => {
    const navigation = { navigate: jest.fn() };
    const root = await render(<Profile navigation={navigation} />);
    const row = label => root.findAll(n => n.props.label === label && n.props.onPress)[0];
    await act(async () => row('Turag Verified').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.WEB_PAGE, { title: 'Turag Verified', path: '/verified' });
    await act(async () => row('About').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.WEB_PAGE, { title: 'About', path: '/about' });
    expect(row('Pricing')).toBeUndefined();
  });

  test('signing up: the optional questions never hold the user up', async () => {
    const then = [ROUTES.AUTH_SUCCESS, { titleKey: 'auth.accountCreated', next: ROUTES.MAIN_TABS }];
    const navigation = { reset: jest.fn(), getState: () => ({ routes: [] }) };
    jest.spyOn(insightsApi, 'saveProfileAnswers').mockRejectedValue(new Error('down'));
    const root = await render(<AboutYou navigation={navigation} route={{ params: { then } }} />);
    await act(async () => button(root, 'Skip').props.onPress());
    expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: ROUTES.AUTH_SUCCESS, params: then[1] }] });
  });

  test('the listing form shows the report: photos without dents, and the overview', async () => {
    const report = mapReport({
      assessment: { grade: 'A', coverage_pct: 92 },
      odometer_km: 42180,
      owners_declared: 1,
      vehicle: { fuel: 'PETROL' },
      evidence: [
        { media_id: 'm1', shot_code: 'WALK_FRONT', thumb_url: 'https://cdn/m1.jpg' },
        { media_id: 'm2', shot_code: 'WALK_REAR', thumb_url: 'https://cdn/m2.jpg' },
        { media_id: 'm3', shot_code: 'DENT_1', thumb_url: 'https://cdn/m3.jpg' },
        { media_id: 'm4', shot_code: 'WALK_LEFT', thumb_url: null },
      ],
    });
    expect(report.photos.map(p => p.id)).toEqual(['m1', 'm2']);
    jest.spyOn(reportApi, 'getInspectionReport').mockResolvedValue(report);
    const root = await render(<ListingReportSummary inspectionId="ins_1" vehicle={{}} />);
    ['Vehicle report summary', 'Report ready', '1/2', '92%', '42,180 km'].forEach(text => expect(hasText(root, text)).toBe(true));
    // Previous owners + the seller.
    expect(hasText(root, '2')).toBe(true);
    await act(async () => root.findAll(n => n.props.accessibilityLabel === 'Show photo 2' && n.props.onPress)[0].props.onPress());
    expect(hasText(root, '2/2')).toBe(true);
  });

  test('the report failing or no inspection: the summary just is not shown', async () => {
    jest.spyOn(reportApi, 'getInspectionReport').mockRejectedValue(new Error('not ready'));
    let root = await render(<ListingReportSummary inspectionId="ins_1" vehicle={{}} />);
    expect(hasText(root, 'Vehicle report summary')).toBe(false);
    act(() => tree.unmount());
    root = await render(<ListingReportSummary vehicle={{}} />);
    expect(hasText(root, 'Vehicle report summary')).toBe(false);
  });
});

describe('the optional questions', () => {
  test('Home card: only when not answered; save sends the answers; when asked only for buying or selling', async () => {
    jest.spyOn(insightsApi, 'getMyProfileAnswers').mockResolvedValue(null);
    const save = jest.spyOn(insightsApi, 'saveProfileAnswers').mockResolvedValue({});
    const root = await render(<HomeInsightsCard />);
    expect(hasText(root, 'Help us improve Turag')).toBe(true);
    await act(async () => button(root, 'Answer now').props.onPress());
    // One question at a time.
    expect(hasText(root, 'Question 1 of 3')).toBe(true);
    expect(hasText(root, 'What brings you')).toBe(false);
    await act(async () => chip(root, 'Google search').props.onPress());
    await act(async () => button(root, 'Next').props.onPress());
    expect(hasText(root, 'Question 2 of 3')).toBe(true);
    await act(async () => chip(root, 'Sell my car').props.onPress());
    expect(button(root, 'Save and continue')).toBeUndefined();
    await act(async () => button(root, 'Next').props.onPress());
    expect(hasText(root, 'When are you planning')).toBe(true);
    await act(async () => chip(root, 'This month').props.onPress());
    await act(async () => button(root, 'Save and continue').props.onPress());
    expect(save).toHaveBeenCalledWith({ heard_from: 'GOOGLE', heard_from_other: null, intents: ['SELL'], timeline: 'THIS_MONTH' });
    expect(hasText(root, 'Your answers help us make Turag better.')).toBe(true);
  });

  test('questions: not buying or selling ends at the second; saving needs an answer; back keeps them', async () => {
    jest.spyOn(insightsApi, 'getMyProfileAnswers').mockResolvedValue(null);
    const save = jest.spyOn(insightsApi, 'saveProfileAnswers').mockResolvedValue({});
    const root = await render(<HomeInsightsCard />);
    await act(async () => button(root, 'Answer now').props.onPress());
    await act(async () => button(root, 'Next').props.onPress());
    expect(button(root, 'Save and continue').props.disabled).toBe(true);
    await act(async () => chip(root, 'Just looking around').props.onPress());
    expect(button(root, 'Save and continue').props.disabled).toBe(false);
    await act(async () => root.findAll(n => n.props.accessibilityRole === 'button' && n.props.onPress && n.findAll(c => c.props.children === 'Go back').length)[0].props.onPress());
    expect(hasText(root, 'Question 1 of 3')).toBe(true);
    await act(async () => button(root, 'Next').props.onPress());
    expect(chip(root, 'Just looking around').props.accessibilityState.selected).toBe(true);
    await act(async () => button(root, 'Save and continue').props.onPress());
    expect(save).toHaveBeenCalledWith({ heard_from: null, heard_from_other: null, intents: ['EXPLORE'], timeline: null });
  });

  test('Home card: hidden when already answered or skipped, and when the lookup fails', async () => {
    jest.spyOn(insightsApi, 'getMyProfileAnswers').mockResolvedValueOnce({ skipped: true }).mockRejectedValueOnce(new Error('down'));
    let root = await render(<HomeInsightsCard />);
    expect(hasText(root, 'Help us improve Turag')).toBe(false);
    act(() => tree.unmount());
    root = await render(<HomeInsightsCard />);
    expect(hasText(root, 'Help us improve Turag')).toBe(false);
  });

  test('value accuracy: one tap sends it, then thanks', async () => {
    const send = jest.spyOn(insightsApi, 'submitFeedback').mockResolvedValue({});
    const root = await render(<ValueAccuracyPrompt valuationId="val_1" />);
    await act(async () => chip(root, 'About right').props.onPress());
    expect(send).toHaveBeenCalledWith({ kind: 'VALUE_ACCURACY', subject_id: 'val_1', choice: 'ABOUT_RIGHT' });
    expect(hasText(root, 'Thanks for telling us.')).toBe(true);
  });

  test('recommend score: asked once per order; sends the score and comment', async () => {
    const check = jest.spyOn(insightsApi, 'getMyFeedback').mockResolvedValueOnce(null).mockResolvedValueOnce({ score: 9 });
    const send = jest.spyOn(insightsApi, 'submitFeedback').mockResolvedValue({});
    let root = await render(<NpsCard orderId="ord_1" />);
    expect(check).toHaveBeenCalledWith('NPS', 'ord_1');
    await act(async () => root.findAll(n => n.props.accessibilityLabel === '9 out of 10' && n.props.onPress)[0].props.onPress());
    await act(async () => button(root, 'Send').props.onPress());
    expect(send).toHaveBeenCalledWith({ kind: 'NPS', subject_id: 'ord_1', score: 9, comment: null });
    expect(hasText(root, 'Your rating helps us')).toBe(true);
    act(() => tree.unmount());
    root = await render(<NpsCard orderId="ord_2" />);
    expect(hasText(root, 'How likely are you')).toBe(false);
  });

  test('cancel reason: optional, sent only after the cancel, and a failure changes nothing', async () => {
    const send = jest.spyOn(insightsApi, 'submitFeedback').mockRejectedValue(new Error('down'));
    const change = jest.fn();
    const root = await render(<CancelReasonPicker onChange={change} />);
    await act(async () => chip(root, 'The price').props.onPress());
    expect(change).toHaveBeenLastCalledWith({ choice: 'PRICE', comment: '' });
    sendCancelReason('bkg_1', null);
    expect(send).not.toHaveBeenCalled();
    sendCancelReason('bkg_1', { choice: 'PRICE', comment: '  ' });
    expect(send).toHaveBeenCalledWith({ kind: 'BOOKING_CANCEL_REASON', subject_id: 'bkg_1', choice: 'PRICE', comment: null });
  });
});
