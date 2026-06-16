import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  MapPin,
  Search,
  ChevronRight,
  Building2,
  CheckCircle2,
  X,
  Loader2,
  Shield,
  Zap,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { useApp, type SelectedCity } from "../context/AppContext";
import { api } from "../lib/api";
import { loadStorefrontCities } from "../lib/storefrontCities";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";

const RECENT_KEY = "sb_city_recent_meta";
const HERO_PIN_KEY = "sb_hero_delivery_pin";

/** Public-folder truck art (Screen.png → `public/marketing/structbay-delivery-truck.png`). SVG kept as fallback. */
function publicAsset(rel: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const path = rel.replace(/^\//, "");
  return base.endsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

const TRUCK_PNG = publicAsset("marketing/structbay-delivery-truck.png");
const TRUCK_SVG_FALLBACK = publicAsset("marketing/structbay-delivery-truck.svg");

function readRecent(): SelectedCity | null {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o?.id && o?.name) return { id: String(o.id), name: String(o.name), state: String(o.state || ""), slug: o.slug };
  } catch {
    /* ignore */
  }
  return null;
}

function writeRecent(c: SelectedCity) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

function readStoredCitySafe(): SelectedCity | null {
  try {
    const raw = localStorage.getItem("sb_selected_city");
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o?.id && o?.name) return { id: String(o.id), name: String(o.name), state: String(o.state || ""), slug: o.slug };
  } catch {
    /* ignore */
  }
  return null;
}

function readRecentPinDisplay(): string {
  try {
    const v = localStorage.getItem(HERO_PIN_KEY);
    return v && /^\d{6}$/.test(v) ? v : "";
  } catch {
    return "";
  }
}

interface CitySelectionProps {
  isModal?: boolean;
  onClose?: () => void;
}

export function CitySelection({ isModal = false, onClose }: CitySelectionProps) {
  const { setSelectedCity, cityId: currentCityId } = useApp();
  const navigate = useNavigate();
  const [cities, setCities] = useState<SelectedCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(currentCityId);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinStatus, setPinStatus] = useState<{ tone: "err" | "ok"; text: string } | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [recentPin, setRecentPin] = useState("");
  const [truckSrc, setTruckSrc] = useState(TRUCK_PNG);

  const recentCity = readRecent();

  useEffect(() => {
    setRecentPin(readRecentPinDisplay());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void (async () => {
      try {
        const rows = await loadStorefrontCities();
        if (!cancelled) setCities(rows);
      } catch (e) {
        if (!cancelled) {
          setCities([]);
          setLoadError(
            e instanceof Error
              ? e.message
              : "Could not load cities. Check your connection and try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isModal) setTimeout(() => searchRef.current?.focus(), 100);
  }, [isModal]);

  useEffect(() => {
    setSelectedId(currentCityId);
  }, [currentCityId]);

  const filtered = cities.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.state.toLowerCase().includes(search.toLowerCase()) ||
      (c.slug && c.slug.toLowerCase().includes(search.toLowerCase()))
  );

  const applySelection = (c: SelectedCity | null) => {
    const prev = readStoredCitySafe();
    if (prev && c && prev.id !== c.id) writeRecent(prev);
    setSelectedCity(c);
    if (c) {
      try {
        localStorage.removeItem("sb_city");
      } catch {
        /* ignore */
      }
    }
    if (isModal) onClose?.();
    else navigate("/");
  };

  const handleSelect = (c: SelectedCity) => {
    setSelectedId(c.id);
    applySelection(c);
  };

  const handleClear = () => {
    setSelectedId(null);
    applySelection(null);
  };

  const handlePinCheck = async () => {
    setPinStatus(null);
    setPinBusy(true);
    try {
      const d = await api.validatePincode(pinInput, selectedId || currentCityId);
      if (d.serviceable && d.city) {
        handleSelect({ id: d.city.id, name: d.city.name, state: d.city.state || "", slug: d.city.slug });
        return;
      }
      setPinStatus({
        tone: "err",
        text: d.message || "This PIN code is not in our active service area.",
      });
    } catch {
      setPinStatus({
        tone: "err",
        text: "We could not verify this PIN right now. Please try again in a moment.",
      });
    } finally {
      setPinBusy(false);
    }
  };

  /* ── Compact premium modal — same APIs / handlers ─────────────────────── */
  if (isModal) {
    return (
      <div
        className="w-full max-w-[min(100%,680px)] max-h-[min(68vh,580px)] flex flex-col rounded-xl overflow-hidden border border-sb-ink/12 bg-sb-surface shadow-[0_20px_50px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sb-location-title"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-sb-ink/10 bg-sb-cream shrink-0">
          <img src={logoImg} alt="StructBay" className="h-7 w-auto object-contain object-left" />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-sb-ink-muted hover:text-sb-ink hover:bg-sb-ink/5 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[12fr_10fr] min-h-0 flex-1 overflow-y-auto">
          {/* Left — selection */}
          <div className="p-4 sm:p-5 space-y-3.5 border-b lg:border-b-0 lg:border-r border-sb-ink/10 bg-sb-page min-h-0">
            <div>
              <h2 id="sb-location-title" className="text-lg sm:text-xl font-black text-sb-ink tracking-tight leading-snug">
                Select Your Delivery Location
              </h2>
              <p className="mt-1.5 text-xs text-sb-ink-muted/85 leading-relaxed max-w-prose">
                Choose your city to see accurate product availability, delivery timelines, inventory and pricing.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sb-ink-muted/45" aria-hidden />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search city..."
                disabled={loading || !!loadError}
                className="w-full pl-9 pr-3 py-2 bg-sb-cream-secondary border border-sb-ink/12 rounded-lg text-sm text-sb-ink placeholder:text-sb-ink-muted/45 focus:outline-none focus:border-[#FE5E00] focus:ring-1 focus:ring-[#FE5E00]/20 transition-colors disabled:opacity-50"
              />
            </div>

            <div className="rounded-lg border border-sb-ink/12 bg-sb-cream-secondary/90 p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sb-ink/55">Check By Pincode</p>
              <p className="text-[11px] text-sb-ink-muted/70 leading-relaxed">
                Enter your 6-digit PIN. If it matches a service area we have configured, your city is set automatically.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={8}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinStatus(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handlePinCheck();
                  }}
                  disabled={!!loadError}
                  placeholder="6 Digit Pincode"
                  className="flex-1 min-w-0 px-2.5 py-2 bg-sb-cream border border-sb-ink/12 rounded-lg text-sm text-sb-ink placeholder:text-sb-ink-muted/45 focus:outline-none focus:border-[#FE5E00] transition-colors disabled:opacity-50 tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => void handlePinCheck()}
                  disabled={pinBusy || !!loadError}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#FE5E00] text-white text-xs font-bold hover:bg-[#E05200] transition-colors disabled:opacity-50 flex items-center justify-center min-w-[76px]"
                >
                  {pinBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Check"}
                </button>
              </div>
              {pinStatus && (
                <p
                  className={`text-sm leading-relaxed ${
                    pinStatus.tone === "err" ? "text-amber-800" : "text-emerald-700"
                  }`}
                >
                  {pinStatus.text}
                </p>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sb-ink-muted text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-[#FE5E00]" /> Loading serviceable cities…
              </div>
            )}

            {loadError && !loading && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-800 text-xs">{loadError}</div>
            )}

            {!loading && !loadError && cities.length === 0 && (
              <div className="text-center py-4 px-2 rounded-lg border border-sb-ink/10 bg-sb-cream-secondary">
                <p className="text-sb-ink font-semibold text-xs mb-1">No cities available yet</p>
                <p className="text-sb-ink-muted/70 text-[11px] leading-relaxed">
                  Add active, serviceable cities in Admin. You can still browse; turn on city pricing when data is ready.
                </p>
              </div>
            )}

            {!loading && !loadError && (recentCity || recentPin) && !search && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sb-ink/50 mb-2">Recent</p>
                <div className="flex flex-col gap-2">
                  {recentCity && cities.some((c) => c.id === recentCity.id) && (
                    <button
                      type="button"
                      onClick={() => handleSelect(recentCity)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-sb-cream-secondary border border-sb-ink/12 rounded-xl hover:border-[#FE5E00]/45 transition-all w-full text-left"
                    >
                      <MapPin className="w-4 h-4 text-[#FE5E00] shrink-0" />
                      <span className="text-sm font-medium text-sb-ink">
                        {recentCity.name}
                        {recentCity.state ? <span className="text-sb-ink-muted/55"> · {recentCity.state}</span> : null}
                      </span>
                      <ChevronRight className="w-4 h-4 text-sb-ink-muted/35 ml-auto" />
                    </button>
                  )}
                  {recentPin && (
                    <button
                      type="button"
                      onClick={() => {
                        setPinInput(recentPin);
                        setPinStatus(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-sb-cream-secondary border border-sb-ink/12 rounded-xl hover:border-[#FE5E00]/45 transition-all w-full text-left text-sm text-sb-ink"
                    >
                      <span className="text-sb-ink-muted text-xs font-semibold uppercase tracking-wide shrink-0">PIN</span>
                      <span className="font-mono font-semibold tracking-wider">{recentPin}</span>
                      <span className="text-xs text-sb-ink-muted/70 ml-auto">Tap to use</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {!loading && !loadError && cities.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sb-ink/50 mb-3">
                  {search ? "Matching cities" : "Serviceable cities"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[168px] overflow-y-auto pr-0.5">
                  {filtered.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all text-left group ${
                        selectedId === c.id
                          ? "border-[#FE5E00] bg-[#FE5E00]/10 shadow-sm"
                          : "border-sb-ink/10 bg-sb-cream-secondary hover:border-[#FE5E00]/35 hover:bg-sb-cream"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                          selectedId === c.id ? "bg-[#FE5E00]" : "bg-sb-ink/5 group-hover:bg-[#FE5E00]/12"
                        }`}
                      >
                        <Building2 className={`w-3.5 h-3.5 ${selectedId === c.id ? "text-white" : "text-sb-ink-muted/65"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`font-semibold text-xs leading-tight truncate ${
                            selectedId === c.id ? "text-[#FE5E00]" : "text-sb-ink"
                          }`}
                        >
                          {c.name}
                        </p>
                        <p className="text-[10px] text-sb-ink-muted/60 truncate mt-0.5">{c.state || "—"}</p>
                      </div>
                      {selectedId === c.id && <CheckCircle2 className="w-3.5 h-3.5 text-[#FE5E00] shrink-0" />}
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <div className="col-span-full text-center py-4 px-3 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg">
                      <p className="text-sb-ink-muted text-xs">No cities match your search.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-1.5 border-t border-sb-ink/10">
              <button
                type="button"
                onClick={handleClear}
                className="w-full py-2 rounded-lg border border-sb-ink/12 bg-transparent text-xs font-medium text-sb-ink-muted hover:text-sb-ink hover:border-sb-ink/22 hover:bg-sb-ink/[0.03] transition-colors"
              >
                Continue Without Selecting City
              </button>
              <p className="text-center text-[10px] text-sb-ink-muted/45 mt-1.5 leading-relaxed">
                Catalog is national; prices and fulfilment use the city you pick. Change anytime from the header.
              </p>
            </div>
          </div>

          {/* Right — truck (PNG) + trust */}
          <div className="flex flex-col bg-sb-cream px-4 py-4 sm:px-5 sm:py-5 lg:min-w-0">
            <div className="flex flex-1 flex-col items-center justify-center min-h-[200px] lg:min-h-[240px]">
              <div className="relative w-full max-w-[260px] aspect-[16/10] rounded-xl overflow-hidden border border-sb-ink/10 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.1)]">
                <img
                  src={truckSrc}
                  alt="StructBay delivery"
                  width={520}
                  height={325}
                  className="absolute inset-0 w-full h-full object-contain object-center p-2"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  onError={() => {
                    setTruckSrc((s) => (s === TRUCK_SVG_FALLBACK ? s : TRUCK_SVG_FALLBACK));
                  }}
                />
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 text-left w-full max-w-[240px] mx-auto">
              {[
                { Icon: Shield, label: "StructBay Assured" },
                { Icon: Zap, label: "Express Delivery" },
                { Icon: FileText, label: "GST Billing" },
                { Icon: BadgeCheck, label: "Verified Vendors" },
              ].map(({ Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-[11px] text-sb-ink/85">
                  <Icon className="w-3.5 h-3.5 shrink-0 text-[#FE5E00]" aria-hidden />
                  <span className="font-medium">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  /* ── Full page (/city) — existing layout ───────────────────────────────── */
  const content = (
    <div className="w-full max-w-lg relative z-10 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-center mb-8">
        <img src={logoImg} alt="StructBay" className="h-14 w-auto object-contain" />
      </div>

      <div className="bg-sb-surface border border-sb-ink/12 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden">
        <div className="bg-[#FE5E00] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <MapPin className="w-5 h-5 text-sb-on-orange shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sb-on-orange font-black text-lg leading-none truncate">Select your city</h2>
              <p className="text-sb-on-orange/80 text-xs mt-0.5">Optional — prices & stock follow each city&apos;s warehouse</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sb-ink-muted/40" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city or state..."
              disabled={loading || !!loadError}
              className="w-full pl-10 pr-4 py-2.5 bg-sb-surface-2 border border-white/12 rounded-xl text-sm text-sb-ink placeholder:text-sb-ink-muted/40 focus:outline-none focus:border-[#FE5E00] transition-colors disabled:opacity-50"
            />
          </div>

          <div className="rounded-xl border border-sb-ink/12 bg-sb-surface-2/80 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-sb-ink-muted/60">By PIN code</p>
            <p className="text-xs text-sb-ink-muted/50 leading-relaxed">
              Enter your 6-digit PIN. If it matches a service area we have configured, your city is set automatically.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinStatus(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handlePinCheck();
                }}
                disabled={!!loadError}
                placeholder="e.g. 560001"
                className="flex-1 min-w-0 px-3 py-2.5 bg-sb-surface border border-white/12 rounded-xl text-sm text-sb-ink placeholder:text-sb-ink-muted/40 focus:outline-none focus:border-[#FE5E00] transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void handlePinCheck()}
                disabled={pinBusy || !!loadError}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-[#FE5E00] text-sb-on-orange text-sm font-bold hover:bg-[#E05200] transition-colors disabled:opacity-50 flex items-center justify-center min-w-[88px]"
              >
                {pinBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
              </button>
            </div>
            {pinStatus && (
              <p
                className={`text-sm leading-relaxed ${
                  pinStatus.tone === "err" ? "text-amber-200/95" : "text-emerald-400/95"
                }`}
              >
                {pinStatus.text}
              </p>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sb-ink-muted/60 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-[#FE5E00]" /> Loading serviceable cities…
            </div>
          )}

          {loadError && !loading && (
            <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-xl text-red-300 text-sm">{loadError}</div>
          )}

          {!loading && !loadError && cities.length === 0 && (
            <div className="text-center py-8 px-2">
              <p className="text-sb-ink font-semibold text-sm mb-2">No cities available yet</p>
              <p className="text-sb-ink-muted/60 text-xs leading-relaxed">
                Add active, serviceable cities in Admin. You can still browse; turn on city pricing when data is ready.
              </p>
            </div>
          )}

          {!loading && !loadError && recentCity && !search && cities.some((c) => c.id === recentCity.id) && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-sb-ink-muted/60 mb-2.5">Recent</p>
              <button
                type="button"
                onClick={() => handleSelect(recentCity)}
                className="flex items-center gap-2 px-4 py-2.5 bg-sb-surface-2 border border-sb-ink/12 rounded-xl hover:border-[#FE5E00]/50 transition-all w-full text-left"
              >
                <MapPin className="w-4 h-4 text-[#FE5E00] shrink-0" />
                <span className="text-sm font-medium text-sb-ink">
                  {recentCity.name}
                  {recentCity.state ? <span className="text-sb-ink-muted/50"> · {recentCity.state}</span> : null}
                </span>
                <ChevronRight className="w-4 h-4 text-sb-ink-muted/30 ml-auto" />
              </button>
            </div>
          )}

          {!loading && !loadError && cities.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-sb-ink-muted/60 mb-3.5">
                {search ? "Matching cities" : "Serviceable cities"}
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                {filtered.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left group ${
                      selectedId === c.id
                        ? "border-[#FE5E00] bg-[#FE5E00]/8"
                        : "border-sb-ink/10 bg-sb-surface-2 hover:border-[#FE5E00]/40 hover:bg-[#2A2A2A]"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        selectedId === c.id ? "bg-[#FE5E00]" : "bg-white/6 group-hover:bg-[#FE5E00]/15"
                      }`}
                    >
                      <Building2 className={`w-4 h-4 ${selectedId === c.id ? "text-sb-on-orange" : "text-sb-ink-muted/60"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-semibold text-sm leading-none mb-1 truncate ${
                          selectedId === c.id ? "text-[#FE5E00]" : "text-sb-ink"
                        }`}
                      >
                        {c.name}
                      </p>
                      <p className="text-xs text-sb-ink-muted/50 truncate">{c.state || "—"}</p>
                    </div>
                    {selectedId === c.id && <CheckCircle2 className="w-4 h-4 text-[#FE5E00] shrink-0" />}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-2 text-center py-6 px-4 bg-sb-surface-2 border border-sb-ink/12 rounded-xl">
                    <p className="text-sb-ink-muted/70 text-sm">No cities match your search.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1 border-t border-sb-ink/10">
            <button
              type="button"
              onClick={handleClear}
              className="w-full py-2.5 rounded-xl border border-sb-ink/15 text-sm text-sb-ink-muted hover:border-[#FE5E00]/40 hover:text-sb-ink transition-colors"
            >
              Continue without a city
            </button>
            <p className="text-center text-xs text-sb-ink-muted/35">
              Catalog is national; prices and fulfilment use the city you pick. Change anytime from the header.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sb-page flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, #F4E9D8 1px, transparent 0)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#FE5E00]/5 rounded-full blur-3xl pointer-events-none" />
      {content}
    </div>
  );
}
