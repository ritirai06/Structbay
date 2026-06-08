import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  Star, Shield, Zap, ShoppingCart, ChevronRight, Plus, Minus,
  Download, ChevronDown, ChevronUp, Truck, RotateCcw, Phone, MapPin,
} from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";

export function ProductDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart, city } = useApp();

  const [product, setProduct]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [qty, setQty]           = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab]     = useState("description");
  const [openFaq, setOpenFaq]         = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getProductDetails(slug, city || undefined)
      .then((res: any) => {
        if (!res.data) { navigate("/shop", { replace: true }); return; }
        setProduct(res.data);
      })
      .catch(() => navigate("/shop", { replace: true }))
      .finally(() => setLoading(false));
  }, [slug, city]);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center bg-[#0D0D0D] min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: "#FE5E00", borderTopColor: "transparent" }} />
    </div>
  );

  if (!product) return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center bg-[#0D0D0D] min-h-screen">
      <p className="text-[#D4C4A8]/60 text-lg">Product not found.</p>
      <Link to="/shop" className="text-[#FE5E00] underline mt-2 inline-block">Browse Shop</Link>
    </div>
  );

  const images: string[] = (product.images || []).map((i: any) => i?.url || i).filter(Boolean);
  const price     = product.pricing?.salePrice || product.pricing?.regularPrice || 0;
  const mrp       = product.pricing?.regularPrice || price;
  const discount  = mrp && price < mrp ? Math.round((1 - price / mrp) * 100) : 0;
  const gst       = product.gstPercentage || 18;
  const related: any[] = product.related || [];
  const variations: any[] = product.variations || [];
  const faqs: any[] = product.faqs || [];
  const brandName = product.brand?.name || product.brand || "";
  const categorySlug = product.category?.slug || "";
  const categoryName = product.category?.name || "";

  const handleAddToCart = () => {
    addToCart({
      id: product.slug || product._id,
      name: product.name,
      brand: brandName,
      price,
      qty,
      unit: product.unit || "unit",
      image: images[0],
    });
  };

  return (
    <div className="bg-[#0D0D0D] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-[#D4C4A8]/50 mb-6">
          <Link to="/" className="hover:text-[#FE5E00] transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          {categorySlug && (
            <>
              <Link to={`/category/${categorySlug}`} className="hover:text-[#FE5E00] transition-colors capitalize">{categoryName}</Link>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="text-[#F4E9D8] line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Gallery */}
          <div>
            <div className="bg-[#171717] border border-white/10 rounded-2xl aspect-square overflow-hidden mb-3">
              {images[activeImage] && (
                <img src={images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === activeImage ? "border-[#FE5E00]" : "border-white/10 hover:border-white/30"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="flex gap-2 mb-3">
              {product.isAssured && (
                <span className="bg-[#0D0D0D] text-[#C9A227] border border-[#C9A227]/40 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold">
                  <Shield className="w-3 h-3" /> StructBay Assured
                </span>
              )}
              {product.isExpress && (
                <span className="bg-[#FE5E00] text-[#0D0D0D] text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold">
                  <Zap className="w-3 h-3" /> Express Delivery
                </span>
              )}
            </div>

            <p className="text-sm text-[#D4C4A8]/60 mb-1">{brandName}</p>
            <h1 className="text-2xl font-bold text-[#F4E9D8] mb-1">{product.name}</h1>
            <p className="text-xs text-[#D4C4A8]/40 mb-3">SKU: {product.sku}</p>

            {/* Pricing */}
            <div className="bg-[#171717] border border-white/10 rounded-2xl p-5 mb-5">
              {price > 0 ? (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-[#FE5E00]">₹{price.toLocaleString()}</span>
                    {discount > 0 && (
                      <>
                        <span className="text-lg text-[#D4C4A8]/50 line-through">₹{mrp.toLocaleString()}</span>
                        <span className="bg-[#C9A227] text-[#0D0D0D] text-sm font-bold px-2 py-0.5 rounded-lg">{discount}% OFF</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-[#D4C4A8]/60 mt-1">
                    per {product.unit || "unit"}{city ? ` · ` : ""}
                    {city && <span className="flex items-center gap-1 inline-flex"><MapPin className="w-3 h-3" />{city} price</span>}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm text-[#D4C4A8]/60">
                    <span>+ GST ({gst}%): ₹{Math.round(price * gst / 100).toLocaleString()}</span>
                    <span className="font-semibold text-[#F4E9D8]">Total: ₹{Math.round(price * (1 + gst / 100)).toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <p className="text-[#D4C4A8]/60 text-sm">{city ? "Select your city for pricing" : "Price on request"}</p>
              )}
            </div>

            {/* Wholesale slabs */}
            {product.pricing?.wholesaleSlabs?.length > 0 && (
              <div className="mb-5">
                <h4 className="font-semibold text-sm text-[#F4E9D8] mb-2">Wholesale Pricing</h4>
                <div className="grid grid-cols-2 gap-2">
                  {product.pricing.wholesaleSlabs.map((slab: any, i: number) => (
                    <div key={i} className="flex justify-between bg-[#171717] border border-white/10 rounded-xl px-3 py-2 text-sm">
                      <span className="text-[#D4C4A8]/60">{slab.minQty}+ {product.unit || "units"}</span>
                      <span className="font-semibold text-[#FE5E00]">₹{slab.price?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variations */}
            {variations.length > 0 && (
              <div className="mb-5">
                <h4 className="font-semibold text-sm text-[#F4E9D8] mb-2">Variants</h4>
                <div className="flex flex-wrap gap-2">
                  {variations.map((v: any) => (
                    <button key={v._id} className="px-3 py-1.5 rounded-lg border border-white/15 text-xs text-[#D4C4A8] hover:border-[#FE5E00] hover:text-[#FE5E00] transition-colors">
                      {Object.values(v.attributes || {}).join(" · ")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-medium text-[#D4C4A8]">Quantity:</span>
              <div className="flex items-center border border-white/15 rounded-xl overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-2 hover:bg-[#222222] transition-colors text-[#D4C4A8]"><Minus className="w-4 h-4" /></button>
                <span className="px-4 py-2 font-semibold text-sm border-x border-white/15 min-w-[3rem] text-center text-[#F4E9D8]">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="px-3 py-2 hover:bg-[#222222] transition-colors text-[#D4C4A8]"><Plus className="w-4 h-4" /></button>
              </div>
              <span className="text-sm text-[#D4C4A8]/50">{product.unit || "units"}</span>
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
                  className="flex-1 flex items-center justify-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] rounded-2xl py-3 font-semibold transition-colors"
                >
                  <Zap className="w-5 h-5" /> Buy Now
                </button>
              </div>
            )}

            {/* Delivery info */}
            <div className="bg-[#171717] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Truck className="w-4 h-4 shrink-0 text-[#FE5E00]" />
                <div><span className="font-medium text-[#F4E9D8]">Free Delivery</span><span className="text-[#D4C4A8]/60"> on orders above ₹10,000</span></div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <RotateCcw className="w-4 h-4 shrink-0 text-[#C9A227]" />
                <div><span className="font-medium text-[#F4E9D8]">7-day Return Policy</span><span className="text-[#D4C4A8]/60"> for defective products</span></div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 shrink-0 text-green-400" />
                <div><span className="font-medium text-[#F4E9D8]">Expert Support</span><span className="text-[#D4C4A8]/60"> +91 70905 70505</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-12">
          <div className="flex border-b border-white/10 mb-6 overflow-x-auto">
            {[
              { key: "description", label: "Description" },
              { key: "documents",   label: "Documents" },
              ...(faqs.length > 0 ? [{ key: "faq", label: "FAQ" }] : []),
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-[#FE5E00] text-[#FE5E00]"
                    : "border-transparent text-[#D4C4A8]/60 hover:text-[#F4E9D8]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "description" && (
            <div className="bg-[#171717] border border-white/10 rounded-2xl p-6">
              <p className="text-[#D4C4A8]/80 leading-relaxed whitespace-pre-line">
                {product.description || product.shortDescription || "No description available."}
              </p>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="bg-[#171717] border border-white/10 rounded-2xl p-6">
              {product.documents?.length > 0 ? (
                <div className="space-y-3">
                  {product.documents.map((doc: any, i: number) => (
                    <a key={i} href={doc.url} target="_blank" rel="noreferrer"
                      className="flex items-center justify-between w-full p-4 border border-white/10 rounded-xl hover:bg-[#222222] hover:border-[#FE5E00]/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#FE5E00] flex items-center justify-center">
                          <Download className="w-4 h-4 text-[#0D0D0D]" />
                        </div>
                        <span className="font-medium text-sm text-[#F4E9D8]">{doc.name}</span>
                      </div>
                      <span className="text-xs text-[#D4C4A8]/50">Download</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-[#D4C4A8]/50 text-sm">No documents available.</p>
              )}
            </div>
          )}

          {activeTab === "faq" && faqs.length > 0 && (
            <div className="space-y-2">
              {faqs.map((faq: any, i: number) => (
                <div key={i} className="bg-[#171717] border border-white/10 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex items-center justify-between w-full px-5 py-4 text-left"
                  >
                    <span className="font-medium text-sm text-[#F4E9D8]">{faq.question}</span>
                    {openFaq === i ? <ChevronUp className="w-4 h-4 text-[#FE5E00]" /> : <ChevronDown className="w-4 h-4 text-[#D4C4A8]/50" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-sm text-[#D4C4A8]/70 border-t border-white/8 pt-3">{faq.answer}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mb-24 md:mb-6">
            <h2 className="text-[#F4E9D8] font-bold text-xl mb-4">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {related.slice(0, 4).map((p: any) => {
                const img = Array.isArray(p.images) ? p.images[0]?.url : p.image;
                return (
                  <Link key={p._id} to={`/products/${p.slug}`} className="bg-[#222222] border border-white/10 rounded-2xl overflow-hidden hover:border-[#FE5E00]/50 hover:shadow-[0_4px_20px_rgba(254,94,0,0.1)] transition-all group">
                    <div className="aspect-square overflow-hidden bg-[#171717]">
                      {img && <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-[#D4C4A8]/50">{p.brand?.name || p.brand}</p>
                      <p className="text-sm font-medium text-[#F4E9D8] line-clamp-2 mt-0.5">{p.name}</p>
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
        <div className="fixed bottom-0 left-0 right-0 bg-[#0D0D0D] border-t border-white/10 px-4 py-3 md:hidden flex gap-3 z-40">
          <button onClick={handleAddToCart} className="flex-1 flex items-center justify-center gap-2 border-2 border-[#FE5E00] text-[#FE5E00] rounded-2xl py-3 font-semibold text-sm">
            <ShoppingCart className="w-4 h-4" /> Add to Cart
          </button>
          <button onClick={() => { handleAddToCart(); navigate("/cart"); }} className="flex-1 flex items-center justify-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] rounded-2xl py-3 font-semibold text-sm">
            Buy Now
          </button>
        </div>
      )}
    </div>
  );
}
