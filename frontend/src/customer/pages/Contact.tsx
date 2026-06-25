import React from "react";
import { Phone, Mail, Map, User, MessageSquare } from "lucide-react";
import { useCmsHomepage } from "../hooks/useCmsHomepage";
import { HeroBanner } from "../components/HeroBanner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export function Contact() {
  const { cms, loading, error } = useCmsHomepage();
  
  // Get banner URL from CMS - same pattern as Homepage
  let bannerUrl = cms?.pageBanners?.contactUsUrl;
  
  // If URL is relative (starts with /), prepend API_BASE_URL
  if (bannerUrl && bannerUrl.startsWith("/")) {
    bannerUrl = `${API_BASE_URL}${bannerUrl}`;
  }
  
  // If still no banner URL, use a default fallback (never show broken image)
  if (!bannerUrl) {
    bannerUrl = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=2400&q=82";
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <HeroBanner imageUrl={bannerUrl} title="Contact Us" overlayOpacity={0.4} />

      {/* 2. CONNECT WITH US */}
      <section className="py-20 md:py-28 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-black uppercase tracking-wide">
            CONNECT WITH US
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white p-12 flex flex-col items-center text-center shadow-sm">
            <div className="mb-6 text-gray-400">
              <Phone className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <h3 className="text-sb-orange text-lg font-medium uppercase tracking-widest mb-4">CALL US</h3>
            <p className="text-gray-500 font-medium text-sm tracking-wider">+91 73488 44465</p>
          </div>
          
          {/* Card 2 */}
          <div className="bg-white p-12 flex flex-col items-center text-center shadow-sm">
            <div className="mb-6 text-gray-400">
              <Mail className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <h3 className="text-sb-orange text-lg font-medium uppercase tracking-widest mb-4">EMAIL US</h3>
            <p className="text-gray-500 font-medium text-sm tracking-wider">hello@structbay.com</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-12 flex flex-col items-center text-center shadow-sm">
            <div className="mb-6 text-gray-400">
              <Map className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <h3 className="text-sb-orange text-lg font-medium uppercase tracking-widest mb-4">ADDRESS</h3>
            <p className="text-gray-500 font-medium text-[13px] leading-relaxed max-w-[280px]">
              102, Road No.4, Defence Layout,<br />Vidyaranyapura, Bengaluru 560097
            </p>
          </div>
        </div>
      </section>

      {/* 3. FORM & MAP */}
      <section className="pb-24 px-4 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row bg-white shadow-sm overflow-hidden h-auto lg:h-[600px]">
          {/* Left: Form */}
          <div className="w-full lg:w-1/2 p-10 md:p-16 flex flex-col justify-center bg-white">
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-sb-orange" />
                </div>
                <input
                  type="text"
                  placeholder="Your Name..."
                  className="block w-full pl-11 pr-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-full focus:outline-none focus:border-sb-orange focus:ring-1 focus:ring-sb-orange transition-colors placeholder-gray-400"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-sb-orange" />
                </div>
                <input
                  type="email"
                  placeholder="Email Address..."
                  className="block w-full pl-11 pr-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-full focus:outline-none focus:border-sb-orange focus:ring-1 focus:ring-sb-orange transition-colors placeholder-gray-400"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MessageSquare className="h-4 w-4 text-sb-orange" />
                </div>
                <input
                  type="text"
                  placeholder="Subject..."
                  className="block w-full pl-11 pr-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-full focus:outline-none focus:border-sb-orange focus:ring-1 focus:ring-sb-orange transition-colors placeholder-gray-400"
                />
              </div>

              <div className="relative">
                <div className="absolute top-[14px] left-0 pl-4 flex items-start pointer-events-none">
                  <MessageSquare className="h-4 w-4 text-sb-orange" />
                </div>
                <textarea
                  rows={5}
                  placeholder="Your Message"
                  className="block w-full pl-11 pr-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-[20px] focus:outline-none focus:border-sb-orange focus:ring-1 focus:ring-sb-orange transition-colors resize-none placeholder-gray-400"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="px-8 py-3 bg-white border border-sb-orange text-sb-orange font-medium text-sm rounded-full hover:bg-sb-orange hover:text-white transition-colors uppercase tracking-widest"
                >
                  SEND MESSAGE
                </button>
              </div>
            </form>
          </div>

          {/* Right: Map */}
          <div className="w-full lg:w-1/2 h-[400px] lg:h-full">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15545.923055416035!2d77.54583191196144!3d13.068631165438883!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae229be0b201a7%3A0xc49d0cb09d3b8417!2sVidyaranyapura%2C%20Bengaluru%2C%20Karnataka!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="StructBay Location Map"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
