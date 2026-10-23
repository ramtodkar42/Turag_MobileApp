// How the fee can be paid, in the payment screen's sections. All of them go
// through the backend's payment for the booking; the chosen one opens straight
// in Razorpay's checkout (booking.api RAZORPAY_METHOD), which then takes the
// UPI app / card / bank. Pay on delivery isn't offered: the backend only
// confirms a booking once its fee is paid.
export const PAYMENT_SECTIONS = [
  {
    titleKey: 'booking.payment.upiTitle',
    methods: [
      { key: 'UPI', icon: 'phone', titleKey: 'booking.payment.upi', subtitleKey: 'booking.payment.upiHint' },
      { key: 'CARD', icon: 'plus', titleKey: 'booking.payment.card', subtitleKey: 'booking.payment.cardHint' },
    ],
  },
  {
    titleKey: 'booking.payment.optionsTitle',
    methods: [
      {
        key: 'NET_BANKING',
        icon: 'bank',
        titleKey: 'booking.payment.netBanking',
        subtitleKey: 'booking.payment.netBankingHint',
      },
    ],
  },
];

export const DEFAULT_METHOD = 'UPI';
