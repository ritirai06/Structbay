import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  Star, Shield, Zap, ShoppingCart, ChevronRight, Plus, Minus,
  Download, ChevronDown, ChevronUp, Truck, RotateCcw, Phone,
} from "lucide-react";
import { PRODUCTS } from "../data/products";
import { useApp } from "../context/AppContext";

const FAQS = [
  { q: "What is the minimum order quantity?", a: "Minimum order is 1 unit. For bulk orders above 50 units, contact our sales team for special pricing." },
  { q: "What are the delivery timelines?", a: "Express products: 24–48 hours. Standard: 3–5 business days. Bulk orders: 5–7 days depending on quantity." },
  { q: "Can I get a GST invoice?", a: "Yes, all orders come with GST-compliant invoices that can be downloaded from your order history." },
  { q: "Is the product BIS certified?", a: "Yes, all products on StructBay are BIS/ISI certified and sourced from authorized dealers." },
];

export function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, city } = useApp();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState("specs");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const product = PRODUCTS.find(p => p.id === id);

  if (!product) return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center bg-[#0D0D0D] min-h-screen">
      <p className="text-[#D4C4A8]/60 text-lg">Product not found.</p>
      <Link to="/" className="text-[#FE5E00] underline mt-2 inline-block">Go Home</Link>
    </div>
  );

  const discount = Math.round((1 - product.price / product.mrp) * 100);
  const related = PRODUCTS.filter(p => p.category === product.category && p.id !== product.id);

  return (
    <div className="bg-[#0D0D0D] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-[#D4C4A8]/50 mb-6">
          <Link to="/" className="hover:text-[#FE5E00] transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to={`/category/${product.category}`} className="hover:text-[#FE5E00] transition-colors capitalize">{product.category}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#F4E9D8] line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Gallery */}
          <div>
            <div className="bg-[#171717] border border-white/10 rounded-2xl aspect-square overflow-hidden mb-3">
              <img src={product.images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === activeImage ? "border-[#FE5E00]" : "border-white/10 hover:border-white/30"}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="flex gap-2 mb-3">
              {product.assured && (
                <span className="bg-[#0D0D0D] text-[#C9A227] border border-[#C9A227]/40 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold">
                  <Shield className="w-3 h-3" /> StructBay Assured
                </span>
              )}
              {product.express && (
                <span className="bg-[#FE5E00] text-[#0D0D0D] text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold">
                  <Zap className="w-3 h-3" /> Express Delivery
                </span>
              )}
            </div>

            <p className="text-sm text-[#D4C4A8]/60 mb-1">{product.brand}</p>
            <h1 className="text-2xl font-bold text-[#F4E9D8] mb-3">{product.name}</h1>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={`w-4 h-4 ${n <= Math.round(product.rating) ? "fill-[#C9A227] text-[#C9A227]" : "text-white/20"}`} />
                ))}
              </div>
              <span className="font-semibold text-[#F4E9D8]">{product.rating}</span>
              <span className="text-[#D4C4A8]/50 text-sm">({product.reviews} reviews)</span>
            </div>

            {/* Pricing */}
            <div className="bg-[#171717] border border-white/10 rounded-2xl p-5 mb-5">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-[#FE5E00]">₹{product.price.toLocaleString()}</span>
                <span className="text-lg text-[#D4C4A8]/50 line-through">₹{product.mrp.toLocaleString()}</span>
                <span className="bg-[#C9A227] text-[#0D0D0D] text-sm font-bold px-2 py-0.5 rounded-lg">{discount}% OFF</span>
              </div>
              <p className="text-sm text-[#D4C4A8]/60 mt-1">per {product.unit}{city ? ` · ${city} price` : ""}</p>
              <div className="flex gap-4 mt-2 text-sm text-[#D4C4A8]/60">
                <span>+ GST (18%): ₹{Math.round(product.price * 0.18).toLocaleString()}</span>
                <span className="font-semibold text-[#F4E9D8]">Total: ₹{Math.round(product.price * 1.18).toLocaleString()}</span>
              </div>
            </div>

            {/* Wholesale */}
            {product.wholesalePricing.length > 0 && (
              <div className="mb-5">
                <h4 className="font-semibold text-sm text-[#F4E9D8] mb-2">Wholesale Pricing</h4>
                <div className="grid grid-cols-2 gap-2">
                  {product.wholesalePricing.map(tier => (
                    <div key={tier.qty} className="flex justify-between bg-[#171717] border border-white/10 rounded-xl px-3 py-2 text-sm">
                      <span className="text-[#D4C4A8]/60">{tier.qty}</span>
                      <span className="font-semibold text-[#FE5E00]">₹{tier.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stock */}
            <div className="mb-4">
              {product.inStock ? (
                <span className="flex items-center gap-1.5 text-sm text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full" /> In Stock · Ready to ship
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-red-400">
                  <div className="w-2 h-2 bg-red-400 rounded-full" /> Out of Stock
                </span>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-medium text-[#D4C4A8]">Quantity:</span>
              <div className="flex items-center border border-white/15 rounded-xl overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-2 hover:bg-[#222222] transition-colors text-[#D4C4A8]">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 font-semibold text-sm border-x border-white/15 min-w-[3rem] text-center text-[#F4E9D8]">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="px-3 py-2 hover:bg-[#222222] transition-colors text-[#D4C4A8]">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm text-[#D4C4A8]/50">{product.unit}s</span>
            </div>

            {/* Actions */}
            {product.inStock && (
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => addToCart({ id: product.id, name: product.name, brand: product.brand, price: product.price, qty, unit: product.unit, image: product.image })}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-[#FE5E00] text-[#FE5E00] rounded-2xl py-3 font-semibold transition-colors hover:bg-[#FE5E00]/10"
                >
                  <ShoppingCart className="w-5 h-5" /> Add to Cart
                </button>
                <button
                  onClick={() => { addToCart({ id: product.id, name: product.name, brand: product.brand, price: product.price, qty, unit: product.unit, image: product.image }); navigate("/cart"); }}
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
                <div><span className="font-medium text-[#F4E9D8]">Expert Support</span><span className="text-[#D4C4A8]/60"> +91 80 4567 8900</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-12">
          <div className="flex border-b border-white/10 mb-6 overflow-x-auto">
            {["specs", "description", "documents", "faq"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab
                    ? "border-[#FE5E00] text-[#FE5E00]"
                    : "border-transparent text-[#D4C4A8]/60 hover:text-[#F4E9D8]"
                }`}
              >
                {tab === "faq" ? "FAQ" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === "specs" && (
            <div className="bg-[#171717] border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(product.specs).map(([key, value], i) => (
                    <tr key={key} className={i % 2 === 0 ? "bg-[#1A1A1A]" : "bg-[#171717]"}>
                      <td className="px-4 py-3 font-medium text-[#F4E9D8] w-1/3">{key}</td>
                      <td className="px-4 py-3 text-[#D4C4A8]/70">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "description" && (
            <div className="bg-[#171717] border border-white/10 rounded-2xl p-6">
              <p className="text-[#D4C4A8]/80 leading-relaxed">{product.description}</p>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="bg-[#171717] border border-white/10 rounded-2xl p-6">
              <div className="space-y-3">
                {["Technical Data Sheet", "Safety Data Sheet", "BIS Certificate", "Test Report"].map(doc => (
                  <button key={doc} className="flex items-center justify-between w-full p-4 border border-white/10 rounded-xl hover:bg-[#222222] hover:border-[#FE5E00]/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FE5E00] flex items-center justify-center">
                        <Download className="w-4 h-4 text-[#0D0D0D]" />
                      </div>
                      <span className="font-medium text-sm text-[#F4E9D8]">{doc}</span>
                    </div>
                    <span className="text-xs text-[#D4C4A8]/50">PDF · 245 KB</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "faq" && (
            <div className="space-y-2">
              {FAQS.map((faq, i) => (
                <div key={i} className="bg-[#171717] border border-white/10 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex items-center justify-between w-full px-5 py-4 text-left"
                  >
                    <span className="font-medium text-sm text-[#F4E9D8]">{faq.q}</span>
                    {openFaq === i ? <ChevronUp className="w-4 h-4 text-[#FE5E00]" /> : <ChevronDown className="w-4 h-4 text-[#D4C4A8]/50" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-sm text-[#D4C4A8]/70 border-t border-white/8 pt-3">{faq.a}</div>
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
              {related.slice(0, 4).map(p => {
                const disc = Math.round((1 - p.price / p.mrp) * 100);
                return (
                  <Link key={p.id} to={`/product/${p.id}`} className="bg-[#222222] border border-white/10 rounded-2xl overflow-hidden hover:border-[#FE5E00]/50 hover:shadow-[0_4px_20px_rgba(254,94,0,0.1)] transition-all group">
                    <div className="aspect-square overflow-hidden bg-[#171717] relative">
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute top-2 right-2 bg-[#C9A227] text-[#0D0D0D] text-xs font-bold px-2 py-0.5 rounded-full">-{disc}%</div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-[#D4C4A8]/50">{p.brand}</p>
                      <p className="text-sm font-medium text-[#F4E9D8] line-clamp-2 mt-0.5">{p.name}</p>
                      <p className="font-bold text-[#FE5E00] mt-1">₹{p.price.toLocaleString()}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky mobile footer */}
      {product.inStock && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0D0D0D] border-t border-white/10 px-4 py-3 md:hidden flex gap-3 z-40">
          <button
            onClick={() => addToCart({ id: product.id, name: product.name, brand: product.brand, price: product.price, qty, unit: product.unit, image: product.image })}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-[#FE5E00] text-[#FE5E00] rounded-2xl py-3 font-semibold text-sm"
          >
            <ShoppingCart className="w-4 h-4" /> Add to Cart
          </button>
          <button
            onClick={() => { addToCart({ id: product.id, name: product.name, brand: product.brand, price: product.price, qty, unit: product.unit, image: product.image }); navigate("/cart"); }}
            className="flex-1 flex items-center justify-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] rounded-2xl py-3 font-semibold text-sm"
          >
            Buy Now
          </button>
        </div>
      )}
    </div>
  );
}
