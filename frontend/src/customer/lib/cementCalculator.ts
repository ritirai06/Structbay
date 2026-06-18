export type ConcreteGrade = "M10" | "M15" | "M20" | "M25" | "M30";

export const CONCRETE_GRADES: ConcreteGrade[] = ["M10", "M15", "M20", "M25", "M30"];

const GRADE_MIX: Record<
  ConcreteGrade,
  { cementPart: number; totalParts: number; ratioLabel: string }
> = {
  M10: { cementPart: 1, totalParts: 10, ratioLabel: "1 : 3 : 6" },
  M15: { cementPart: 1, totalParts: 7, ratioLabel: "1 : 2 : 4" },
  M20: { cementPart: 1, totalParts: 5.5, ratioLabel: "1 : 1.5 : 3" },
  M25: { cementPart: 1, totalParts: 4, ratioLabel: "1 : 1 : 2" },
  M30: { cementPart: 1, totalParts: 3.25, ratioLabel: "1 : 0.75 : 1.5" },
};

export const DRY_VOLUME_FACTOR = 1.54;
export const CEMENT_DENSITY_KG_M3 = 1440;
export const CEMENT_BAG_KG = 50;

export type CementCalculatorInput = {
  length: number;
  width: number;
  depth: number;
  grade: ConcreteGrade;
  pricePerBag?: number | null;
};

export type CementCalculatorResult = {
  wetVolume: number;
  dryVolume: number;
  cementVolume: number;
  cementWeight: number;
  cementBags: number;
  totalCost: number | null;
  mixRatio: string;
  grade: ConcreteGrade;
};

export function calculateCementQuantity(input: CementCalculatorInput): CementCalculatorResult | null {
  const length = Number(input.length);
  const width = Number(input.width);
  const depth = Number(input.depth);
  if (!Number.isFinite(length) || !Number.isFinite(width) || !Number.isFinite(depth)) return null;
  if (length <= 0 || width <= 0 || depth <= 0) return null;

  const mix = GRADE_MIX[input.grade];
  const wetVolume = length * width * depth;
  const dryVolume = wetVolume * DRY_VOLUME_FACTOR;
  const cementVolume = dryVolume * (mix.cementPart / mix.totalParts);
  const cementWeight = cementVolume * CEMENT_DENSITY_KG_M3;
  const cementBags = Math.ceil(cementWeight / CEMENT_BAG_KG);

  const price = Number(input.pricePerBag);
  const totalCost = Number.isFinite(price) && price > 0 ? cementBags * price : null;

  return {
    wetVolume,
    dryVolume,
    cementVolume,
    cementWeight,
    cementBags,
    totalCost,
    mixRatio: mix.ratioLabel,
    grade: input.grade,
  };
}

export function formatVolumeM3(n: number): string {
  return `${n.toFixed(2)} m³`;
}

export function formatWeightKg(n: number): string {
  return `${Math.round(n).toLocaleString("en-IN")} kg`;
}

export function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
