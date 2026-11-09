/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import GuidedVideo from '../src/screens/selfInspection/SelfInspection/components/GuidedVideo';
import OutcomeBanner from '../src/screens/selfInspection/SelfInspection/components/OutcomeBanner';
import UploadProgress from '../src/screens/selfInspection/SelfInspection/components/UploadProgress';
import { spacing } from '../src/theme';

const guide = { tipKeys: ['selfInspection.gvideo.walk.exterior'], checkCoverage: true };
const props = extra => ({
  guide,
  title: 'Walkaround',
  maxS: 120,
  have: false,
  busy: false,
  disabled: false,
  onRecord: jest.fn(),
  onUse: jest.fn(async () => true),
  ...extra,
});

describe('GuidedVideo', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('what came back from the camera scrolls into view: a new clip once, after the screen is back; a refused one its reason', async () => {
    const scrollRef = { current: { getInnerViewRef: () => ({}), scrollTo: jest.fn() } };
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(<GuidedVideo {...props({ scrollRef })} />);
    });
    // The block with the clip and its buttons sits 480 down the page.
    tree.root.find(n => n.props.collapsable === false).instance.measureLayout = (host, done) => done(0, 480);
    await act(async () => jest.advanceTimersByTime(1000));
    expect(scrollRef.current.scrollTo).not.toHaveBeenCalled(); // nothing recorded yet

    await act(async () => tree.update(<GuidedVideo {...props({ scrollRef, pending: { uri: 'file:///a.mp4' } })} />));
    expect(scrollRef.current.scrollTo).not.toHaveBeenCalled(); // the screen settles first
    await act(async () => jest.advanceTimersByTime(350));
    expect(scrollRef.current.scrollTo).toHaveBeenCalledWith({ y: 480 - spacing.md, animated: true });

    // The same clip again (uploading, any re-render): the page stays where the user is.
    await act(async () => tree.update(<GuidedVideo {...props({ scrollRef, pending: { uri: 'file:///a.mp4' }, busy: true })} />));
    await act(async () => jest.advanceTimersByTime(1000));
    expect(scrollRef.current.scrollTo).toHaveBeenCalledTimes(1);

    await act(async () => tree.update(<GuidedVideo {...props({ scrollRef, error: 'This video is only 10 seconds long.' })} />));
    await act(async () => jest.advanceTimersByTime(350));
    expect(scrollRef.current.scrollTo).toHaveBeenCalledTimes(2);

    await act(async () => tree.unmount());
  });

  test('while it uploads: the one panel, no buttons; afterwards the buttons are back under the clip', async () => {
    let tree;
    const pending = { uri: 'file:///a.mp4' };
    await act(async () => {
      tree = ReactTestRenderer.create(<GuidedVideo {...props({ pending, busy: true })} />);
    });
    const titles = () => [
      ...new Set(tree.root.findAll(n => typeof n.props.title === 'string' && n.props.onPress).map(n => n.props.title)),
    ];
    expect(titles()).toEqual([]);
    expect(tree.root.findAllByType(UploadProgress)).toHaveLength(1);

    await act(async () => tree.update(<GuidedVideo {...props({ pending })} />));
    expect(titles()).toEqual(['Retake video', 'Use this video']);
    expect(tree.root.findAllByType(UploadProgress)).toHaveLength(0);
    await act(async () => tree.unmount());
  });

  test('saved: a green "Video saved", Retake as the second choice, and Next on to the next group', async () => {
    const onNext = jest.fn();
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(<GuidedVideo {...props({ have: true, nextLabel: 'Next: Tyres', onNext })} />);
    });
    const banners = tree.root.findAllByType(OutcomeBanner);
    expect(banners).toHaveLength(1);
    expect(banners[0].props).toMatchObject({ tone: 'success', title: 'Video saved' });
    expect(tree.root.findAll(n => n.props.title === 'Retake video' && n.props.variant)[0].props.variant).toBe('outline');
    await act(async () => tree.root.findAll(n => n.props.title === 'Next: Tyres' && n.props.onPress)[0].props.onPress());
    expect(onNext).toHaveBeenCalledTimes(1);

    // Nothing left after it: no Next (the screen's own footer goes on).
    await act(async () => tree.update(<GuidedVideo {...props({ have: true })} />));
    expect(tree.root.findAll(n => typeof n.props.title === 'string' && n.props.title.startsWith('Next'))).toHaveLength(0);
    await act(async () => tree.unmount());
  });

  test('not uploaded: a red note saying what to do, and "Try again" sends the same recording', async () => {
    const onUse = jest.fn(async () => false);
    const pending = { uri: 'file:///a.mp4' };
    const message = { kind: 'error', text: 'Please check your internet connection and tap "Try again". Your recording is still here.' };
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(<GuidedVideo {...props({ pending, onUse, message })} />);
    });
    const banners = tree.root.findAllByType(OutcomeBanner);
    expect(banners).toHaveLength(1);
    expect(banners[0].props).toMatchObject({ tone: 'danger', title: 'Video not uploaded', text: message.text });
    const titles = [
      ...new Set(tree.root.findAll(n => typeof n.props.title === 'string' && n.props.onPress).map(n => n.props.title)),
    ];
    expect(titles).toEqual(['Retake video', 'Try again']);
    await act(async () => tree.root.findAll(n => n.props.title === 'Try again' && n.props.onPress)[0].props.onPress());
    expect(onUse).toHaveBeenCalledWith(pending);
    await act(async () => tree.unmount());
  });
});
