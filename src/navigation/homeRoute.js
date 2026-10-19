import { ROLES } from '../constants/roles';
import { ROUTES } from './routes';
import { getUser } from '../store/userStore';

// Where a signed-in user lands: inspection officers get their own tabs,
// everyone else the consumer app.
export const getHomeRoute = role =>
  role === ROLES.INSPECTOR ? ROUTES.INSPECTOR_TABS : ROUTES.MAIN_TABS;

// The signed-in user's tabs - for screens that jump back to a tab
// (both tab sets name Market and Garage the same).
export const currentHomeRoute = () => getHomeRoute(getUser()?.role);
