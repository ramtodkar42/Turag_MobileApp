import { memo } from 'react';
import { FadeIn } from '../../../../components';
import MessageBubble from '../../../chat/Chat/components/MessageBubble';
import UserMessage from '../../../chat/Chat/components/UserMessage';
import EstimateSummary from '../../components/EstimateSummary';
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
        <EstimateSummary
          vehicle={message.vehicle}
          valuation={message.valuation}
          label={message.label}
          description={message.description}
        />
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

export default memo(ChatItem);
