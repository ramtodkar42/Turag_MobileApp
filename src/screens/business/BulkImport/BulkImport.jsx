import { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  AppText,
  Button,
  Header,
  Icon,
  InfoNote,
  ScreenContainer,
  TextField,
  TitledCard,
  UploadRow,
} from '../../../components';
import { colors, fonts, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { formatFileSize } from '../../../utils/format';
import { copyToClipboard } from '../../../utils/clipboard';
import { INTAKE_CSV_TEMPLATE } from '../../../api/services/business.api';
import { useT } from '../../../i18n';
import OrgSummary from '../components/OrgSummary';
import { BUSINESS_ROUTES } from '../routes';
import useBulkImport from './useBulkImport';

// Bulk import repo stock (as the web's /institutional/import): pick a CSV of
// repossessed vehicles, enter the lot's SARFAESI authority document key, and
// import. Each row becomes a repo intake - no money, no listing. The server
// processes it straight away; the job's per-row results open next.
// The web's "Download template" becomes "Copy template" (the CSV text).
// params: { org }
function BulkImport({ navigation, route }) {
  const t = useT();
  const { org } = route.params;
  const form = useBulkImport(org.id);
  const [copied, setCopied] = useState(false);

  const onImport = async () => {
    const job = await form.submit();
    if (job) {
      navigation.replace(BUSINESS_ROUTES.IMPORT_JOB, { orgId: org.id, importId: job.id, job });
    }
  };

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={navigation.goBack} title={t('business.import.title')} />}
      footer={<Button title={t('business.import.submit')} loading={form.busy} onPress={onImport} />}
    >
      <AppText variant="subtitle" style={styles.intro}>
        {t('business.import.intro')}
      </AppText>
      <OrgSummary org={org} style={styles.block} />

      <UploadRow
        title={t('business.import.csv')}
        subtitle={
          form.file
            ? `${form.file.fileName}${form.file.fileSize ? ` · ${formatFileSize(form.file.fileSize)}` : ''}`
            : t('business.import.csvHint')
        }
        icon={<Icon name="document" size={ms(20)} color={colors.body} />}
        uploaded={!!form.file}
        loading={form.picking}
        uploadLabel={t('business.import.choose')}
        onUpload={form.chooseFile}
        style={styles.block}
      />

      <TextField
        label={t('business.import.authorityKey')}
        value={form.authorityKey}
        onChangeText={form.changeKey}
        placeholder="intake-imports/<org>/authority.pdf"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={1024}
        style={styles.block}
      />
      <InfoNote style={styles.note}>{t('business.import.authorityHint')}</InfoNote>

      {form.error ? (
        <AppText variant="caption" color={colors.danger} style={styles.block}>
          {form.error}
        </AppText>
      ) : null}

      <TitledCard
        title={t('business.import.template')}
        style={styles.block}
        right={
          <Button
            title={t(copied ? 'business.import.copied' : 'business.import.copyTemplate')}
            variant="outline"
            size="sm"
            onPress={() => setCopied(copyToClipboard(INTAKE_CSV_TEMPLATE))}
          />
        }
      >
        <AppText variant="caption" style={styles.note}>
          {t('business.import.templateHint')}
        </AppText>
        <AppText variant="caption" color={colors.heading} style={styles.headers} selectable>
          {INTAKE_CSV_TEMPLATE.split('\n')[0]}
        </AppText>
      </TitledCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: spacing.sm,
  },
  block: {
    marginTop: spacing.lg,
  },
  note: {
    marginTop: spacing.xs,
  },
  headers: {
    marginTop: spacing.sm,
    fontFamily: fonts.subtitle.regular,
    fontSize: fs(12),
    lineHeight: fs(18),
  },
});

export default BulkImport;
