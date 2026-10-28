// The token refund in words (ADR-0051, as the web's TokenCancelPanel). Only
// the server's numbers are shown - nothing is worked out here.
import { formatINR } from '../../../utils/format';
import { formatDayTime } from '../../../utils/date';

// Before cancelling a paid order: what cancelling right now would refund, and
// when that goes down. quote: order.token.quote (null when the server had none:
// never claim "no refund" then).
export const cancelQuoteText = (quote, t, language) => {
  let text;
  if (quote && quote.refund > 0) {
    text = t('offers.cancelPaid.refundNow', {
      refund: formatINR(quote.refund),
      percent: String(quote.refundPercent),
      retained: formatINR(quote.retained),
    });
  } else if (quote) {
    text = t('offers.cancelPaid.noRefund');
  } else {
    text = t('offers.cancelPaid.refundUnknown');
  }
  return quote?.nextChangeAt
    ? `${text}\n\n${t('offers.cancelPaid.dropsAt', { time: formatDayTime(quote.nextChangeAt, language) })}`
    : text;
};

// After a paid order was cancelled: what was refunded (null when the order
// wasn't paid, so there's nothing to say).
export const refundOutcomeText = (refund, t) => {
  if (!refund) {
    return null;
  }
  return refund.refund > 0
    ? t('offers.cancelPaid.refunded', { refund: formatINR(refund.refund), percent: String(refund.refundPercent) })
    : t('offers.cancelPaid.notRefunded');
};
