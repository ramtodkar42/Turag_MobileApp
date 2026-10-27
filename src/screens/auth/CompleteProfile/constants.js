// "What brings you to turag ?" options (`value` is what's saved as `purpose`).
export const PURPOSES = [
  { value: 'buy_sell', labelKey: 'auth.purpose.buy_sell' },
  { value: 'dealer', labelKey: 'auth.purpose.dealer' },
  { value: 'bank', labelKey: 'auth.purpose.bank' },
  { value: 'storage_yard', labelKey: 'auth.purpose.storage_yard' },
];

// Terms & Conditions rows. `required` ones must be ticked to continue.
// Text = prefix + link (underlined, opens the page) + suffix, as i18n keys.
// `path`: the website page the link opens (in the app).
export const CONSENTS = [
  {
    key: 'terms',
    prefixKey: 'auth.consent.terms.prefix',
    linkKey: 'auth.consent.terms.link',
    suffixKey: 'auth.consent.terms.suffix',
    path: '/terms',
    required: true,
  },
  {
    key: 'privacy',
    prefixKey: 'auth.consent.privacy.prefix',
    linkKey: 'auth.consent.privacy.link',
    suffixKey: 'auth.consent.privacy.suffix',
    path: '/privacy_policy',
    required: true,
  },
  {
    key: 'updates',
    prefixKey: 'auth.consent.updates.prefix',
    required: false,
  },
  // WhatsApp opt-in (as the web): optional and unticked - consent is a choice.
  {
    key: 'whatsapp',
    prefixKey: 'auth.consent.whatsapp.prefix',
    required: false,
  },
];

export const INITIAL_CONSENTS = { terms: false, privacy: false, updates: false, whatsapp: false };
