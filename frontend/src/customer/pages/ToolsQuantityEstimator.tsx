import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Calculator, IndianRupee, Package } from "lucide-react";
import {
  calculateCementQuantity,
  CONCRETE_GRADES,
  type ConcreteGrade,
  formatInr,
  formatVolumeM3,
  formatWeightKg,
  DRY_VOLUME_FACTOR,
  CEMENT_DENSITY_KG_M3,
  CEMENT_BAG_KG,
} from "../lib/cementCalculator";
import {
  UtilityBreadcrumb,
  UtilityCard,
  UtilityHero,
  UtilityPage,
  UtilitySectionLabel,
} from "../components/UtilityPageLayout";
import { useCmsPageSeo } from "../hooks/useCmsPageSeo";
import { useBulkEnquiryModal } from "../context/BulkEnquiryModalContext";

export function ToolsQuantityEstimator() {
  useCmsPageSeo("cement-calculator");
  const { openBulkEnquiry } = useBulkEnquiryModal();

  const [lengthM, setLengthM] = useState("10");
  const [widthM, setWidthM] = useState("5");
  const [depthM, setDepthM] = useState("0.15");
  const [grade, setGrade] = useState<ConcreteGrade>("M20");
  const [pricePerBag, setPricePerBag] = useState("420");

  const result = useMemo(() => {
    return calculateCementQuantity({
      length: Number(lengthM),
      width: Number(widthM),
      depth: Number(depthM),
      grade,
      pricePerBag: pricePerBag.trim() === "" ? null : Number(pricePerBag),
    });
  }, [lengthM, widthM, depthM, grade, pricePerBag]);

  const invalid =
    !result &&
    (Number(lengthM) <= 0 || Number(widthM) <= 0 || Number(depthM) <= 0 || !lengthM || !widthM || !depthM);

  return (
    <UtilityPage width="medium" className="sf-cement-calc-page">
      <div className="sf-cement-calc">
      <UtilityBreadcrumb items={[{ label: "Home", to: "/" }, { label: "Cement calculator" }]} />

      <UtilityHero
        variant="brand"
        icon={Calculator}
        title="Cement quantity calculator"
        description="Estimate cement bags and cost for slabs and footings. Confirm with your site engineer before ordering."
        features={["M10–M30 grades", "50 kg bags", "Live estimate"]}
      />

      <div className="sf-tool-grid">
        <UtilityCard>
          <UtilitySectionLabel>Inputs</UtilitySectionLabel>
          <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <label className="sf-utility-field">
              <span>Length (m)</span>
              <input
                value={lengthM}
                onChange={(e) => setLengthM(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 10"
              />
            </label>
            <label className="sf-utility-field">
              <span>Width (m)</span>
              <input
                value={widthM}
                onChange={(e) => setWidthM(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 5"
              />
            </label>
            <label className="sf-utility-field">
              <span>Depth / thickness (m)</span>
              <input
                value={depthM}
                onChange={(e) => setDepthM(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 0.15"
              />
              <p className="sf-utility-field__hint">150 mm slab → 0.15 m</p>
            </label>
            <label className="sf-utility-field">
              <span>Concrete grade</span>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as ConcreteGrade)}
                className="cursor-pointer"
              >
                {CONCRETE_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="sf-utility-field sm:col-span-2 lg:col-span-1">
              <span>Price per bag (₹) — optional</span>
              <input
                value={pricePerBag}
                onChange={(e) => setPricePerBag(e.target.value)}
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 420"
              />
            </label>
          </div>
        </UtilityCard>

        <div className="sf-cement-calc__results space-y-3">
          {invalid && (
            <div className="sf-utility-alert sf-utility-alert--warn">
              Enter positive values for length, width, and depth to calculate cement quantity.
            </div>
          )}

          {result && (
            <>
              <div className="sf-tool-highlight">
                <div className="sf-tool-highlight__row">
                  <div>
                    <p className="sf-tool-highlight__label">Required cement bags</p>
                    <p className="sf-tool-highlight__value">{result.cementBags} bags</p>
                    <p className="sf-tool-highlight__meta">
                      {grade} mix ({result.mixRatio}) · 50 kg bags, rounded up
                    </p>
                  </div>
                  {result.totalCost != null && (
                    <div className="text-right">
                      <p className="sf-tool-highlight__label">
                        <IndianRupee aria-hidden /> Estimated cost
                      </p>
                      <p className="sf-tool-highlight__cost">{formatInr(result.totalCost)}</p>
                    </div>
                  )}
                </div>
              </div>

              <UtilityCard>
                <UtilitySectionLabel>Calculation breakdown</UtilitySectionLabel>
                <ol className="sf-tool-breakdown">
                  <li>
                    <span>1. Wet volume (L × W × D)</span>
                    <span>{formatVolumeM3(result.wetVolume)}</span>
                  </li>
                  <li>
                    <span>2. Dry volume (× {DRY_VOLUME_FACTOR})</span>
                    <span>{formatVolumeM3(result.dryVolume)}</span>
                  </li>
                  <li>
                    <span>3. Cement volume ({grade} ratio)</span>
                    <span>{formatVolumeM3(result.cementVolume)}</span>
                  </li>
                  <li>
                    <span>4. Cement weight (× {CEMENT_DENSITY_KG_M3} kg/m³)</span>
                    <span>{formatWeightKg(result.cementWeight)}</span>
                  </li>
                  <li>
                    <span>5. Bags (÷ {CEMENT_BAG_KG} kg, round up)</span>
                    <span className="is-accent">{result.cementBags} bags</span>
                  </li>
                </ol>
              </UtilityCard>

              <div className="sf-utility-actions">
                <Link to="/category/cement" className="sf-utility-btn-primary">
                  <Package aria-hidden />
                  Shop cement
                </Link>
                <button
                  type="button"
                  onClick={() => openBulkEnquiry()}
                  className="sf-utility-btn-secondary"
                >
                  Bulk order enquiry
                </button>
                <Link to="/rfq" className="sf-utility-btn-secondary">
                  Concrete RFQ
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="sf-utility-disclaimer">
        Uses dry volume factor 1.54 and cement density 1440 kg/m³. Actual consumption varies by site and mix design.
      </p>
      </div>
    </UtilityPage>
  );
}
