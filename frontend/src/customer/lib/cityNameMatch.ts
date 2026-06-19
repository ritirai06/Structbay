/** Mirror backend cityNameMatch — Bangalore/Bengaluru etc. */
const ALIASES: Record<string, string> = {
  bangalore: "bengaluru",
  bengaluru: "bengaluru",
  "bengaluru urban": "bengaluru",
  bengalore: "bengaluru",
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

export function cityNamesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeCityName(a);
  const nb = normalizeCityName(b);
  if (!na || !nb) return false;
  return na === nb;
}
