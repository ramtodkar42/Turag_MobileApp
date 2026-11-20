import { isEmail } from '../../../utils/validators';

// The "Become a dealer" form: its fields, the same checks the server makes
// (so a mistake shows on its field before sending), and the server's own
// field errors mapped back onto the form.

// Field -> its max length (the server's limits).
export const MAX_LENGTH = {
  businessName: 120,
  ownerName: 120,
  email: 254,
  addressLine: 200,
  city: 80,
  state: 80,
  pinCode: 6,
  pan: 10,
  gstin: 15,
  registrationNumber: 60,
  aadhaarNumber: 14,
};

export const EMPTY_FORM = {
  businessName: '',
  ownerName: '',
  email: '',
  addressLine: '',
  city: '',
  state: '',
  pinCode: '',
  pan: '',
  gstin: '',
  registrationType: 'SHOP_ACT',
  registrationNumber: '',
  // Never sent back by the server (only its last 4 digits): typed again on each save.
  aadhaarNumber: '',
};

// The form from a saved application (application: mapDealerApplication), or
// the account's own name / email for a new one.
export const formFrom = (application, user) =>
  application
    ? {
        ...EMPTY_FORM,
        businessName: application.businessName,
        ownerName: application.ownerName,
        email: application.email,
        addressLine: application.addressLine,
        city: application.city,
        state: application.state,
        pinCode: application.pinCode,
        pan: application.pan,
        gstin: application.gstin,
        registrationType: application.registrationType || 'SHOP_ACT',
        registrationNumber: application.registrationNumber,
      }
    : { ...EMPTY_FORM, ownerName: user?.fullName ?? '', email: user?.email ?? '' };

const PIN = /^[1-9][0-9]{5}$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN = /^[0-9]{2}[A-Z0-9]{13}$/;
const AADHAAR = /^[2-9][0-9]{11}$/;
const UDYAM = /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/;
const SHOP_ACT = /^[A-Z0-9][A-Z0-9/.\- ]{2,49}$/;

const text = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const code = value => String(value ?? '').replace(/\s/g, '').toUpperCase();

// Checks the form. Returns { details (ready for saveDealerApplication), errors
// ({ field: i18n key }, empty when all is well) }.
export const checkForm = form => {
  const details = {
    businessName: text(form.businessName),
    ownerName: text(form.ownerName),
    email: text(form.email),
    addressLine: text(form.addressLine),
    city: text(form.city),
    state: text(form.state),
    pinCode: code(form.pinCode),
    pan: code(form.pan),
    gstin: code(form.gstin),
    registrationType: form.registrationType === 'UDYAM' ? 'UDYAM' : 'SHOP_ACT',
    registrationNumber:
      form.registrationType === 'UDYAM' ? code(form.registrationNumber) : text(form.registrationNumber).toUpperCase(),
    aadhaarNumber: String(form.aadhaarNumber ?? '').replace(/[\s-]/g, ''),
  };
  const errors = {};
  ['businessName', 'ownerName', 'city', 'state'].forEach(field => {
    if (!details[field]) errors[field] = 'dealerApply.error.required';
  });
  if (!isEmail(details.email)) errors.email = 'errors.email';
  if (!PIN.test(details.pinCode)) errors.pinCode = 'dealerApply.error.pinCode';
  if (!PAN.test(details.pan)) errors.pan = 'dealerApply.error.pan';
  if (details.gstin) {
    if (!GSTIN.test(details.gstin)) errors.gstin = 'dealerApply.error.gstin';
    // A GSTIN carries its holder's PAN (characters 3-12): both must agree.
    else if (!errors.pan && details.gstin.slice(2, 12) !== details.pan) errors.pan = 'dealerApply.error.panGstin';
  }
  const registration = details.registrationType === 'UDYAM' ? UDYAM : SHOP_ACT;
  if (!registration.test(details.registrationNumber)) {
    errors.registrationNumber =
      details.registrationType === 'UDYAM' ? 'dealerApply.error.udyam' : 'dealerApply.error.shopAct';
  }
  if (!AADHAAR.test(details.aadhaarNumber)) errors.aadhaarNumber = 'dealerApply.error.aadhaar';
  return { details, errors };
};

// The server's field names -> the form's.
const SERVER_FIELDS = {
  business_name: 'businessName',
  owner_name: 'ownerName',
  email: 'email',
  address_line: 'addressLine',
  city: 'city',
  state: 'state',
  pin_code: 'pinCode',
  pan: 'pan',
  gstin: 'gstin',
  registration_number: 'registrationNumber',
  aadhaar_number: 'aadhaarNumber',
};

// A field the server refused (ApiError details.field, e.g. 'location.pin_code'),
// as the form's field name, or null.
export const serverField = error => {
  const field = String(error?.details?.field ?? '').replace(/^location\./, '');
  return SERVER_FIELDS[field] ?? null;
};
