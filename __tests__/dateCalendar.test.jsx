/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import Calendar from 'react-native-calendars/src/calendar';
import DateCalendar from '../src/components/common/DateCalendar';
import ChoiceChip from '../src/components/common/ChoiceChip';
import { toIsoDate } from '../src/utils/date';

const today = toIsoDate(new Date());
const thisYear = Number(today.slice(0, 4));
const thisMonth = today.slice(5, 7);

let root;
const render = async props => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<DateCalendar onSelect={jest.fn()} {...props} />);
  });
  root = renderer.root;
  return renderer;
};
const yearButton = () =>
  root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.endsWith('Choose a year') && n.props.onPress);

describe('DateCalendar', () => {
  it('opens a past-date calendar on this month, not on the earliest date', async () => {
    const renderer = await render({ value: null, minDate: '2000-01-01', maxDate: today });
    expect(root.findByType(Calendar).props.current).toBe(today);
    renderer.unmount();
  });

  it('changes the year in one tap from the month title', async () => {
    const onSelect = jest.fn();
    const renderer = await render({ value: null, minDate: '2000-01-01', maxDate: today, onSelect });

    await act(async () => yearButton()[0].props.onPress());
    const chips = root.findAllByType(ChoiceChip);
    expect(chips).toHaveLength(thisYear - 2000 + 1);
    expect(chips[0].props.label).toBe(String(thisYear));
    expect(chips[0].props.selected).toBe(true);

    await act(async () => chips.find(c => c.props.label === '2015').props.onPress());
    expect(root.findAllByType(ChoiceChip)).toHaveLength(0);
    expect(root.findByType(Calendar).props.current).toBe(`2015-${thisMonth}-01`);

    await act(async () => root.findByType(Calendar).props.onDayPress({ dateString: '2015-03-10' }));
    expect(onSelect).toHaveBeenCalledWith('2015-03-10');
    renderer.unmount();
  });

  it('keeps a picked year inside the allowed range', async () => {
    const renderer = await render({ value: null, minDate: '2020-06-15', maxDate: today });
    await act(async () => yearButton()[0].props.onPress());
    await act(async () => root.findAllByType(ChoiceChip).find(c => c.props.label === '2020').props.onPress());
    const current = root.findByType(Calendar).props.current;
    expect(current >= '2020-06-15').toBe(true);
    expect(current.slice(0, 4)).toBe('2020');
    renderer.unmount();
  });

  it('opens on the picked date when there is one', async () => {
    const renderer = await render({ value: '2012-04-20', minDate: '2000-01-01', maxDate: today });
    expect(root.findByType(Calendar).props.current).toBe('2012-04-20');
    renderer.unmount();
  });

  it('has no year list for a range inside one year or for open slots', async () => {
    let renderer = await render({ value: null, minDate: '2024-01-01' });
    expect(root.findByType(Calendar).props.current).toBe(today);
    expect(yearButton()).toHaveLength(0);
    renderer.unmount();

    renderer = await render({ value: null, availableDates: ['2026-12-02', '2026-12-03'] });
    expect(root.findByType(Calendar).props.current).toBe('2026-12-02');
    expect(yearButton()).toHaveLength(0);
    renderer.unmount();
  });
});
