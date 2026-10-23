/**
 * Profile extras, as the web: the profile photo saved on the account, Identity
 * verification from Profile, and the seller's "Preview as a buyer".
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Badge, Button } from '../src/components';
import IdentityVerification from '../src/screens/profile/IdentityVerification/IdentityVerification';
import ListingPreview from '../src/screens/selling/ListingPreview/ListingPreview';
import { avatarImageSource, uploadMyAvatar } from '../src/api/services/profile.api';
import { endSession, startSession } from '../src/api/session';
import { mapUser } from '../src/api/mappers/user';
import { mapMyListing } from '../src/api/mappers/offer';
import { ROUTES } from '../src/navigation/routes';
import { USE_REAL_API } from '../src/api/config';

jest.mock('../src/api/services/verification.api', () => ({
  ...jest.requireActual('../src/api/services/verification.api'),
  getMyVerification: jest.fn(async () => null),
}));
jest.mock('../src/api/services/report.api', () => ({
  ...jest.requireActual('../src/api/services/report.api'),
  getInspectionReport: jest.fn(async () => ({ grade: 'A', gradeNotReady: false, score: 82, issues: 2 })),
}));
// The status page reloads when it comes back into view; here, once after mounting.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});
const verificationApi = require('../src/api/services/verification.api');
const reportApi = require('../src/api/services/report.api');

const metrics = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>);
  });
  return tree.root;
};
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;
const button = (root, title) => root.findAllByType(Button).find(b => b.props.title === title);
const nav = () => ({ navigate: jest.fn(), goBack: jest.fn() });

afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
});

describe('profile photo on the account', () => {
  const reply = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify(body)),
    blob: () => Promise.resolve({ size: 1000 }),
  });
  let originalFetch;
  const authBefore = USE_REAL_API.auth;
  beforeEach(async () => {
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

  test('the photo is sent as a JPEG to /me/avatar and the user comes back with its avatarUrl', async () => {
    global.fetch
      .mockResolvedValueOnce(reply(200, {})) // reading the picked file
      .mockResolvedValueOnce(
        reply(200, { user: { id: 'u1', name: 'Ram', roles: [], avatar_url: 'avatars/u1/2.jpg' }, consents_summary: [] }),
      );
    const user = await uploadMyAvatar({ uri: 'file:///photo.jpg', type: 'image/jpeg' }, { phone: '9876543210' });
    const [url, init] = global.fetch.mock.calls[1];
    expect(url).toMatch(/\/me\/avatar$/);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('image/jpeg');
    expect(init.headers.Authorization).toBe('Bearer access-1');
    expect(user).toMatchObject({ avatarUrl: 'avatars/u1/2.jpg', contact: '9876543210' });
  });

  test('the image source carries the login token; a new photo gets a new address', async () => {
    const source = await avatarImageSource('avatars/u1/2.jpg');
    expect(source.uri).toMatch(/\/me\/avatar\?v=avatars%2Fu1%2F2\.jpg$/);
    expect(source.headers.Authorization).toBe('Bearer access-1');
    expect(await avatarImageSource(null)).toBeNull();
    expect(mapUser({ avatar_url: null }).avatarUrl).toBeNull();
  });
});

describe('Identity verification from Profile', () => {
  test('not sent yet: "Verify your identity" opens the form', async () => {
    const navigation = nav();
    const root = await render(<IdentityVerification navigation={navigation} />);
    expect(hasText(root, 'Not verified yet')).toBe(true);
    await act(async () => button(root, 'Verify your identity').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.VERIFY_IDENTITY);
  });

  test('rejected: the reason and "Verify again"; under review: just the status', async () => {
    verificationApi.getMyVerification.mockResolvedValueOnce({
      status: 'REJECTED',
      docType: 'PAN',
      docMasked: 'XXXXXX234F',
      rejectionReason: 'Photo is blurry',
      submittedAt: null,
    });
    let root = await render(<IdentityVerification navigation={nav()} />);
    expect(root.findByType(Badge).props.label).toBe('Not approved');
    expect(hasText(root, 'Reason: Photo is blurry')).toBe(true);
    expect(button(root, 'Verify again')).toBeDefined();
    act(() => tree.unmount());

    verificationApi.getMyVerification.mockResolvedValueOnce({ status: 'PENDING_REVIEW', docType: 'AADHAAR', docMasked: '' });
    root = await render(<IdentityVerification navigation={nav()} />);
    expect(root.findByType(Badge).props.label).toBe('Under review');
    expect(button(root, 'Verify again')).toBeUndefined();
  });
});

describe('Preview as a buyer', () => {
  const listing = mapMyListing({
    listing_id: 'lst_1',
    status: 'DRAFT',
    vehicle: { make: 'Hyundai', model: 'Creta', variant: null, mfg_year: 2022 },
    ask_price: { amount_minor: 119000000, currency: 'INR' },
    seller_note: 'Single owner.',
    location: { city: 'Pune', state: 'Maharashtra', locality: 'Baner' },
    inspection_id: 'insp_1',
    verification: { verification_label: 'SELF_DECLARED_UNVERIFIED', turag_verified: false },
    moderation: { reason: null },
    view_count: 0,
    version: 1,
  });

  test('the listing card, where it is, the note and the report summary - full report one tap away', async () => {
    const navigation = nav();
    const root = await render(<ListingPreview navigation={navigation} route={{ params: { listing } }} />);
    expect(hasText(root, 'Hyundai Creta 2022')).toBe(true);
    expect(hasText(root, 'Baner, Pune, Maharashtra')).toBe(true);
    expect(hasText(root, 'Single owner.')).toBe(true);
    expect(root.findByType(Badge).props.label).toBe('Self-declared');
    expect(reportApi.getInspectionReport).toHaveBeenCalledWith('insp_1');
    expect(hasText(root, '82/100')).toBe(true);
    await act(async () => button(root, 'View full report').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.INSPECTION_REPORT, { inspectionId: 'insp_1' });
  });

  test('no inspection: says buyers see it as self-declared and unverified', async () => {
    const root = await render(
      <ListingPreview navigation={nav()} route={{ params: { listing: { ...listing, inspectionId: null } } }} />,
    );
    expect(hasText(root, 'This listing has no inspection report.')).toBe(true);
  });
});
