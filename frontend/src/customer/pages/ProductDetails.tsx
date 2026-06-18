import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { Zap, Plus, Minus, Download, ChevronDown, Package } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import {
  firstImageUrl,
  flattenVariationAttributes,
  formatVariationLabel,
  sortSpecsByCategoryFilterOrder,
} from "../lib/productAttributes";
import {
  axesForVariations,
  initSelectionsForVariation,
  resolveVariationFromSelections,
  uniqueValuesForAxis,
  lowestBulkSlabPrice,
} from "../lib/variationSelectors";
import {
  pricingSnapshotFromProduct,
  resolveUnitPriceFromSnapshot,
  listingUnitPrice,
  variationIdFromRow,
} from "../lib/wholesalePricing";
import { displayUnitFromExGst, displayPriceMeta, productGstPct } from "../lib/displayPricing";
import { productHref } from "../lib/productRoutes";

function PdpAccordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="sf-pdp-accordion">
      <button type="button" className="sf-pdp-accordion__head" onClick={onToggle} aria-expanded={open}>
        <span>{title}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="sf-pdp-accordion__body">{children}</div>}
    </div>
  );
}

function relatedCardPricing(p: any) {
  const vid = p.variations?.[0]?._id ? String(p.variations[0]._id) : null;
  const snap = pricingSnapshotFromProduct(p, vid);
  const unitEx = snap ? resolveUnitPriceFromSnapshot(snap, 1) : listingUnitPrice(p, vid);
  const unit = displayUnitFromExGst(unitEx, p);
  const mrpEx = snap?.regularPrice ?? unitEx;
  const mrp = displayUnitFromExGst(mrpEx, p);
  const discount = mrp > unit ? Math.round((1 - unit / mrp) * 100) : 0;
  return { unit, mrp, discount };
}

export function ProductDetails() {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const productSlug = (slug || id || "").trim();
  const navigate = useNavigate();
  const { addToCart, city, cityId } = useApp();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [openSection, setOpenSection] = useState<string | null>("highlights");
  const [selectedVid, setSelectedVid] = useState<string | null>(null);
  const [attrSelections, setAttrSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!productSlug) return;
    setLoading(true);
    api
      .getProductDetails(productSlug, cityId || undefined)
      .then((res: any) => {
        if (!res.data) {
          navigate("/shop", { replace: true });
          return;
        }
        setProduct(res.data);
      })
      .catch(() => navigate("/shop", { replace: true }))
      .finally(() => setLoading(false));
  }, [productSlug, cityId, navigate]);

  useEffect(() => {
    if (!product) return;
    const vars = product.variations || [];
    setSelectedVid(vars.length ? String(vars[0]._id) : null);
    setActiveImage(0);
    setOpenSection("highlights");
  }, [productSlug, product]);

  const variations: any[] = product?.variations || [];
  const axes = useMemo(
    () => axesForVariations(variations, product?.categoryFilters || []),
    [variations, product?.categoryFilters]
  );

  const selectedVar = variations.find((v: any) => String(v._id) === selectedVid);

  useEffect(() => {
    if (!selectedVar || !axes.length) return;
    setAttrSelections(initSelectionsForVariation(selectedVar, axes));
  }, [selectedVid, axes.length]);

  useEffect(() => {
    if (!product) return;
    const v = variations.find((x: any) => String(x._id) === selectedVid);
    const moq = Math.max(1, Math.floor(Number(v?.moq) || 1));
    setQty((q) => (q < moq ? moq : q));
  }, [selectedVid, product]);

  const pricingSnap = useMemo(() => {
    if (!product) return null;
    return pricingSnapshotFromProduct(product, selectedVid);
  }, [product, selectedVid]);

  const effectiveUnit = useMemo(() => {
    if (pricingSnap) return resolveUnitPriceFromSnapshot(pricingSnap, qty);
    const fallback = listingUnitPrice(product, selectedVid);
    return fallback > 0 ? fallback : 0;
  }, [pricingSnap, qty, product, selectedVid]);

  const mrp = useMemo(() => {
    if (!product) return 0;
    if (pricingSnap) return pricingSnap.regularPrice;
    const vp =
      selectedVid &&
      product.variationPricing?.find((r: any) => variationIdFromRow(r) === selectedVid);
    if (vp?.regularPrice != null) return Number(vp.regularPrice);
    const v = variations.find((x: any) => String(x._id) === selectedVid);
    const varMrp = Number(v?.mrp);
    if (Number.isFinite(varMrp) && varMrp > 0) return varMrp;
    return Number(product.pricing?.regularPrice ?? effectiveUnit);
  }, [product, selectedVid, effectiveUnit, pricingSnap, variations]);

  const gstPct = useMemo(() => productGstPct(product), [product?.gstPercentage]);

  const bulkFrom = lowestBulkSlabPrice(pricingSnap);
  const displayUnit = displayUnitFromExGst(effectiveUnit, product);
  const displayMrp = displayUnitFromExGst(mrp, product);
  const displayBulkFrom = bulkFrom != null ? displayUnitFromExGst(bulkFrom, product) : null;

  const discount = mrp > 0 && effectiveUnit < mrp ? Math.round((1 - effectiveUnit / mrp) * 100) : 0;

  const specRowsForPanel = useMemo(() => {
    if (!product) return [];
    const v = variations.find((x: any) => String(x._id) === selectedVid) || variations[0];
    const rows = flattenVariationAttributes(v?.attributes);
    return sortSpecsByCategoryFilterOrder(rows, product.categoryFilters);
  }, [product, selectedVid, variations]);

  const setAxis = (key: string, value: string) => {
    const next = { ...attrSelections, [key]: value };
    const resolved = resolveVariationFromSelections(variations, next);
    if (resolved?._id) setSelectedVid(String(resolved._id));
    setAttrSelections(resolved ? initSelectionsForVariation(resolved, axes) : next);
  };

  const toggleSection = (key: string) => {
    setOpenSection((s) => (s === key ? null : key));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center bg-white min-h-screen">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto"
          style={{ borderColor: "#E85A00", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center bg-white min-h-screen">
        <p className="text-gray-500 text-lg">Product not found.</p>
        <Link to="/shop" className="text-[#E85A00] underline mt-2 inline-block">
          Browse Shop
        </Link>
      </div>
    );
  }

  const images: string[] = (product.images || [])
    .map((i: any) => (typeof i === "string" ? i : i?.url))
    .filter(Boolean);
  const faqs: any[] = product.faqs || [];
  const related: any[] = product.related || [];
  const brandName = product.brand?.name || product.brand || "";
  const categorySlug = product.category?.slug || "";
  const categoryName = product.category?.name || "";
  const moq = Math.max(1, Math.floor(Number(selectedVar?.moq) || 1));
  const showExpress = !!(product.isExpress || product.isStructbayDelivery || product.displayStructbayDelivery);
  const inStock = selectedVar?.inStock !== false && product.inStock !== false;

  const handleAddToCart = () => {
    const pslug = product.slug || product._id;
    const vid = selectedVid || undefined;
    const cartId = `${pslug}::${vid || "base"}`;
    addToCart({
      id: cartId,
      productSlug: pslug,
      variationId: vid,
      variationLabel: selectedVar ? formatVariationLabel(selectedVar) : undefined,
      name: product.name,
      brand: brandName,
      price: effectiveUnit,
      qty,
      unit: product.unit || "unit",
      image: images[0] || firstImageUrl(product.images) || "",
      pricingSnapshot: pricingSnap,
      gstPercentage: gstPct,
    });
  };

  return (
    <div className="bg-white min-h-screen pb-24 lg:pb-12">
      <div className="max-w-7xl mx-auto px-4 py-5">
        {/* Breadcrumbs */}
        <nav className="sf-pdp-crumbs mb-5" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          {categorySlug && (
            <>
              <span>/</span>
              <Link to={`/category/${categorySlug}`}>{categoryName}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-700 line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-start">
          {/* Sticky gallery */}
          <div className="sf-pdp-gallery">
            <div className="sf-pdp-gallery__main relative">
              {discount > 0 && (
                <span className="sf-pdp-gallery__discount">{discount}% OFF</span>
              )}
              {images[activeImage] ? (
                <img src={images[activeImage]} alt={product.name} className="sf-pdp-gallery__img" />
              ) : (
                <div className="sf-pdp-gallery__empty">
                  <Package className="w-16 h-16 text-gray-300" aria-hidden />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={`sf-pdp-gallery__thumb ${i === activeImage ? "sf-pdp-gallery__thumb--active" : ""}`}
                  >
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable details */}
          <div className="sf-pdp-details min-w-0">
            {showExpress && (
              <p className="sf-pdp-express">
                <Zap className="w-3.5 h-3.5" aria-hidden />
                Delivered in 24–48 hrs
                {city ? ` · ${city}` : ""}
              </p>
            )}

            <h1 className="sf-pdp-title">{product.name}</h1>

            <p className={`sf-pdp-stock ${inStock ? "sf-pdp-stock--in" : "sf-pdp-stock--out"}`}>
              <span className="sf-pdp-stock__dot" aria-hidden />
              {inStock ? "IN STOCK" : "OUT OF STOCK"}
            </p>

            {effectiveUnit > 0 ? (
              <div className="sf-pdp-price-block">
                <div className="sf-pdp-price-row">
                  {discount > 0 && (
                    <span className="sf-pdp-price-was">₹{displayMrp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  )}
                  <span className="sf-pdp-price">
                    ₹{displayUnit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  {discount > 0 && <span className="sf-pdp-sale-tag">Sale</span>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {displayPriceMeta(product)} · Shipping at checkout
                  </span>
                </div>
                {bulkFrom != null && bulkFrom < effectiveUnit && (
                  <p className="sf-pdp-bulk-hint">
                    Unlock bulk prices from ₹{displayBulkFrom?.toLocaleString("en-IN")}
                    {product?.priceIncludesGst ? ` incl. ${gstPct}% GST` : " ex-GST"}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                {cityId ? "Pricing not available for this product in your city" : "Select your city for pricing"}
              </p>
            )}

            {/* Variant pills by attribute axis */}
            {axes.length > 0 &&
              axes.map((axis) => {
                const options = uniqueValuesForAxis(variations, axis.key, attrSelections);
                if (!options.length) return null;
                return (
                  <div key={axis.key} className="sf-pdp-variant-group">
                    <p className="sf-pdp-variant-label">{axis.label}</p>
                    <div className="sf-pdp-pills">
                      {options.map((opt) => {
                        const active = attrSelections[axis.key] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            className={`sf-pdp-pill ${active ? "sf-pdp-pill--active" : ""}`}
                            onClick={() => setAxis(axis.key, opt)}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            {axes.length === 0 && variations.length > 1 && (
              <div className="sf-pdp-variant-group">
                <p className="sf-pdp-variant-label">Size</p>
                <div className="sf-pdp-pills">
                  {variations.map((v: any) => {
                    const active = String(v._id) === selectedVid;
                    return (
                      <button
                        key={v._id}
                        type="button"
                        className={`sf-pdp-pill ${active ? "sf-pdp-pill--active" : ""}`}
                        onClick={() => setSelectedVid(String(v._id))}
                      >
                        {formatVariationLabel(v)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="sf-pdp-variant-group">
              <p className="sf-pdp-variant-label">Quantity</p>
              <div className="sf-pdp-qty">
                <button type="button" aria-label="Decrease" onClick={() => setQty((q) => Math.max(moq, q - 1))}>
                  <Minus className="w-4 h-4" />
                </button>
                <span>{qty}</span>
                <button type="button" aria-label="Increase" onClick={() => setQty((q) => q + 1)}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {effectiveUnit > 0 && inStock && (
              <button type="button" className="sf-pdp-add-cart" onClick={handleAddToCart}>
                Add to cart
              </button>
            )}

            {/* Accordions */}
            <div className="sf-pdp-accordions mt-6">
              <PdpAccordion
                title="Product Highlights"
                open={openSection === "highlights"}
                onToggle={() => toggleSection("highlights")}
              >
                {specRowsForPanel.length > 0 ? (
                  <ul className="sf-pdp-list">
                    {specRowsForPanel.map((row) => (
                      <li key={row.key}>
                        <strong>{row.label}:</strong> {row.value}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {product.shortDescription || "Premium quality product from verified StructBay vendors."}
                  </p>
                )}
                {brandName && (
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Brand:</strong> {brandName}
                  </p>
                )}
              </PdpAccordion>

              <PdpAccordion
                title="Product Description"
                open={openSection === "description"}
                onToggle={() => toggleSection("description")}
              >
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {product.description || product.shortDescription || "No description available."}
                </p>
                {product.documents?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {product.documents.map((doc: any, i: number) => (
                      <a
                        key={i}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm text-[#E85A00] hover:underline"
                      >
                        <Download className="w-4 h-4" />
                        {doc.name}
                      </a>
                    ))}
                  </div>
                )}
              </PdpAccordion>

              <PdpAccordion
                title="FAQs"
                open={openSection === "faq"}
                onToggle={() => toggleSection("faq")}
              >
                  {faqs.length > 0 ? (
                    <div className="space-y-3">
                      {faqs.map((faq: any, i: number) => (
                        <div key={i}>
                          <p className="text-sm font-semibold text-gray-900">{faq.question}</p>
                          <p className="text-sm text-gray-600 mt-1">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Contact us at +91 70905 70505 for product-specific questions.
                    </p>
                )}
              </PdpAccordion>

              <PdpAccordion
                title="Returns & Exchange Policy"
                open={openSection === "returns"}
                onToggle={() => toggleSection("returns")}
              >
                <ul className="sf-pdp-list">
                  <li>7-day replacement for defective or wrong products.</li>
                  <li>Report issues with order number and site photos within 7 days of delivery.</li>
                  <li>Refunds processed after verification; GST invoice provided on all orders.</li>
                </ul>
              </PdpAccordion>
            </div>
          </div>
        </div>

        {/* You may also like */}
        {related.length > 0 && (
          <section className="sf-pdp-related mt-14">
            <h2 className="sf-pdp-related__title">You may also like</h2>
            <div className="sf-pdp-related__grid">
              {related.slice(0, 4).map((p: any) => {
                const img = firstImageUrl(p.images);
                const { unit, mrp: relMrp, discount: relDisc } = relatedCardPricing(p);
                const pslug = p.slug || p._id;
                return (
                  <Link key={p._id || pslug} to={productHref(pslug)} className="sf-pdp-related-card group">
                    <div className="sf-pdp-related-card__image-wrap">
                      {relDisc > 0 && (
                        <span className="sf-pdp-related-card__discount">{relDisc}% OFF</span>
                      )}
                      {img ? (
                        <img src={img} alt={p.name} className="sf-pdp-related-card__image" loading="lazy" />
                      ) : (
                        <div className="sf-pdp-related-card__image sf-pdp-related-card__image--empty" />
                      )}
                    </div>
                    <p className="sf-pdp-related-card__title">{p.name}</p>
                    <div className="sf-pdp-related-card__price-row">
                      {relDisc > 0 && (
                        <span className="sf-pdp-related-card__was">
                          ₹{relMrp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      <span className="sf-pdp-related-card__price">
                        ₹{unit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Mobile sticky add */}
      {effectiveUnit > 0 && inStock && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 lg:hidden z-40">
          <button type="button" className="sf-pdp-add-cart w-full" onClick={handleAddToCart}>
            Add to cart · ₹{(effectiveUnit * qty).toLocaleString("en-IN")}
          </button>
        </div>
      )}
    </div>
  );
}
