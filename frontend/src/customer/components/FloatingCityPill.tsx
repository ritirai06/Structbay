import { MapPin } from "lucide-react";
import { useApp } from "../context/AppContext";

type Props = {
  onChangeCity: () => void;
};

export function FloatingCityPill({ onChangeCity }: Props) {
  const { city } = useApp();

  return (
    <div className="sf-floating-city pointer-events-none">
      <button
        type="button"
        onClick={onChangeCity}
        className="sf-city-pill pointer-events-auto"
        aria-label="Change delivery city"
      >
        <MapPin className="w-4 h-4 text-red-500 shrink-0" aria-hidden />
        <span>{city || "Select city"}</span>
        <span className="text-white/60">(change)</span>
      </button>
    </div>
  );
}
