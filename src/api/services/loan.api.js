// Apply for a loan to finance a vehicle (as the web's LoanApplicationSheet):
// a request for a call back - Turag's team follows up; the loan itself is
// arranged offline with the financing partner. Aadhaar is never asked here.
// Needs sign-in.
import { request } from '../client';
import { ENDPOINTS } from '../endpoints';
import { toMoney } from '../mappers/money';

export const LOAN_TENURES = [12, 24, 36, 48, 60, 72, 84];
export const EMPLOYMENT_TYPES = ['SALARIED', 'SELF_EMPLOYED', 'OTHER'];
export const PAN_PATTERN = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/;

const minorOrNull = rupees => (rupees != null && rupees > 0 ? toMoney(rupees).amount_minor : null);

// application: { listingId?, orderId?, vehicleLabel?, vehiclePrice? (₹), loanAmount (₹),
//   downPayment? (₹), tenureMonths?, name, email?, pan?, monthlyIncome? (₹),
//   employmentType?, city? } - the user agreed to be contacted (consent).
// Returns { applicationId, status }.
export const submitLoanApplication = async a => {
  const data = await request(ENDPOINTS.LOAN_APPLICATIONS, {
    method: 'POST',
    idempotent: true,
    body: {
      listing_id: a.listingId ?? null,
      order_id: a.orderId ?? null,
      vehicle_label: a.vehicleLabel ?? null,
      vehicle_price_minor: minorOrNull(a.vehiclePrice),
      loan_amount_minor: toMoney(a.loanAmount).amount_minor,
      down_payment_minor: minorOrNull(a.downPayment),
      tenure_months: a.tenureMonths ?? null,
      applicant_name: a.name.trim(),
      email: a.email?.trim() || null,
      pan: a.pan?.trim().toUpperCase() || null,
      monthly_income_minor: minorOrNull(a.monthlyIncome),
      employment_type: a.employmentType ?? null,
      city: a.city?.trim() || null,
      consent: true,
    },
  });
  return { applicationId: data.application_id, status: data.status };
};
