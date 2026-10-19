import { ROUTES } from './routes';
import RoleTabs from './RoleTabs';
import Home from '../screens/home/Home/Home';
import ComingSoon from '../screens/common/ComingSoon/ComingSoon';
import Saved from '../screens/saved/Saved/Saved';
import Garage from '../screens/garage/Garage/Garage';
import Profile from '../screens/profile/Profile/Profile';

// Consumer app tabs.
const TABS = [
  { name: ROUTES.MARKET, titleKey: 'nav.market', icon: 'store', component: Home },
  {
    name: ROUTES.EVALUATE,
    titleKey: 'nav.evaluate',
    icon: 'document',
    component: ComingSoon,
    opens: ROUTES.EVALUATE_CHAT,
  },
  { name: ROUTES.GARAGE, titleKey: 'nav.garage', icon: 'car', component: Garage },
  { name: ROUTES.SAVED, titleKey: 'nav.saved', icon: 'bookmark', component: Saved },
  { name: ROUTES.PROFILE, titleKey: 'nav.profile', icon: 'user', component: Profile },
];

function MainTabs() {
  return <RoleTabs tabs={TABS} />;
}

export default MainTabs;
