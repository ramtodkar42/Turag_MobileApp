import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppRefreshControl,
  AppText,
  Button,
  CardListSkeleton,
  ChoiceChip,
  Header,
  HeaderCard,
  OptionSheet,
  ScreenContainer,
  TextField,
  TitledCard,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { useT } from '../../../i18n';
import { requiredDocuments } from '../../../api/services/dealerApplication.api';
import useDealerApply from './useDealerApply';
import { MAX_LENGTH } from './dealerApplyForm';
import StatusNote from './components/StatusNote';
import DocumentRow from './components/DocumentRow';

const DOC_LABELS = {
  PAN: 'dealerApply.doc.pan',
  AADHAAR: 'dealerApply.doc.aadhaar',
  SHOP_ACT: 'dealerApply.doc.shopAct',
  UDYAM: 'dealerApply.doc.udyam',
};

// Where the application stands, once sent (as the web): { tone, messageKey, detail }.
const statusNoteFor = application => {
  switch (application?.status) {
    case 'ONBOARDED':
      return { tone: 'success', messageKey: 'dealerApply.status.onboarded', detailKey: 'dealerApply.status.onboardedHint' };
    case 'PENDING_REVIEW':
    case 'VERIFIED':
      return { tone: 'info', messageKey: 'dealerApply.status.review' };
    case 'CHANGES_NEEDED':
      return { tone: 'warning', messageKey: 'dealerApply.status.changes', detail: application.statusReason };
    case 'REJECTED':
      return { tone: 'danger', messageKey: 'dealerApply.status.rejected', detail: application.statusReason };
    default:
      return null;
  }
};

// Become a dealer (ADR-0101, as the web's /dealer/apply): business and
// showroom details, then the KYC documents (PAN, Aadhaar, Shop Act licence or
// Udyam certificate - a photo or a PDF), then "Submit for review". Turag's
// team verifies them; the account becomes a dealer once it's approved. Opened
// after a dealer sign-up ("Add your documents") and from Profile.
function DealerApply({ navigation }) {
  const t = useT();
  const d = useDealerApply();
  const { application: app, form, setField, fieldErrors, error } = d;
  const [sheetFor, setSheetFor] = useState(null);
  const editable = !app || app.editable;
  const busy = d.saving || d.submitting || !!d.uploading;

  // The documents for the registration chosen in the form; submit needs the
  // ones for the saved registration.
  const docs = requiredDocuments(form.registrationType);
  const byType = new Map((app?.documents ?? []).map(doc => [doc.docType, doc]));
  const ready = !!app && requiredDocuments(app.registrationType).every(type => byType.has(type));
  const note = statusNoteFor(app);

  const field = (name, label, props = {}) => (
    <TextField
      label={t(label)}
      value={form[name]}
      onChangeText={setField(name)}
      error={fieldErrors[name] ? t(fieldErrors[name]) : ''}
      maxLength={MAX_LENGTH[name]}
      editable={!d.saving}
      {...props}
    />
  );

  const errorFor = where =>
    error?.where === where ? <StatusNote tone="danger" message={error.text} style={styles.note} /> : null;

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={navigation.goBack} />}
      refreshControl={<AppRefreshControl refreshing={d.refreshing} onRefresh={d.refresh} />}
      footer={
        editable && !d.loading && !d.loadError ? (
          <Button
            title={t('dealerApply.submit')}
            onPress={d.submit}
            loading={d.submitting}
            disabled={!ready || busy}
          />
        ) : null
      }
    >
      <HeaderCard title={t('dealerApply.title')} subtitle={t('dealerApply.subtitle')} style={styles.card} />

      {d.loading ? <CardListSkeleton cards={[6, 3]} style={styles.card} /> : null}

      {d.loadError && !d.loading ? (
        <View style={styles.card}>
          <StatusNote tone="danger" message={d.loadError} />
          <Button title={t('common.retry')} variant="outline" size="md" fullWidth={false} onPress={d.reload} style={styles.retry} />
        </View>
      ) : null}

      {note ? (
        <StatusNote
          tone={note.tone}
          message={t(note.messageKey)}
          detail={note.detailKey ? t(note.detailKey) : note.detail}
          style={styles.card}
        />
      ) : null}

      {!d.loading && !d.loadError && editable ? (
        <>
          <TitledCard title={t('dealerApply.details.title')} style={styles.card}>
            <View style={styles.fields}>
              {field('businessName', 'dealerApply.field.businessName', { autoCapitalize: 'words' })}
              {field('ownerName', 'dealerApply.field.ownerName', { autoCapitalize: 'words', textContentType: 'name' })}
              {field('email', 'dealerApply.field.email', {
                keyboardType: 'email-address',
                autoCapitalize: 'none',
                autoCorrect: false,
                textContentType: 'emailAddress',
              })}
              {field('addressLine', 'dealerApply.field.address', { optional: true })}
              {field('city', 'dealerApply.field.city', { autoCapitalize: 'words' })}
              {field('state', 'dealerApply.field.state', { autoCapitalize: 'words' })}
              {field('pinCode', 'dealerApply.field.pinCode', { keyboardType: 'number-pad' })}
              {field('pan', 'dealerApply.field.pan', { autoCapitalize: 'characters', autoCorrect: false, placeholder: 'ABCDE1234F' })}
              {field('gstin', 'dealerApply.field.gstin', { autoCapitalize: 'characters', autoCorrect: false, optional: true })}

              <View>
                <AppText variant="caption">{t('dealerApply.field.registrationType')}</AppText>
                <View style={styles.chips}>
                  <ChoiceChip
                    label={t('dealerApply.doc.shopAct')}
                    selected={form.registrationType === 'SHOP_ACT'}
                    onPress={() => setField('registrationType')('SHOP_ACT')}
                  />
                  <ChoiceChip
                    label={t('dealerApply.doc.udyamShort')}
                    selected={form.registrationType === 'UDYAM'}
                    onPress={() => setField('registrationType')('UDYAM')}
                  />
                </View>
              </View>
              {field('registrationNumber', 'dealerApply.field.registrationNumber', {
                autoCapitalize: 'characters',
                autoCorrect: false,
                placeholder: form.registrationType === 'UDYAM' ? 'UDYAM-MH-00-0000000' : undefined,
              })}
              {field('aadhaarNumber', 'dealerApply.field.aadhaar', { keyboardType: 'number-pad', placeholder: 'XXXX XXXX XXXX' })}
              {app?.aadhaarMasked ? (
                <AppText variant="caption" style={styles.hint}>
                  {t('dealerApply.field.aadhaarOnFile', { masked: app.aadhaarMasked })}
                </AppText>
              ) : null}
            </View>

            {d.saved ? <StatusNote tone="success" message={t('dealerApply.details.saved')} style={styles.note} /> : null}
            {errorFor('details')}
            <Button
              title={t('dealerApply.details.save')}
              variant="outline"
              size="md"
              onPress={d.save}
              loading={d.saving}
              disabled={busy}
              style={styles.save}
            />
          </TitledCard>

          <TitledCard title={t('dealerApply.docs.title')} style={styles.card}>
            <AppText variant="caption" style={styles.docsHelp}>
              {t(app ? 'dealerApply.docs.help' : 'dealerApply.docs.saveFirst')}
            </AppText>
            {docs.map((type, i) => (
              <DocumentRow
                key={type}
                label={t(DOC_LABELS[type])}
                document={byType.get(type) ?? null}
                disabled={!app || busy}
                loading={d.uploading === type}
                onUpload={() => setSheetFor(type)}
                showDivider={i > 0}
              />
            ))}
            {errorFor('docs')}
          </TitledCard>

          {errorFor('submit')}
          {!ready && app ? (
            <AppText variant="caption" style={styles.card}>
              {t('dealerApply.submitHint')}
            </AppText>
          ) : null}
        </>
      ) : null}

      <OptionSheet
        visible={!!sheetFor}
        title={sheetFor ? t(DOC_LABELS[sheetFor]) : ''}
        options={[
          { value: 'camera', label: t('dealerApply.doc.camera') },
          { value: 'gallery', label: t('dealerApply.doc.gallery') },
          { value: 'pdf', label: t('dealerApply.doc.pdf') },
        ]}
        onSelect={source => d.upload(sheetFor, source)}
        onClose={() => setSheetFor(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  fields: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  hint: {
    marginTop: -spacing.sm,
  },
  note: {
    marginTop: spacing.md,
  },
  save: {
    marginTop: spacing.md,
  },
  retry: {
    marginTop: spacing.md,
  },
  docsHelp: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    color: colors.body,
  },
});

export default DealerApply;
