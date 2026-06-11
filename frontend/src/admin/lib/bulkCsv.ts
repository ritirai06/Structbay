/** Split one CSV line respecting quoted fields */
export function splitCsvLine(line: string): string[] {
  const res: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (!q && c === ",") {
      res.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  res.push(cur.trim());
  return res;
}

export type CsvFieldSpec = { key: string; headers: string[]; required?: boolean };

/**
 * Parse CSV using header aliases; each output row only includes keys with values (or required empty string skipped = row skipped if required missing).
 */
export function parseMappedCsv(text: string, fields: CsvFieldSpec[]): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const headerCells = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/^\ufeff/, ""));
  const colIndex = (aliases: string[]) => {
    for (const a of aliases) {
      const j = headerCells.indexOf(a.toLowerCase());
      if (j >= 0) return j;
    }
    return -1;
  };

  const indices: { key: string; i: number; required: boolean }[] = [];
  for (const f of fields) {
    const i = colIndex(f.headers);
    if (i < 0 && f.required) {
      throw new Error(`CSV must include one of these columns: ${f.headers.join(", ")}`);
    }
    if (i >= 0) indices.push({ key: f.key, i, required: !!f.required });
  }

  const out: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r += 1) {
    const cells = splitCsvLine(lines[r]);
    const get = (i: number) => (i >= 0 && cells[i] !== undefined ? cells[i].trim() : "");
    const row: Record<string, string> = {};
    let skip = true;
    for (const { key, i, required } of indices) {
      const v = get(i);
      if (v) {
        row[key] = v;
        skip = false;
      } else if (required) {
        skip = true;
        break;
      }
    }
    if (skip) continue;
    out.push(row);
  }
  return out;
}
