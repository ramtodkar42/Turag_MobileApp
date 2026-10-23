// Data behind the Home quick filters: makes and their models (per vehicle
// type), and the states / cities we serve. The backend matches make / model
// as text (case-insensitive, "contains"), so these are the common names.

// Vehicle type filter -> Home's category ('cars' | 'bikes').
export const VEHICLE_TYPES = ['cars', 'bikes'];

// Each make's models by vehicle type. Honda makes both cars and bikes.
export const MAKES = [
  {
    name: 'Maruti Suzuki',
    cars: ['Swift', 'Baleno', 'Dzire', 'Wagon R', 'Alto', 'Celerio', 'Ignis', 'S-Presso', 'Ertiga', 'XL6', 'Brezza', 'Fronx', 'Grand Vitara', 'Ciaz'],
  },
  {
    name: 'Hyundai',
    cars: ['i10', 'Grand i10 Nios', 'i20', 'Aura', 'Exter', 'Venue', 'Verna', 'Creta', 'Alcazar', 'Tucson'],
  },
  {
    name: 'Honda',
    cars: ['City', 'Amaze', 'Jazz', 'WR-V', 'Elevate'],
    bikes: ['Activa', 'Shine', 'SP 125', 'Unicorn', 'CB Hornet'],
  },
  { name: 'Tata', cars: ['Tiago', 'Tigor', 'Altroz', 'Punch', 'Nexon', 'Harrier', 'Safari'] },
  { name: 'Mahindra', cars: ['XUV300', 'XUV 3XO', 'XUV700', 'Scorpio', 'Thar', 'Bolero'] },
  { name: 'Toyota', cars: ['Glanza', 'Etios', 'Urban Cruiser Hyryder', 'Innova', 'Fortuner'] },
  { name: 'Kia', cars: ['Sonet', 'Seltos', 'Carens', 'Carnival'] },
  { name: 'Renault', cars: ['Kwid', 'Triber', 'Kiger', 'Duster'] },
  { name: 'Volkswagen', cars: ['Polo', 'Vento', 'Virtus', 'Taigun'] },
  { name: 'Skoda', cars: ['Rapid', 'Slavia', 'Kushaq', 'Octavia'] },
  { name: 'Ford', cars: ['Figo', 'Aspire', 'EcoSport', 'Endeavour'] },
  { name: 'MG', cars: ['Comet EV', 'Astor', 'ZS EV', 'Hector'] },
  { name: 'Nissan', cars: ['Micra', 'Sunny', 'Magnite', 'Kicks'] },
  { name: 'Royal Enfield', bikes: ['Classic 350', 'Bullet 350', 'Hunter 350', 'Meteor 350', 'Himalayan'] },
  { name: 'Bajaj', bikes: ['Pulsar', 'Platina', 'CT 100', 'Avenger', 'Dominar'] },
  { name: 'Hero', bikes: ['Splendor', 'HF Deluxe', 'Passion', 'Glamour', 'Xtreme'] },
  { name: 'TVS', bikes: ['Apache', 'Raider', 'Jupiter', 'Ntorq', 'XL100'] },
  { name: 'Yamaha', bikes: ['FZ', 'R15', 'MT-15', 'Fascino', 'RayZR'] },
  { name: 'Suzuki', bikes: ['Access 125', 'Gixxer', 'Burgman Street', 'Avenis', 'V-Strom SX'] },
  { name: 'KTM', bikes: ['Duke 200', 'Duke 390', 'RC 200', 'RC 390', 'Adventure 390'] },
  { name: 'Kawasaki', bikes: ['Ninja 300', 'Ninja 650', 'Z650', 'Z900', 'Versys 650'] },
];

// Makes for a vehicle type ('cars' | 'bikes'; anything else = all makes).
export const makesFor = vehicle =>
  MAKES.filter(make => !VEHICLE_TYPES.includes(vehicle) || make[vehicle]).map(make => make.name);

// Models for a make and vehicle type. No make: every model of that type.
export const modelsFor = ({ vehicle, make }) => {
  const types = VEHICLE_TYPES.includes(vehicle) ? [vehicle] : VEHICLE_TYPES;
  const makes = make ? MAKES.filter(m => m.name === make) : MAKES;
  return [...new Set(makes.flatMap(m => types.flatMap(type => m[type] ?? [])))];
};

// The state we serve today, and its cities (the backend's city codes).
export const LIVE_STATE = 'MH';
export const CITIES = [
  { value: 'PUNE', labelKey: 'location.city.pune' },
  { value: 'PCMC', labelKey: 'location.city.pcmc' },
];

// India's states and union territories (codes; names are translated as
// location.state.<code>). The live state is listed first.
export const STATES = [
  'MH',
  'AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CG', 'DN', 'DL', 'GA', 'GJ', 'HR', 'HP', 'JK', 'JH', 'KA', 'KL',
  'LA', 'LD', 'MP', 'MN', 'ML', 'MZ', 'NL', 'OD', 'PY', 'PB', 'RJ', 'SK', 'TN', 'TS', 'TR', 'UP', 'UK', 'WB',
];
