import { ROUTES } from '../../../navigation/routes';

// Profile menu, in screen order. Titles and labels are i18n keys.
// `route`: screen to open (default: a "coming soon" page with the item's label).
// `action`: handled by the Profile screen instead of navigating (logout, delete).
// `showsLanguage`: shows the current app language on the right.
export const PROFILE_MENU = [
  {
    titleKey: 'profile.group.settings',
    items: [
      { labelKey: 'profile.item.personalInfo', route: ROUTES.PERSONAL_INFO },
      { labelKey: 'profile.item.myBookings', route: ROUTES.MY_BOOKINGS },
      { labelKey: 'profile.item.myOffers', route: ROUTES.MY_OFFERS },
      { labelKey: 'profile.item.myListings', route: ROUTES.MY_LISTINGS },
      { labelKey: 'profile.item.language', route: ROUTES.LANGUAGE, showsLanguage: true },
    ],
  },
  {
    titleKey: 'profile.group.help',
    items: [
      { labelKey: 'profile.item.helpCentre' },
      { labelKey: 'profile.item.faqs' },
      { labelKey: 'profile.item.contactSupport' },
    ],
  },
  {
    titleKey: 'profile.group.account',
    items: [
      { labelKey: 'profile.item.logout', action: 'logout' },
      { labelKey: 'profile.item.delete', action: 'delete' },
    ],
  },
];
