import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  Shield, Zap, ShoppingCart, ChevronRight, Plus, Minus,
  Download, ChevronDown, ChevronUp, Truck, RotateCcw, Phone, MapPin, Package,
} from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { DeliveryChargesNotice } from "@shared/components/DeliveryChargesNotice";
import {
  firstImageUrl,
  flattenVariationAttributes,
  formatVariationLabel,
  sortSpecsByCategoryFilterOrder,
} from "../lib/productAttributes";

export function ProductDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart, city, cityId } = useApp();

  const [product, setProduct]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [qty, setQty]           = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab]     = useState("description");
  const [openFaq, setOpenFaq]         = useState<number | null>(null);
  const [selectedVid, setSelectedVid] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getProductDetails(slug, cityId || undefined)
      .then((res: any) => {
        if (!res.data) { navigate("/shop", { replace: true }); return; }
        setProduct(res.data);
      })
      .catch(() => navigate("/shop", { replace: true }))
      .finally(() => setLoading(false));
  }, [slug, cityId, navigate]);

  useEffect(() => {
    if (!product) return;
    const vars = product.variations || [];
    setSelectedVid(vars.length ? String(vars[0]._id) : null);
  }, [product]);

  const { price, mrp, discount } = useMemo(() => {
    if (!product) return { price: 0, mrp: 0, discount: 0 };
    const vp = selectedVid && product.variationPricing?.find((r: any) => String(r.variation) === selectedVid);
    const p = vp ? Number(vp.salePrice ?? vp.regularPrice ?? 0) : Number(product.pricing?.salePrice || product.pricing?.regularPrice || 0);
    const m = vp ? Number(vp.regularPrice ?? p) : Number(product.pricing?.regularPrice || p);
    const d = m && p < m ? Math.round((1 - p / m) * 100) : 0;
    return { price: p, mrp: m, discount: d };
  }, [product, selectedVid]);

  const specRowsForPanel = useMemo(() => {
    if (!product) return [];
    const vars: any[] = product.variations || [];
    const v = vars.find((x: any) => String(x._id) === selectedVid) || vars[0];
    const rows = flattenVariationAttributes(v?.attributes);
    return sortSpecsByCategoryFilterOrder(rows, product.categoryFilters);
  }, [product, selectedVid]);

  const tabDefs = useMemo(() => {
    if (!product) return [{ key: "description", label: "Description" }];
    const tabs: { key: string; label: string }[] = [{ key: "description", label: "Description" }];
    if (specRowsForPanel.length) tabs.push({ key: "specifications", label: "Specifications" });
    if (product.documents?.length) tabs.push({ key: "documents", label: "Downloads" });
    if ((product.faqs || []).length) tabs.push({ key: "faq", label: "FAQ" });
    return tabs;
  }, [product, specRowsForPanel]);

  useEffect(() => {
    setActiveTab("description");
    setOpenFaq(null);
  }, [slug]);

  useEffect(() => {
    const keys = tabDefs.map((t) => t.key);
    if (!keys.includes(activeTab)) setActiveTab(keys[0] || "description");
  }, [tabDefs, activeTab]);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center bg-sb-cream min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: "#FE5E00", borderTopColor: "transparent" }} />
    </div>
  );

  if (!product) return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center bg-sb-cream min-h-screen">
      <p className="text-[#D4C4A8]/60 text-lg">Product not found.</p>
      <Link to="/shop" className="text-[#FE5E00] underline mt-2 inline-block">Browse Shop</Link>
    </div>
  );

  const images: string[] = (product.images || [])
    .map((i: any) => (typeof i === "string" ? i : i?.url))
    .filter(Boolean);
  const variations: any[] = product.variations || [];
  const faqs: any[] = product.faqs || [];
  const related: any[] = product.related || [];
  const brandName = product.brand?.name || product.brand || "";
  const categorySlug = product.category?.slug || "";
  const categoryName = product.category?.name || "";

  const selectedVar = variations.find((v: any) => String(v._id) === selectedVid);
  const gst = product.gstPercentage || 18;

  const showAssuredBadge = !!(product.isStructbayAssured || product.isAssured || product.displayStructbayAssured);
  const showDeliveryBadge = !!(product.isStructbayDelivery || product.isExpress || product.displayStructbayDelivery);

  const handleAddToCart = () => {
    const slug = product.slug || product._id;
    const vid = selectedVid || undefined;
    const cartId = `${slug}::${vid || "base"}`;
    addToCart({
      id: cartId,
      productSlug: slug,
      variationId: vid,
      variationLabel: selectedVar ? formatVariationLabel(selectedVar) : undefined,
      name: product.name,
      brand: brandName,
      price,
      qty,
      unit: product.unit || "unit",
      image: images[0] || firstImageUrl(product.images) || "",
    });
  };

  return (
    <div className="bg-sb-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-sb-ink-muted mb-6 flex-wrap">
          <Link to="/" className="hover:text-[#FE5E00] transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />
          {categorySlug && (
            <>
              <Link to={`/category/${categorySlug}`} className="hover:text-[#FE5E00] transition-colors capitalize">{categoryName}</Link>
              <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />
            </>
          )}
          <span className="text-sb-ink font-medium line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Gallery */}
          <div>
            <div className="bg-sb-surface-2 border border-sb-ink/10 rounded-2xl aspect-square overflow-hidden mb-3 flex items-center justify-center">
              {images[activeImage] ? (
                <img src={images[activeImage]} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <Package className="w-20 h-20 text-sb-ink-muted/30" aria-hidden />
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === activeImage ? "border-[#FE5E00]" : "border-sb-ink/15 hover:border-sb-ink/30"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {showAssuredBadge && (
                <span className="flex items-center gap-1 rounded-full border border-[#C9A227]/35 bg-[#C9A227]/10 px-2.5 py-1 text-xs font-semibold text-[#9A7B0C]">
                  <Shield className="w-3 h-3" /> StructBay Assured
                </span>
              )}
              {showDeliveryBadge && (
                <span className="bg-[#FE5E00] text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold">
                  <Zap className="w-3 h-3" /> StructBay Delivery
                </span>
              )}
              {product.isTopSelling && (
                <span className="rounded-full border border-sb-ink/15 bg-sb-surface px-2.5 py-1 text-xs font-semibold text-sb-ink-muted">Top selling</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-sb-ink-muted mb-2">
              <span className="font-semibold text-sb-ink">{brandName}</span>
              {categoryName ? <span>· {categoryName}</span> : null}
              {selectedVar?.sku ? <span>· Variant SKU: {selectedVar.sku}</span> : null}
            </div>
            <h1 className="text-2xl font-bold text-sb-ink mb-1">{product.name}</h1>
            <p className="text-xs text-sb-ink-muted mb-2">Parent SKU: {product.sku}</p>
            {selectedVar && (Number(selectedVar.moq) > 1 || selectedVar.leadTimeDays != null) && (
              <p className="text-xs text-sb-ink-muted mb-3">
                MOQ: {selectedVar.moq ?? 1}
                {selectedVar.leadTimeDays != null && Number.isFinite(Number(selectedVar.leadTimeDays))
                  ? ` · Lead time ~${selectedVar.leadTimeDays} day(s)`
                  : ""}
              </p>
            )}

            {/* Pricing */}
            <div className="bg-sb-surface border border-sb-ink/10 rounded-2xl p-5 mb-5">
              {price > 0 ? (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-[#FE5E00]">₹{price.toLocaleString()}</span>
                    {discount > 0 && (
                      <>
                        <span className="text-lg text-sb-ink-muted line-through">₹{mrp.toLocaleString()}</span>
                        <span className="rounded-lg bg-sb-orange px-2 py-0.5 text-sm font-bold text-white">{discount}% OFF</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-sb-ink-muted mt-1">
                    per {product.unit || "unit"}{city ? ` · ` : ""}
                    {city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{city} price</span>}
                    <span className="block text-[11px] text-sb-ink-muted/80 mt-1">Prices exclude GST; GST applied at checkout.</span>
                  </p>
                  <div className="mt-3">
                    <DeliveryChargesNotice />
                  </div>
                  <div className="flex gap-4 mt-2 text-sm text-sb-ink-muted">
                    <span>+ GST ({gst}%): ₹{Math.round(price * gst / 100).toLocaleString()}</span>
                    <span className="font-semibold text-sb-ink">Total: ₹{Math.round(price * (1 + gst / 100)).toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <p className="text-sb-ink-muted text-sm">{city ? "Select your city for pricing" : "Price on request"}</p>
              )}
            </div>

            {/* Wholesale slabs */}
            {product.pricing?.wholesaleSlabs?.length > 0 && (
              <div className="mb-5">
                <h4 className="font-semibold text-sm text-sb-ink mb-2">Wholesale Pricing</h4>
                <div className="grid grid-cols-2 gap-2">
                  {product.pricing.wholesaleSlabs.map((slab: any, i: number) => (
                    <div key={i} className="flex justify-between bg-sb-surface border border-sb-ink/10 rounded-xl px-3 py-2 text-sm">
                      <span className="text-sb-ink-muted">{slab.minQty}+ {product.unit || "units"}</span>
                      <span className="font-semibold text-[#FE5E00]">₹{slab.price?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variations */}
            {variations.length > 0 && (
              <div className="mb-5">
                <h4 className="font-semibold text-sm text-sb-ink mb-2">Variants</h4>
                <div className="flex flex-wrap gap-2">
                  {variations.map((v: any) => {
                    const active = String(v._id) === selectedVid;
                    return (
                      <button
                        key={v._id}
                        type="button"
                        onClick={() => setSelectedVid(String(v._id))}
                        className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                          active
                            ? "border-[#FE5E00] text-[#FE5E00] bg-[#FE5E00]/10"
                            : "border-sb-ink/15 text-sb-ink-muted hover:border-[#FE5E00]/50"
                        }`}
                      >
                        {formatVariationLabel(v)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-medium text-sb-ink-muted">Quantity:</span>
              <div className="flex items-center border border-sb-ink/15 rounded-xl overflow-hidden bg-sb-surface">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 hover:bg-sb-surface-2 transition-colors text-sb-ink-muted"><Minus className="w-4 h-4" /></button>
                <span className="px-4 py-2 font-semibold text-sm border-x border-sb-ink/10 min-w-[3rem] text-center text-sb-ink">{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)} className="px-3 py-2 hover:bg-sb-surface-2 transition-colors text-sb-ink-muted"><Plus className="w-4 h-4" /></button>
              </div>
              <span className="text-sm text-sb-ink-muted">{product.unit || "units"}</span>
            </div>

            {/* Actions */}
            {price > 0 && (
              <div className="flex gap-3 mb-6">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-[#FE5E00] text-[#FE5E00] rounded-2xl py-3 font-semibold transition-colors hover:bg-[#FE5E00]/10"
                >
                  <ShoppingCart className="w-5 h-5" /> Add to Cart
                </button>
                <button
                  onClick={() => { handleAddToCart(); navigate("/cart"); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-white rounded-2xl py-3 font-semibold transition-colors"
                >
                  <Zap className="w-5 h-5" /> Buy Now
                </button>
              </div>
            )}

            {/* Delivery info */}
            <div className="bg-sb-surface border border-sb-ink/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Truck className="w-4 h-4 shrink-0 text-[#FE5E00]" />
                <div>
                  <span className="font-medium text-sb-ink">Delivery</span>
                  <span className="text-sb-ink-muted"> — {city || "Select city"} for accurate rates & ETA.</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <RotateCcw className="h-4 w-4 shrink-0 text-sb-orange" />
                <div><span className="font-medium text-sb-ink">7-day Return Policy</span><span className="text-sb-ink-muted"> for defective products</span></div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 shrink-0 text-green-600" />
                <div><span className="font-medium text-sb-ink">Expert Support</span><span className="text-sb-ink-muted"> +91 70905 70505</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-12">
          <div className="flex border-b border-sb-ink/10 mb-6 overflow-x-auto">
            {tabDefs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-[#FE5E00] text-[#FE5E00]"
                    : "border-transparent text-sb-ink-muted hover:text-sb-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "description" && (
            <div className="bg-sb-surface border border-sb-ink/10 rounded-2xl p-6">
              <p className="text-sb-ink-muted leading-relaxed whitespace-pre-line">
                {product.description || product.shortDescription || "No description available."}
              </p>
            </div>
          )}

          {activeTab === "specifications" && specRowsForPanel.length > 0 && (
            <div className="bg-sb-surface border border-sb-ink/10 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {specRowsForPanel.map((row) => (
                    <tr key={row.key} className="border-b border-sb-ink/8 last:border-0">
                      <th className="text-left font-semibold text-sb-ink bg-sb-surface-2/80 w-[40%] px-4 py-3 align-top">{row.label}</th>
                      <td className="text-sb-ink-muted px-4 py-3 align-top">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "documents" && product.documents?.length > 0 && (
            <div className="bg-sb-surface border border-sb-ink/10 rounded-2xl p-6">
              <div className="space-y-3">
                {product.documents.map((doc: any, i: number) => (
                  <a key={i} href={doc.url} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between w-full p-4 border border-sb-ink/10 rounded-xl hover:bg-sb-surface-2 hover:border-[#FE5E00]/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FE5E00] flex items-center justify-center">
                        <Download className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium text-sm text-sb-ink">{doc.name}</span>
                    </div>
                    <span className="text-xs text-sb-ink-muted">Download</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {activeTab === "faq" && faqs.length > 0 && (
            <div className="space-y-2">
              {faqs.map((faq: any, i: number) => (
                <div key={i} className="bg-sb-surface border border-sb-ink/10 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex items-center justify-between w-full px-5 py-4 text-left"
                  >
                    <span className="font-medium text-sm text-sb-ink">{faq.question}</span>
                    {openFaq === i ? <ChevronUp className="w-4 h-4 text-[#FE5E00]" /> : <ChevronDown className="w-4 h-4 text-sb-ink-muted" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-sm text-sb-ink-muted border-t border-sb-ink/10 pt-3">{faq.answer}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mb-24 md:mb-6">
            <h2 className="text-sb-ink font-bold text-xl mb-4">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {related.slice(0, 4).map((p: any) => {
                const img = firstImageUrl(p.images);
                return (
                  <Link key={p._id} to={`/products/${p.slug}`} className="bg-sb-surface border border-sb-ink/10 rounded-2xl overflow-hidden hover:border-[#FE5E00]/50 hover:shadow-[0_4px_20px_rgba(254,94,0,0.1)] transition-all group">
                    <div className="aspect-square overflow-hidden bg-sb-surface-2 flex items-center justify-center">
                      {img ? <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <Package className="w-10 h-10 text-sb-ink-muted/25" />}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-sb-ink-muted">{p.brand?.name || p.brand}</p>
                      <p className="text-sm font-medium text-sb-ink line-clamp-2 mt-0.5">{p.name}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky mobile footer */}
      {price > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-sb-page border-t border-sb-ink/10 px-4 py-3 md:hidden flex gap-3 z-40">
          <button onClick={handleAddToCart} className="flex-1 flex items-center justify-center gap-2 border-2 border-[#FE5E00] text-[#FE5E00] rounded-2xl py-3 font-semibold text-sm">
            <ShoppingCart className="w-4 h-4" /> Add to Cart
          </button>
          <button onClick={() => { handleAddToCart(); navigate("/cart"); }} className="flex-1 flex items-center justify-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-white rounded-2xl py-3 font-semibold text-sm">
            Buy Now
          </button>
        </div>
      )}
    </div>
  );
}
