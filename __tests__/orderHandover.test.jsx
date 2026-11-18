/**
 * The order after the token (main 15): the buyer confirms the handover by the seller's
 * QR or its code (ADR-0097), the transfer documents stay open after it (ADR-0098), and
 * the buyer and seller chat on the order (ADR-0096).
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TextInput } from 'react-native';
import { Button, CheckRow, QrCode, TextField } from '../src/components';
import * as handoverApi from '../src/api/services/handover.api';
import * as offerApi from '../src/api/services/offer.api';
import { endSession, startSession } from '../src/api/session';
import HandoverQrPanel from '../src/screens/selling/MyListing/components/HandoverQrPanel';
import HandoverConfirm from '../src/screens/offers/HandoverConfirm/HandoverConfirm';
import HandoverCodeEntry from '../src/screens/offers/components/HandoverCodeEntry';
import HandoverScan from '../src/screens/offers/HandoverScan/HandoverScan';
import OrderChat from '../src/screens/offers/OrderChat/OrderChat';
import { orderChatVisible } from '../src/screens/offers/components/OrderChatButton';
import { ROUTES } from '../src/navigation/routes';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>);
  });
  await act(async () => {});
  return tree.root;
};
const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: () => Promise.resolve(JSON.stringify(body)),
});
const call = i => {
  const [url, init = {}] = global.fetch.mock.calls[i];
  return { url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : undefined };
};
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;
const button = (root, title) => root.findAllByType(Button).find(b => b.props.title === title);
const flush = async () => act(async () => {});

let originalFetch;
beforeEach(async () => {
  originalFetch = global.fetch;
  global.fetch = jest.fn();
  await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
});
afterEach(async () => {
  act(() => tree?.unmount());
  tree = null;
  global.fetch = originalFetch;
  jest.restoreAllMocks();
  jest.useRealTimers();
  await endSession();
});

describe('handover API', () => {
  test('the QR link and reading its token back; anything else is not a handover code', () => {
    const token = 'abcdefghijklmnopqrstuvwxyz012345';
    const value = handoverApi.handoverQrValue(token);
    expect(value).toMatch(/\/handover#t=abcdefghijklmnopqrstuvwxyz012345$/);
    expect(handoverApi.handoverTokenFromQr(value)).toBe(token);
    expect(handoverApi.handoverTokenFromQr('https://example.com/pay?x=1')).toBeNull();
    expect(handoverApi.handoverTokenFromQr('')).toBeNull();
  });

  test('the typed code: 6 letters / digits, upper case', () => {
    expect(handoverApi.cleanHandoverCode(' ab-c 2d9z77 ')).toBe('ABC2D9');
  });

  test('start, preview (by QR or by order + code), confirm with all three ticks', async () => {
    global.fetch
      .mockResolvedValueOnce(reply(201, { handover: { token: 'tok_1234567890abcdefghij', short_code: 'K7PQ2M', expires_at: '2026-11-18T10:10:00Z' } }))
      .mockResolvedValueOnce(reply(200, { preview: { order_id: 'ord_1', vehicle: { make: 'Maruti', model: 'Swift', mfg_year: 2019 }, agreed_price: { amount_minor: 45000000, currency: 'INR' }, expires_at: '2026-11-18T10:10:00Z' } }))
      .mockResolvedValueOnce(reply(200, { order: { order_id: 'ord_1', status: 'HANDED_OVER', agreed_price: { amount_minor: 45000000, currency: 'INR' } } }));
    const started = await handoverApi.startHandover('ord_1');
    expect(started).toMatchObject({ token: 'tok_1234567890abcdefghij', shortCode: 'K7PQ2M' });
    expect(call(0).url).toMatch(/\/orders\/ord_1\/handover\/start$/);

    const preview = await handoverApi.previewHandover({ orderId: 'ord_1', shortCode: 'k7pq2m' });
    expect(call(1).body).toEqual({ order_id: 'ord_1', short_code: 'K7PQ2M' });
    expect(preview).toMatchObject({ orderId: 'ord_1', agreedPrice: 450000, vehicle: { make: 'Maruti', model: 'Swift', year: 2019 } });

    const order = await handoverApi.confirmHandover({ token: 'tok_1234567890abcdefghij' }, { vehicle: true, keys: true, documents: true });
    expect(call(2).url).toMatch(/\/handover\/confirm$/);
    expect(call(2).body).toEqual({ token: 'tok_1234567890abcdefghij', checklist: { vehicle: true, keys: true, documents: true } });
    expect(order.status).toBe('HANDED_OVER');
  });

  test("the server's refusals in the app's words", async () => {
    const key = { orderId: 'ord_1', shortCode: 'AAAAAA' };
    global.fetch.mockResolvedValueOnce(reply(422, { error: { code: 'HANDOVER_CODE_INVALID', message: 'That code is not right. 3 tries left.' } }));
    await expect(handoverApi.previewHandover(key)).rejects.toMatchObject({ message: 'That code isn’t right. 3 tries left.' });
    global.fetch.mockResolvedValueOnce(reply(422, { error: { code: 'HANDOVER_CODE_INVALID', message: 'Too many wrong codes. Ask the seller to show a new one.' } }));
    await expect(handoverApi.previewHandover(key)).rejects.toMatchObject({ message: 'Too many wrong codes. Ask the seller to show a new one.' });
    global.fetch.mockResolvedValueOnce(reply(409, { error: { code: 'HANDOVER_CODE_EXPIRED', message: 'x' } }));
    await expect(handoverApi.previewHandover(key)).rejects.toMatchObject({ code: 'HANDOVER_CODE_EXPIRED' });
    global.fetch.mockResolvedValueOnce(reply(404, { error: { code: 'ORDER_NOT_FOUND', message: 'x' } }));
    await expect(handoverApi.previewHandover(key)).rejects.toMatchObject({ message: expect.stringContaining('No handover code found') });
  });
});

describe('seller: the handover QR', () => {
  const code = () => ({ token: 'tok_1234567890abcdefghij', shortCode: 'K7PQ2M', expiresAt: Date.now() + 10 * 60 * 1000 });

  test('waits for the transfer forms; then shows the QR, the code and the time left', async () => {
    jest.spyOn(handoverApi, 'startHandover').mockResolvedValue(code());
    let root = await render(<HandoverQrPanel orderId="ord_1" ready={false} onHandedOver={jest.fn()} />);
    expect(button(root, 'Start handover').props.disabled).toBe(true);
    act(() => tree.unmount());

    root = await render(<HandoverQrPanel orderId="ord_1" ready onHandedOver={jest.fn()} />);
    await act(async () => button(root, 'Start handover').props.onPress());
    expect(root.findAllByType(QrCode)).toHaveLength(1);
    expect(root.findByType(QrCode).props.value).toMatch(/\/handover#t=tok_1234567890abcdefghij$/);
    expect(hasText(root, 'K7PQ2M')).toBe(true);
    expect(hasText(root, 'Expires in 10:00')).toBe(true);
    expect(hasText(root, 'Waiting for the buyer to confirm')).toBe(true);
  });

  test('the buyer confirms: noticed by the next check, and the page reloads', async () => {
    jest.useFakeTimers();
    jest.spyOn(handoverApi, 'startHandover').mockResolvedValue(code());
    const getOrder = jest.spyOn(offerApi, 'getOrder').mockResolvedValueOnce({ status: 'TOKEN_PAID' }).mockResolvedValue({ status: 'HANDED_OVER' });
    const onHandedOver = jest.fn();
    const root = await render(<HandoverQrPanel orderId="ord_1" ready onHandedOver={onHandedOver} />);
    await act(async () => button(root, 'Start handover').props.onPress());
    await act(async () => jest.advanceTimersByTime(4000));
    await flush();
    expect(onHandedOver).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(4000));
    await flush();
    expect(getOrder).toHaveBeenCalledWith('ord_1');
    expect(onHandedOver).toHaveBeenCalledTimes(1);
    expect(hasText(root, 'The buyer confirmed the handover.')).toBe(true);
  });

  test('after 10 minutes the code expires; a new one can be shown', async () => {
    jest.useFakeTimers();
    const start = jest.spyOn(handoverApi, 'startHandover').mockResolvedValue(code());
    jest.spyOn(offerApi, 'getOrder').mockResolvedValue({ status: 'TOKEN_PAID' });
    const root = await render(<HandoverQrPanel orderId="ord_1" ready onHandedOver={jest.fn()} />);
    await act(async () => button(root, 'Start handover').props.onPress());
    await act(async () => jest.advanceTimersByTime(10 * 60 * 1000 + 1000));
    expect(hasText(root, 'This code has expired.')).toBe(true);
    expect(root.findAllByType(QrCode)).toHaveLength(0);
    await act(async () => button(root, 'Show a new code').props.onPress());
    expect(start).toHaveBeenCalledTimes(2);
  });
});

describe('buyer: at the handover', () => {
  test('the code entry: scan, or type 6 characters to continue', async () => {
    const onScan = jest.fn();
    const onCode = jest.fn();
    const root = await render(<HandoverCodeEntry onScan={onScan} onCode={onCode} />);
    await act(async () => button(root, 'Scan QR code').props.onPress());
    expect(onScan).toHaveBeenCalled();
    await act(async () => root.findByType(TextField).props.onChangeText('k7p'));
    await act(async () => button(root, 'Continue').props.onPress());
    expect(onCode).not.toHaveBeenCalled();
    expect(root.findByType(TextField).props.error).toBe('Enter the 6-character code shown under the QR code.');
    await act(async () => root.findByType(TextField).props.onChangeText('k7pq2m'));
    await act(async () => button(root, 'Continue').props.onPress());
    expect(onCode).toHaveBeenCalledWith('K7PQ2M');
  });

  const preview = { orderId: 'ord_1', vehicle: { make: 'Maruti', model: 'Swift', year: 2019 }, agreedPrice: 450000, expiresAt: Date.now() + 600000 };

  test('confirm: the vehicle and price, then all three ticks before Confirm', async () => {
    jest.spyOn(handoverApi, 'previewHandover').mockResolvedValue(preview);
    const confirm = jest.spyOn(handoverApi, 'confirmHandover').mockResolvedValue({ status: 'HANDED_OVER' });
    const navigation = { goBack: jest.fn() };
    const root = await render(<HandoverConfirm navigation={navigation} route={{ params: { token: 'tok_1234567890abcdefghij' } }} />);
    expect(hasText(root, 'Maruti Swift 2019')).toBe(true);
    expect(hasText(root, '₹4,50,000')).toBe(true);
    expect(button(root, 'Confirm handover').props.disabled).toBe(true);
    for (const row of root.findAllByType(CheckRow)) {
      await act(async () => row.props.onToggle());
    }
    expect(button(root, 'Confirm handover').props.disabled).toBe(false);
    await act(async () => button(root, 'Confirm handover').props.onPress());
    expect(confirm).toHaveBeenCalledWith({ token: 'tok_1234567890abcdefghij' }, { vehicle: true, keys: true, documents: true });
    expect(hasText(root, 'Handover confirmed.')).toBe(true);
    await act(async () => button(root, 'Back to my order').props.onPress());
    expect(navigation.goBack).toHaveBeenCalled();
  });

  test("something's wrong: report it to Turag instead (with what's wrong)", async () => {
    jest.spyOn(handoverApi, 'previewHandover').mockResolvedValue(preview);
    const refuse = jest.spyOn(handoverApi, 'refuseHandover').mockResolvedValue();
    const root = await render(
      <HandoverConfirm navigation={{ goBack: jest.fn() }} route={{ params: { orderId: 'ord_1', shortCode: 'K7PQ2M' } }} />,
    );
    await act(async () => button(root, "Something's wrong").props.onPress());
    expect(button(root, 'Report to Turag').props.disabled).toBe(true);
    await act(async () => root.findByType(TextField).props.onChangeText('Scratches not in the report'));
    await act(async () => button(root, 'Report to Turag').props.onPress());
    expect(refuse).toHaveBeenCalledWith({ orderId: 'ord_1', shortCode: 'K7PQ2M' }, 'Scratches not in the report');
    expect(hasText(root, 'Nothing has been handed over')).toBe(true);
  });

  test('a wrong or expired code: said plainly, with a way back', async () => {
    jest.spyOn(handoverApi, 'previewHandover').mockRejectedValue(new Error('That code isn’t right. 2 tries left.'));
    const root = await render(<HandoverConfirm navigation={{ goBack: jest.fn() }} route={{ params: { orderId: 'ord_1', shortCode: 'AAAAAA' } }} />);
    expect(hasText(root, 'That code isn’t right. 2 tries left.')).toBe(true);
    expect(button(root, 'Back')).toBeDefined();
  });

  test('scanning: without the scanner in this build, type the code instead', async () => {
    const navigation = { goBack: jest.fn(), replace: jest.fn() };
    const root = await render(<HandoverScan navigation={navigation} route={{ params: { orderId: 'ord_1' } }} />);
    expect(hasText(root, 'Type the code instead')).toBe(true);
    await act(async () => button(root, 'Type the code instead').props.onPress());
    expect(navigation.goBack).toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalledWith(ROUTES.HANDOVER_CONFIRM, expect.anything());
  });
});

describe('the buyer-seller chat', () => {
  const msg = (id, body, mine) => ({ message_id: id, body, sender_is_me: mine, created_at: '2026-11-18T09:00:00Z' });

  test('visible from the token on; after a cancel only if the token was paid', () => {
    expect(orderChatVisible(null)).toBe(false);
    expect(orderChatVisible({ status: 'CREATED' })).toBe(false);
    expect(orderChatVisible({ status: 'TOKEN_PAID' })).toBe(true);
    expect(orderChatVisible({ status: 'HANDED_OVER' })).toBe(true);
    expect(orderChatVisible({ status: 'COMPLETED' })).toBe(true);
    expect(orderChatVisible({ status: 'CANCELLED', token: null })).toBe(false);
    expect(orderChatVisible({ status: 'CANCELLED', token: { amount: 1000 } })).toBe(true);
  });

  test('open: the messages, and a phone number comes back to the box with the reason', async () => {
    global.fetch.mockImplementation((url, init = {}) => {
      if (init.method === 'POST') {
        return Promise.resolve(reply(422, { error: { code: 'ORDER_MESSAGE_PHONE_NUMBER', message: 'no numbers' } }));
      }
      return Promise.resolve(reply(200, { messages: [msg('m1', 'Hello, when can we meet?', false)], chat: 'OPEN' }));
    });
    const root = await render(<OrderChat navigation={{ goBack: jest.fn() }} route={{ params: { orderId: 'ord_1', role: 'BUYER' } }} />);
    expect(hasText(root, 'Message the seller')).toBe(true);
    expect(hasText(root, 'Hello, when can we meet?')).toBe(true);
    expect(hasText(root, 'phone numbers can’t be shared') || hasText(root, "phone numbers can't be shared")).toBe(true);
    const input = root.findByType(TextInput);
    await act(async () => input.props.onChangeText('Call me on 98765 43210'));
    const send = root.findAll(n => n.props.accessibilityLabel === 'Send' && n.props.onPress)[0];
    await act(async () => send.props.onPress());
    await flush();
    expect(global.fetch.mock.calls.some(([u, i]) => /\/orders\/ord_1\/messages$/.test(u) && i?.method === 'POST')).toBe(true);
    expect(root.findByType(TextInput).props.value).toBe('Call me on 98765 43210');
    expect(hasText(root, 'Phone numbers can’t be shared in chat.') || hasText(root, "Phone numbers can't be shared in chat.")).toBe(true);
  });

  test('closed order: read-only, no message box', async () => {
    global.fetch.mockResolvedValue(reply(200, { messages: [msg('m1', 'Thanks!', true)], chat: 'READ_ONLY' }));
    const root = await render(<OrderChat navigation={{ goBack: jest.fn() }} route={{ params: { orderId: 'ord_1', role: 'SELLER' } }} />);
    expect(hasText(root, 'Message the buyer')).toBe(true);
    expect(root.findAllByType(TextInput)).toHaveLength(0);
    expect(hasText(root, 'This order is closed, so the chat is read-only.')).toBe(true);
  });
});
