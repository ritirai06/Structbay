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
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em] leading-relaxed">Indian Cities Coming Soon</div>
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

      {/* 2.5 MISSION & VISION */}
      <section className="py-16 md:py-24 px-6 max-w-7xl mx-auto bg-gray-50 mb-16 rounded-3xl">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
            <h3 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-3">
              <span className="w-8 h-1 bg-sb-orange inline-block rounded-full"></span>
              Our Vision
            </h3>
            <p className="text-gray-600 leading-relaxed text-lg italic text-justify">
              "To digitalize the construction industry by creating a seamless, transparent, and efficient marketplace for construction materials—empowering contractors with high-quality authentic products at the best prices, delivered swiftly and reliably."
            </p>
          </div>
          
          <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
            <h3 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-3">
              <span className="w-8 h-1 bg-sb-orange inline-block rounded-full"></span>
              Our Mission
            </h3>
            <p className="text-gray-600 leading-relaxed text-lg italic text-justify">
              "At StructBay, our mission is to revolutionize the construction industry by empowering contractors with a one-stop solution for construction. StructBay is where quality meets convenience — Click-Buy-Build."
            </p>
          </div>
        </div>

        <div className="mt-20 md:mt-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Why choose StructBay?</h2>
            <div className="w-20 h-1.5 bg-sb-orange mx-auto rounded-full"></div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-sb-orange/30 transition-colors">
              <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-start gap-2">
                <span className="text-sb-orange mt-1">✦</span> One-stop shop
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed text-justify">We provide a comprehensive range of materials for all your construction needs, helping you build your dream project with ease.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-sb-orange/30 transition-colors">
              <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-start gap-2">
                <span className="text-sb-orange mt-1">✦</span> Fast & reliable delivery
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed text-justify">No more delays! Get your materials delivered quickly and efficiently to keep your project on track.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-sb-orange/30 transition-colors">
              <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-start gap-2">
                <span className="text-sb-orange mt-1">✦</span> Direct from manufacturers
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed text-justify">Best prices guaranteed – We eliminate middlemen, ensuring unbeatable prices on high-quality products.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-sb-orange/30 transition-colors">
              <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-start gap-2">
                <span className="text-sb-orange mt-1">✦</span> 24×7 Customer Support
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed text-justify">Our expert team is available round-the-clock to assist with orders, inquiries, and after-sales support.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-sb-orange/30 transition-colors">
              <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-start gap-2">
                <span className="text-sb-orange mt-1">✦</span> Tailored for contractors
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed text-justify">Whether you're constructing your own home or managing a project, we make sourcing materials simple, affordable, and hassle-free.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-sb-orange/30 transition-colors">
              <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-start gap-2">
                <span className="text-sb-orange mt-1">✦</span> Seamless online shopping
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed text-justify">A user-friendly platform for easy browsing, ordering, and tracking—all at your fingertips!</p>
            </div>
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