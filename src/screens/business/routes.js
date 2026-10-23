import { ROUTES } from '../../navigation/routes';

// The Business screens' route names (registered in the root stack, see ROUTES).
export const BUSINESS_ROUTES = {
  HOME: ROUTES.BUSINESS_HOME, // no params
  DEALER: ROUTES.DEALER_PORTAL, // { org }
  DEALER_CREATE: ROUTES.DEALER_CREATE_LISTING, // { org }
  INSTITUTIONAL: ROUTES.INSTITUTIONAL_PORTAL, // { org }
  INTAKE_DETAIL: ROUTES.INTAKE_DETAIL, // { orgId, intakeId }
  PLACEMENT_DETAIL: ROUTES.YARD_PLACEMENT_DETAIL, // { orgId, placementId }
  BULK_IMPORT: ROUTES.BULK_INTAKE_IMPORT, // { org }
  IMPORT_JOB: ROUTES.INTAKE_IMPORT_JOB, // { orgId, importId, job? }
};
