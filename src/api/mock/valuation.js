// Sample Evaluate data used when USE_REAL_API.valuation is false.
// Already in the app's shape (see api/mappers/valuation.js); prices in rupees.
export const sampleVehicle = {
  vehicleId: null,
  make: 'KIA',
  model: 'Seltos',
  variant: 'HTX 1.5 Petrol',
  year: 2024,
  fuelCode: 'PETROL',
  fuel: 'Petrol',
  category: 'PASSENGER',
  categoryKey: 'marketplace.vehicleType.PASSENGER',
  rcCity: 'Nashik',
  rcState: 'Maharashtra',
  rcStatus: 'ACTIVE',
  ownerCount: 1,
  color: 'Granite Gray',
  bodyType: 'Suv',
  engineCc: 1497,
  seats: 5,
  registrationDate: '2024-02-07',
  insuranceCompany: 'ICICI Lombard',
  insuranceUpto: '2026-02-07',
  taxUpto: null,
  pucUpto: '2026-08-07',
  fitnessUpto: '2039-02-06',
  financed: null,
};

// Bands go low -> high: distress < auction < trade-in < retail.
export const sampleValuation = {
  valuationId: 'val_mock_1',
  vehicleId: 'veh_mock_1',
  stage: 'INSTANT',
  estimatedValue: 831300,
  headlineBand: 'retail',
  priceBands: {
    distress: { min: 620000, max: 670000 },
    auction: { min: 680000, max: 740000 },
    tradeIn: { min: 740000, max: 800000 },
    retail: { min: 800000, max: 860000 },
  },
  confidence: 'LOW',
  validUntil: null,
};
