import { useState, useEffect, useCallback } from "react";
import { MapPin, X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";

const STORAGE_PIN = "sb_hero_delivery_pin";

function readStoredPin(): string {
  try {
    const v = localStorage.getItem(STORAGE_PIN);
    return v && /^\d{6}$/.test(v) ? v : "";
  } catch {
    return "";
  }
}

function writeStoredPin(pin: string) {
  try {
    if (pin && /^\d{6}$/.test(pin)) localStorage.setItem(STORAGE_PIN, pin);
    else localStorage.removeItem(STORAGE_PIN);
  } catch {
    /* ignore */
  }
}

type Props = {
  cityId: string | null;
  className?: string;
};

/**
 * Quick commerce–style “Deliver to” chip + modal. Availability comes from
 * `GET /customer/serviceability/pincode` (City.pincodes — no hardcoded PIN logic).
 */
export function HeroDeliverTo({ cityId, className = "" }: Props) {
  const [displayPin, setDisplayPin] = useState("");
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    serviceable: boolean;
    message?: string;
    city?: { name: string; state: string };
    matchKind?: string;
  } | null>(null);

  useEffect(() => {
    setDisplayPin(readStoredPin());
  }, []);

  const openModal = useCallback(() => {
    setInput(displayPin || "");
    setResult(null);
    setOpen(true);
  }, [displayPin]);

  const check = async () => {
    const digits = input.replace(/\D/g, "").slice(0, 6);
    if (digits.length !== 6) {
      setResult({ serviceable: false, message: "Enter a valid 6-digit PIN code." });
      return;
    }
    setChecking(true);
    setResult(null);
    try {
      const data = await api.validatePincode(digits, cityId);
      setResult({
        serviceable: !!data.serviceable,
        message: data.message,
        city: data.city,
        matchKind: (data as { matchKind?: string }).matchKind,
      });
      if (data.serviceable) {
        setDisplayPin(digits);
        writeStoredPin(digits);
      }
    } catch (e) {
      setResult({
        serviceable: false,
        message: e instanceof Error ? e.message : "Could not check PIN.",
      });
    } finally {
      setChecking(false);
    }
  };

  const close = () => {
    setOpen(false);
    setResult(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-left text-sm text-white backdrop-blur-sm transition hover:bg-white/15 hover:border-white/35 ${className}`}
      >
        <MapPin className="w-4 h-4 shrink-0 text-[#E85A00]" aria-hidden />
        <span className="text-white/75 text-xs font-medium uppercase tracking-wide">Deliver to</span>
        <span className="font-mono font-semibold text-white tabular-nums">{displayPin || "—"}</span>
        <span className="text-[#E85A00] text-xs font-bold ml-1">Change</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="hero-pin-title">
          <button type="button" className="absolute inset-0 bg-sb-ink/60 backdrop-blur-sm" aria-label="Close" onClick={close} />
          <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10">
              <h2 id="hero-pin-title" className="text-base font-bold text-sb-ink">
                Check delivery availability
              </h2>
              <button type="button" onClick={close} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-black" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block text-xs font-semibold text-sb-ink/70 uppercase tracking-wide">Enter pincode</label>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="560001"
                  maxLength={6}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-lg text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E85A00]/35"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  disabled={checking}
                  onClick={() => void check()}
                  className="shrink-0 rounded-xl bg-[#E85A00] hover:bg-[#CC4E00] text-white font-bold px-5 py-3 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Check
                </button>
              </div>

              {result && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    result.serviceable
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950"
                      : "border-amber-500/35 bg-amber-500/10 text-amber-950"
                  }`}
                >
                  {result.serviceable ? (
                    <div className="space-y-2">
                      <p className="font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> Delivery available
                      </p>
                      <ul className="text-xs space-y-1.5 text-emerald-900/90 pl-1">
                        <li className="flex gap-2">
                          <span className="text-emerald-600 font-bold">✓</span> Structbay Delivery
                        </li>
                        <li className="flex gap-2">
                          <span className="text-emerald-600 font-bold">✓</span> Express delivery where products support 24–48h windows
                        </li>
                        {result.city && (
                          <li className="flex gap-2">
                            <span className="text-emerald-600 font-bold">✓</span> Hub: {result.city.name}
                            {result.city.state ? `, ${result.city.state}` : ""}
                          </li>
                        )}
                        <li className="flex gap-2">
                          <span className="text-emerald-600 font-bold">✓</span> Estimated delivery: typically 24–48 hours (product & slot dependent)
                        </li>
                      </ul>
                    </div>
                  ) : (
                    <p className="flex items-start gap-2 leading-relaxed">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{result.message || "This PIN is not serviceable yet."}</span>
                    </p>
                  )}
                </div>
              )}

              <p className="text-[11px] text-sb-ink-muted/70 leading-relaxed">
                Service area is determined from your admin-configured city PIN lists (no hardcoded PINs in the app).
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
