/**
 * Public storefront city lists (header + city modal + checkout).
 * Tries `/api/v1/customer/cities` first, then `/api/v1/cities` so the UI works even if one route misbehaves.
 */

export type StorefrontCity = {
  id: string;
  name: string;
  state: string;
  slug?: string;
};

function citiesFromApiData(data: unknown): StorefrontCity[] {
  const arr = Array.isArray(data) ? data : [];
  const out: StorefrontCity[] = [];
  for (const c of arr) {
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    const id = o._id != null ? String(o._id) : "";
    const name = o.name != null ? String(o.name) : "";
    if (!id || !name) continue;
    out.push({
      id,
      name,
      state: o.state != null ? String(o.state) : "",
      slug: o.slug != null ? String(o.slug) : undefined,
    });
  }
  return out;
}

async function fetchCitiesEnvelope(url: string): Promise<{ data: unknown }> {
  const r = await fetch(url);
  const text = await r.text();
  let json: { success?: boolean; message?: string; data?: unknown } = {};
  if (text) {
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      throw new Error("Server did not return valid JSON. Is the API running (e.g. port 5000)?");
    }
  }
  if (!r.ok) {
    throw new Error(typeof json.message === "string" ? json.message : `Cities request failed (${r.status})`);
  }
  if (json.success === false) {
    throw new Error(typeof json.message === "string" ? json.message : "Could not load cities.");
  }
  return { data: json.data };
}

export async function loadStorefrontCities(): Promise<StorefrontCity[]> {
  try {
    const j = await fetchCitiesEnvelope("/api/v1/customer/cities");
    const rows = citiesFromApiData(j.data);
    if (rows.length > 0) return rows;
  } catch {
    /* fall through */
  }

  const j2 = await fetchCitiesEnvelope("/api/v1/cities?status=ACTIVE&limit=200");
  const raw = Array.isArray(j2.data) ? j2.data : [];
  const filtered = raw.filter(
    (c: any) => c && c.status === "ACTIVE" && c.isServiceable !== false && c.name
  );
  return citiesFromApiData(filtered);
}
