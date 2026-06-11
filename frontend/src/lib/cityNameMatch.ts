/** Align with backend `cityNameMatch.js` for checkout UX. */
const ALIASES: Record<string, string> = {
  bangalore: "bengaluru",
  bengaluru: "bengaluru",
  "bengaluru urban": "bengaluru",
  madras: "chennai",
  chennai: "chennai",
  hyderabad: "hyderabad",
  secunderabad: "hyderabad",
  delhi: "delhi",
  "new delhi": "delhi",
};

export function normalizeCityName(name: string | null | undefined): string {
  if (name == null || String(name).trim() === "") return "";
  const key = String(name).trim().toLowerCase().replace(/\s+/g, " ");
  return ALIASES[key] || key.replace(/\s+/g, "");
}

export function deliveryCityMatchesSelected(selectedCityName: string, deliveryCity: string): boolean {
  const a = normalizeCityName(selectedCityName);
  const b = normalizeCityName(deliveryCity);
  if (!a || !b) return true;
  return a === b;
}
