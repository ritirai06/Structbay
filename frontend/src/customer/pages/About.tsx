import React from "react";
import { Star } from "lucide-react";
import { useCmsHomepage } from "../hooks/useCmsHomepage";
import { HeroBanner } from "../components/HeroBanner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export function About() {
  const { cms, loading, error } = useCmsHomepage();
  
  // Get banner URL from CMS - same pattern as Homepage
  let bannerUrl = cms?.pageBanners?.aboutUsUrl;
  
  // If URL is relative (starts with /), prepend API_BASE_URL
  if (bannerUrl && bannerUrl.startsWith("/")) {
    bannerUrl = `${API_BASE_URL}${bannerUrl}`;
  }
  
  // If still no banner URL, use a default fallback (never show broken image)
  if (!bannerUrl) {
    bannerUrl = "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=2400&q=82";
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <HeroBanner imageUrl={bannerUrl} title="About Us" overlayOpacity={0.4} />

      {/* 2. STATS & DESCRIPTION */}
      <section className="py-20 md:py-32 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Stats Left Side */}
          <div className="grid grid-cols-2 gap-y-16 gap-x-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-medium text-sb-orange mb-4">2000+</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em] leading-relaxed">Verified Branded Products</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-medium text-sb-orange mb-4">5+</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em] leading-relaxed">Cities Indian Covered</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-medium text-sb-orange mb-4">50000+</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em] leading-relaxed">Orders Delivered On Time</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-medium text-sb-orange mb-4">10000+</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em] leading-relaxed">Trusted Brand Partners</div>
            </div>
          </div>
          
          {/* Description Right Side */}
          <div className="text-[#888888] leading-[2.2] text-lg px-4 md:px-0">
            <p className="text-justify" style={{ textAlign: "justify" }}>
              At <span className="font-bold text-gray-800">Structbay</span>, we're revolutionizing the construction supply industry by making it easier, safer, and more affordable to source authentic building materials. Whether you're a contractor, architect, or individual builder, our platform gives you direct access to 100% genuine products from India's top brands — all in one place. No more dealing with fake items, inflated prices, or juggling multiple vendors. With Structbay, construction becomes smarter, faster, and more reliable.
            </p>
          </div>
        </div>
      </section>

      {/* 3. TESTIMONIALS */}
      <section className="py-20 md:py-28 px-4 bg-[#e2e2e2]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 uppercase tracking-wide">
              TESTIMONIALS
            </h2>
            <p className="text-sb-orange text-lg font-medium">
              Hear It From Our Customers
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Testimonial 1 */}
            <div className="border border-gray-400 bg-transparent p-10 md:p-14 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Amit Sharma</h3>
              <p className="text-sm text-gray-800 mb-10 font-medium">Senior Site Engineer, Shree Constructions</p>
              
              <p className="text-gray-900 leading-loose mb-10 max-w-sm mx-auto text-justify" style={{ textAlign: "justify" }}>
                "Structbay has completely changed how we source materials. No more running behind different vendors. We now get everything — from cement to tiles — in one place, and it's all genuine. That's a huge relief!"
              </p>
              
              <div className="flex justify-center gap-1.5">
                {[...Array(4)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-sb-orange fill-sb-orange" />
                ))}
                <Star className="w-5 h-5 text-sb-orange" />
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="border border-gray-400 bg-transparent p-10 md:p-14 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Nitin Desai</h3>
              <p className="text-sm text-gray-800 mb-10 font-medium">Interior Contractor, Desai Interiors</p>
              
              <p className="text-gray-900 leading-loose mb-10 max-w-sm mx-auto text-justify" style={{ textAlign: "justify" }}>
                "Getting fake products in the market has been a major issue — especially with paints. Structbay guarantees authenticity. I've never had to second guess a single delivery!"
              </p>
              
              <div className="flex justify-center gap-1.5">
                {[...Array(4)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-sb-orange fill-sb-orange" />
                ))}
                <Star className="w-5 h-5 text-sb-orange" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}