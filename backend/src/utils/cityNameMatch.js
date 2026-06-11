/**
 * Normalize city names for serviceability checks (e.g. Bangalore vs Bengaluru).
 */
const ALIASES = {
  bangalore: 'bengaluru',
  bengaluru: 'bengaluru',
  'bengaluru urban': 'bengaluru',
  madras: 'chennai',
  chennai: 'chennai',
  hyderabad: 'hyderabad',
  secunderabad: 'hyderabad',
  delhi: 'delhi',
  'new delhi': 'delhi',
};

function normalizeCityName(name) {
  if (name == null || String(name).trim() === '') return '';
  const key = String(name).trim().toLowerCase().replace(/\s+/g, ' ');
  return ALIASES[key] || key.replace(/\s+/g, '');
}

/** True when delivery city matches the customer's selected shopping city (after alias normalization). */
function deliveryCityMatchesSelected(selectedCityName, deliveryAddressCity) {
  const a = normalizeCityName(selectedCityName);
  const b = normalizeCityName(deliveryAddressCity);
  if (!a || !b) return true;
  return a === b;
}

module.exports = { normalizeCityName, deliveryCityMatchesSelected, ALIASES };
