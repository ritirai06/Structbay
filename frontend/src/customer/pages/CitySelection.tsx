import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, Loader2 } from "lucide-react";
import { useApp, type SelectedCity } from "../context/AppContext";
import { loadStorefrontCities } from "../lib/storefrontCities";
import { markLocationOnboardingComplete } from "../lib/locationOnboarding";

const RECENT_KEY = "sb_city_recent_meta";

const SERVING_CITIES_LINE = "Bengaluru | Telangana | Chennai";

function publicAsset(rel: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const path = rel.replace(/^\//, "");
  return base.endsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

const TRUCK_PNG = publicAsset("marketing/structbay-truck.png");
const TRUCK_SVG_FALLBACK = publicAsset("marketing/structbay-delivery-truck.svg");

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
  /** When true: no close, no skip — user must pick a city to continue. */
  requireSelection?: boolean;
  onClose?: () => void;
}

function CityPickerBody({
  cities,
  loading,
  loadError,
  selectedId,
  onSelectId,
  onContinue,
  continueBusy,
  showBrowseWithout,
  onBrowseWithout,
}: {
  cities: SelectedCity[];
  loading: boolean;
  loadError: string | null;
  selectedId: string | null;
  onSelectId: (id: string) => void;
  onContinue: () => void;
  continueBusy?: boolean;
  showBrowseWithout?: boolean;
  onBrowseWithout?: () => void;
}) {
  const [truckSrc, setTruckSrc] = useState(TRUCK_PNG);

  return (
    <div className="sf-city-modal">
      <div className="sf-city-modal__hero">
        <img
          src={truckSrc}
          alt="Structbay delivery truck"
          className="sf-city-modal__truck"
          loading="eager"
          decoding="async"
          onError={() => setTruckSrc((s) => (s === TRUCK_SVG_FALLBACK ? s : TRUCK_SVG_FALLBACK))}
        />
      </div>

      <div className="sf-city-modal__body">
        <p className="sf-city-modal__eyebrow">Introducing</p>
        <h2 id="sb-location-title" className="sf-city-modal__title">
          Structbay Express
        </h2>
        <p className="sf-city-modal__lead">Order before 2 pm for same day delivery</p>
        <p className="sf-city-modal__fine">*applicable for select products and pincodes</p>
        <p className="sf-city-modal__serve-note">
          We are currently serving in 3 cities — Bengaluru, Telangana &amp; Chennai.
        </p>
        <p className="sf-city-modal__cities">{SERVING_CITIES_LINE}</p>

        {loading ? (
          <div className="sf-city-modal__loading">
            <Loader2 className="w-5 h-5 animate-spin text-[#E85A00]" aria-hidden />
            <span>Loading cities…</span>
          </div>
        ) : loadError ? (
          <p className="sf-city-modal__error">{loadError}</p>
        ) : cities.length === 0 ? (
          <p className="sf-city-modal__error">No cities available yet.</p>
        ) : (
          <div className="sf-city-modal__field">
            <label htmlFor="sb-city-select" className="sr-only">
              Select your city
            </label>
            <select
              id="sb-city-select"
              value={selectedId || ""}
              onChange={(e) => onSelectId(e.target.value)}
              className="sf-city-modal__select"
            >
              <option value="">Select Your City</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.state ? `${c.name}, ${c.state}` : c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="sf-city-modal__chevron" aria-hidden />
          </div>
        )}

        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedId || loading || !!loadError || continueBusy}
          className="sf-city-modal__continue"
        >
          {continueBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
        </button>

        {showBrowseWithout && onBrowseWithout && (
          <button type="button" onClick={onBrowseWithout} className="sf-city-modal__browse-skip">
            Browse without selecting a city
          </button>
        )}
      </div>
    </div>
  );
}

export function CitySelection({ isModal = false, requireSelection = false, onClose }: CitySelectionProps) {
  const { setSelectedCity, cityId: currentCityId } = useApp();
  const navigate = useNavigate();
  const [cities, setCities] = useState<SelectedCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(currentCityId);
  const [continueBusy, setContinueBusy] = useState(false);

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
            e instanceof Error ? e.message : "Could not load cities. Check your connection and try again."
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
    if (requireSelection) {
      setSelectedId(null);
      return;
    }
    setSelectedId(currentCityId);
  }, [currentCityId, requireSelection]);

  const applySelection = (c: SelectedCity) => {
    const prev = readStoredCitySafe();
    if (prev && prev.id !== c.id) writeRecent(prev);
    setSelectedCity(c);
    try {
      localStorage.removeItem("sb_city");
    } catch {
      /* ignore */
    }
    if (isModal) onClose?.();
    else navigate("/");
  };

  const handleContinue = () => {
    const c = cities.find((x) => x.id === selectedId);
    if (!c) return;
    setContinueBusy(true);
    applySelection(c);
    setContinueBusy(false);
  };

  const handleBrowseWithout = () => {
    markLocationOnboardingComplete();
    if (isModal) onClose?.();
    else navigate("/");
  };

  const picker = (
    <CityPickerBody
      cities={cities}
      loading={loading}
      loadError={loadError}
      selectedId={selectedId}
      onSelectId={setSelectedId}
      onContinue={handleContinue}
      continueBusy={continueBusy}
      showBrowseWithout={requireSelection}
      onBrowseWithout={handleBrowseWithout}
    />
  );

  const gate = (
    <div
      className="sf-city-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sb-location-title"
      onClick={requireSelection ? undefined : onClose}
    >
      <div className="sf-city-modal-wrap" onClick={(e) => e.stopPropagation()}>
        {picker}
      </div>
    </div>
  );

  if (isModal) return gate;

  return gate;
}
