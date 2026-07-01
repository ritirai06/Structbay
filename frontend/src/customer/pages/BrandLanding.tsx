import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ChevronRight, Shield, ShoppingCart, Zap, MapPin, Package } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { pricingSnapshotFromProduct, resolveUnitPriceFromSnapshot, listingUnitPrice } from "../lib/wholesalePricing";
import { productHref } from "../lib/productRoutes";
import { isVariantProduct, validateCartLine } from "../lib/productStructure";

export function BrandLanding() {
  const params = useParams();
  const brandSlug = params.slug || params.brand;
  const { addToCart, city, cityId } = useApp();
  const navigate = useNavigate();

  const [brand, setBrand] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAssured, setShowAssured] = useState(false);
  const [showExpress, setShowExpress] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    setShowAssured(false);
    setShowExpress(false);
    setInStockOnly(false);
    setSelectedCategory("");
    setPage(1);
  }, [brandSlug]);

  useEffect(() => {
    if (!brandSlug) {
      navigate("/shop", { replace: true });
      return;
    }
    setLoading(true);
    const cid = cityId || undefined;
    const params: Record<string, string> = { page: String(page), limit: "24" };
    if (cid) params.cityId = cid;
    if (selectedCategory && /^[a-f0-9]{24}$/i.test(selectedCategory)) params.categoryId = selectedCategory;
    if (showAssured) params.assured = "true";
    if (showExpress) params.express = "true";

    api.getBrandDetails(brandSlug, params)
      .then((res: any) => {
        if (!res.data?.brand) { navigate("/shop", { replace: true }); return; }
        setBrand(res.data.brand);
        setProducts(res.data.products || []);
        setCategories(res.data.categories || []);
        setTotal(res.data.pagination?.total || (res.data.products || []).length);
      })
      .catch(() => navigate("/shop", { replace: true }))
      .finally(() => setLoading(false));
  }, [brandSlug, cityId, page, selectedCategory, showAssured, showExpress, navigate]);

  const displayed = inStockOnly
    ? products.filter((p: any) => p.inStock !== false)
    : products;

  if (loading) return (
    <div className="min-h-screen bg-sb-page flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#E85A00", borderTopColor: "transparent" }} />
    </div>
  );

  if (!brand) return null;

  return (
    <div className="bg-sb-page min-h-screen">
      {/* Banner */}
      <div className="relative h-64 overflow-hidden">
        {brand.banner?.url
          ? <img src={brand.banner.url} alt={brand.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-sb-surface" />
        }
        <div className="absolute inset-0 bg-gradient-to-r from-sb-ink via-sb-ink/85 to-sb-ink/40" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 w-full">
            <nav className="flex items-center gap-2 text-sm text-white/60 mb-4">
              <Link to="/" className="hover:text-white">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link to="/shop" className="hover:text-white">Brands</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white">{brand.name}</span>
            </nav>
            <div className="flex items-center gap-4">
              {brand.logo?.url
                ? <img src={brand.logo.url} alt={brand.name} className="w-16 h-16 rounded-2xl object-contain bg-white p-2" />
                : <div className="w-16 h-16 rounded-2xl bg-[#E85A00] flex items-center justify-center text-sb-on-orange font-black text-2xl">{brand.name[0]}</div>
              }
              <div>
                <h1 className="text-sb-ink text-3xl font-black">{brand.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className="w-4 h-4 text-[#E85A00]" />
                  <span className="text-[#E85A00] text-sm font-semibold">Authorized StructBay Partner</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Brand description */}
        {brand.description && (
          <div className="bg-sb-surface border border-sb-ink/10 rounded-2xl p-6 mb-8">
            <p className="text-sb-ink-muted/80 leading-relaxed">{brand.description}</p>
          </div>
        )}

        {/* Quick badges */}
        <div className="bg-sb-surface border border-sb-ink/10 rounded-2xl p-4 mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-sb-ink-muted/60 mb-3">Quick badges</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={showAssured} onChange={e => { setShowAssured(e.target.checked); setPage(1); }} className="w-4 h-4 rounded border-sb-ink/25 accent-[#E85A00]" />
              <Shield className="w-3.5 h-3.5 text-[#E85A00]" aria-hidden />
              <span className="text-sm text-sb-ink-muted/80 group-hover:text-sb-ink">Assured only</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={showExpress} onChange={e => { setShowExpress(e.target.checked); setPage(1); }} className="w-4 h-4 rounded border-sb-ink/25 accent-[#E85A00]" />
              <Zap className="w-3.5 h-3.5 text-[#E85A00]" aria-hidden />
              <span className="text-sm text-sb-ink-muted/80 group-hover:text-sb-ink">Express delivery</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={inStockOnly} onChange={e => { setInStockOnly(e.target.checked); }} className="w-4 h-4 rounded border-sb-ink/25 accent-[#E85A00]" />
              <Package className="w-3.5 h-3.5 text-emerald-400" aria-hidden />
              <span className="text-sm text-sb-ink-muted/80 group-hover:text-sb-ink">In stock only</span>
            </label>
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            <button
              onClick={() => { setSelectedCategory(""); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${!selectedCategory ? "bg-[#E85A00] text-sb-on-orange" : "bg-sb-surface border border-sb-ink/10 text-sb-ink-muted hover:border-[#E85A00]/50"}`}
            >
              All
            </button>
            {categories.map((cat: any) => (
              <button
                key={cat.slug}
                onClick={() => { setSelectedCategory(cat._id || cat.slug); setPage(1); }}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedCategory === (cat._id || cat.slug) ? "bg-[#E85A00] text-sb-on-orange" : "bg-sb-surface border border-sb-ink/10 text-sb-ink-muted hover:border-[#E85A00]/50"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Products */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sb-ink font-bold text-xl">{brand.name} Products</h2>
          <span className="text-sm text-sb-ink-muted/50">
            {inStockOnly ? `${displayed.length} of ${total}` : `${total}`} products
          </span>
        </div>

        {displayed.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {displayed.map((p: any) => {
              const img = Array.isArray(p.images) ? p.images[0]?.url : p.image;
              const isVariant = isVariantProduct(p);
              const price = isVariant
                ? listingUnitPrice(p, null)
                : (p.pricing?.salePrice || p.pricing?.regularPrice || listingUnitPrice(p, null));
              const slug = p.slug || p._id;
              const brandName = p.brand?.name || brand.name;
              return (
                <div key={p._id} className="bg-sb-surface border border-sb-ink/10 rounded-2xl overflow-hidden hover:border-[#E85A00]/40 hover:shadow-[0_4px_20px_rgba(232, 90, 0,0.1)] transition-all group">
                  <Link to={productHref(slug)} className="relative aspect-square overflow-hidden block bg-sb-surface-2">
                    {img && <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {p.isAssured && <span className="bg-sb-page/90 text-[#E85A00] border border-[#E85A00]/40 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold"><Shield className="w-2.5 h-2.5" /> Assured</span>}
                      {p.isExpress && <span className="bg-[#E85A00] text-sb-on-orange text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold"><Zap className="w-2.5 h-2.5" /> Express</span>}
                    </div>
                  </Link>
                  <div className="p-3">
                    <Link to={productHref(slug)}>
                      <h3 className="text-sm font-medium text-sb-ink line-clamp-2 hover:text-[#E85A00] transition-colors">{p.name}</h3>
                    </Link>
                    {city && <p className="text-[10px] text-sb-ink-muted/50 flex items-center gap-0.5 mt-1"><MapPin className="w-2.5 h-2.5" /> {city} price</p>}
                    {price > 0
                      ? (
                        <>
                          <p className="font-bold text-[#E85A00] mt-1">₹{price.toLocaleString()} <span className="text-xs text-sb-ink-muted/40 font-normal">/{p.unit || "unit"}</span></p>
                          <p className="text-[10px] text-sb-ink-muted/40">excl. GST</p>
                        </>
                      )
                      : <p className="text-xs text-sb-ink-muted/40 mt-1">Price on request</p>
                    }
                    {price > 0 && (
                      isVariant ? (
                        <Link
                          to={productHref(slug)}
                          className="w-full mt-3 py-2 rounded-xl bg-[#E85A00] hover:bg-[#CC4E00] text-sb-on-orange text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                        >
                          Select options
                        </Link>
                      ) : (
                        <button
                          onClick={() => {
                            const snap = pricingSnapshotFromProduct(p, null);
                            const check = validateCartLine(p, undefined);
                            if (!check.ok) {
                              alert(check.message);
                              return;
                            }
                            addToCart({
                              id: `${String(slug)}::base`,
                              productSlug: String(slug),
                              name: p.name,
                              brand: brandName,
                              price: snap ? resolveUnitPriceFromSnapshot(snap, 1) : Number(price),
                              qty: 1,
                              unit: p.unit || "unit",
                              image: img || "",
                              pricingSnapshot: snap || undefined,
                              gstPercentage: Number.isFinite(Number(p.gstPercentage)) ? Number(p.gstPercentage) : 18,
                              gstType: p.priceIncludesGst ? "inclusive" : "exclusive",
                            });
                          }}
                          className="w-full mt-3 py-2 rounded-xl bg-[#E85A00] hover:bg-[#CC4E00] text-sb-on-orange text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-sb-surface border border-sb-ink/10 rounded-2xl">
            <p className="text-sb-ink-muted/50">No products found for this brand.</p>
            <Link to="/shop" className="text-[#E85A00] text-sm font-semibold mt-2 block hover:underline">Browse all products</Link>
          </div>
        )}
      </div>
    </div>
  );
}
