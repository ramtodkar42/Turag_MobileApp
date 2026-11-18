/**
 * "Report this listing" (Google Play's rule for what people post): pick a reason,
 * and the email app opens with the report to Turag support written out.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReportListing, { REPORT_REASONS, reportEmailUrl } from '../src/screens/marketplace/components/ReportListing';
import { OptionSheet } from '../src/components';
import { BACKEND_URL } from '../src/api/config';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const vehicle = { id: 'lst_42', name: 'Maruti Suzuki Swift' };
let tree;
const render = async () => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <ReportListing vehicle={vehicle} />
      </SafeAreaProvider>,
    );
  });
  return tree.root;
};
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;
const link = root => root.findAll(n => n.props.accessibilityRole === 'button' && n.props.onPress)[0];

afterEach(() => {
  act(() => tree?.unmount());
  jest.restoreAllMocks();
});

test('the email to support: the reason, which listing and its page', () => {
  const url = reportEmailUrl(vehicle, 'fake');
  expect(url.startsWith('mailto:support@turag.ai?subject=')).toBe(true);
  const [, query] = url.split('?');
  const params = Object.fromEntries(query.split('&').map(p => p.split('=').map(decodeURIComponent)));
  expect(params.subject).toBe('Report listing lst_42');
  expect(params.body).toContain('Reason: Fake or misleading');
  expect(params.body).toContain('Listing: Maruti Suzuki Swift (lst_42)');
  expect(params.body).toContain(`${BACKEND_URL}/used-cars-marketplace/lst_42`);
});

test('the link opens the reasons; one opens the email app and says what happens next', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const root = await render();
  expect(hasText(root, 'Report this listing')).toBe(true);
  await act(async () => link(root).props.onPress());
  const sheet = root.findByType(OptionSheet);
  expect(sheet.props.visible).toBe(true);
  expect(sheet.props.options.map(o => o.value)).toEqual(REPORT_REASONS);
  expect(sheet.props.options.map(o => o.label)).toContain('Spam or scam');

  await act(async () => sheet.props.onSelect('scam'));
  expect(open).toHaveBeenCalledWith(expect.stringContaining('mailto:support@turag.ai'));
  expect(decodeURIComponent(open.mock.calls[0][0])).toContain('Reason: Spam or scam');
  expect(hasText(root, 'Send the email and our team will review this listing.')).toBe(true);
});

test('no email app: the address to write to instead', async () => {
  jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('No app'));
  const root = await render();
  await act(async () => root.findByType(OptionSheet).props.onSelect('other'));
  expect(hasText(root, 'Please write to support@turag.ai')).toBe(true);
});
