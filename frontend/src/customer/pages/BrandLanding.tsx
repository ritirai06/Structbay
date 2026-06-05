import { Link, useParams } from "react-router";
import { ChevronRight, Star, Shield, ShoppingCart } from "lucide-react";
import { PRODUCTS } from "../data/products";
import { useApp } from "../context/AppContext";

const BRAND_INFO: Record<string, { name: string; tagline: string; description: string; image: string; established: string; headquarters: string }> = {
  ultratech: { name: "Ultratech Cement", tagline: "The Engineer's Choice", description: "UltraTech Cement Ltd. is India's largest manufacturer of grey cement, white cement and ready mix concrete. UltraTech has a consolidated capacity of 116.75 MTPA of grey cement.", image: "https://images.unsplash.com/photo-1587163750009-30c06ff8d8ef?w=1200&h=400&fit=crop", established: "1983", headquarters: "Mumbai, Maharashtra" },
  acc: { name: "ACC Cement", tagline: "Building Memories, Building Lives", description: "ACC Limited is one of India's foremost manufacturers of cement and concrete. ACC's operations are spread throughout the country with 17 modern cement factories.", image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=400&fit=crop", established: "1936", headquarters: "Mumbai, Maharashtra" },
  ambuja: { name: "Ambuja Cement", tagline: "Strength of a Bond", description: "Ambuja Cement is one of the top cement companies in India. With a presence in 11 states and 6 integrated cement manufacturing plants, it is a market leader.", image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1200&h=400&fit=crop", established: "1983", headquarters: "Gurugram, Haryana" },
};

export function BrandLanding() {
  const { brand = "ultratech" } = useParams<{ brand: string }>();
  const { addToCart } = useApp();
  const info = BRAND_INFO[brand] || BRAND_INFO.ultratech;
  const brandProducts = PRODUCTS.filter(p => p.brand.toLowerCase().includes(info.name.split(" ")[0].toLowerCase()));

  return (
    <div>
      {/* Banner */}
      <div className="relative h-64 overflow-hidden">
        <img src={info.image} alt={info.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50 flex items-center">
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex items-center gap-2 text-sm text-white/70 mb-4">
              <Link to="/" className="hover:text-white">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white">{info.name}</span>
            </nav>
            <div className="flex items-center gap-4">
              <div style={{ backgroundColor: "var(--sb-blue)" }} className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shrink-0">
                {info.name[0]}
              </div>
              <div>
                <h1 className="text-white">{info.name}</h1>
                <p style={{ color: "var(--sb-yellow)" }} className="font-medium">{info.tagline}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Brand story */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 bg-white rounded-2xl border border-border p-6">
            <h2 className="text-foreground mb-3">About {info.name}</h2>
            <p className="text-muted-foreground leading-relaxed">{info.description}</p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Brand Overview</h3>
            {[["Established", info.established], ["Headquarters", info.headquarters], ["Status", "Authorized Dealer"]].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--sb-green, #16a34a)" }}>
                <Shield className="w-4 h-4" />
                <span className="font-semibold">Authorized StructBay Partner</span>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div>
          <h2 className="text-foreground mb-4">{info.name} Products</h2>
          {brandProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {brandProducts.map(product => (
                <div key={product.id} className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all group">
                  <Link to={`/product/${product.id}`} className="block aspect-square overflow-hidden bg-muted">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </Link>
                  <div className="p-3">
                    <Link to={`/product/${product.id}`}>
                      <h3 className="text-sm font-medium text-foreground line-clamp-2">{product.name}</h3>
                    </Link>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium">{product.rating}</span>
                    </div>
                    <p style={{ color: "var(--sb-blue)" }} className="font-bold mt-1">₹{product.price.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">per {product.unit}</p>
                    {product.inStock && (
                      <button
                        onClick={() => addToCart({ id: product.id, name: product.name, brand: product.brand, price: product.price, qty: 1, unit: product.unit, image: product.image })}
                        style={{ backgroundColor: "var(--sb-blue)" }}
                        className="w-full mt-3 py-2 rounded-xl text-white text-sm hover:opacity-90 flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-border">
              <p className="text-muted-foreground">No products found for this brand.</p>
              <Link to="/category/cement" style={{ color: "var(--sb-blue)" }} className="text-sm font-medium mt-2 block hover:underline">Browse all products</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
