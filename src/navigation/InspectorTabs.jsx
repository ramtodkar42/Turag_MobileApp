import { ROUTES } from './routes';
import RoleTabs from './RoleTabs';
import Home from '../screens/home/Home/Home';
import Saved from '../screens/saved/Saved/Saved';
import Garage from '../screens/garage/Garage/Garage';
import Profile from '../screens/profile/Profile/Profile';
import Jobs from '../screens/inspector/Jobs/Jobs';

// Inspection officer tabs: same bar as consumers, but the second tab is
// their jobs (assigned doorstep inspections), and the app opens on it.
const TABS = [
  { name: ROUTES.MARKET, titleKey: 'nav.market', icon: 'store', component: Home },
  { name: ROUTES.INSPECTIONS, titleKey: 'nav.inspections', icon: 'document', component: Jobs },
  { name: ROUTES.GARAGE, titleKey: 'nav.garage', icon: 'car', component: Garage },
  { name: ROUTES.SAVED, titleKey: 'nav.saved', icon: 'bookmark', component: Saved },
  { name: ROUTES.PROFILE, titleKey: 'nav.profile', icon: 'user', component: Profile },
];

function InspectorTabs() {
  return <RoleTabs tabs={TABS} initialRouteName={ROUTES.INSPECTIONS} />;
}

export default InspectorTabs;
