import type { ReactNode, CSSProperties } from "react";
import {
  ClipboardList,
  Users,
  Package,
  FileText,
  Truck,
  BarChart3,
  Network,
  Tags,
  Cpu,
  FolderKanban,
  Compass,
  Check,
} from "lucide-react";
import { cn } from "@shared/components/ui/utils";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";

/** Procurement / site imagery — warm tones, works with orange overlay */
const AUTH_HERO_IMAGE =
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=2000&q=82";

const LOGIN_FEATURES: { label: string; icon: typeof ClipboardList }[] = [
  { label: "RFQ Management", icon: ClipboardList },
  { label: "Vendor Discovery", icon: Users },
  { label: "Bulk Procurement", icon: Package },
  { label: "GST Invoicing", icon: FileText },
  { label: "Order Tracking", icon: Truck },
  { label: "Construction Analytics", icon: BarChart3 },
];

const LOGIN_STATS = [
  { value: "10,000+", label: "Products" },
  { value: "500+", label: "Verified Vendors" },
  { value: "50+", label: "Brands" },
  { value: "1000+", label: "RFQs Processed" },
];

const REGISTER_FLOAT: { label: string; icon: typeof Network }[] = [
  { label: "Vendor Network", icon: Network },
  { label: "Bulk Pricing", icon: Tags },
  { label: "RFQ Marketplace", icon: ClipboardList },
  { label: "Procurement Automation", icon: Cpu },
  { label: "Project Management", icon: FolderKanban },
  { label: "Material Discovery", icon: Compass },
];

/** Premium glass panel — blur + top highlight + soft depth */
const glassPanel =
  "rounded-2xl border border-white/14 border-t-white/25 bg-gradient-to-br from-white/[0.16] to-white/[0.04] backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.2)]";

const heroTitleClass =
  "font-bold tracking-tight text-[#FAF3E1] [text-shadow:0_1px_2px_rgba(0,0,0,0.9),0_4px_28px_rgba(0,0,0,0.65),0_0_1px_rgba(0,0,0,1)]";

function GlassStat({
  value,
  label,
  className,
  style,
}: {
  value: string;
  label: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        glassPanel,
        "px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#FE5E00]/25 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.22)]",
        className
      )}
      style={style}
    >
      <p className="text-lg font-bold tracking-tight text-[#FAF3E1]">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#F5E7C6]/70">{label}</p>
    </div>
  );
}

function LoginVisual() {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col justify-center px-6 py-10 md:px-10 lg:px-14">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#FE5E00]/20 via-[#FE5E00]/06 to-transparent"
        aria-hidden
      />
      <div className="relative z-[1] mx-auto flex w-full max-w-xl flex-col gap-10 lg:max-w-none lg:gap-12">
      <header className="space-y-4 animate-fade-up">
        <p className="inline-flex w-fit items-center rounded-full border border-[#FE5E00]/35 bg-[#FE5E00]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5E7C6]">
          B2B Marketplace
        </p>
        <h1 className={`text-2xl font-bold leading-[1.2] tracking-tight md:text-3xl lg:text-[1.7rem] xl:text-4xl ${heroTitleClass}`}>
          India&apos;s Premier Construction Procurement Marketplace
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-[#F5E7C6]/90 md:text-base">
          Manage projects, RFQs, procurement, vendors, orders and construction materials from one platform.
        </p>
        <div className="h-1 w-14 rounded-full bg-[#FE5E00] shadow-[0_0_20px_rgba(254,94,0,0.55)]" />
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
        {LOGIN_FEATURES.map(({ label, icon: Icon }, i) => (
          <li
            key={label}
            className={cn(
              glassPanel,
              "flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-[#FAF3E1] transition-all duration-300 hover:border-[#FE5E00]/30 animate-fade-up"
            )}
            style={{ animationDelay: `${80 + i * 50}ms` }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FE5E00] text-white shadow-[0_4px_16px_rgba(254,94,0,0.45)] ring-1 ring-white/20">
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-[#FE5E00]" strokeWidth={2.5} aria-hidden />
              <span className="leading-snug">{label}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-4">
        {LOGIN_STATS.map((s, i) => (
          <GlassStat
            key={s.label}
            {...s}
            className="animate-fade-up"
            style={{ animationDelay: `${200 + i * 60}ms` }}
          />
        ))}
      </div>
      </div>
    </div>
  );
}

function RegisterVisual() {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col justify-center px-6 py-10 md:px-10 lg:px-14">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#FE5E00]/28 via-[#111]/40 to-transparent"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-1/4 h-px max-w-md bg-gradient-to-r from-transparent via-[#FE5E00]/40 to-transparent opacity-80 md:max-w-lg" aria-hidden />

      <div className="relative z-[1] mx-auto flex w-full max-w-xl flex-col gap-11 pt-2 md:gap-12 lg:max-w-2xl lg:gap-14">
        <header className="space-y-5 animate-fade-up">
          <p className="inline-flex w-fit items-center rounded-full border border-[#FE5E00]/35 bg-[#FE5E00]/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5E7C6]">
            Join StructBay
          </p>
          <h1 className={`text-[1.65rem] font-bold leading-[1.15] tracking-tight sm:text-3xl lg:text-4xl xl:text-[2.35rem] ${heroTitleClass}`}>
            Build Smarter With StructBay
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-[#F5E7C6] md:text-lg md:leading-relaxed">
            Join India&apos;s growing B2B construction ecosystem.
          </p>
          <div className="flex items-center gap-3">
            <div className="h-1 w-16 rounded-full bg-[#FE5E00] shadow-[0_0_24px_rgba(254,94,0,0.6)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#FAF3E1]/50">Procurement · Vendors · Projects</span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
          {REGISTER_FLOAT.map(({ label, icon: Icon }, i) => (
            <div
              key={label}
              className={cn(
                glassPanel,
                "group flex items-center gap-3.5 px-4 py-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-[#FE5E00]/35 animate-fade-up"
              )}
              style={{ animationDelay: `${70 + i * 55}ms` }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FE5E00] text-white shadow-[0_6px_20px_rgba(254,94,0,0.5)] ring-2 ring-[#FE5E00]/35 transition-transform duration-300 group-hover:scale-105">
                <Icon className="h-[19px] w-[19px]" strokeWidth={1.85} aria-hidden />
              </span>
              <span className="min-w-0 text-sm font-semibold leading-snug text-[#FAF3E1] sm:text-[0.9375rem]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export type CustomerAuthVisualVariant = "login" | "register";

type CustomerAuthLayoutProps = {
  children: ReactNode;
  visualVariant: CustomerAuthVisualVariant;
};

/**
 * Premium split auth shell: left form (40% desktop), right construction visual (60%).
 * Mobile: visual first, form below. Tablet: 50/50. Desktop: 40/60.
 */
export function CustomerAuthLayout({ children, visualVariant }: CustomerAuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#111111]">
      {/* Visual — top on mobile, right on desktop */}
      <section
        className={cn(
          "relative order-1 w-full md:w-1/2 lg:order-2 lg:w-[60%]",
          "min-h-[280px] sm:min-h-[340px] lg:min-h-screen shrink-0"
        )}
      >
        <img
          src={AUTH_HERO_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center scale-105 lg:scale-100"
          loading="eager"
        />
        <div className="absolute inset-0 bg-[#111111]/80" aria-hidden />
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#111111]/90 via-[#222222]/65 to-[#FE5E00]/28"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_70%_100%,rgba(254,94,0,0.22),transparent_55%)]"
          aria-hidden
        />
        <div className="relative z-10 flex h-full min-h-[280px] flex-1 flex-col sm:min-h-[340px] lg:min-h-screen">
          {visualVariant === "login" ? <LoginVisual /> : <RegisterVisual />}
        </div>
      </section>

      {/* Form column — bottom on mobile, left on desktop */}
      <section
        className={cn(
          "order-2 flex w-full flex-1 flex-col items-center justify-center",
          "md:w-1/2 lg:order-1 lg:w-[40%]",
          "bg-[#FAF3E1] px-5 py-10 sm:px-8 lg:px-10 lg:py-12"
        )}
      >
        <div
          className={cn(
            "w-full max-w-[500px] rounded-2xl border border-[#222222]/10 bg-[#F5E7C6]/90 p-8 shadow-[0_24px_48px_-12px_rgba(34,34,34,0.18)] backdrop-blur-sm",
            "transition-shadow duration-300 hover:shadow-[0_28px_56px_-12px_rgba(34,34,34,0.22)]",
            "animate-fade-up"
          )}
        >
          <div className="mb-8 flex justify-center lg:justify-start">
            <img src={logoImg} alt="StructBay" className="h-11 w-auto object-contain md:h-12" />
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
