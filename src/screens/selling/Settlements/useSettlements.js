import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useRemoteData from '../../../hooks/useRemoteData';
import { listSettlements, openSettlementReceipt } from '../../../api/services/payout.api';
import { toRupees } from '../../../api/mappers/money';
import { formatINR } from '../../../utils/format';
import { tNow } from '../../../i18n';

// Paise -> "₹1,23,456" (whole rupees, as the web).
export const formatMinor = minor => formatINR(toRupees(minor ?? 0));

// The web's honest figures: only money that has moved (PAID) is "paid to you";
// PENDING is held, never a projection. Sums are in paise.
export const settlementSummary = list => {
  const sum = status =>
    list.filter(s => s.status === status).reduce((total, s) => total + (s.amountMinor ?? 0), 0);
  return { paidMinor: sum('PAID'), heldMinor: sum('PENDING'), count: list.length };
};

// The seller's settlement ledger, its summary, and opening a receipt.
// Returns { ...useRemoteData, summary, openingId, receiptError: { id, message }, openReceipt(settlement) }.
export default function useSettlements() {
  const remote = useRemoteData(listSettlements);
  const [openingId, setOpeningId] = useState(null);
  const [receiptError, setReceiptError] = useState(null);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const summary = useMemo(() => settlementSummary(remote.data ?? []), [remote.data]);

  const openReceipt = useCallback(
    async settlement => {
      if (openingId) return;
      setOpeningId(settlement.id);
      setReceiptError(null);
      try {
        await openSettlementReceipt(settlement.id);
      } catch (e) {
        if (mounted.current) {
          setReceiptError({ id: settlement.id, message: e?.message || tNow('payouts.settle.receiptError') });
        }
      } finally {
        if (mounted.current) setOpeningId(null);
      }
    },
    [openingId],
  );

  return { ...remote, summary, openingId, receiptError, openReceipt };
}
