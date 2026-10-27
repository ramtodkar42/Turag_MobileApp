// What a car alert can match on - the web's WhatsAppAlerts lists. Values are
// what the backend stores; labels are i18n keys (makes are brand names).
export const MAKES = [
  'Maruti Suzuki',
  'Hyundai',
  'Honda',
  'Tata',
  'Mahindra',
  'Toyota',
  'Kia',
  'Renault',
  'Volkswagen',
  'Skoda',
  'MG',
  'Nissan',
];
export const BODIES = ['HATCHBACK', 'SEDAN', 'SUV', 'MUV'];
export const FUELS = ['PETROL', 'DIESEL', 'CNG', 'ELECTRIC'];
export const CITIES = ['PUNE', 'PCMC'];
// Budget ceilings in rupees (sent as paise).
export const BUDGETS = [500000, 800000, 1000000, 1500000, 2000000];

export const EMPTY_FORM = {
  make: null,
  bodyType: null,
  fuel: null,
  city: null,
  budget: null,
};

// "₹5 lakh" style amount in lakh.
export const lakhs = rupees => rupees / 100000;
