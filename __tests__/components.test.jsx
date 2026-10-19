/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  AppText,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  CheckCircle,
  Chevron,
  Chip,
  Divider,
  Header,
  HeaderCard,
  InfoNote,
  KeyValueCard,
  OTPInput,
  PaginationDots,
  ScreenContainer,
  SearchBar,
  SegmentedControl,
  Spinner,
  StatusTimeline,
  StatusView,
  Stepper,
  SuccessSheet,
  TextField,
  UploadRow,
  ValueCard,
  VehicleCard,
  VehicleRow,
} from '../src/components';

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const noop = () => {};

function Showcase() {
  return (
    <ScreenContainer scroll header={<Header onBack={noop} title="Title" />} footer={<Button title="Next" />}>
      <AppText variant="h1">Heading</AppText>
      <Avatar name="Manish Thakre" />
      <Badge label="Ok" tone="success" />
      <Button title="Upload" size="sm" variant="dark" loading />
      <Button title="Disabled" disabled />
      <Card><Divider /></Card>
      <CheckCircle />
      <Chevron direction="right" />
      <Chip label="Pune" selected />
      <HeaderCard title="Documents" subtitle="Submit these documents" />
      <InfoNote>Refundable charge</InfoNote>
      <KeyValueCard title="Details" rows={[{ label: 'Date', value: '25/10/2026' }]} />
      <OTPInput value="35" onChangeText={noop} autoFocus={false} />
      <PaginationDots count={3} activeIndex={1} />
      <SearchBar placeholder="Search Car" />
      <SegmentedControl
        options={[{ label: 'Self', value: 'self' }, { label: 'Inspector', value: 'inspector' }]}
        value="self"
        onChange={noop}
      />
      <Spinner />
      <StatusTimeline steps={['Scheduled', 'Assigned', 'En route']} currentStep={2} />
      <StatusView title="Account Created" message="All set." icon={<CheckCircle />} />
      <Stepper steps={['Condition', 'Verification', 'Valuation']} currentStep={1} />
      <TextField label="Registration Number" value="MH12CT4590" valid />
      <TextField label="Password" variant="underline" secureTextEntry error="Required" />
      <UploadRow title="PUC Certificate" subtitle="5 MB Max" onUpload={noop} />
      <UploadRow title="Front 0°" uploaded />
      <ValueCard value="₹8,31,300/-" title="KIA Seltos 2023" description="Pre-estimated" />
      <VehicleCard title="KIA Seltos" meta={['2023', 'Petrol']} price="₹6.8L" badge="Verified" />
      <VehicleRow title="KIA Seltos" subtitle="2023 · Petrol" />
      <BottomSheet visible onClose={noop}><AppText>Sheet</AppText></BottomSheet>
      <SuccessSheet visible onClose={noop} message="Done" actionLabel="Continue" onAction={noop} />
    </ScreenContainer>
  );
}

test('all shared components render', async () => {
  let tree;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <Showcase />
      </SafeAreaProvider>,
    );
  });
  // Unmount so the open sheets' slide animations stop with the test.
  await ReactTestRenderer.act(() => tree.unmount());
});

test('PinnedToBottom keeps its place when the keyboard shrinks the screen', () => {
  const { act } = ReactTestRenderer;
  const PinnedToBottom = require('../src/components/layout/PinnedToBottom').default;
  const { View } = require('react-native');
  let tree;
  act(() => {
    tree = ReactTestRenderer.create(
      <PinnedToBottom offset={20}>
        <View />
      </PinnedToBottom>,
    );
  });
  const [parent, pinned] = tree.root.findAll(n => n.type === View && n.props.onLayout);
  const layout = (node, width, height) =>
    act(() => node.props.onLayout({ nativeEvent: { layout: { width, height } } }));
  const top = () => tree.root.findAll(n => n.type === View && n.props.onLayout)[1].props.style
    .flat()
    .find(s => s && 'top' in s)?.top;

  layout(pinned, 340, 60);
  layout(parent, 375, 800);
  expect(top()).toBe(720); // 800 - 20 - 60
  layout(parent, 375, 500); // keyboard open: the screen shrinks
  expect(top()).toBe(720); // ...it stays put (behind the keyboard)
  layout(parent, 800, 375); // rotated: a new width starts over
  expect(top()).toBe(295);
});
