/**
 * Heuristic PIN → state-region checks for serviceability when admin has not
 * listed every PIN on a City document. Tuned for Karnataka (incl. Bengaluru
 * metro & rest of state) and Telangana.
 *
 * Ranges use India Post’s common sorting-district numbering; adjust if you
 * need stricter boundaries.
 */

/** Karnataka (incl. Bengaluru area + most intra-state PINs we want to cover). */
function pinMatchesKarnatakaState(digits) {
  const p3 = parseInt(String(digits).slice(0, 3), 10);
  if (Number.isNaN(p3)) return false;
  return p3 >= 560 && p3 <= 591;
}

/** Telangana (Hyderabad circle + common TS extensions; avoids 52x Andhra-heavy blocks). */
function pinMatchesTelanganaState(digits) {
  const p3 = parseInt(String(digits).slice(0, 3), 10);
  if (Number.isNaN(p3)) return false;
  if (p3 >= 500 && p3 <= 509) return true;
  if (p3 >= 510 && p3 <= 517) return true;
  return false;
}

function stateLooksKarnataka(stateName) {
  const s = String(stateName || '').trim();
  if (!s) return false;
  if (/karnataka/i.test(s)) return true;
  if (/^ka$/i.test(s)) return true;
  if (/^k\.?\s*a\.?$/i.test(s)) return true;
  return false;
}

/** Accept common misspelling “Telengana”. */
function stateLooksTelangana(stateName) {
  const s = String(stateName || '').trim();
  if (!s) return false;
  if (/(telangana|telengana)/i.test(s)) return true;
  if (/^ts$/i.test(s)) return true;
  return false;
}

/** When `state` is blank or wrong in DB, still treat known hub names as Karnataka for PIN rules. */
function cityLooksBangaloreMetro(c) {
  if (!c) return false;
  const name = String(c.name || '');
  const slug = String(c.slug || '');
  return /bengaluru|bangalore|bengalore/i.test(name) || /bengaluru|bangalore/i.test(slug);
}

function cityLooksHyderabadMetro(c) {
  if (!c) return false;
  const name = String(c.name || '');
  const slug = String(c.slug || '');
  return /hyderabad|secunderabad/i.test(name) || /hyderabad/i.test(slug);
}

function regionLooksKarnatakaForPin(c) {
  return stateLooksKarnataka(c.state) || cityLooksBangaloreMetro(c);
}

function regionLooksTelanganaForPin(c) {
  return stateLooksTelangana(c.state) || cityLooksHyderabadMetro(c);
}

module.exports = {
  pinMatchesKarnatakaState,
  pinMatchesTelanganaState,
  stateLooksKarnataka,
  stateLooksTelangana,
  cityLooksBangaloreMetro,
  cityLooksHyderabadMetro,
  regionLooksKarnatakaForPin,
  regionLooksTelanganaForPin,
};
