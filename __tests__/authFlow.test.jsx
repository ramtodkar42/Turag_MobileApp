/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Login from '../src/screens/auth/Login/Login';
import VerifyOtp from '../src/screens/auth/VerifyOtp/VerifyOtp';
import CompleteProfile from '../src/screens/auth/CompleteProfile/CompleteProfile';
import AuthSuccess from '../src/screens/auth/AuthSuccess/AuthSuccess';
import CheckRow from '../src/components/common/CheckRow';
import { ROUTES } from '../src/navigation/routes';
import { clearUser, getUser, setUser } from '../src/store/userStore';
import { endSession } from '../src/api/session';
import { loadSession } from '../src/api/tokenStorage';
import { ApiError } from '../src/api/client';
import * as authApi from '../src/api/services/auth.api';
import * as profileApi from '../src/api/services/profile.api';

// A signed-in session as verifyLoginOtp returns it.
const session = (user, consentRequired = false) => ({
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresIn: 900,
  user: { id: 'usr_1', email: '', roles: ['consumer'], role: 'individual', ...user },
  consentRequired,
});

// Order the account calls were made in (consents must come before the profile).
let mockCalls = [];

jest.mock('../src/api/services/auth.api', () => ({
  sendLoginOtp: jest.fn(() =>
    Promise.resolve({ otpToken: 'otp-token-1', expiresIn: 300, resendAfter: 30, devHint: '1234' }),
  ),
  verifyLoginOtp: jest.fn(),
  refreshSession: jest.fn(),
  revokeSession: jest.fn(() => Promise.resolve()),
}));

jest.mock('../src/api/services/profile.api', () => ({
  acceptConsents: jest.fn(() => {
    mockCalls.push('consents');
    return Promise.resolve([]);
  }),
  updateMyName: jest.fn(name => {
    mockCalls.push('name');
    return Promise.resolve({ id: 'usr_1', fullName: name, email: '', roles: ['consumer'], role: 'individual' });
  }),
  saveMyEmail: jest.fn(() => {
    mockCalls.push('email');
    return Promise.resolve({ sent: true });
  }),
  getMe: jest.fn(() => {
    mockCalls.push('me');
    return Promise.resolve({
      user: { id: 'usr_2', fullName: 'Isha Inspector', roles: ['inspector'], role: 'inspector' },
    });
  }),
}));

// Status bar switching needs a real navigator; not what these tests check.
jest.mock('../src/hooks/useStatusBarStyle', () => jest.fn());

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const makeNavigation = () => ({
  navigate: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  popTo: jest.fn(),
  goBack: jest.fn(),
  canGoBack: () => true,
});

let mounted = [];

const render = async element => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>,
    );
  });
  mounted.push(tree);
  return tree.root;
};

const byProp = (root, prop, value) => root.findAll(n => n.props[prop] === value)[0];

const type = async (root, prop, value, text) => {
  await act(async () => byProp(root, prop, value).props.onChangeText(text));
};

const press = async (root, title) => {
  await act(async () => byProp(root, 'title', title).props.onPress());
};

// Typing the 4th digit verifies straight away.
const enterOtp = async (root, otp) => {
  await act(async () => byProp(root, 'maxLength', 4).props.onChangeText(otp));
};

const phoneRoute = phone => ({
  params: { channel: 'phone', phone, otpToken: 'otp-token-1', resendAfter: 30 },
});

// Unmount so timers (OTP countdown) stop before Jest tears down.
afterEach(async () => {
  act(() => mounted.forEach(tree => tree.unmount()));
  mounted = [];
  mockCalls = [];
  jest.clearAllMocks();
  clearUser();
  await endSession();
});

test('Login blocks an invalid mobile number', async () => {
  const navigation = makeNavigation();
  const root = await render(<Login navigation={navigation} />);

  await type(root, 'placeholder', 'Enter your number', '98765');
  await press(root, 'Get OTP');
  expect(byProp(root, 'error', 'Enter your 10-digit mobile number')).toBeDefined();

  await type(root, 'placeholder', 'Enter your number', '1234567890');
  await press(root, 'Get OTP');
  expect(authApi.sendLoginOtp).not.toHaveBeenCalled();
  expect(navigation.navigate).not.toHaveBeenCalled();
});

test('Login sends the OTP and opens Verify', async () => {
  const navigation = makeNavigation();
  const root = await render(<Login navigation={navigation} />);

  await type(root, 'placeholder', 'Enter your number', '98765 43210');
  await press(root, 'Get OTP');

  expect(authApi.sendLoginOtp).toHaveBeenCalledWith({ phone: '9876543210' });
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.VERIFY_OTP, {
    channel: 'phone',
    phone: '9876543210',
    otpToken: 'otp-token-1',
    resendAfter: 30,
    devHint: '1234',
  });
});

test('Mobile OTP: an existing user signs in, is remembered, and sees Login Successful', async () => {
  authApi.verifyLoginOtp.mockResolvedValueOnce(session({ fullName: 'Raj Sonawane' }));
  const navigation = makeNavigation();
  const root = await render(<VerifyOtp navigation={navigation} route={phoneRoute('9876543211')} />);

  expect(byProp(root, 'title', 'Verify').props.disabled).toBe(true);
  await enterOtp(root, '3579');

  expect(authApi.verifyLoginOtp).toHaveBeenCalledWith({
    phone: '9876543211',
    otpToken: 'otp-token-1',
    otp: '3579',
  });
  expect(navigation.reset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: ROUTES.AUTH_SUCCESS, params: { titleKey: 'auth.loginSuccessful', next: ROUTES.MAIN_TABS } }],
  });
  expect(getUser()).toEqual(expect.objectContaining({ fullName: 'Raj Sonawane', contact: '9876543211' }));
  // Kept in the keychain so the next app start opens Home directly.
  expect(await loadSession()).toEqual(
    expect.objectContaining({ refreshToken: 'refresh-1', pending: null }),
  );
});

test('Mobile OTP: typing the 4th digit verifies once, even if Verify is also tapped', async () => {
  let finish;
  authApi.verifyLoginOtp.mockImplementationOnce(() => new Promise(r => (finish = r)));
  const navigation = makeNavigation();
  const root = await render(<VerifyOtp navigation={navigation} route={phoneRoute('9876543211')} />);

  await enterOtp(root, '3579');
  await press(root, 'Verify');
  await act(async () => finish(session({ fullName: 'Raj' })));

  expect(authApi.verifyLoginOtp).toHaveBeenCalledTimes(1);
  expect(navigation.reset).toHaveBeenCalledTimes(1);
});

test('Mobile OTP: a wrong code shows the message and lets the user try again', async () => {
  authApi.verifyLoginOtp.mockRejectedValueOnce(new Error('Invalid code. Please try again.'));
  const navigation = makeNavigation();
  const root = await render(<VerifyOtp navigation={navigation} route={phoneRoute('9876543211')} />);

  await enterOtp(root, '0000');
  expect(root.findAll(n => n.props.children === 'Invalid code. Please try again.').length).toBeGreaterThan(0);
  expect(navigation.reset).not.toHaveBeenCalled();

  authApi.verifyLoginOtp.mockResolvedValueOnce(session({ fullName: 'Raj' }));
  await enterOtp(root, '1234');
  expect(navigation.reset).toHaveBeenCalled();
});

test('Mobile OTP: resend uses the new OTP token', async () => {
  authApi.sendLoginOtp.mockResolvedValueOnce({ otpToken: 'otp-token-2', resendAfter: 30 });
  authApi.verifyLoginOtp.mockResolvedValueOnce(session({ fullName: 'Raj' }));
  const navigation = makeNavigation();
  const route = { params: { ...phoneRoute('9876543211').params, resendAfter: 0 } };
  const root = await render(<VerifyOtp navigation={navigation} route={route} />);

  const resend = root.findAll(n => n.props.children === 'Resend OTP' && n.props.onPress)[0];
  await act(async () => resend.props.onPress());
  expect(authApi.sendLoginOtp).toHaveBeenCalledWith({ phone: '9876543211' });

  await enterOtp(root, '2468');
  expect(authApi.verifyLoginOtp).toHaveBeenCalledWith(expect.objectContaining({ otpToken: 'otp-token-2' }));
});

test('Mobile OTP: an inspection officer goes to the inspector app, never to sign-up', async () => {
  authApi.verifyLoginOtp.mockResolvedValueOnce(
    session({ fullName: '', roles: ['inspector', 'consumer'], role: 'inspector' }),
  );
  const navigation = makeNavigation();
  const root = await render(<VerifyOtp navigation={navigation} route={phoneRoute('9000000002')} />);

  await enterOtp(root, '1111');

  expect(navigation.reset).toHaveBeenCalledWith({
    index: 0,
    routes: [
      { name: ROUTES.AUTH_SUCCESS, params: { titleKey: 'auth.loginSuccessful', next: ROUTES.INSPECTOR_TABS } },
    ],
  });
  expect(getUser()).toEqual(expect.objectContaining({ role: 'inspector', contact: '9000000002' }));
});

test('Mobile OTP: a new number goes to Create Account (signed in, sign-up pending)', async () => {
  authApi.verifyLoginOtp.mockResolvedValueOnce(session({ fullName: '' }, true));
  const navigation = makeNavigation();
  const root = await render(<VerifyOtp navigation={navigation} route={phoneRoute('9876543210')} />);

  await enterOtp(root, '1234');

  const pending = { needsConsent: true, needsProfile: true };
  expect(navigation.reset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: ROUTES.COMPLETE_PROFILE, params: { phone: '9876543210', ...pending } }],
  });
  // If the app is closed now, it reopens on Create Account.
  expect(await loadSession()).toEqual(expect.objectContaining({ pending }));
});

test('Mobile OTP: an inspector who owes the terms only sees the terms', async () => {
  authApi.verifyLoginOtp.mockResolvedValueOnce(
    session({ fullName: 'Isha', roles: ['inspector'], role: 'inspector' }, true),
  );
  const navigation = makeNavigation();
  const root = await render(<VerifyOtp navigation={navigation} route={phoneRoute('9000000002')} />);

  await enterOtp(root, '1234');

  expect(navigation.reset).toHaveBeenCalledWith({
    index: 0,
    routes: [
      {
        name: ROUTES.COMPLETE_PROFILE,
        params: { phone: '9000000002', needsConsent: true, needsProfile: false },
      },
    ],
  });
});

test('Create Account: Verify marks a valid email verified at once (no OTP screen)', async () => {
  const navigation = makeNavigation();
  const route = { params: { phone: '9876543210' } };
  const root = await render(<CompleteProfile navigation={navigation} route={route} />);
  const isVerified = () => root.findAll(n => n.props.accessibilityLabel === 'Email verified').length > 0;

  await type(root, 'label', 'Email', 'raj@');
  await press(root, 'Verify');
  expect(byProp(root, 'error', 'Enter a valid email address')).toBeDefined();
  expect(isVerified()).toBe(false);

  await type(root, 'label', 'Email', 'raj@gmail.com');
  await press(root, 'Verify');
  expect(isVerified()).toBe(true);
  expect(navigation.navigate).not.toHaveBeenCalled();

  // Changing the address needs Verify again.
  await type(root, 'label', 'Email', 'raj.s@gmail.com');
  expect(isVerified()).toBe(false);
});

const tickConsents = async (root, count) => {
  const rows = root.findAllByType(CheckRow);
  for (const row of rows.slice(0, count)) {
    await act(async () => row.props.onToggle());
  }
};

test('Create Account needs a verified email, a choice and the required consents', async () => {
  const navigation = makeNavigation();
  const route = { params: { phone: '9876543210' } };
  const root = await render(<CompleteProfile navigation={navigation} route={route} />);

  // Accept & Continue stays off until Terms + Privacy are ticked.
  expect(byProp(root, 'title', 'Accept & Continue').props.disabled).toBe(true);
  await tickConsents(root, 2);
  expect(byProp(root, 'title', 'Accept & Continue').props.disabled).toBe(false);

  await type(root, 'label', 'Name', 'Raj Sonawane');
  await type(root, 'label', 'Email', 'raj@gmail.com');
  await press(root, 'Accept & Continue');

  expect(byProp(root, 'error', 'Please verify your email')).toBeDefined();
  expect(root.findAll(n => n.props.children === 'Please choose one option').length).toBeGreaterThan(0);
  expect(profileApi.acceptConsents).not.toHaveBeenCalled();
});

test('Create Account: saves consents, then name, then email, and opens Home', async () => {
  act(() => setUser({ contact: '9876543210', role: 'individual' }));
  const navigation = makeNavigation();
  const route = { params: { phone: '9876543210' } };
  const root = await render(<CompleteProfile navigation={navigation} route={route} />);

  await type(root, 'label', 'Name', 'Raj Sonawane');
  await type(root, 'label', 'Email', 'raj@gmail.com');
  await press(root, 'Verify');
  expect(root.findAll(n => n.props.accessibilityLabel === 'Email verified').length).toBeGreaterThan(0);

  await act(async () => byProp(root, 'label', "I'm a dealer").props.onPress());
  await tickConsents(root, 2);
  await press(root, 'Accept & Continue');

  expect(mockCalls).toEqual(['consents', 'name', 'email']);
  expect(profileApi.acceptConsents).toHaveBeenCalledWith({ terms: true, privacy: true, marketing: false });
  expect(profileApi.updateMyName).toHaveBeenCalledWith('Raj Sonawane', { phone: '9876543210' });
  expect(profileApi.saveMyEmail).toHaveBeenCalledWith('raj@gmail.com');
  expect(navigation.reset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: ROUTES.AUTH_SUCCESS, params: { titleKey: 'auth.accountCreated', next: ROUTES.MAIN_TABS } }],
  });
  expect(getUser()).toEqual(
    expect.objectContaining({
      fullName: 'Raj Sonawane',
      email: 'raj@gmail.com',
      purpose: 'dealer',
      contact: '9876543210',
    }),
  );
});

test('Create Account: an email used by another account shows on the Email field', async () => {
  profileApi.saveMyEmail.mockRejectedValueOnce(
    new ApiError({ status: 409, code: 'EMAIL_IN_USE', message: 'in use' }),
  );
  const navigation = makeNavigation();
  const route = { params: { phone: '9876543210' } };
  const root = await render(<CompleteProfile navigation={navigation} route={route} />);

  await type(root, 'label', 'Name', 'Raj Sonawane');
  await type(root, 'label', 'Email', 'raj@gmail.com');
  await press(root, 'Verify');
  await act(async () => byProp(root, 'label', "I'm a dealer").props.onPress());
  await tickConsents(root, 2);
  await press(root, 'Accept & Continue');

  expect(byProp(root, 'error', 'This email is already used by another account.')).toBeDefined();
  expect(navigation.reset).not.toHaveBeenCalled();
});

test('Terms only (e.g. an inspector): no name or email fields, then their home', async () => {
  const navigation = makeNavigation();
  const route = { params: { phone: '9000000002', needsConsent: true, needsProfile: false } };
  const root = await render(<CompleteProfile navigation={navigation} route={route} />);

  expect(root.findAll(n => n.props.label === 'Name')).toHaveLength(0);
  expect(root.findAll(n => n.props.label === 'Email')).toHaveLength(0);
  await tickConsents(root, 2);
  await press(root, 'Accept & Continue');

  expect(mockCalls).toEqual(['consents', 'me']);
  expect(profileApi.updateMyName).not.toHaveBeenCalled();
  expect(navigation.reset).toHaveBeenCalledWith({
    index: 0,
    routes: [
      { name: ROUTES.AUTH_SUCCESS, params: { titleKey: 'auth.loginSuccessful', next: ROUTES.INSPECTOR_TABS } },
    ],
  });
});

test('Back on Create Account signs out and returns to Login (use another number)', async () => {
  authApi.verifyLoginOtp.mockResolvedValueOnce(session({ fullName: '' }, true));
  const otpRoot = await render(<VerifyOtp navigation={makeNavigation()} route={phoneRoute('9876543210')} />);
  await enterOtp(otpRoot, '1234');
  expect(await loadSession()).not.toBeNull();

  const navigation = makeNavigation();
  const root = await render(
    <CompleteProfile navigation={navigation} route={{ params: { phone: '9876543210' } }} />,
  );
  const header = root.findAll(n => typeof n.props.onBack === 'function')[0];
  await act(async () => header.props.onBack());

  expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: ROUTES.LOGIN }] });
  expect(authApi.revokeSession).toHaveBeenCalledWith('refresh-1');
  expect(await loadSession()).toBeNull();
  expect(getUser()).toBeNull();
});

test('Success screen shows its title, then opens Home after 2 seconds', async () => {
  jest.useFakeTimers();
  const navigation = makeNavigation();
  const root = await render(
    <AuthSuccess navigation={navigation} route={{ params: { title: 'Login Successful' } }} />,
  );
  expect(root.findAll(n => n.props.title === 'Login Successful').length).toBeGreaterThan(0);

  act(() => jest.advanceTimersByTime(1999));
  expect(navigation.replace).not.toHaveBeenCalled();

  act(() => jest.advanceTimersByTime(1));
  expect(navigation.replace).toHaveBeenCalledWith(ROUTES.MAIN_TABS);
  jest.useRealTimers();
});

test('Success screen opens the inspector app for inspectors', async () => {
  jest.useFakeTimers();
  const navigation = makeNavigation();
  const params = { titleKey: 'auth.loginSuccessful', next: ROUTES.INSPECTOR_TABS };
  await render(<AuthSuccess navigation={navigation} route={{ params }} />);

  act(() => jest.advanceTimersByTime(2000));
  expect(navigation.replace).toHaveBeenCalledWith(ROUTES.INSPECTOR_TABS);
  jest.useRealTimers();
});

test('OTP boxes: 6 when the server sends a test code (devHint), 4 otherwise', async () => {
  jest.useFakeTimers();
  authApi.verifyLoginOtp.mockResolvedValueOnce(session({ fullName: 'Raj' }));
  const navigation = makeNavigation();
  const route = { params: { ...phoneRoute('9876543211').params, devHint: '482913' } };
  const root = await render(<VerifyOtp navigation={navigation} route={route} />);

  expect(root.findAll(n => n.props.maxLength === 6).length).toBeGreaterThan(0);
  expect(root.findAll(n => n.props.children?.includes?.(6)).length).toBeGreaterThan(0);

  // 4 digits are not enough on the test server...
  await act(async () => byProp(root, 'maxLength', 6).props.onChangeText('4829'));
  expect(authApi.verifyLoginOtp).not.toHaveBeenCalled();
  // ...autofill leaves what the user is typing alone...
  await act(async () => jest.advanceTimersByTime(1000));
  expect(byProp(root, 'maxLength', 6).props.value).toBe('4829');
  // ...the 6th digit verifies.
  await act(async () => byProp(root, 'maxLength', 6).props.onChangeText('482913'));
  expect(authApi.verifyLoginOtp).toHaveBeenCalledWith(expect.objectContaining({ otp: '482913' }));
  jest.useRealTimers();

  const plain = await render(<VerifyOtp navigation={makeNavigation()} route={phoneRoute('9876543211')} />);
  expect(plain.findAll(n => n.props.maxLength === 4).length).toBeGreaterThan(0);
  expect(plain.findAll(n => n.props.maxLength === 6)).toHaveLength(0);
});

test('OTP autofill: the test server code fills the boxes by itself and verifies', async () => {
  jest.useFakeTimers();
  authApi.verifyLoginOtp.mockResolvedValueOnce(session({ fullName: 'Raj' }));
  const navigation = makeNavigation();
  const route = { params: { ...phoneRoute('9876543211').params, devHint: '482913' } };
  const root = await render(<VerifyOtp navigation={navigation} route={route} />);

  // The screen shows first, empty...
  expect(byProp(root, 'maxLength', 6).props.value).toBe('');
  await act(async () => jest.advanceTimersByTime(300));
  expect(authApi.verifyLoginOtp).not.toHaveBeenCalled();

  // ...then the code arrives and verifies (no tap).
  await act(async () => jest.advanceTimersByTime(400));
  expect(byProp(root, 'maxLength', 6).props.value).toBe('482913');
  expect(authApi.verifyLoginOtp).toHaveBeenCalledWith(expect.objectContaining({ otp: '482913' }));
  expect(navigation.reset).toHaveBeenCalled();
  jest.useRealTimers();
});

test('OTP fields tell the phone they take a one-time code (SMS autofill)', async () => {
  const root = await render(<VerifyOtp navigation={makeNavigation()} route={phoneRoute('9876543211')} />);
  const input = byProp(root, 'maxLength', 4);
  expect(input.props.autoComplete).toBe('sms-otp'); // Android
  expect(input.props.textContentType).toBe('oneTimeCode'); // iOS
});
