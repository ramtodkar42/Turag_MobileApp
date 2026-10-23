import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  ButtonRow,
  CheckRow,
  ChoiceChip,
  Header,
  HeaderCard,
  Icon,
  OptionSheet,
  ScreenContainer,
  TextField,
  TitledCard,
} from '../../../components';
import { colors, radius, spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import { DOCUMENTS } from './documents';
import useVerifyIdentity from './useVerifyIdentity';
import PhotoPreview from './components/PhotoPreview';

// Verify your identity - the web's booking step between "Pay now" and the
// payment window (ADR-0041): a government ID (Aadhaar, PAN or Driving
// Licence), its number, a selfie and a photo of it. Turag's team reviews it
// after the booking, so it never delays the visit. Submitting opens payment.
// Only shown when the user isn't verified yet (see usePayBooking).
// Also opened on its own from Profile > Identity verification (no booking):
// optional there, and submitting goes back to the status page.
// params: { booking (created, PENDING_PAYMENT), method } - passed on to payment; none from Profile.
function VerifyIdentity({ navigation, route }) {
  const t = useT();
  const { booking, method } = route.params ?? {};
  const standalone = !booking;
  const [docSheetOpen, setDocSheetOpen] = useState(false);
  const form = useVerifyIdentity({
    // Payment takes this screen's place: back from payment goes to the payment screen.
    onDone: () =>
      standalone ? navigation.goBack() : navigation.replace(ROUTES.PAYMENT_STATUS, { booking, method }),
  });
  const docLabel = t(`verify.doc.${form.docType}`);
  const showNumberError = form.number.length > 0 && !form.numberOk;

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={navigation.goBack} />}
      footer={
        <View style={styles.footer}>
          {form.error ? (
            <AppText variant="caption" color={colors.danger} align="center" accessibilityLiveRegion="polite">
              {form.error}
            </AppText>
          ) : (
            <AppText variant="caption" align="center">
              {t(standalone ? 'verify.reviewAfter' : 'verify.payAfter')}
            </AppText>
          )}
          <Button
            title={t(form.submitting ? 'verify.submitting' : 'verify.submit')}
            onPress={form.submit}
            loading={form.submitting}
            disabled={!form.canSubmit}
          />
        </View>
      }
    >
      <HeaderCard
        title={t('verify.title')}
        subtitle={t(standalone ? 'verify.subtitleOptional' : 'verify.subtitle')}
        style={styles.card}
      />

      {/* 1 · Document type */}
      <TitledCard title={t('verify.step.document')} style={styles.card}>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {DOCUMENTS.map(d => (
            <ChoiceChip
              key={d.type}
              label={t(`verify.doc.${d.type}`)}
              selected={form.docType === d.type}
              onPress={() => form.chooseDocType(d.type)}
              style={styles.chip}
            />
          ))}
        </View>
      </TitledCard>

      {/* 2 · Number */}
      <TitledCard title={t('verify.step.number', { doc: docLabel })} style={styles.card}>
        <TextField
          placeholder={form.doc.placeholder}
          value={form.number}
          onChangeText={form.changeNumber}
          keyboardType={form.doc.keyboardType}
          autoCapitalize={form.doc.autoCapitalize}
          autoCorrect={false}
          autoComplete="off"
          valid={form.numberOk}
          error={showNumberError ? t('verify.numberInvalid', { doc: docLabel }) : undefined}
          accessibilityLabel={t('verify.step.number', { doc: docLabel })}
          style={styles.inner}
        />
        {!showNumberError ? (
          <AppText variant="caption" style={styles.hint}>
            {t(`verify.hint.${form.docType}`)}
          </AppText>
        ) : null}
      </TitledCard>

      {/* 3 · Selfie */}
      <TitledCard title={t('verify.step.selfie')} style={styles.card}>
        <View style={styles.inner}>
          {form.selfie ? (
            <PhotoPreview
              uri={form.selfie.uri}
              square
              actionLabel={t('verify.retake')}
              onAction={() => form.pickSelfie('camera')}
              disabled={form.submitting}
              accessibilityLabel={t('verify.selfieAlt')}
            />
          ) : (
            <ButtonRow>
              <Button
                title={t('verify.openCamera')}
                size="md"
                fullWidth={false}
                leftIcon={<Icon name="camera" size={ms(16)} color={colors.white} />}
                onPress={() => form.pickSelfie('camera')}
                style={styles.flexWide}
              />
              <Button
                title={t('verify.upload')}
                variant="outline"
                size="md"
                fullWidth={false}
                onPress={() => form.pickSelfie('gallery')}
                style={styles.flex}
              />
            </ButtonRow>
          )}
        </View>
      </TitledCard>

      {/* 4 · Document photo */}
      <TitledCard title={t('verify.step.docPhoto', { doc: docLabel })} style={styles.card}>
        <View style={styles.inner}>
          {form.docImage ? (
            <PhotoPreview
              uri={form.docImage.uri}
              actionLabel={t('verify.change')}
              onAction={() => setDocSheetOpen(true)}
              disabled={form.submitting}
              accessibilityLabel={t('verify.docAlt', { doc: docLabel })}
            />
          ) : (
            <Pressable
              onPress={() => setDocSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('verify.addDocPhoto')}
              style={({ pressed }) => [styles.drop, pressed && styles.dropPressed]}
            >
              <Icon name="plus" size={ms(22)} color={colors.primary} />
              <AppText variant="label" color={colors.heading} align="center">
                {t('verify.addDocPhoto')}
              </AppText>
            </Pressable>
          )}
        </View>
        {form.photoError ? (
          <AppText variant="caption" color={colors.danger} style={styles.hint}>
            {form.photoError}
          </AppText>
        ) : null}
      </TitledCard>

      {/* Consent */}
      <CheckRow
        label={t('verify.consent', { doc: docLabel })}
        checked={form.consent}
        onToggle={form.toggleConsent}
        style={styles.consent}
      />

      <OptionSheet
        visible={docSheetOpen}
        title={t('verify.step.docPhoto', { doc: docLabel })}
        options={[
          { value: 'camera', label: t('verify.source.camera') },
          { value: 'gallery', label: t('verify.source.gallery') },
        ]}
        onSelect={form.pickDocImage}
        onClose={() => setDocSheetOpen(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  inner: {
    marginTop: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    flexGrow: 1,
  },
  hint: {
    marginTop: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  flexWide: {
    flex: 1.4,
  },
  drop: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: ms(110),
    padding: spacing.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.lg,
    backgroundColor: colors.unreadTint,
  },
  dropPressed: {
    backgroundColor: colors.dangerLight,
  },
  consent: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  footer: {
    gap: spacing.sm,
  },
});

export default VerifyIdentity;
