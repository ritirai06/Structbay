import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  MapPin, Search, ChevronRight,
  Building2, CheckCircle2, X, Loader2,
} from "lucide-react";
import { useApp, type SelectedCity } from "../context/AppContext";
import { api } from "../lib/api";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";

const RECENT_KEY = "sb_city_recent_meta";

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

  const recentCity = readRecent();

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetch("/api/v1/customer/cities")
      .then((r) => r.json())
      .then((res) => {
        const list = res.data || [];
        setCities(
          list.map((c: any) => ({
            id: String(c._id),
            name: c.name,
            state: c.state || "",
            slug: c.slug,
          }))
        );
      })
      .catch(() => setLoadError("Could not load cities. Check your connection and try again."))
      .finally(() => setLoading(false));
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
      const d = await api.validatePincode(pinInput);
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

  const content = (
    <div className={`${isModal ? "w-full max-w-lg" : "w-full max-w-lg"} relative z-10 animate-in fade-in zoom-in-95 duration-300`}>
      {!isModal && (
        <div className="flex justify-center mb-8">
          <img src={logoImg} alt="StructBay" className="h-14 w-auto object-contain" />
        </div>
      )}

      <div className="bg-sb-surface border border-sb-ink/12 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden">
        <div className="bg-[#FE5E00] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <MapPin className="w-5 h-5 text-sb-on-orange shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sb-on-orange font-black text-lg leading-none truncate">Select your city</h2>
              <p className="text-sb-on-orange/80 text-xs mt-0.5">Optional — prices & stock follow each city&apos;s warehouse</p>
            </div>
          </div>
          {isModal && onClose && (
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-sb-page/10 transition-colors shrink-0">
              <X className="w-5 h-5 text-sb-on-orange" />
            </button>
          )}
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

  if (isModal) return content;

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
