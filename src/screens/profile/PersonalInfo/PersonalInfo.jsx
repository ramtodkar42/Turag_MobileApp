import { ActivityIndicator, StyleSheet, Switch } from 'react-native';
import { AppText, Badge, Header, KeyValueCard, ScreenContainer } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { useUser } from '../../../store/userStore';
import { ROLES } from '../../../constants/roles';
import { LANGUAGES, useLanguage, useT } from '../../../i18n';
import useAvatarSource from '../../../hooks/useAvatarSource';
import ProfileHeader from './components/ProfileHeader';
import usePersonalInfo from './usePersonalInfo';
import useProfilePhoto from './useProfilePhoto';

const ROLE_KEYS = {
  [ROLES.INDIVIDUAL]: 'profile.role.individual',
  [ROLES.INSPECTOR]: 'profile.role.inspector',
};

// Consent ids from the backend (and the mock) -> i18n key.
const CONSENT_KEYS = {
  ACCOUNT_TERMS: 'profile.consent.ACCOUNT_TERMS',
  terms: 'profile.consent.ACCOUNT_TERMS',
  PRIVACY_POLICY: 'profile.consent.PRIVACY_POLICY',
  privacy: 'profile.consent.PRIVACY_POLICY',
  MARKETING: 'profile.consent.MARKETING',
  marketing: 'profile.consent.MARKETING',
};

// Profile > Personal Information: name/photo, account details and consents.
function PersonalInfo({ navigation }) {
  const t = useT();
  const language = useLanguage();
  const user = useUser();
  const { profile, loading, error, setMarketing, savingMarketing, marketingError } = usePersonalInfo();
  const languageName = LANGUAGES.find(l => l.code === language)?.nativeName;
  // The photo saved on the account (shows on every phone and the web).
  const photoSource = useAvatarSource(user?.avatarUrl);
  const photo = useProfilePhoto();

  const cardTitle = text => (
    <AppText variant="title" style={styles.cardTitle}>
      {text}
    </AppText>
  );

  return (
    <ScreenContainer scroll header={<Header onBack={navigation.goBack} />}>
      <ProfileHeader
        name={user?.fullName || t('profile.fallbackName')}
        role={t(ROLE_KEYS[user?.role] ?? ROLE_KEYS[ROLES.INDIVIDUAL])}
        photoSource={photoSource}
        onChangePhoto={photo.change}
        uploading={photo.uploading}
        error={photo.error}
      />

      {loading ? <ActivityIndicator color={colors.primary} style={styles.status} /> : null}
      {error ? (
        <AppText variant="subtitle" color={colors.danger} style={styles.status}>
          {error}
        </AppText>
      ) : null}

      {profile ? (
        <>
          <KeyValueCard
            dense
            header={cardTitle(t('profile.info.details'))}
            rows={[
              { label: t('profile.info.mobile'), value: profile.mobile },
              { label: t('profile.info.accountId'), value: profile.accountId },
              { label: t('profile.info.language'), value: languageName },
            ]}
            style={styles.card}
          />
          <KeyValueCard
            dense
            header={cardTitle(t('profile.info.consents'))}
            rows={profile.consents.map(consent => ({
              label: CONSENT_KEYS[consent.key] ? t(CONSENT_KEYS[consent.key]) : consent.label,
              // Marketing is the only optional one (as the web): an on / off switch.
              value:
                consent.key === 'MARKETING' ? (
                  <Switch
                    value={consent.verified}
                    onValueChange={setMarketing}
                    disabled={savingMarketing}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.white}
                    ios_backgroundColor={colors.border}
                    accessibilityLabel={t('profile.info.marketingSwitch')}
                  />
                ) : (
                  <Badge
                    label={consent.verified ? t('profile.info.verified') : t('profile.info.pending')}
                    tone={consent.verified ? 'success' : 'warning'}
                    size="sm"
                  />
                ),
            }))}
            style={styles.card}
          />
          <AppText variant="caption" style={styles.note}>
            {t('profile.info.marketingNote')}
          </AppText>
          {marketingError ? (
            <AppText variant="caption" color={colors.danger} style={styles.note}>
              {marketingError}
            </AppText>
          ) : null}
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
  },
  cardTitle: {
    marginBottom: spacing.xs,
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  status: {
    marginTop: spacing.xl,
  },
  note: {
    marginTop: spacing.sm,
  },
});

export default PersonalInfo;
