import { useCallback, useState } from 'react';
import useRemoteData from '../../../hooks/useRemoteData';
import {
  createCarAlert,
  deleteCarAlert,
  listCarAlerts,
} from '../../../api/services/carAlerts.api';
import {
  getProfile,
  setOptionalConsent,
} from '../../../api/services/profile.api';
import { tNow } from '../../../i18n';
import { EMPTY_FORM } from './constants';

// The page's data: the alerts and whether WhatsApp messages are switched on
// (without it no alert is sent - the page says so and offers to turn it on).
const loadAll = async () => {
  const [alerts, profile] = await Promise.all([
    listCarAlerts(),
    getProfile().catch(() => null),
  ]);
  const whatsapp = profile?.consents?.find(c => c.key === 'WHATSAPP');
  return { alerts, whatsappOn: whatsapp ? whatsapp.verified : null };
};

// WhatsApp car alerts (as the web): the "All new cars" switch, the matching
// alerts with Remove, and the add form. One action at a time; each reloads the
// list after. Returns { ...useRemoteData, alerts, allAlert, matching, whatsappOn,
// busy ('all' | 'add' | 'whatsapp' | alert id | null), actionError, form,
// setField(key)(value), canAdd, toggleAll(), addAlert(), removeAlert(id), turnOnWhatsapp() }.
export default function useCarAlerts() {
  const remote = useRemoteData(loadAll);
  const { data, setData, reload } = remote;
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const alerts = data?.alerts ?? [];
  const allAlert = alerts.find(a => a.scope === 'ALL') ?? null;
  const matching = alerts.filter(a => a.scope === 'MATCH');

  const run = useCallback(
    async (key, fn) => {
      if (busy) return;
      setBusy(key);
      setActionError('');
      try {
        await fn();
        await reload();
      } catch (e) {
        setActionError(e?.message || tNow('carAlerts.error.action'));
      } finally {
        setBusy(null);
      }
    },
    [busy, reload],
  );

  const setField = key => value =>
    setForm(f => ({ ...f, [key]: f[key] === value ? null : value }));
  const canAdd = Object.values(form).some(v => v != null);

  const toggleAll = () =>
    run('all', () =>
      allAlert ? deleteCarAlert(allAlert.id) : createCarAlert({ scope: 'ALL' }),
    );

  const addAlert = () =>
    run('add', async () => {
      await createCarAlert({
        scope: 'MATCH',
        make: form.make,
        bodyType: form.bodyType,
        fuel: form.fuel,
        city: form.city,
        priceMaxMinor: form.budget != null ? form.budget * 100 : null,
      });
      setForm(EMPTY_FORM);
    });

  const removeAlert = id => run(id, () => deleteCarAlert(id));

  const turnOnWhatsapp = () =>
    run('whatsapp', async () => {
      await setOptionalConsent('WHATSAPP', true);
      setData(d => (d ? { ...d, whatsappOn: true } : d));
    });

  return {
    ...remote,
    alerts,
    allAlert,
    matching,
    whatsappOn: data?.whatsappOn ?? null,
    busy,
    actionError,
    form,
    setField,
    canAdd,
    toggleAll,
    addAlert,
    removeAlert,
    turnOnWhatsapp,
  };
}
