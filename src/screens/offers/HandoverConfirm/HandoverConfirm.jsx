import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  CheckRow,
  Header,
  Icon,
  ScreenContainer,
  StatusView,
  TextField,
} from '../../../components';
import { colors, radius, spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { formatINR, vehicleName } from '../../../utils/format';
import { useT } from '../../../i18n';
import { confirmHandover, previewHandover, refuseHandover } from '../../../api/services/handover.api';

const REASON_MAX = 1000;

// The buyer answers the seller's handover (the web's HandoverConfirm, ADR-0097): which
// order the code is for, then - only after checking the vehicle - tick the vehicle, the
// keys and the original RC + documents and confirm. "Something's wrong" reports a problem
// to Turag instead: nothing is handed over and the seller isn't paid until it's sorted out.
// params: { token } (scanned QR) or { orderId, shortCode } (typed on the order page).
function HandoverConfirm({ navigation, route }) {
  const t = useT();
  const { token, orderId, shortCode } = route.params ?? {};
  const key = useRef(token ? { token } : { orderId, shortCode }).current;

  const [preview, setPreview] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [checks, setChecks] = useState({ vehicle: false, keys: false, documents: false });
  const [problem, setProblem] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(null); // 'confirm' | 'report'
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // 'confirmed' | 'reported'
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const next = await previewHandover(key);
      if (alive.current) setPreview(next);
    } catch (e) {
      if (alive.current) setLoadError(e.message || t('handover.buyer.noCode'));
    }
  }, [key, t]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  const run = async (kind, action, outcome) => {
    if (busy) return;
    setBusy(kind);
    setError('');
    try {
      await action();
      if (alive.current) setResult(outcome);
    } catch (e) {
      if (alive.current) setError(e.message || t('offers.error.action'));
    } finally {
      if (alive.current) setBusy(null);
    }
  };

  const allTicked = checks.vehicle && checks.keys && checks.documents;
  const toggle = name => () => setChecks(prev => ({ ...prev, [name]: !prev[name] }));
  const back = () => navigation.goBack();
  const header = <Header onBack={back} title={t('handover.buyer.title')} />;

  if (result) {
    const confirmed = result === 'confirmed';
    return (
      <ScreenContainer header={header}>
        <StatusView
          icon={
            <View style={[styles.resultIcon, confirmed ? styles.resultOk : styles.resultInfo]}>
              <Icon
                name={confirmed ? 'check' : 'flag'}
                size={ms(26)}
                color={confirmed ? colors.success : colors.primary}
                strokeWidth={2.6}
              />
            </View>
          }
          title={t(confirmed ? 'handover.buyer.title' : 'handover.buyer.report')}
          message={t(confirmed ? 'handover.buyer.confirmed' : 'handover.buyer.reported')}
        >
          <Button title={t('handover.buyer.backToOrder')} size="md" onPress={back} style={styles.action} />
        </StatusView>
      </ScreenContainer>
    );
  }

  if (loadError) {
    return (
      <ScreenContainer header={header}>
        <StatusView title={t('handover.buyer.title')} message={loadError}>
          <Button title={t('handover.buyer.back')} size="md" onPress={back} style={styles.action} />
        </StatusView>
      </ScreenContainer>
    );
  }

  if (!preview) {
    return (
      <ScreenContainer header={header}>
        <View style={styles.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.primary} />
          <AppText variant="subtitle">{t('handover.buyer.loading')}</AppText>
        </View>
      </ScreenContainer>
    );
  }

  const name = preview.vehicle
    ? [vehicleName(preview.vehicle.make, preview.vehicle.model), preview.vehicle.year].filter(Boolean).join(' ')
    : null;

  return (
    <ScreenContainer scroll header={header}>
      <Card style={styles.card}>
        {name ? <AppText variant="title">{name}</AppText> : null}
        <View style={styles.priceRow}>
          <AppText variant="caption" color={colors.body} style={styles.flex}>
            {t('handover.buyer.price')}
          </AppText>
          <AppText variant="title" color={colors.success}>
            {formatINR(preview.agreedPrice)}
          </AppText>
        </View>
      </Card>

      {problem ? (
        <Card style={styles.card}>
          <TextField
            label={t('handover.buyer.problemLabel')}
            placeholder={t('handover.buyer.problemPlaceholder')}
            value={reason}
            onChangeText={setReason}
            maxLength={REASON_MAX}
            multiline
          />
          {error ? (
            <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}
          <Button
            title={t('handover.buyer.report')}
            onPress={() => run('report', () => refuseHandover(key, reason), 'reported')}
            loading={busy === 'report'}
            disabled={!reason.trim() || !!busy}
          />
          <Button
            title={t('handover.buyer.back')}
            variant="ghost"
            size="md"
            onPress={() => {
              setProblem(false);
              setError('');
            }}
            disabled={!!busy}
          />
        </Card>
      ) : (
        <Card style={styles.card}>
          <AppText variant="subtitle">{t('handover.buyer.intro')}</AppText>
          <View style={styles.checks}>
            <CheckRow label={t('handover.buyer.vehicle')} checked={checks.vehicle} onToggle={toggle('vehicle')} />
            <CheckRow label={t('handover.buyer.keys')} checked={checks.keys} onToggle={toggle('keys')} />
            <CheckRow label={t('handover.buyer.documents')} checked={checks.documents} onToggle={toggle('documents')} />
          </View>
          {error ? (
            <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}
          <Button
            title={t(busy === 'confirm' ? 'handover.buyer.confirming' : 'handover.buyer.confirm')}
            onPress={() => run('confirm', () => confirmHandover(key, checks), 'confirmed')}
            loading={busy === 'confirm'}
            disabled={!allTicked || !!busy}
          />
          <Button
            title={t('handover.buyer.problem')}
            variant="ghost"
            size="md"
            onPress={() => {
              setProblem(true);
              setError('');
            }}
            disabled={!!busy}
          />
        </Card>
      )}
    </ScreenContainer>
  );
}

const ICON = ms(56);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  flex: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checks: {
    gap: spacing.md,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  action: {
    marginTop: spacing.lg,
  },
  resultIcon: {
    width: ICON,
    height: ICON,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultOk: {
    backgroundColor: colors.successLight,
  },
  resultInfo: {
    backgroundColor: colors.dangerLight,
  },
});

export default HandoverConfirm;
