import { useRef, useState } from 'react';
import { PAN_PATTERN, submitLoanApplication } from '../../../api/services/loan.api';
import { getUser } from '../../../store/userStore';
import { tNow } from '../../../i18n';

const digits = text => text.replace(/\D/g, '').slice(0, 10);
const rupees = text => (text ? Number(text) : null);

// The loan form (as the web's LoanApplicationSheet): the amount (the agreed
// price to start with), down payment, tenure, name / email (from the profile),
// city, PAN, income and employment, and consent. submit() checks it as the web
// does and sends it; `done` once Turag has it.
// context: { listingId, orderId, vehicleLabel, vehiclePrice (₹) }.
export default function useLoanForm(context) {
  const user = getUser();
  const [values, setValues] = useState({
    loanAmount: context.vehiclePrice ? String(Math.round(context.vehiclePrice)) : '',
    downPayment: '',
    tenureMonths: 60,
    name: user?.fullName ?? '',
    email: user?.email ?? '',
    city: '',
    pan: '',
    monthlyIncome: '',
    employmentType: 'SALARIED',
  });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const sending = useRef(false);

  const set = key => value => setValues(v => ({ ...v, [key]: value }));
  const setAmount = key => text => set(key)(digits(text));
  const setPan = text => set('pan')(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));

  const submit = async () => {
    if (sending.current) return;
    setError('');
    if (!values.name.trim()) return setError(tNow('loan.error.name'));
    if (!rupees(values.loanAmount)) return setError(tNow('loan.error.amount'));
    if (values.pan && !PAN_PATTERN.test(values.pan)) return setError(tNow('loan.error.pan'));
    if (!consent) return setError(tNow('loan.error.consent'));
    sending.current = true;
    setBusy(true);
    try {
      await submitLoanApplication({
        ...context,
        loanAmount: rupees(values.loanAmount),
        downPayment: rupees(values.downPayment),
        tenureMonths: values.tenureMonths,
        name: values.name,
        email: values.email,
        pan: values.pan,
        monthlyIncome: rupees(values.monthlyIncome),
        employmentType: values.employmentType,
        city: values.city,
      });
      setDone(true);
    } catch (e) {
      setError(e?.message || tNow('loan.error.submit'));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  return {
    values,
    set,
    setAmount,
    setPan,
    consent,
    toggleConsent: () => setConsent(c => !c),
    busy,
    error,
    done,
    submit,
  };
}
