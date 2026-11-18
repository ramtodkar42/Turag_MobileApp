import { Button, Icon } from '../../../components';
import { colors } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';

// Whether an order has a buyer-seller chat to show (as the web's orderChatVisible): from
// the token payment on; after a cancellation only if the token was paid (there was a chat).
export const orderChatVisible = order => {
  if (!order) return false;
  if (order.status === 'TOKEN_PAID' || order.status === 'HANDED_OVER' || order.status === 'COMPLETED') return true;
  return order.status === 'CANCELLED' && order.token != null;
};

// Opens the buyer-seller chat on an order: "Message the seller" (buyer) / "Message the
// buyer" (seller), or "View messages" once the order is closed (read-only).
// role: 'BUYER' | 'SELLER'.
function OrderChatButton({ role, readOnly = false, onPress, style }) {
  const t = useT();
  let title = t(role === 'SELLER' ? 'orderChat.titleSeller' : 'orderChat.titleBuyer');
  if (readOnly) title = t('orderChat.view');
  return (
    <Button
      title={title}
      variant="outline"
      size="md"
      fullWidth
      leftIcon={<Icon name="messageCircle" size={ms(18)} color={colors.primary} />}
      onPress={onPress}
      style={style}
    />
  );
}

export default OrderChatButton;
