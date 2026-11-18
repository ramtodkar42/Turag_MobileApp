import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { AppText, Button, Icon, QrCode } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { handoverQrValue, startHandover } from '../../../../api/services/handover.api';
import { getOrder } from '../../../../api/services/offer.api';

// While the code is showing, check this often whether the buyer has confirmed.
const CHECK_EVERY_MS = 4000;

// "9:42" from milliseconds left.
const clock = left => {
  const total = Math.max(0, Math.ceil(left / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

// The seller's side of the handover (the web's HandoverQrPanel, ADR-0097): only the
// buyer can confirm it now, by scanning this QR (or typing the code under it) and
// ticking the vehicle, keys and original documents. "Start handover" is open once
// the transfer forms are in (ready). The code lasts 10 minutes; "Show a new code"
// replaces it. While it shows, the order is checked every few seconds and, once the
// buyer confirms, onHandedOver() reloads the page.
function HandoverQrPanel({ orderId, ready, onHandedOver, style }) {
  const t = useT();
  const [code, setCode] = useState(null); // { token, shortCode, expiresAt }
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  const alive = useRef(true);
  const finished = useRef(onHandedOver);
  finished.current = onHandedOver;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const expired = !!code && now >= code.expiresAt;
  const waiting = !!code && !expired && !done;

  const start = async () => {
    setStarting(true);
    setError('');
    try {
      const next = await startHandover(orderId);
      if (!alive.current) return;
      setCode(next);
      setNow(Date.now());
    } catch (e) {
      if (alive.current) setError(e.message || t('offers.error.action'));
    } finally {
      if (alive.current) setStarting(false);
    }
  };

  // Has the buyer confirmed? (A failed check just waits for the next one.)
  const check = useCallback(async () => {
    const order = await getOrder(orderId).catch(() => null);
    if (!alive.current || !order) return;
    if (order.status === 'HANDED_OVER' || order.status === 'COMPLETED') {
      setDone(true);
      finished.current?.();
    }
  }, [orderId]);

  // The countdown, and the check, while the code is live.
  useEffect(() => {
    if (!waiting) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(check, CHECK_EVERY_MS);
    const appState = AppState.addEventListener('change', next => next === 'active' && check());
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      appState.remove();
    };
  }, [waiting, check]);

  return (
    <View style={[styles.wrap, style]}>
      <AppText variant="title">{t('handover.seller.title')}</AppText>
      <AppText variant="caption" color={colors.body}>
        {t('handover.seller.intro')}
      </AppText>

      {done ? (
        <View style={styles.done} accessibilityLiveRegion="polite">
          <Icon name="check" size={ms(18)} color={colors.success} strokeWidth={2.6} />
          <AppText variant="label" color={colors.success} style={styles.flex}>
            {t('handover.seller.done')}
          </AppText>
        </View>
      ) : null}

      {code && !done ? (
        <View style={styles.codeBox}>
          {expired ? (
            <AppText variant="label" color={colors.danger} align="center" accessibilityLiveRegion="polite">
              {t('handover.seller.expired')}
            </AppText>
          ) : (
            <>
              <QrCode value={handoverQrValue(code.token)} size={ms(200)} label={t('handover.seller.qrAria')} />
              <AppText variant="caption" color={colors.body} align="center">
                {t('handover.seller.codeLabel')}
              </AppText>
              <AppText selectable style={styles.shortCode} accessibilityLabel={code.shortCode.split('').join(' ')}>
                {code.shortCode}
              </AppText>
              <AppText variant="caption" color={colors.muted} align="center">
                {t('handover.seller.expiresIn', { time: clock(code.expiresAt - now) })}
              </AppText>
              <View style={styles.waiting} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={colors.primary} />
                <AppText variant="caption" color={colors.body}>
                  {t('handover.seller.waiting')}
                </AppText>
              </View>
            </>
          )}
        </View>
      ) : null}

      {!done && (!code || expired) ? (
        <>
          <Button
            title={t(starting ? 'handover.seller.starting' : code ? 'handover.seller.newCode' : 'handover.seller.start')}
            onPress={start}
            loading={starting}
            disabled={!ready || starting}
          />
          {!ready ? (
            <AppText variant="caption" align="center">
              {t('selling.handover.needForms')}
            </AppText>
          ) : null}
        </>
      ) : null}

      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}

      {code ? (
        <AppText variant="caption" color={colors.muted}>
          {t('handover.seller.issueHint')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  codeBox: {
    gap: spacing.sm,
    alignItems: 'stretch',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  shortCode: {
    fontFamily: fonts.title.bold,
    fontSize: fs(28),
    lineHeight: fs(34),
    letterSpacing: fs(6),
    textAlign: 'center',
    color: colors.heading,
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.successLight,
  },
});

export default HandoverQrPanel;
