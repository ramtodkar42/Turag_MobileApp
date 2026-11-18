/**
 * The estimate as ONE price range (owner rule, 5 Nov 2026, as the web): the range from
 * the server's bands, "Most likely around", and how it was worked out.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import PriceRange, { priceRange } from '../src/screens/valuation/components/PriceRange';
import PriceFactors, { knownFactors } from '../src/screens/valuation/components/PriceFactors';
import { mapValuation } from '../src/api/mappers/valuation';

const texts = root => root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children);
const render = async element => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  return tree.root;
};

test("the range is the server's auction low to trade-in high; nothing without bands", () => {
  const valuation = { priceBands: { auction: { min: 400000, max: 430000 }, tradeIn: { min: 440000, max: 480000 } } };
  expect(priceRange(valuation)).toEqual({ low: 400000, high: 480000 });
  expect(priceRange({ priceBands: { auction: { min: null }, tradeIn: { max: null } } })).toBeNull();
  expect(priceRange(null)).toBeNull();
});

test('shows "Estimated value", the range and the most likely price', async () => {
  const root = await render(<PriceRange range={{ low: 400000, high: 480000 }} value={450000} />);
  const shown = texts(root);
  expect(shown).toContain('Estimated value');
  expect(shown).toContain('₹4,00,000 – ₹4,80,000');
  expect(shown).toContain('Most likely around ₹4,50,000');
});

test('"How we worked this out": known factors with their effect; unknown ones left out', async () => {
  const factors = knownFactors([
    { factor: 'odometer_vs_expected', impactPct: -4 },
    { factor: 'owner_count', impactPct: 2 },
    { factor: 'something_new', impactPct: 9 },
  ]);
  expect(factors.map(f => f.factor)).toEqual(['odometer_vs_expected', 'owner_count']);
  const root = await render(<PriceFactors factors={factors} />);
  const shown = texts(root);
  expect(shown).toEqual(
    expect.arrayContaining(['How we worked this out', 'Kilometres driven vs usual', '-4%', 'Number of owners', '+2%']),
  );
  expect(shown.join(' ')).not.toContain('something_new');

  // Nothing to show: nothing at all.
  expect((await render(<PriceFactors factors={[]} />)).findAll(() => true).length).toBeLessThanOrEqual(1);
});

test('the server\'s adjustments come through on the valuation', () => {
  const valuation = mapValuation({
    valuation_id: 'val_1',
    headline: { value: 45000000 },
    bands: {},
    adjustments: [{ factor: 'declared_condition', impact_pct: -6, detail: 'FAIR' }],
  });
  expect(valuation.adjustments).toEqual([{ factor: 'declared_condition', impactPct: -6 }]);
});
