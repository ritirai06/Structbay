import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  MapPin, Search, LocateFixed, ChevronRight,
  Building2, CheckCircle2, X, Navigation,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";

const CITIES = [
  { name: "Bengaluru",  state: "Karnataka",  builders: "4,200+", pinPrefix: "56" },
  { name: "Chennai",    state: "Tamil Nadu", builders: "2,700+", pinPrefix: "60" },
  { name: "Hyderabad",  state: "Telangana",  builders: "3,100+", pinPrefix: "50" },
];

interface CitySelectionProps {
  isModal?: boolean;
  onClose?: () => void;
}

export function CitySelection({ isModal = false, onClose }: CitySelectionProps) {
  const { setCity, city: currentCity } = useApp();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(currentCity);
  const [search, setSearch] = useState("");
  const [pincode, setPincode] = useState("");
  const [pincodeError, setPincodeError] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const recentCity = localStorage.getItem("sb_city_recent");

  useEffect(() => {
    if (isModal) setTimeout(() => searchRef.current?.focus(), 100);
  }, [isModal]);

  const filtered = CITIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.state.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (cityName: string) => {
    setSelected(cityName);
    const prev = localStorage.getItem("sb_city");
    if (prev) localStorage.setItem("sb_city_recent", prev);
    setCity(cityName);
    if (isModal) {
      onClose?.();
    } else {
      navigate("/");
    }
  };

  const handleDetect = () => {
    setDetecting(true);
    setDetectMsg("Detecting your location...");
    navigator.geolocation?.getCurrentPosition(
      () => {
        setDetectMsg("Location detected — defaulting to Bengaluru");
        setTimeout(() => { setDetecting(false); handleSelect("Bengaluru"); }, 1200);
      },
      () => {
        setDetectMsg("Could not detect. Please select manually.");
        setDetecting(false);
      }
    );
  };

  const handlePincode = () => {
    if (pincode.length < 6) return;
    const match = CITIES.find(c => pincode.startsWith(c.pinPrefix));
    if (match) {
      setPincodeError("");
      handleSelect(match.name);
    } else {
      setPincodeError("We sincerely apologize, but StructBay operations are currently exclusive to Bengaluru, Chennai, and Hyderabad. We appreciate your interest and hope to serve your location in the future.");
    }
  };

  const content = (
    <div className={`${isModal ? "w-full max-w-lg" : "w-full max-w-lg"} relative z-10 animate-in fade-in zoom-in-95 duration-300`}>
      {/* Logo */}
      {!isModal && (
        <div className="flex justify-center mb-8">
          <img src={logoImg} alt="StructBay" className="h-14 w-auto object-contain" />
        </div>
      )}

      <div className="bg-[#171717] border border-white/10 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden">
        {/* Header */}
        <div className="bg-[#FE5E00] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-[#0D0D0D]" />
            <div>
              <h2 className="text-[#0D0D0D] font-black text-lg leading-none">Select Your City</h2>
              <p className="text-[#0D0D0D]/70 text-xs mt-0.5">For accurate pricing & availability</p>
            </div>
          </div>
          {isModal && onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#0D0D0D]/10 transition-colors">
              <X className="w-5 h-5 text-[#0D0D0D]" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4C4A8]/40" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search city or state..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#222222] border border-white/12 rounded-xl text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/40 focus:outline-none focus:border-[#FE5E00] transition-colors"
            />
          </div>

          {/* Auto detect */}
          <button
            onClick={handleDetect}
            disabled={detecting}
            className="w-full flex items-center gap-3 px-4 py-3 bg-[#222222] border border-white/10 rounded-xl hover:border-[#FE5E00]/50 hover:bg-[#2A2A2A] transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#FE5E00]/15 border border-[#FE5E00]/20 flex items-center justify-center shrink-0">
              <LocateFixed className={`w-4 h-4 text-[#FE5E00] ${detecting ? "animate-pulse" : ""}`} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#F4E9D8] group-hover:text-[#FE5E00] transition-colors">
                {detecting ? "Detecting..." : "Auto-detect my location"}
              </p>
              <p className="text-xs text-[#D4C4A8]/50">{detectMsg || "Uses GPS to find your city"}</p>
            </div>
            <Navigation className="w-4 h-4 text-[#D4C4A8]/30 ml-auto group-hover:text-[#FE5E00] transition-colors" />
          </button>

          {/* Recent */}
          {recentCity && !search && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#D4C4A8]/60 mb-2.5">Recent City</p>
              <button
                onClick={() => handleSelect(recentCity)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#222222] border border-white/10 rounded-xl hover:border-[#FE5E00]/50 transition-all w-full text-left"
              >
                <MapPin className="w-4 h-4 text-[#FE5E00] shrink-0" />
                <span className="text-sm font-medium text-[#F4E9D8]">{recentCity}</span>
                <ChevronRight className="w-4 h-4 text-[#D4C4A8]/30 ml-auto" />
              </button>
            </div>
          )}

          {/* City grid */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#D4C4A8]/60 mb-3.5">
              {search ? "Search Results" : "Popular Cities"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {filtered.map(city => (
                <button
                  key={city.name}
                  onClick={() => handleSelect(city.name)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left group ${
                    selected === city.name
                      ? "border-[#FE5E00] bg-[#FE5E00]/8"
                      : "border-white/8 bg-[#222222] hover:border-[#FE5E00]/40 hover:bg-[#2A2A2A]"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    selected === city.name ? "bg-[#FE5E00]" : "bg-white/6 group-hover:bg-[#FE5E00]/15"
                  }`}>
                    <Building2 className={`w-4 h-4 ${selected === city.name ? "text-[#0D0D0D]" : "text-[#D4C4A8]/60"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold text-sm leading-none mb-1 ${
                      selected === city.name ? "text-[#FE5E00]" : "text-[#F4E9D8]"
                    }`}>{city.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[#D4C4A8]/50 truncate">{city.state}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#2A2A2A] text-[#D4C4A8]/70 border border-white/5">
                        {city.builders} vendors
                      </span>
                    </div>
                  </div>
                  {selected === city.name && (
                    <CheckCircle2 className="w-4 h-4 text-[#FE5E00] shrink-0" />
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-2 text-center py-6 px-4 bg-[#222222] border border-white/10 rounded-xl">
                  <p className="text-[#F4E9D8] font-semibold text-sm mb-1.5">Location Not Serviceable</p>
                  <p className="text-[#D4C4A8]/60 text-xs leading-relaxed">
                    We sincerely apologize, but StructBay operations are currently exclusive to Bengaluru, Chennai, and Hyderabad. We appreciate your interest and hope to serve your location in the future.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Pincode */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#D4C4A8]/60 mb-2.5">Or enter Pincode</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={pincode}
                onChange={e => setPincode(e.target.value.replace(/\D/, "").slice(0, 6))}
                placeholder="e.g. 560001"
                className="flex-1 px-3.5 py-2.5 bg-[#222222] border border-white/12 rounded-xl text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/40 focus:outline-none focus:border-[#FE5E00] transition-colors"
              />
              <button
                onClick={handlePincode}
                disabled={pincode.length < 6}
                className="px-4 py-2.5 bg-[#FE5E00] hover:bg-[#E05200] disabled:opacity-40 disabled:cursor-not-allowed text-[#0D0D0D] font-semibold text-sm rounded-xl transition-colors"
              >
                Go
              </button>
            </div>
            {pincodeError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-xs leading-relaxed">{pincodeError}</p>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-[#D4C4A8]/30">
            More cities coming soon · You can change anytime from header
          </p>
        </div>
      </div>
    </div>
  );

  if (isModal) return content;

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #F4E9D8 1px, transparent 0)", backgroundSize: "48px 48px" }} />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#FE5E00]/5 rounded-full blur-3xl pointer-events-none" />
      {content}
    </div>
  );
}
