import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  accent?: boolean;
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ title, value, icon: Icon, accent, trend, trendUp }: StatCardProps) {
  return (
    <div
      className="rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
      style={{
        background: accent
          ? "linear-gradient(135deg, var(--sb-orange) 0%, var(--sb-orange-hover) 100%)"
          : "var(--sb-card)",
        border: accent ? "none" : "1px solid var(--sb-border)",
        boxShadow: accent ? "0 8px 24px var(--sb-orange-glow)" : "0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: accent ? "rgba(255,255,255,0.75)" : "var(--sb-text-muted)" }}
        >
          {title}
        </p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: accent ? "rgba(255,255,255,0.2)" : "var(--sb-orange-subtle)",
            border: accent ? "none" : "1px solid var(--sb-orange-border)",
          }}
        >
          <Icon className="w-4 h-4" style={{ color: accent ? "#fff" : "var(--sb-orange)" }} />
        </div>
      </div>
      <p className="text-3xl font-black" style={{ color: accent ? "#fff" : "var(--sb-text-primary)" }}>
        {value}
      </p>
      {trend && (
        <p className="text-xs mt-1.5 font-semibold" style={{ color: trendUp ? "var(--sb-green)" : accent ? "rgba(255,255,255,0.6)" : "var(--sb-text-faint)" }}>
          {trend}
        </p>
      )}
    </div>
  );
}
