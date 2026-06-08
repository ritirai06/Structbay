import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin, Youtube, Send } from "lucide-react";
import { useFooterCMS } from "@shared/hooks/useFooterCMS";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";

const SOCIAL_ICONS = [Facebook, Twitter, Instagram, Linkedin, Youtube];
const SOCIAL_KEYS = ["facebook", "twitter", "instagram", "linkedin", "youtube"] as const;

export function Footer() {
  const { data: cms } = useFooterCMS();
  const [categories, setCategories] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    fetch("/api/v1/categories?status=ACTIVE&limit=8")
      .then(r => r.json())
      .then(d => setCategories(d.data || []))
      .catch(() => {});
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await fetch("/api/v1/cms/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubscribed(true);
      setEmail("");
    } catch {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="bg-[#0D0D0D] text-[#F4E9D8] mt-16 border-t border-white/8">
      <div className="h-0.5 w-full bg-gradient-to-r from-[#FE5E00] via-[#C9A227] to-[#FE5E00]" />

      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="mb-5">
              <img src={logoImg} alt="StructBay" className="h-16 w-auto object-contain" />
            </div>
            <p className="text-[#D4C4A8]/70 text-sm leading-relaxed mb-5 max-w-xs">
              {cms.companyDescription}
            </p>
            <div className="flex gap-2.5 mb-6">
              {SOCIAL_ICONS.map((Icon, i) => {
                const href = cms.socialLinks[SOCIAL_KEYS[i]] || "#";
                return (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-lg bg-[#222222] border border-white/10 flex items-center justify-center text-[#D4C4A8] hover:bg-[#FE5E00] hover:text-[#0D0D0D] hover:border-[#FE5E00] transition-all"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
            <div className="space-y-2.5 text-sm text-[#D4C4A8]/70">
              {cms.phone  && <div className="flex items-center gap-2.5"><Phone  className="w-4 h-4 text-[#FE5E00]" /><span>{cms.phone}</span></div>}
              {cms.email  && <div className="flex items-center gap-2.5"><Mail   className="w-4 h-4 text-[#FE5E00]" /><span>{cms.email}</span></div>}
              {cms.address && <div className="flex items-center gap-2.5"><MapPin className="w-4 h-4 text-[#FE5E00]" /><span>{cms.address}</span></div>}
            </div>
          </div>

          {/* Quick Links — admin-managed */}
          <div>
            <h4 className="font-semibold mb-4 text-[#F4E9D8] text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-[#D4C4A8]/70">
              {cms.quickLinks.map(link => (
                <li key={link._id}>
                  <Link to={link.href} className="hover:text-[#FE5E00] transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories — dynamic from API */}
          <div>
            <h4 className="font-semibold mb-4 text-[#F4E9D8] text-sm uppercase tracking-wider">Categories</h4>
            <ul className="space-y-2.5 text-sm text-[#D4C4A8]/70">
              {categories.map(cat => (
                <li key={cat.slug}>
                  <Link to={`/category/${cat.slug}`} className="hover:text-[#FE5E00] transition-colors">{cat.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support + Newsletter */}
          <div>
            <h4 className="font-semibold mb-4 text-[#F4E9D8] text-sm uppercase tracking-wider">Support</h4>
            <ul className="space-y-2.5 text-sm text-[#D4C4A8]/70 mb-6">
              {[["RFQ", "/rfq"], ["Bulk Enquiry", "/bulk-enquiry"], ["Login", "/login"], ["Register", "/register"]].map(([label, href]) => (
                <li key={label}>
                  <Link to={href} className="hover:text-[#FE5E00] transition-colors">{label}</Link>
                </li>
              ))}
            </ul>

            <div>
              <h4 className="font-semibold mb-2 text-[#F4E9D8] text-sm uppercase tracking-wider">Newsletter</h4>
              <p className="text-xs text-[#D4C4A8]/60 mb-3">{cms.newsletterText}</p>
              {subscribed ? (
                <p className="text-xs text-[#FE5E00] font-semibold">✓ Thanks for subscribing!</p>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Your email"
                    required
                    className="flex-1 bg-[#171717] border border-white/15 rounded-lg px-3 py-2 text-xs text-[#F4E9D8] placeholder:text-[#D4C4A8]/40 focus:outline-none focus:border-[#FE5E00] transition-colors min-w-0"
                  />
                  <button type="submit" className="p-2 rounded-lg bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] transition-colors shrink-0">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <hr className="border-white/8 my-10" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[#D4C4A8]/40">
          <p>{cms.copyrightText}</p>
        </div>
      </div>
    </footer>
  );
}
