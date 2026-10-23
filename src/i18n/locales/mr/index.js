// All mr strings, one file per feature area (keys are '<area>.<name>').
import common from './common';
import errors from './errors';
import nav from './nav';
import auth from './auth';
import onboarding from './onboarding';
import home from './home';
import location from './location';
import marketplace from './marketplace';
import saved from './saved';
import garage from './garage';
import valuation from './valuation';
import booking from './booking';
import inspector from './inspector';
import selfInspection from './selfInspection';
import chat from './chat';
import profile from './profile';
import notifications from './notifications';
import account from './account';
import offers from './offers';
import selling from './selling';
import payouts from './payouts';
import business from './business';
import guest from './guest';

export default {
  ...common,
  ...errors,
  ...nav,
  ...auth,
  ...onboarding,
  ...home,
  ...location,
  ...marketplace,
  ...saved,
  ...garage,
  ...valuation,
  ...booking,
  ...inspector,
  ...selfInspection,
  ...chat,
  ...profile,
  ...notifications,
  ...account,
  ...offers,
  ...selling,
  ...payouts,
  ...business,
  ...guest,
};
