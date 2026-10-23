import { tNow } from '../../../i18n';
import { formatDateTime } from '../../../utils/date';

const stamp = time => (time ? formatDateTime(time) : null);

// The offer's progress, from the server's facts only (as the web's
// buildTimeline): placed -> countered -> accepted -> token paid -> handover ->
// completed. A declined / withdrawn / expired offer ends there.
// Returns [{ label, caption, state: 'done' | 'current' | 'pending' }].
export const buildOfferTimeline = (offer, order) => {
  const steps = [{ label: tNow('offers.tl.placed'), caption: stamp(offer.createdAt), state: 'done' }];

  if (['DECLINED', 'WITHDRAWN', 'EXPIRED'].includes(offer.status)) {
    steps.push({ label: tNow(`offers.status.${offer.status}`), caption: stamp(offer.updatedAt), state: 'done' });
    return steps;
  }

  const last = offer.history[offer.history.length - 1];
  if (last) {
    steps.push({
      label: tNow(last.by === 'SELLER' ? 'offers.tl.sellerCountered' : 'offers.tl.youCountered'),
      caption: stamp(last.at),
      state: 'done',
    });
  }

  if (offer.status !== 'ACCEPTED') {
    steps.push({
      label: tNow(offer.status === 'COUNTERED' ? 'offers.tl.reviewCounter' : 'offers.tl.awaitingSeller'),
      state: 'current',
    });
    steps.push({ label: tNow('offers.tl.accepted'), state: 'pending' });
    return steps;
  }

  steps.push({ label: tNow('offers.tl.accepted'), caption: stamp(order?.createdAt ?? offer.updatedAt), state: 'done' });
  const status = order?.status ?? 'CREATED';
  if (status === 'CANCELLED') {
    steps.push({ label: tNow('offers.order.CANCELLED'), caption: stamp(order?.updatedAt), state: 'done' });
    return steps;
  }
  if (status === 'CREATED') {
    steps.push({ label: tNow('offers.tl.payToken'), caption: tNow('offers.tl.payTokenHint'), state: 'current' });
    steps.push({ label: tNow('offers.tl.handover'), state: 'pending' });
    return steps;
  }
  steps.push({ label: tNow('offers.order.TOKEN_PAID'), state: 'done' });
  if (status === 'TOKEN_PAID') {
    steps.push({ label: tNow('offers.tl.handover'), caption: tNow('offers.tl.awaitingHandover'), state: 'current' });
    return steps;
  }
  steps.push({
    label: tNow('offers.order.HANDED_OVER'),
    caption: stamp(order?.handoverAt),
    state: status === 'HANDED_OVER' ? 'current' : 'done',
  });
  if (status === 'COMPLETED') steps.push({ label: tNow('offers.order.COMPLETED'), state: 'done' });
  return steps;
};
