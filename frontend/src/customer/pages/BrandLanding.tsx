import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ChevronRight, Shield, ShoppingCart, Zap, MapPin } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";

export function BrandLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart, city } = useApp();
  const navigate = useNavigate();

  const [brand, setBrand]       = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getBrandDetails(slug, city || undefined)
      .then((res: any) => {
        if (!res.data?.brand) { navigate("/shop", { replace: true }); return; }
        setBrand(res.data.brand);
        setProducts(res.data.products || []);
        setCategories(res.data.categories || []);
        setTotal(res.data.pagination?.total || (res.data.products || []).length);
      })
      .catch(() => navigate("/shop", { replace: true }))
      .finally(() => setLoading(false));
  }, [slug, city, page, selectedCategory]);

  if (loading) return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#FE5E00", borderTopColor: "transparent" }} />
    </div>
  );

  if (!brand) return null;

  return (
    <div className="bg-[#0D0D0D] min-h-screen">
      {/* Banner */}
      <div className="relative h-64 overflow-hidden">
        {brand.banner?.url
          ? <img src={brand.banner.url} alt={brand.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-[#171717]" />
        }
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D0D] via-[#0D0D0D]/80 to-[#0D0D0D]/40" />
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
                : <div className="w-16 h-16 rounded-2xl bg-[#FE5E00] flex items-center justify-center text-[#0D0D0D] font-black text-2xl">{brand.name[0]}</div>
              }
              <div>
                <h1 className="text-[#F4E9D8] text-3xl font-black">{brand.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className="w-4 h-4 text-[#C9A227]" />
                  <span className="text-[#C9A227] text-sm font-semibold">Authorized StructBay Partner</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Brand description */}
        {brand.description && (
          <div className="bg-[#171717] border border-white/8 rounded-2xl p-6 mb-8">
            <p className="text-[#D4C4A8]/80 leading-relaxed">{brand.description}</p>
          </div>
        )}

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            <button
              onClick={() => setSelectedCategory("")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${!selectedCategory ? "bg-[#FE5E00] text-[#0D0D0D]" : "bg-[#171717] border border-white/8 text-[#D4C4A8] hover:border-[#FE5E00]/50"}`}
            >
              All
            </button>
            {categories.map((cat: any) => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat._id || cat.slug)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedCategory === (cat._id || cat.slug) ? "bg-[#FE5E00] text-[#0D0D0D]" : "bg-[#171717] border border-white/8 text-[#D4C4A8] hover:border-[#FE5E00]/50"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Products */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#F4E9D8] font-bold text-xl">{brand.name} Products</h2>
          <span className="text-sm text-[#D4C4A8]/50">{total} products</span>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((p: any) => {
              const img = Array.isArray(p.images) ? p.images[0]?.url : p.image;
              const price = p.pricing?.salePrice || p.pricing?.regularPrice || 0;
              const slug = p.slug || p._id;
              const brandName = p.brand?.name || brand.name;
              return (
                <div key={p._id} className="bg-[#171717] border border-white/8 rounded-2xl overflow-hidden hover:border-[#FE5E00]/40 hover:shadow-[0_4px_20px_rgba(254,94,0,0.1)] transition-all group">
                  <Link to={`/products/${slug}`} className="relative aspect-square overflow-hidden block bg-[#222222]">
                    {img && <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {p.isAssured && <span className="bg-[#0D0D0D]/90 text-[#C9A227] border border-[#C9A227]/40 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold"><Shield className="w-2.5 h-2.5" /> Assured</span>}
                      {p.isExpress && <span className="bg-[#FE5E00] text-[#0D0D0D] text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold"><Zap className="w-2.5 h-2.5" /> Express</span>}
                    </div>
                  </Link>
                  <div className="p-3">
                    <Link to={`/products/${slug}`}>
                      <h3 className="text-sm font-medium text-[#F4E9D8] line-clamp-2 hover:text-[#FE5E00] transition-colors">{p.name}</h3>
                    </Link>
                    {city && <p className="text-[10px] text-[#D4C4A8]/50 flex items-center gap-0.5 mt-1"><MapPin className="w-2.5 h-2.5" /> {city} price</p>}
                    {price > 0
                      ? <p className="font-bold text-[#FE5E00] mt-1">₹{price.toLocaleString()} <span className="text-xs text-[#D4C4A8]/40 font-normal">/{p.unit || "unit"}</span></p>
                      : <p className="text-xs text-[#D4C4A8]/40 mt-1">Price on request</p>
                    }
                    {price > 0 && (
                      <button
                        onClick={() => addToCart({ id: slug, name: p.name, brand: brandName, price, qty: 1, unit: p.unit || "unit", image: img })}
                        className="w-full mt-3 py-2 rounded-xl bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-[#171717] border border-white/8 rounded-2xl">
            <p className="text-[#D4C4A8]/50">No products found for this brand.</p>
            <Link to="/shop" className="text-[#FE5E00] text-sm font-semibold mt-2 block hover:underline">Browse all products</Link>
          </div>
        )}
      </div>
    </div>
  );
}
