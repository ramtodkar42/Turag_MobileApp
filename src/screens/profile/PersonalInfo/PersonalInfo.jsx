import { StyleSheet, Switch, View } from 'react-native';
import {
  AppText,
  Badge,
  CardListSkeleton,
  KeyValueCard,
  ScreenContainer,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { useUser } from '../../../store/userStore';
import { ROLES } from '../../../constants/roles';
import { LANGUAGES, useLanguage, useT } from '../../../i18n';
import useAvatarSource from '../../../hooks/useAvatarSource';
import useStatusBarStyle from '../../../hooks/useStatusBarStyle';
import ProfileHeader from './components/ProfileHeader';
import usePersonalInfo from './usePersonalInfo';
import useProfilePhoto from './useProfilePhoto';
import useEmail from './useEmail';
import EmailCard from './components/EmailCard';

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
  WHATSAPP: 'profile.consent.WHATSAPP',
};

// The optional ones (as the web): an on / off switch each, its screen-reader
// label and the note under the card.
const SWITCHES = {
  MARKETING: {
    labelKey: 'profile.info.marketingSwitch',
    noteKey: 'profile.info.marketingNote',
  },
  WHATSAPP: {
    labelKey: 'profile.info.whatsappSwitch',
    noteKey: 'profile.info.whatsappNote',
  },
};

// The backend only returns a masked number; the 10-digit number typed at login
// is kept on this phone, so show that in full ("+91 98765 43210") when we have it.
const fullMobile = contact =>
  /^\d{10}$/.test(contact ?? '')
    ? `+91 ${contact.slice(0, 5)} ${contact.slice(5)}`
    : null;

// Profile > Personal Information: a red band with the name and contact, the
// photo half over its edge (change it there) and the role, then the account
// details and consents on a light grey page.
function PersonalInfo({ navigation }) {
  // White status bar icons over the red band.
  useStatusBarStyle('light-content');
  const t = useT();
  const language = useLanguage();
  const user = useUser();
  const {
    profile,
    loading,
    error,
    setConsent,
    saving,
    consentError,
    setEmail,
  } = usePersonalInfo();
  // The account's email (as the web): resend the link, or add / change it.
  const email = profile?.email || user?.email || '';
  const mail = useEmail({ email, onSaved: setEmail });
  const languageName = LANGUAGES.find(l => l.code === language)?.nativeName;
  // The photo saved on the account (shows on every phone and the web).
  const photoSource = useAvatarSource(user?.avatarUrl);
  const photo = useProfilePhoto();
  const mobile = fullMobile(user?.contact) ?? profile?.mobile;

  const cardTitle = text => (
    <AppText variant="title" style={styles.cardTitle}>
      {text}
    </AppText>
  );

  return (
    <ScreenContainer
      scroll
      padded={false}
      backgroundColor={colors.primary}
      contentStyle={styles.scroll}
    >
      <ProfileHeader
        name={user?.fullName || t('profile.fallbackName')}
        contact={user?.email || mobile}
        role={t(ROLE_KEYS[user?.role] ?? ROLE_KEYS[ROLES.INDIVIDUAL])}
        photoSource={photoSource}
        photo={photo}
        onBack={navigation.goBack}
      />

      <View style={styles.sheet}>
        {/* First load: the two cards' shape, as the app's other pages. */}
        {loading ? (
          <CardListSkeleton cards={[3, 3]} style={styles.card} />
        ) : null}
        {error ? (
          <AppText
            variant="subtitle"
            color={colors.danger}
            style={styles.status}
          >
            {error}
          </AppText>
        ) : null}

        {profile ? (
          <>
            <KeyValueCard
              dense
              header={cardTitle(t('profile.info.details'))}
              rows={[
                { label: t('profile.info.mobile'), value: mobile },
                {
                  label: t('profile.info.accountId'),
                  value: profile.accountId,
                },
                { label: t('profile.info.language'), value: languageName },
              ]}
              style={styles.card}
            />
            <EmailCard
              email={email}
              verified={!!profile.emailVerified}
              mail={mail}
              style={styles.card}
            />
            <KeyValueCard
              dense
              header={cardTitle(t('profile.info.consents'))}
              rows={profile.consents.map(consent => ({
                label: CONSENT_KEYS[consent.key]
                  ? t(CONSENT_KEYS[consent.key])
                  : consent.label,
                // Offers and updates / WhatsApp updates (optional): a switch.
                value: SWITCHES[consent.key] ? (
                  <Switch
                    value={consent.verified}
                    onValueChange={on => setConsent(consent.key, on)}
                    disabled={saving != null}
                    trackColor={{
                      false: colors.border,
                      true: colors.primary,
                    }}
                    thumbColor={colors.white}
                    ios_backgroundColor={colors.border}
                    accessibilityLabel={t(SWITCHES[consent.key].labelKey)}
                  />
                ) : (
                  <Badge
                    label={
                      consent.verified
                        ? t('profile.info.verified')
                        : t('profile.info.pending')
                    }
                    tone={consent.verified ? 'success' : 'warning'}
                    size="sm"
                  />
                ),
              }))}
              style={styles.card}
            />
            {Object.keys(SWITCHES)
              .filter(key => profile.consents.some(c => c.key === key))
              .map(key => (
                <AppText key={key} variant="caption" style={styles.note}>
                  {t(SWITCHES[key].noteKey)}
                </AppText>
              ))}
            {consentError ? (
              <AppText
                variant="caption"
                color={colors.danger}
                style={styles.note}
              >
                {consentError}
              </AppText>
            ) : null}
          </>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Grey to the end of the page, under the white profile section.
  scroll: {
    paddingBottom: 0,
    flexGrow: 1,
    backgroundColor: colors.input,
  },
  sheet: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
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
