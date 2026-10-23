/**
 * Report screen actions (as the web's report page): Download PDF and Share
 * report; and the self-inspection's "Fix photos" using /reopen (the web's).
 */
/* eslint-env node */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Linking, Share } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import InspectionReport from '../src/screens/account/InspectionReport/InspectionReport';
import { Button } from '../src/components';
import { USE_REAL_API } from '../src/api/config';
import { endSession, startSession } from '../src/api/session';
import { getReportPdf, shareReport } from '../src/api/services/report.api';
import { reopenSelfInspection } from '../src/api/services/selfInspection.api';

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
const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: () => Promise.resolve(JSON.stringify(body)),
});
const button = (root, title) => root.findAllByType(Button).find(b => b.props.title === title);

let tree;
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('Report screen: Download PDF opens the PDF; Share report opens the share sheet with the link', async () => {
  jest.useFakeTimers();
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <InspectionReport navigation={{ goBack: jest.fn() }} route={{ params: { inspectionId: 'insp_1' } }} />
      </SafeAreaProvider>,
    );
  });
  await act(async () => jest.advanceTimersByTime(800));
  const root = tree.root;

  await act(async () => {
    button(root, 'Download PDF').props.onPress();
  });
  await act(async () => jest.advanceTimersByTime(700));
  expect(open).toHaveBeenCalledWith(expect.stringContaining('insp_1'));

  await act(async () => {
    button(root, 'Share report').props.onPress();
  });
  await act(async () => jest.advanceTimersByTime(500));
  expect(share).toHaveBeenCalledWith(
    expect.objectContaining({ message: expect.stringContaining('/verify/'), url: expect.stringContaining('/verify/') }),
  );
});

describe('real backend', () => {
  beforeAll(() => {
    USE_REAL_API.bookings = true;
    USE_REAL_API.inspector = true;
  });
  afterAll(() => {
    USE_REAL_API.bookings = false;
    USE_REAL_API.inspector = false;
  });
  beforeEach(async () => {
    global.fetch = jest.fn();
    await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
  });
  afterEach(async () => {
    await endSession();
  });

  test('PDF: READY gives the link; GENERATING says it is being prepared', async () => {
    fetch.mockResolvedValueOnce(reply(200, { status: 'READY', url: 'https://cdn/r.pdf', expires_at: 'x', request_id: 'r' }));
    await expect(getReportPdf('insp_1')).resolves.toEqual({ status: 'READY', url: 'https://cdn/r.pdf', reason: null });
    expect(fetch.mock.calls[0][0]).toMatch(/\/reports\/insp_1\/pdf$/);

    fetch.mockResolvedValueOnce(reply(202, { status: 'GENERATING', job_id: 'j1', request_id: 'r' }));
    await expect(getReportPdf('insp_1')).resolves.toMatchObject({ status: 'GENERATING' });
  });

  test('Share: POST /reports/{id}/share gives the verification link', async () => {
    fetch.mockResolvedValueOnce(
      reply(200, { share_url: 'https://t/s/1', verify_url: 'https://t/verify/abc', expires_at: 'x', request_id: 'r' }),
    );
    await expect(shareReport('insp_1')).resolves.toEqual({ url: 'https://t/verify/abc' });
    expect(fetch.mock.calls[0][1].method).toBe('POST');
  });

  test('Fix photos: both the owner and the inspector reopen it (/reopen, as the web)', async () => {
    fetch.mockResolvedValue(reply(200, { inspection: { id: 'insp_1', status: 'IN_PROGRESS' } }));
    await reopenSelfInspection('insp_1');
    expect(fetch.mock.calls[0][0]).toMatch(/\/inspections\/insp_1\/reopen$/);
    expect(fetch.mock.calls[0][1].method).toBe('POST');
  });
});
