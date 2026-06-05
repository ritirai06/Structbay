import {
  HardHat, Settings2, Paintbrush2, Layers3, FlaskConical,
  Zap, Droplet, Wrench, Layers, Hammer,
  type LucideIcon,
} from "lucide-react";

export interface Category {
  slug: string;
  name: string;
  /** @deprecated Use lucideIcon instead. Kept for legacy compatibility. */
  icon: string;
  lucideIcon: LucideIcon;
  accentColor: string;       // Tailwind color class e.g. "text-orange-500"
  accentBg: string;          // e.g. "bg-orange-500/10"
  description: string;
  longDescription: string;
  bannerImage: string;
  productCount: number;
  seoTitle: string;
  seoDescription: string;
}

/** Map of slug → Lucide component for quick lookup */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  cement:      HardHat,
  steel:       Settings2,
  paints:      Paintbrush2,
  concrete:    Layers3,
  chemicals:   FlaskConical,
  electricals: Zap,
  pipes:       Droplet,
  tools:       Wrench,
  plywood:     Layers,
  hardware:    Hammer,
};

export const CATEGORIES: Category[] = [
  {
    slug: "cement",
    name: "Cement",
    icon: "🏗️",
    lucideIcon: HardHat,
    accentColor: "text-amber-600",
    accentBg: "bg-amber-500/10",
    description: "OPC, PPC & specialty cements from top brands",
    longDescription:
      "Source premium quality OPC 43, OPC 53, PPC, and specialty cement grades from authorized dealers of Ultratech, ACC, Ambuja, JK Cement and more. All products are BIS certified and ISI marked.",
    bannerImage:
      "https://images.unsplash.com/photo-1587163750009-30c06ff8d8ef?w=1200&h=300&fit=crop",
    productCount: 124,
    seoTitle: "Buy Cement Online | StructBay",
    seoDescription:
      "Buy OPC 53, PPC, and specialty cement online at the best prices. Assured quality, bulk discounts, and express delivery on StructBay.",
  },
  {
    slug: "steel",
    name: "Steel",
    icon: "⚙️",
    lucideIcon: Settings2,
    accentColor: "text-slate-400",
    accentBg: "bg-slate-500/10",
    description: "TMT bars, MS bars & wire rods from top mills",
    longDescription:
      "Procure Fe 500D TMT bars, MS rounds, wire rods and structural steel from TATA Steel, SAIL, JSW, and Jindal. All ISI-certified, with full material test certificates.",
    bannerImage:
      "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&h=300&fit=crop",
    productCount: 89,
    seoTitle: "Buy Steel & TMT Bars Online | StructBay",
    seoDescription:
      "Buy Fe 500D TMT bars, MS bars and structural steel at the best prices from top mills. BIS certified, bulk pricing available on StructBay.",
  },
  {
    slug: "paints",
    name: "Paints",
    icon: "🎨",
    lucideIcon: Paintbrush2,
    accentColor: "text-pink-500",
    accentBg: "bg-pink-500/10",
    description: "Interior, exterior & specialty paints",
    longDescription:
      "Complete range of interior emulsions, exterior weather-resistant paints, primers, and waterproofing solutions from Asian Paints, Berger, Dulux, and Nerolac.",
    bannerImage:
      "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1200&h=300&fit=crop",
    productCount: 203,
    seoTitle: "Buy Paints Online | StructBay",
    seoDescription:
      "Buy interior and exterior paints from Asian Paints, Berger, and Dulux at the best prices. Bulk discounts available on StructBay.",
  },
  {
    slug: "concrete",
    name: "Concrete",
    icon: "🧱",
    lucideIcon: Layers3,
    accentColor: "text-stone-400",
    accentBg: "bg-stone-500/10",
    description: "Ready mix, pre-cast & concrete blocks",
    longDescription:
      "Get Ready Mix Concrete (RMC) in M20, M25, M30, M35 grades, pre-cast elements, and concrete blocks delivered to your site. RFQ-based ordering for large volumes.",
    bannerImage:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=300&fit=crop",
    productCount: 56,
    seoTitle: "Buy Ready Mix Concrete Online | StructBay",
    seoDescription:
      "Order Ready Mix Concrete M20 to M45 grade delivered to your site. Get instant RFQ quotes on StructBay.",
  },
  {
    slug: "chemicals",
    name: "Chemicals",
    icon: "🧪",
    lucideIcon: FlaskConical,
    accentColor: "text-cyan-400",
    accentBg: "bg-cyan-500/10",
    description: "Adhesives, sealants, waterproofing & admixtures",
    longDescription:
      "Industrial adhesives, epoxy compounds, construction chemicals, waterproofing solutions, and concrete admixtures from Pidilite, BASF, and Fosroc.",
    bannerImage:
      "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=1200&h=300&fit=crop",
    productCount: 78,
    seoTitle: "Buy Construction Chemicals Online | StructBay",
    seoDescription:
      "Buy construction chemicals, sealants, waterproofing and admixtures at the best prices on StructBay.",
  },
  {
    slug: "electricals",
    name: "Electricals",
    icon: "⚡",
    lucideIcon: Zap,
    accentColor: "text-yellow-400",
    accentBg: "bg-yellow-500/10",
    description: "Wires, cables, switches & conduits",
    longDescription:
      "Complete range of FRLS wires, armoured cables, MCBs, switchgear, conduit pipes, and electrical panels from Havells, Polycab, Finolex, and Legrand.",
    bannerImage:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=300&fit=crop",
    productCount: 145,
    seoTitle: "Buy Electrical Materials Online | StructBay",
    seoDescription:
      "Buy FRLS wires, cables, switches and MCBs from top brands at the best prices on StructBay.",
  },
  {
    slug: "pipes",
    name: "Pipes",
    icon: "🔧",
    lucideIcon: Droplet,
    accentColor: "text-blue-400",
    accentBg: "bg-blue-500/10",
    description: "CPVC, UPVC, GI & plumbing fittings",
    longDescription:
      "CPVC, UPVC, HDPE, and GI pipes along with all fittings for plumbing, drainage, and water supply from Supreme, Astral, Finolex, and Prince.",
    bannerImage:
      "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=1200&h=300&fit=crop",
    productCount: 92,
    seoTitle: "Buy Pipes & Plumbing Online | StructBay",
    seoDescription:
      "Buy CPVC, UPVC and GI pipes from Supreme, Astral and Finolex at the best prices on StructBay.",
  },
  {
    slug: "tools",
    name: "Tools",
    icon: "🛠️",
    lucideIcon: Wrench,
    accentColor: "text-orange-400",
    accentBg: "bg-orange-500/10",
    description: "Power tools, hand tools & safety equipment",
    longDescription:
      "Professional power tools, hand tools, safety equipment, and measuring instruments from Stanley, Bosch, Dewalt, and 3M for all construction needs.",
    bannerImage:
      "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=1200&h=300&fit=crop",
    productCount: 167,
    seoTitle: "Buy Construction Tools Online | StructBay",
    seoDescription:
      "Buy professional power tools, hand tools and safety equipment from Stanley, Bosch and Dewalt on StructBay.",
  },
  {
    slug: "plywood",
    name: "Plywood",
    icon: "🪵",
    lucideIcon: Layers,
    accentColor: "text-lime-500",
    accentBg: "bg-lime-500/10",
    description: "BWP, MR grade ply, block boards & laminates",
    longDescription:
      "IS-certified BWP and MR grade plywood, block boards, flush doors, and laminates from Century, Greenply, and Kitply for all interior and structural applications.",
    bannerImage:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&h=300&fit=crop",
    productCount: 63,
    seoTitle: "Buy Plywood Online | StructBay",
    seoDescription:
      "Buy IS-certified BWP and MR grade plywood, block boards and laminates from top brands on StructBay.",
  },
  {
    slug: "hardware",
    name: "Hardware",
    icon: "🔩",
    lucideIcon: Hammer,
    accentColor: "text-purple-400",
    accentBg: "bg-purple-500/10",
    description: "Fasteners, locks, hinges & builders hardware",
    longDescription:
      "Complete builders hardware including fasteners, anchor bolts, locks, hinges, door closers, and structural fixings from Dorma, Godrej, and local manufacturers.",
    bannerImage:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=300&fit=crop",
    productCount: 234,
    seoTitle: "Buy Hardware Online | StructBay",
    seoDescription:
      "Buy fasteners, locks, hinges and builders hardware from top brands at the best prices on StructBay.",
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug.toLowerCase());
}
