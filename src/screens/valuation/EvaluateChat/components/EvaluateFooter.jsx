import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, ButtonRow, InspectionConsent } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ROUTES } from '../../../../navigation/routes';
import { useT } from '../../../../i18n';
import { ACCIDENT_OPTIONS } from '../../constants';
import SaveVehicleButton from '../../components/SaveVehicleButton';
import { OWNER_CHOICES, STEPS } from '../steps';
import AnswerInput from './AnswerInput';
import QuickReplies from './QuickReplies';

// Under the Evaluate chat: what the user can answer now (chat: useEvaluateChat).
// Nothing while TURAG.AI is replying.
function EvaluateFooter({ chat, navigation }) {
  const t = useT();
  const [saveError, setSaveError] = useState('');
  const [consent, setConsent] = useState(false);
  const openPolicy = () =>
    navigation.navigate(ROUTES.WEB_PAGE, { title: t('profile.item.privacyPolicy'), path: '/privacy_policy' });

  switch (chat.step) {
    case STEPS.REG:
      return <AnswerInput key="reg" kind="reg" onSubmit={chat.submitReg} />;
    case STEPS.CONFIRM:
      return (
        <QuickReplies
          options={[
            { key: 'no', label: t('valuation.confirm.no'), onPress: () => chat.confirm(false) },
            { key: 'yes', label: t('valuation.confirm.yes'), onPress: () => chat.confirm(true), primary: true },
          ]}
        />
      );
    case STEPS.KM:
      return <AnswerInput key="km" kind="km" onSubmit={chat.submitKm} />;
    case STEPS.OWNERS:
      return (
        <View style={styles.stack}>
          <QuickReplies
            options={OWNER_CHOICES.map(count => ({
              key: String(count),
              label: String(count),
              onPress: () => chat.submitOwners(count),
            }))}
          />
          <AnswerInput key="owners" kind="owners" onSubmit={chat.submitOwners} />
        </View>
      );
    case STEPS.ACCIDENT:
      return (
        <QuickReplies
          options={ACCIDENT_OPTIONS.map(option => ({
            key: option.value,
            label: t(option.labelKey),
            onPress: () => chat.pickAccident(option.value),
          }))}
        />
      );
    case STEPS.RESULT:
      return (
        <View>
          {saveError ? (
            <AppText variant="caption" color={colors.danger} align="center" style={styles.error}>
              {saveError}
            </AppText>
          ) : null}
          <ButtonRow>
            <SaveVehicleButton
              navigation={navigation}
              vehicle={chat.vehicle}
              valuation={chat.valuation}
              onError={setSaveError}
              style={styles.flex}
            />
            <Button title={t('valuation.estimate.inspect')} onPress={chat.inspect} style={styles.flex} />
          </ButtonRow>
        </View>
      );
    case STEPS.MODE:
      return (
        <QuickReplies
          options={[
            ...(chat.canSelfInspect
              ? [{ key: 'self', label: t('valuation.mode.self'), onPress: chat.chooseSelf, primary: true }]
              : []),
            { key: 'inspector', label: t('valuation.mode.inspector'), onPress: chat.chooseInspector },
          ]}
        />
      );
    case STEPS.SELF:
      return (
        <View style={styles.stack}>
          {/* As the web: the self-inspection starts only once the consent is ticked. */}
          <InspectionConsent
            checked={consent}
            onToggle={() => setConsent(c => !c)}
            onOpenPolicy={openPolicy}
            style={styles.consent}
          />
          <Button
            title={t('valuation.self.start')}
            onPress={() => chat.startSelf(consent)}
            loading={chat.starting}
            disabled={!consent}
          />
          <Button
            title={t('valuation.mode.inspector')}
            variant="outline"
            onPress={chat.chooseInspector}
            disabled={chat.starting}
          />
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  error: {
    marginBottom: spacing.sm,
  },
  consent: {
    marginBottom: spacing.xs,
  },
  // Two buttons share the row, so less side padding keeps labels on one line.
  flex: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
});

export default EvaluateFooter;
