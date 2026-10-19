import { ActivityIndicator, StyleSheet } from 'react-native';
import { AppText, Badge, Header, KeyValueCard, ScreenContainer } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { useUser } from '../../../store/userStore';
import { ROLES } from '../../../constants/roles';
import { LANGUAGES, useLanguage, useT } from '../../../i18n';
import ProfileHeader from './components/ProfileHeader';
import usePersonalInfo from './usePersonalInfo';

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
  const { profile, loading, error } = usePersonalInfo();
  const languageName = LANGUAGES.find(l => l.code === language)?.nativeName;

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
        photoUri={user?.photo?.uri}
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
              value: (
                <Badge
                  label={consent.verified ? t('profile.info.verified') : t('profile.info.pending')}
                  tone={consent.verified ? 'success' : 'warning'}
                  size="sm"
                />
              ),
            }))}
            style={styles.card}
          />
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
});

export default PersonalInfo;
