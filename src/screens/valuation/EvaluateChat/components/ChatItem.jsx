import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { FadeIn } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import ValueAccuracyPrompt from '../../../insights/ValueAccuracyPrompt';
import MessageBubble from '../../../chat/Chat/components/MessageBubble';
import UserMessage from '../../../chat/Chat/components/UserMessage';
import EstimateResultCard from '../../components/EstimateResultCard';
import SelfInspectionIntro from '../../components/SelfInspectionIntro';
import BotRow from './BotRow';
import VehicleCard from './VehicleCard';

// One message of the Evaluate chat (see useEvaluateChat), fading in.
function ChatItem({ message }) {
  let content;
  if (message.role === 'user') {
    content = <UserMessage message={message} />;
  } else if (message.kind === 'vehicle') {
    content = (
      <BotRow wide>
        <VehicleCard vehicle={message.vehicle} />
      </BotRow>
    );
  } else if (message.kind === 'estimate') {
    content = (
      <BotRow wide>
        <EstimateResultCard
          vehicle={message.vehicle}
          valuation={message.valuation}
          label={message.label}
          description={message.description}
          summary={message.summary}
          showTier={message.showTier}
        >
          {message.askAccuracy ? <ValueAccuracyPrompt valuationId={message.valuation?.valuationId} style={styles.accuracy} /> : null}
        </EstimateResultCard>
      </BotRow>
    );
  } else if (message.kind === 'selfIntro') {
    content = (
      <BotRow wide>
        <SelfInspectionIntro />
      </BotRow>
    );
  } else {
    content = (
      <BotRow>
        <MessageBubble tone="bot" text={message.text} />
      </BotRow>
    );
  }
  return <FadeIn>{content}</FadeIn>;
}

const styles = StyleSheet.create({
  accuracy: {
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});

export default memo(ChatItem);
