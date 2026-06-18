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
      className={`rounded-card p-4 transition-all duration-200 hover:-translate-y-0.5 ${
        accent
          ? "vendor-stat-card--accent bg-gradient-to-br from-sb-orange to-sb-orange-hover text-white shadow-md shadow-sb-orange/20"
          : "border border-sb-border bg-sb-card shadow-sm hover:shadow-md"
      }`}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <p
          className={`vendor-stat-label ${
            accent ? "text-white/80" : "text-sb-text-secondary"
          }`}
        >
          {title}
        </p>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            accent
              ? "bg-white/20"
              : "border border-sb-orange/25 bg-sb-orange-subtle"
          }`}
        >
          <Icon className={`h-3.5 w-3.5 ${accent ? "text-white" : "text-sb-orange"}`} />
        </div>
      </div>
      <p className={`sb-stat-value ${accent ? "text-white" : ""}`}>
        {value}
      </p>
      {trend && (
        <p className={`mt-1 text-[11px] font-medium ${trendUp ? "text-sb-success" : accent ? "text-white/55" : "text-sb-text-secondary"}`}>
          {trend}
        </p>
      )}
    </div>
  );
}
