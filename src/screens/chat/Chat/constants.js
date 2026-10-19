// Suggestions shown before the first message. Tapping one sends it.
// Text is translated where it's shown (keys in i18n/locales/<lang>/chat.js).
export const INTRO_LINE_KEYS = ['chat.intro.expert', 'chat.intro.ask'];

// `icon` is a name from components/icons/iconPaths.js
export const SUGGESTION_GROUPS = [
  {
    titleKey: 'chat.group.tryAsking',
    icon: 'pencil',
    itemKeys: ['chat.suggest.worthBuying', 'chat.suggest.explainReport', 'chat.suggest.compare'],
  },
  {
    titleKey: 'chat.group.translate',
    icon: 'translate',
    itemKeys: [
      'chat.suggest.checkBeforeBuying',
      'chat.suggest.fairPrice',
      'chat.suggest.history',
    ],
  },
];
