import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
}

export function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const iconColor = color?.includes("orange") ? "text-[#FE5E00]"
                  : color?.includes("blue")   ? "text-[#FE5E00]"
                  : color?.includes("green")  ? "text-green-400"
                  : color?.includes("red")    ? "text-red-400"
                  : color?.includes("purple") ? "text-[#C9A227]"
                  : color?.includes("cyan")   ? "text-[#EADCC6]"
                  : "text-[#FE5E00]";

  const iconBg = color?.includes("orange") ? "bg-[#FE5E00]/15"
               : color?.includes("blue")   ? "bg-[#FE5E00]/15"
               : color?.includes("green")  ? "bg-green-500/15"
               : color?.includes("red")    ? "bg-red-500/15"
               : color?.includes("purple") ? "bg-[#C9A227]/15"
               : color?.includes("cyan")   ? "bg-white/10"
               : "bg-[#FE5E00]/15";

  return (
    <div className="bg-[#222222] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/60">{title}</p>
          <p className="text-2xl font-black text-[#F4E9D8] mt-1.5">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
