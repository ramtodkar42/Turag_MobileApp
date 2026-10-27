import { ROUTES } from '../../../navigation/routes';

// Profile menu, in screen order. Titles and labels are i18n keys.
// `route`: screen to open.
// `web`: a page of the Turag website, opened inside the app (WebPage).
// `action`: handled by the Profile screen instead of navigating (logout, delete).
// `showsLanguage`: shows the current app language on the right.
// `account` (group): only when signed in - hidden for guests (log out, delete).
// `orgsOnly`: only for members of a business organization (dealer / lender / yard).
export const PROFILE_MENU = [
  {
    titleKey: 'profile.group.settings',
    items: [
      { labelKey: 'profile.item.personalInfo', route: ROUTES.PERSONAL_INFO },
      {
        labelKey: 'profile.item.verification',
        route: ROUTES.IDENTITY_VERIFICATION,
      },
      { labelKey: 'profile.item.myBookings', route: ROUTES.MY_BOOKINGS },
      { labelKey: 'profile.item.myOffers', route: ROUTES.MY_OFFERS },
      { labelKey: 'profile.item.myListings', route: ROUTES.MY_LISTINGS },
      { labelKey: 'profile.item.carAlerts', route: ROUTES.CAR_ALERTS },
      { labelKey: 'profile.item.settlements', route: ROUTES.SETTLEMENTS },
      {
        labelKey: 'profile.item.payoutAccounts',
        route: ROUTES.PAYOUT_ACCOUNTS,
      },
      {
        labelKey: 'profile.item.business',
        route: ROUTES.BUSINESS_HOME,
        orgsOnly: true,
      },
      {
        labelKey: 'profile.item.language',
        route: ROUTES.LANGUAGE,
        showsLanguage: true,
      },
    ],
  },
  {
    titleKey: 'profile.group.help',
    items: [
      // Turag's support chat (the TURAG.AI assistant), as the web's support widget.
      { labelKey: 'profile.item.chatSupport', route: ROUTES.CHAT },
      { labelKey: 'profile.item.helpCentre', web: '/how-it-works' },
      { labelKey: 'profile.item.faqs', web: '/faq' },
      { labelKey: 'profile.item.contactSupport', web: '/contact' },
    ],
  },
  {
    // Required by the app stores: the policies are always one tap away.
    titleKey: 'profile.group.legal',
    items: [
      { labelKey: 'profile.item.privacyPolicy', web: '/privacy_policy' },
      { labelKey: 'profile.item.terms', web: '/terms' },
      { labelKey: 'profile.item.refundPolicy', web: '/refund_policy' },
    ],
  },
  {
    titleKey: 'profile.group.account',
    account: true,
    items: [
      { labelKey: 'profile.item.logout', action: 'logout' },
      { labelKey: 'profile.item.delete', action: 'delete' },
    ],
  },
];
