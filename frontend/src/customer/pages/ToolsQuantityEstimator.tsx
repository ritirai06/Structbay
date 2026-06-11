import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, Calculator, Package } from "lucide-react";

/**
 * Example landing-style tool page (PRD: quantity estimation calculators).
 * Figures are indicative — always confirm with your engineer on site.
 */
export function ToolsQuantityEstimator() {
  const [lengthM, setLengthM] = useState("6");
  const [widthM, setWidthM] = useState("4");
  const [thicknessMm, setThicknessMm] = useState("150");
  const [wastagePct, setWastagePct] = useState("8");

  const result = useMemo(() => {
    const L = Number(lengthM) || 0;
    const W = Number(widthM) || 0;
    const T = (Number(thicknessMm) || 0) / 1000;
    const waste = 1 + (Number(wastagePct) || 0) / 100;
    const volumeM3 = L * W * T * waste;
    const bags50kg = volumeM3 > 0 ? Math.ceil((volumeM3 * 1440) / 50) : 0;
    return { volumeM3, bags50kg };
  }, [lengthM, widthM, thicknessMm, wastagePct]);

  return (
    <div className="bg-sb-page min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <nav className="flex items-center gap-2 text-sm text-sb-ink-muted/50 mb-6">
          <Link to="/" className="hover:text-[#FE5E00]">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-sb-ink font-medium">Tools</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-sb-ink font-medium">Cement quantity</span>
        </nav>

        <div className="rounded-2xl border border-sb-ink/12 bg-sb-surface p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-[#FE5E00]/15 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-[#FE5E00]" />
            </div>
            <div>
              <h1 className="text-sb-ink font-black text-2xl">Slab cement — quick estimate</h1>
              <p className="text-sb-ink-muted/60 text-sm">Rough order-of-magnitude for 50&nbsp;kg bags (standard PCC density assumption).</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sb-ink/12 bg-sb-surface-2 p-6 md:p-8 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-sb-ink-muted/70">Length (m)</span>
              <input value={lengthM} onChange={e => setLengthM(e.target.value)} type="number" min="0" step="0.1"
                className="mt-1 w-full bg-sb-page border border-sb-ink/12 rounded-xl px-3 py-2.5 text-sb-ink text-sm focus:outline-none focus:border-[#FE5E00]/50" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-sb-ink-muted/70">Width (m)</span>
              <input value={widthM} onChange={e => setWidthM(e.target.value)} type="number" min="0" step="0.1"
                className="mt-1 w-full bg-sb-page border border-sb-ink/12 rounded-xl px-3 py-2.5 text-sb-ink text-sm focus:outline-none focus:border-[#FE5E00]/50" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-sb-ink-muted/70">Thickness (mm)</span>
              <input value={thicknessMm} onChange={e => setThicknessMm(e.target.value)} type="number" min="0" step="5"
                className="mt-1 w-full bg-sb-page border border-sb-ink/12 rounded-xl px-3 py-2.5 text-sb-ink text-sm focus:outline-none focus:border-[#FE5E00]/50" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-sb-ink-muted/70">Wastage (%)</span>
              <input value={wastagePct} onChange={e => setWastagePct(e.target.value)} type="number" min="0" max="30" step="1"
                className="mt-1 w-full bg-sb-page border border-sb-ink/12 rounded-xl px-3 py-2.5 text-sb-ink text-sm focus:outline-none focus:border-[#FE5E00]/50" />
            </label>
          </div>

          <div className="rounded-xl bg-sb-page border border-[#FE5E00]/25 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-[#FE5E00]" />
              <div>
                <p className="text-xs text-sb-ink-muted/60 uppercase tracking-wider font-semibold">Estimated volume</p>
                <p className="text-2xl font-black text-sb-ink">{result.volumeM3.toFixed(2)} m³</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-sb-ink-muted/60 uppercase tracking-wider font-semibold">~50 kg bags (indicative)</p>
              <p className="text-2xl font-black text-[#FE5E00]">{result.bags50kg} bags</p>
            </div>
          </div>

          <p className="text-xs text-sb-ink-muted/45 leading-relaxed">
            Assumes bulk density ≈ 1440 kg/m³ for back-of-envelope bag count. Mix design, grade, and site conditions change actual consumption.
            For firm quotes, use <Link to="/rfq" className="text-[#FE5E00] hover:underline">Concrete RFQ</Link> or speak with StructBay procurement.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/shop" className="inline-flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange font-bold px-5 py-2.5 rounded-xl text-sm">
              Shop cement
            </Link>
            <Link to="/blogs" className="inline-flex items-center gap-2 border border-sb-ink/15 text-sb-ink hover:border-[#FE5E00]/50 px-5 py-2.5 rounded-xl text-sm font-semibold">
              Read guides
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
