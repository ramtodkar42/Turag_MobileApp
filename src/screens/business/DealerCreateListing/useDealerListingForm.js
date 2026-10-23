import { useState } from 'react';
import { createDealerListing } from '../../../api/services/business.api';
import { tNow } from '../../../i18n';

const digits = value => String(value ?? '').replace(/[^0-9]/g, '');

// The web's "List a vehicle" form: category, make, model, year, fuel, asking
// price (₹) and city, with the same checks and messages. submit() resolves
// to the created listing, or null when a check failed (see `error`).
export default function useDealerListingForm(orgId) {
  const [values, setValues] = useState({
    category: 'PASSENGER',
    make: '',
    model: '',
    year: '',
    fuel: 'PETROL',
    askPrice: '',
    city: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (name, value) => {
    // Year and price take digits only (as the web's inputs).
    const clean = name === 'year' || name === 'askPrice' ? digits(value) : value;
    setValues(v => ({ ...v, [name]: clean }));
    setError('');
  };

  const check = () => {
    const year = Number(values.year);
    const price = Number(values.askPrice);
    if (!values.make.trim() || !values.model.trim()) {
      return tNow('business.create.error.makeModel');
    }
    if (!Number.isInteger(year) || year < 1980 || year > 2100) {
      return tNow('business.create.error.year');
    }
    if (!Number.isFinite(price) || price <= 0) {
      return tNow('business.create.error.price');
    }
    return '';
  };

  const submit = async () => {
    const problem = check();
    if (problem) {
      setError(problem);
      return null;
    }
    setBusy(true);
    setError('');
    try {
      return await createDealerListing(orgId, values);
    } catch (e) {
      setError(e.message || tNow('business.create.error.generic'));
      return null;
    } finally {
      setBusy(false);
    }
  };

  return { values, set, busy, error, submit };
}
