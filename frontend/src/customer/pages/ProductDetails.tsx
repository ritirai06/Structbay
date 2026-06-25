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
import { isVariantProduct, validateCartLine } from "../lib/productStructure";
import {
  pricingSnapshotFromProduct,
  resolveUnitPriceFromSnapshot,
  listingUnitPrice,
  variationIdFromRow,
} from "../lib/wholesalePricing";
import { displayUnitFromExGst, displayPriceMeta, productGstPct } from "../lib/displayPricing";
import { productHref } from "../lib/productRoutes";
import { availabilityForProduct } from "../lib/productAvailability";
import { ProductAvailabilityBadge } from "../components/ProductAvailabilityBadge";

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

function ReturnExchangePolicyContent({ policy }: { policy: any }) {
  const ret = policy?.return || {};
  const ex = policy?.exchange || {};
  const hasReturn =
    ret.allowed ||
    ret.windowDays ||
    ret.instructions ||
    (ret.conditions?.length ?? 0) > 0 ||
    (ret.nonReturnableConditions?.length ?? 0) > 0;
  const hasExchange =
    ex.allowed ||
    ex.windowDays ||
    ex.instructions ||
    (ex.conditions?.length ?? 0) > 0;
  const hasAny = hasReturn || hasExchange;

  if (!hasAny) {
    return (
      <p className="text-sm text-gray-600">
        Contact us at +91 70905 70505 for return and exchange queries on this product.
      </p>
    );
  }

  return (
    <div className="space-y-5 text-sm text-gray-600">
      {hasReturn && (
        <div>
          <p className="font-semibold text-gray-900 mb-2">Return Policy</p>
          <ul className="sf-pdp-list space-y-1">
            <li>
              <strong>Return allowed:</strong> {ret.allowed ? "Yes" : "No"}
            </li>
            {ret.windowDays != null && ret.windowDays !== "" && (
              <li>
                <strong>Return window:</strong> {ret.windowDays} day{Number(ret.windowDays) === 1 ? "" : "s"}
              </li>
            )}
          </ul>
          {ret.instructions && (
            <p className="mt-2 whitespace-pre-line leading-relaxed">{ret.instructions}</p>
          )}
          {(ret.conditions?.length ?? 0) > 0 && (
            <div className="mt-3">
              <p className="font-medium text-gray-800 mb-1">Conditions</p>
              <ul className="sf-pdp-list">
                {ret.conditions.map((c: string, i: number) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {(ret.nonReturnableConditions?.length ?? 0) > 0 && (
            <div className="mt-3">
              <p className="font-medium text-gray-800 mb-1">Non-returnable</p>
              <ul className="sf-pdp-list">
                {ret.nonReturnableConditions.map((c: string, i: number) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {hasExchange && (
        <div>
          <p className="font-semibold text-gray-900 mb-2">Exchange Policy</p>
          <ul className="sf-pdp-list space-y-1">
            <li>
              <strong>Exchange allowed:</strong> {ex.allowed ? "Yes" : "No"}
            </li>
            {ex.windowDays != null && ex.windowDays !== "" && (
              <li>
                <strong>Exchange window:</strong> {ex.windowDays} day{Number(ex.windowDays) === 1 ? "" : "s"}
              </li>
            )}
          </ul>
          {ex.instructions && (
            <p className="mt-2 whitespace-pre-line leading-relaxed">{ex.instructions}</p>
          )}
          {(ex.conditions?.length ?? 0) > 0 && (
            <div className="mt-3">
              <p className="font-medium text-gray-800 mb-1">Conditions</p>
              <ul className="sf-pdp-list">
                {ex.conditions.map((c: string, i: number) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function relatedCardPricing(p: any) {
  // Debug: Log input to pricing helper
  console.log("Pricing Input", p);
  const vid = p.variations?.[0]?._id ? String(p.variations[0]._id) : null;
  const snap = pricingSnapshotFromProduct(p, vid);
  const unitEx = snap ? resolveUnitPriceFromSnapshot(snap, 1) : listingUnitPrice(p, vid);
  const unit = displayUnitFromExGst(unitEx, p);
  const mrpEx = snap?.regularPrice ?? unitEx;
  const mrp = displayUnitFromExGst(mrpEx, p);
  const discount = mrp > unit ? Math.round((1 - unit / mrp) * 100) : 0;
  // Debug: Log output from pricing helper
  console.log("Pricing Output", { unit, mrp, discount });
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
  const [crossSells, setCrossSells] = useState<any[]>([]);

  // Debug: Log the Related Products API Response
  useEffect(() => {
    if (crossSells && crossSells.length > 0) {
      console.log("Related Products API Response", crossSells);
    }
  }, [crossSells]);

  useEffect(() => {
    if (!productSlug) return;
    setLoading(true);
    api
      .getProductDetails(productSlug, cityId || undefined, city || undefined)
      .then((res: any) => {
        if (!res.data) {
          navigate("/shop", { replace: true });
          return;
        }
        setProduct(res.data);
      })
      .catch(() => navigate("/shop", { replace: true }))
      .finally(() => setLoading(false));
  }, [productSlug, cityId, city, navigate]);

  useEffect(() => {
    if (!product) return;
    if (isVariantProduct(product)) {
      const vars = product.variations || [];
      setSelectedVid(vars.length ? String(vars[0]._id) : null);
    } else {
      setSelectedVid(null);
    }
    setActiveImage(0);
    setOpenSection("highlights");
    // Fetch cross-sell products for this product
    setCrossSells([]);
    if (product._id) {
      // Step 1: Fetch related product IDs from relationship API
      fetch(`/api/v1/product-relationships/cross-sell/${product._id}`)
        .then(r => r.json())
        .then(async json => {
          if (json.success && Array.isArray(json.data)) {
            // Step 2: For each related product, fetch full product details using the main product API
            const relatedIds = json.data
              .filter((p: any) => p.status === 'ACTIVE')
              .map((p: any) => p.slug || p._id)
              .filter(Boolean);
            const cityIdParam = cityId || undefined;
            const cityNameParam = city || undefined;
            const relatedDetails = await Promise.all(
              relatedIds.map(async (slugOrId: string) => {
                try {
                  const res = await api.getProductDetails(slugOrId, cityIdParam, cityNameParam);
                  return res.data || null;
                } catch {
                  return null;
                }
              })
            );
            setCrossSells(relatedDetails.filter(Boolean));
          }
        })
        .catch(() => {/* silently ignore */});
    }
  }, [productSlug, product]);

  const isVariant = isVariantProduct(product);
  const variations: any[] = isVariant ? (product?.variations || []) : [];
  const axes = useMemo(
    () => (isVariant ? axesForVariations(variations, product?.categoryFilters || []) : []),
    [isVariant, variations, product?.categoryFilters]
  );

  const selectedVar = variations.find((v: any) => String(v._id) === selectedVid);

  const displayImages = useMemo(() => {
    const fromVar = (selectedVar?.images || [])
      .map((i: any) => (typeof i === "string" ? i : i?.url))
      .filter(Boolean);
    if (fromVar.length) return fromVar as string[];
    return (product?.images || [])
      .map((i: any) => (typeof i === "string" ? i : i?.url))
      .filter(Boolean) as string[];
  }, [product?.images, selectedVar?.images]);

  useEffect(() => {
    setActiveImage(0);
  }, [selectedVid]);

  useEffect(() => {
    if (!selectedVar || !axes.length) return;
    setAttrSelections(initSelectionsForVariation(selectedVar, axes));
  }, [selectedVid, axes.length, selectedVar]);

  useEffect(() => {
    if (!product) return;
    const v = variations.find((x: any) => String(x._id) === selectedVid);
    const moq = Math.max(1, Math.floor(Number(v?.moq) || 1));
    setQty((q) => (q < moq ? moq : q));
  }, [selectedVid, product, variations]);

  const pricingSnap = useMemo(() => {
    if (!product) return null;
    return pricingSnapshotFromProduct(product, isVariant ? selectedVid : null);
  }, [product, selectedVid, isVariant]);

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

  const images: string[] = displayImages;
  const faqs: any[] = product.faqs || [];
  const related: any[] = product.related || [];
  const brandName = product.brand?.name || product.brand || "";
  const categorySlug = product.category?.slug || "";
  const categoryName = product.category?.name || "";
  const moq = Math.max(1, Math.floor(Number(selectedVar?.moq) || 1));
  const showExpress = !!(product.isExpress || product.isStructbayDelivery || product.displayStructbayDelivery);
  const hasPrice = effectiveUnit > 0;
  const availability = availabilityForProduct(product, isVariant ? selectedVid : null, hasPrice);
  const inStock = availability.canAddToCart;

  const handleAddToCart = () => {
    const check = validateCartLine(product, isVariant ? selectedVid : undefined);
    if (!check.ok) {
      alert(check.message);
      return;
    }
    if (!inStock) {
      alert("This product is out of stock in your city.");
      return;
    }
    const pslug = product.slug || product._id;
    const vid = isVariant ? selectedVid || undefined : undefined;
    const cartId = `${pslug}::${vid || "base"}`;
    addToCart({
      id: cartId,
      productSlug: pslug,
      variationId: vid,
      variationLabel: isVariant && selectedVar ? formatVariationLabel(selectedVar) : undefined,
      name: product.name,
      brand: brandName,
      price: effectiveUnit,
      qty,
      unit: product.unit || "unit",
      image: images[0] || firstImageUrl(product.images) || "",
      pricingSnapshot: pricingSnap,
      gstPercentage: gstPct,
      productId: product._id || product.id || undefined,
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

            <ProductAvailabilityBadge info={availability} variant="pdp" />

            {selectedVar?.leadTimeDays != null && Number(selectedVar.leadTimeDays) > 0 && (
              <p className="sf-pdp-lead text-xs text-gray-500 mb-3">
                Lead time: {selectedVar.leadTimeDays} day{Number(selectedVar.leadTimeDays) === 1 ? "" : "s"}
              </p>
            )}

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
                {cityId ? availability.label : "Select your city for pricing and availability"}
              </p>
            )}

            {/* Variant pills by attribute axis */}
            {isVariant && axes.length > 0 &&
              axes.map((axis) => {
                const options = uniqueValuesForAxis(variations, axis.key, attrSelections);
                if (!options.length) return null;
                const isColorAxis = axis.key.toLowerCase() === "color";

                // Build color code map for color axis: colorName → colorCode
                const colorCodeMap: Record<string, string> = {};
                if (isColorAxis) {
                  for (const v of variations) {
                    const rows = flattenVariationAttributes(v?.attributes);
                    const colorRow = rows.find((r) => r.key.toLowerCase() === "color");
                    if (!colorRow) continue;
                    const custom: any[] = v?.attributes?.custom || [];
                    const codeEntry = custom.find((c: any) => c?.key === `${axis.key}_code` || c?.key === "color_code");
                    if (codeEntry?.value) colorCodeMap[colorRow.value] = codeEntry.value;
                  }
                }

                return (
                  <div key={axis.key} className="sf-pdp-variant-group">
                    <p className="sf-pdp-variant-label">{axis.label}</p>
                    <div className="sf-pdp-pills">
                      {options.map((opt) => {
                        const active = attrSelections[axis.key] === opt;
                        const partial = { ...attrSelections, [axis.key]: opt };
                        const v = resolveVariationFromSelections(variations, partial);
                        const vidOpt = v?._id ? String(v._id) : "";
                        const snapOpt = vidOpt ? pricingSnapshotFromProduct(product, vidOpt) : null;
                        const unitOpt = snapOpt
                          ? resolveUnitPriceFromSnapshot(snapOpt, 1)
                          : listingUnitPrice(product, vidOpt || null);
                        const infoOpt = availabilityForProduct(product, vidOpt || null, unitOpt > 0);
                        const colorCode = isColorAxis ? colorCodeMap[opt] : undefined;

                        if (isColorAxis) {
                          return (
                            <button
                              key={opt}
                              type="button"
                              title={opt}
                              onClick={() => setAxis(axis.key, opt)}
                              className={`relative flex flex-col items-center gap-1 p-1 rounded-lg border-2 transition-colors ${
                                active
                                  ? "border-sb-orange"
                                  : "border-transparent hover:border-gray-300"
                              } ${infoOpt.stockStatus === "OUT_OF_STOCK" ? "opacity-45" : ""}`}
                            >
                              <span
                                className="w-8 h-8 rounded-full border border-black/10"
                                style={{ background: colorCode || opt }}
                              />
                              <span className="text-[10px] text-gray-600 leading-none max-w-[48px] truncate">
                                {opt}
                              </span>
                              {infoOpt.stockStatus === "OUT_OF_STOCK" && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <span className="w-full h-px bg-gray-400 rotate-45 absolute" />
                                </span>
                              )}
                            </button>
                          );
                        }

                        return (
                          <button
                            key={opt}
                            type="button"
                            className={`sf-pdp-pill ${active ? "sf-pdp-pill--active" : ""} ${infoOpt.stockStatus === "OUT_OF_STOCK" ? "sf-pdp-pill--oos" : ""}`}
                            onClick={() => setAxis(axis.key, opt)}
                          >
                            <span>{opt}</span>
                            {unitOpt > 0 && (
                              <span className="sf-pdp-pill__price">₹{displayUnitFromExGst(unitOpt, product).toLocaleString("en-IN")}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            {isVariant && axes.length === 0 && variations.length > 1 && (
              <div className="sf-pdp-variant-group">
                <p className="sf-pdp-variant-label">Size</p>
                <div className="sf-pdp-pills">
                  {variations.map((v: any) => {
                    const active = String(v._id) === selectedVid;
                    const vidOpt = String(v._id);
                    const snapOpt = pricingSnapshotFromProduct(product, vidOpt);
                    const unitOpt = snapOpt
                      ? resolveUnitPriceFromSnapshot(snapOpt, 1)
                      : listingUnitPrice(product, vidOpt);
                    const infoOpt = availabilityForProduct(product, vidOpt, unitOpt > 0);
                    return (
                      <button
                        key={v._id}
                        type="button"
                        className={`sf-pdp-pill ${active ? "sf-pdp-pill--active" : ""} ${infoOpt.stockStatus === "OUT_OF_STOCK" ? "sf-pdp-pill--oos" : ""}`}
                        onClick={() => setSelectedVid(vidOpt)}
                      >
                        <span>{formatVariationLabel(v)}</span>
                        {unitOpt > 0 && (
                          <span className="sf-pdp-pill__price">₹{displayUnitFromExGst(unitOpt, product).toLocaleString("en-IN")}</span>
                        )}
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

            {moq > 1 && (
              <p className="text-xs text-gray-500 mb-2">Minimum order quantity: {moq} units</p>
            )}

            {effectiveUnit > 0 && inStock ? (
              <button type="button" className="sf-pdp-add-cart" onClick={handleAddToCart}>
                Add to cart
              </button>
            ) : effectiveUnit > 0 ? (
              <button type="button" className="sf-pdp-add-cart sf-pdp-add-cart--disabled" disabled>
                {availability.stockStatus === "OUT_OF_STOCK" ? "Out of stock" : "Unavailable"}
              </button>
            ) : null}

            {/* Accordions */}
            <div className="sf-pdp-accordions mt-6">
              <PdpAccordion
                title="Specifications"
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
                title="Return & Exchange Policy"
                open={openSection === "returns"}
                onToggle={() => toggleSection("returns")}
              >
                <ReturnExchangePolicyContent policy={product.returnExchangePolicy} />
              </PdpAccordion>
            </div>
          </div>
        </div>

        {/* Cross-sell products (from admin configuration) */}
        {crossSells.length > 0 && (
          <section className="sf-pdp-related mt-14">
            <h2 className="sf-pdp-related__title">Related Products</h2>
            <div className="sf-pdp-related__grid">
              {crossSells.slice(0, 8).map((p: any) => {
                // Debug: Log the product sent to pricing helper
                console.log("Product sent to pricing helper:", p);
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

        {/* Category-based "You may also like" (existing) */}
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
      {effectiveUnit > 0 && inStock ? (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 lg:hidden z-40">
          <button type="button" className="sf-pdp-add-cart w-full" onClick={handleAddToCart}>
            Add to cart · ₹{(effectiveUnit * qty).toLocaleString("en-IN")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
