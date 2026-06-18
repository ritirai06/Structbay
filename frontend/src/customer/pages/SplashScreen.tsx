import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Package, Truck, Shield, Zap } from "lucide-react";

export function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/"), 1200);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      style={{ backgroundColor: "var(--sb-black)" }}
      className="sb-storefront fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background construction pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-64 h-64 border-2 border-[#F4E9D8] rounded-full" />
        <div className="absolute bottom-10 right-10 w-96 h-96 border-2 border-[#F4E9D8] rounded-full" />
        <div className="absolute top-1/4 right-1/4 w-32 h-32 border border-[#F4E9D8] rotate-45" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 border border-[#F4E9D8] rotate-12" />
      </div>

      {/* Animated logo */}
      <div className="relative z-10 flex flex-col items-center gap-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div style={{ backgroundColor: "var(--sb-orange)" }} className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl">
            <Package className="w-10 h-10 text-sb-on-orange" />
          </div>
          <div>
            <p className="text-sb-ink text-5xl font-bold leading-none tracking-tight">
              Struct<span style={{ color: "var(--sb-orange)" }}>Bay</span>
            </p>
            <p className="text-sb-ink-muted/60 text-sm tracking-widest uppercase mt-1">Construction Marketplace</p>
          </div>
        </div>

        <p className="text-sb-ink-muted/80 text-lg text-center max-w-xs">
          Building India's Future, One Material at a Time
        </p>

        {/* Feature pills */}
        <div className="flex gap-3 mt-4">
          {[
            { icon: Shield, label: "Assured Quality" },
            { icon: Zap, label: "Express Delivery" },
            { icon: Truck, label: "Bulk Orders" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-sb-ink-muted/80 text-xs">
              <Icon className="w-3 h-3" />
              {label}
            </div>
          ))}
        </div>

        {/* Loading bar */}
        <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden mt-6">
          <div
            style={{ backgroundColor: "var(--sb-orange)", animation: "loading 2.5s ease-in-out forwards" }}
            className="h-full rounded-full"
          />
        </div>
      </div>

      <style>{`
        @keyframes loading {
          from { width: 0% }
          to { width: 100% }
        }
      `}</style>
    </div>
  );
}
