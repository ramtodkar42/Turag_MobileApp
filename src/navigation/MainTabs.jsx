import { ROUTES } from './routes';
import RoleTabs from './RoleTabs';
import Home from '../screens/home/Home/Home';
import Saved from '../screens/saved/Saved/Saved';
import Garage from '../screens/garage/Garage/Garage';
import Profile from '../screens/profile/Profile/Profile';
import accountScreen from './accountScreen';

// The Evaluate tab never shows a page of its own: tapping it opens the
// TURAG.AI chat (`opens`), so its tab screen is empty.
const EvaluateTab = () => null;

// Tabs that need an account (guests: what it's for + "Log in or sign up").
const GarageTab = accountScreen(Garage, {
  titleKey: 'nav.garage',
  icon: 'car',
  headingKey: 'guest.garage.title',
  messageKey: 'guest.garage.message',
});

const SavedTab = accountScreen(Saved, {
  titleKey: 'nav.saved',
  icon: 'bookmark',
  headingKey: 'guest.saved.title',
  messageKey: 'guest.saved.message',
});

// Consumer app tabs (guests too: the marketplace and Profile work without an
// account). `loginReason`: a guest is asked to log in first (LoginPrompt).
const TABS = [
  { name: ROUTES.MARKET, titleKey: 'nav.market', icon: 'store', component: Home },
  {
    name: ROUTES.EVALUATE,
    titleKey: 'nav.evaluate',
    icon: 'document',
    component: EvaluateTab,
    opens: ROUTES.EVALUATE_CHAT,
    loginReason: 'evaluate',
  },
  { name: ROUTES.GARAGE, titleKey: 'nav.garage', icon: 'car', component: GarageTab },
  { name: ROUTES.SAVED, titleKey: 'nav.saved', icon: 'bookmark', component: SavedTab },
  { name: ROUTES.PROFILE, titleKey: 'nav.profile', icon: 'user', component: Profile },
];

function MainTabs() {
  return <RoleTabs tabs={TABS} />;
}

export default MainTabs;
