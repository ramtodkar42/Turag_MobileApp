/**
 * Fixes from the full-app QA pass (2026-10-29): a payment waiting for the
 * bank says so and keeps checking, hearts reach the server in tap order, a
 * slow earlier load never overwrites newer data, and payment messages follow
 * a language switch.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import usePayAgain from '../src/screens/account/BookingDetails/usePayAgain';
import useRemoteData from '../src/hooks/useRemoteData';
import { PaymentNotice } from '../src/components';
import { setLanguage } from '../src/i18n';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: () => {},
}));

let tree;
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  jest.useRealTimers();
});

describe('a booking payment waiting for the bank', () => {
  test('says "confirming" (not "pay again"), checks every 5 s, and stops once paid', async () => {
    jest.useFakeTimers();
    const onPaid = jest.fn();
    let pay;
    function Probe({ booking }) {
      pay = usePayAgain({ booking, onPaid, pending: true });
      return null;
    }
    await act(async () => {
      tree = ReactTestRenderer.create(<Probe booking={{ id: 'bkg_1', feePaid: false, price: 799 }} />);
    });
    expect(pay.problem).toEqual(expect.objectContaining({ kind: 'awaiting', messageKey: 'account.booking.pay.awaiting' }));

    await act(async () => jest.advanceTimersByTime(15000));
    expect(onPaid).toHaveBeenCalledTimes(3);

    // The booking is paid now: the card goes and the checks stop.
    await act(async () => tree.update(<Probe booking={{ id: 'bkg_1', feePaid: true, price: 799 }} />));
    expect(pay.problem).toBeNull();
    await act(async () => jest.advanceTimersByTime(15000));
    expect(onPaid).toHaveBeenCalledTimes(3);
  });

  test('gives up checking after two minutes (pull to refresh still works)', async () => {
    jest.useFakeTimers();
    const onPaid = jest.fn();
    function Probe() {
      usePayAgain({ booking: { id: 'bkg_2', feePaid: false }, onPaid, pending: true });
      return null;
    }
    await act(async () => {
      tree = ReactTestRenderer.create(<Probe />);
    });
    await act(async () => jest.advanceTimersByTime(10 * 60 * 1000));
    expect(onPaid.mock.calls.length).toBeLessThanOrEqual(24);
  });
});

describe('hearts', () => {
  test('a quick save + un-save reach the server in tap order', async () => {
    const savedApi = require('../src/api/services/saved.api');
    const order = [];
    let releaseSave;
    jest.spyOn(savedApi, 'saveVehicle').mockImplementation(
      () =>
        new Promise(resolve => {
          releaseSave = () => {
            order.push('save');
            resolve();
          };
        }),
    );
    jest.spyOn(savedApi, 'removeSavedVehicle').mockImplementation(async () => order.push('unsave'));
    const { toggleSaved, isSaved } = require('../src/store/savedStore');
    const vehicle = { id: 'lst_7', name: 'Swift' };
    let first;
    let second;
    await act(async () => {
      first = toggleSaved(vehicle); // save (slow)
      second = toggleSaved(vehicle); // un-save, tapped before the save answered
    });
    expect(isSaved('lst_7')).toBe(false); // the screen follows the last tap
    expect(order).toEqual([]); // the un-save waits for the save
    await act(async () => {
      releaseSave();
      await first;
      await second;
    });
    expect(order).toEqual(['save', 'unsave']);
    expect(isSaved('lst_7')).toBe(false);
    jest.restoreAllMocks();
  });
});

describe('screens that load data', () => {
  test('a slow earlier load never overwrites a newer one', async () => {
    const answers = [];
    const loader = () => new Promise(resolve => answers.push(resolve));
    let remote;
    function Probe() {
      remote = useRemoteData(loader, []);
      return null;
    }
    await act(async () => {
      tree = ReactTestRenderer.create(<Probe />);
    });
    await act(async () => {
      remote.reload(); // a second load starts while the first is still out
    });
    await act(async () => answers[1]('new'));
    await act(async () => answers[0]('old')); // the first one answers last
    expect(remote.data).toBe('new');
  });

  test('data set after an action wins over a load already on its way', async () => {
    let answer;
    let remote;
    function Probe() {
      remote = useRemoteData(() => new Promise(resolve => (answer = resolve)), []);
      return null;
    }
    await act(async () => {
      tree = ReactTestRenderer.create(<Probe />);
    });
    await act(async () => remote.setData('after the action'));
    await act(async () => answer('before the action'));
    expect(remote.data).toBe('after the action');
  });
});

describe('Login while typing', () => {
  test('tightens on tap (before the keyboard), returns when it closes - animated both ways', async () => {
    const { Keyboard, LayoutAnimation } = require('react-native');
    const listeners = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation((name, fn) => {
      listeners[name] = fn;
      return { remove: jest.fn() };
    });
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    const animate = jest.spyOn(LayoutAnimation, 'configureNext').mockImplementation(() => {});
    const useCompactOnKeyboard = require('../src/hooks/useCompactOnKeyboard').default;
    let state;
    function Probe() {
      state = useCompactOnKeyboard();
      return null;
    }
    await act(async () => {
      tree = ReactTestRenderer.create(<Probe />);
    });
    expect(state.compact).toBe(false);

    await act(async () => state.onFocus()); // the number box tapped
    expect(state.compact).toBe(true);
    expect(animate).toHaveBeenCalledTimes(1);
    await act(async () => listeners.keyboardDidShow()); // already tight: no second jump
    expect(animate).toHaveBeenCalledTimes(1);

    await act(async () => listeners.keyboardDidHide()); // Back
    expect(state.compact).toBe(false);
    expect(animate).toHaveBeenCalledTimes(2);
    expect(dismiss).toHaveBeenCalled(); // the next tap counts as a new tap
    jest.restoreAllMocks();
  });
});

describe('payment messages', () => {
  test('follow a language switch (translated when shown)', async () => {
    const problem = { kind: 'declined', message: 'old text', messageKey: 'booking.summary.payFailed' };
    const texts = () => tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children);
    await act(async () => {
      tree = ReactTestRenderer.create(<PaymentNotice problem={problem} />);
    });
    expect(texts().some(s => s.startsWith('Your bank or UPI app'))).toBe(true);
    await act(async () => setLanguage('hi'));
    expect(texts().some(s => s.startsWith('आपके बैंक या UPI ऐप'))).toBe(true);
    await act(async () => setLanguage('en'));
  });
});
