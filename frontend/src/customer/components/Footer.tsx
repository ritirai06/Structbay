import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Phone, Mail, MapPin, Check, CheckCircle } from "lucide-react";
import { useFooterCMS } from "@shared/hooks/useFooterCMS";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";
import { useApp } from "../context/AppContext";
import { fetchNavCategories } from "../lib/navCategories";

export function Footer() {
  const { data: cms } = useFooterCMS();
  const { cityId } = useApp();
  const [categories, setCategories] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    fetchNavCategories({ cityId, max: 8 })
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [cityId]);

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
    <footer className="sf-footer mt-0">
      <div className="relative max-w-7xl mx-auto px-5 lg:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <img src={logoImg} alt="Structbay" className="h-24 w-auto object-contain mb-4" />
            <p className="text-sm text-white/75 leading-relaxed">{cms.companyDescription}</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4>Quick Links</h4>
            <ul className="space-y-2">
              {cms.quickLinks.map((link) => (
                <li key={link._id}>
                  <Link to={link.href} className="sf-footer-link">
                    <CheckCircle className="w-4 h-4 shrink-0 text-white/70" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Let's Connect */}
          <div>
            <h4>Let&apos;s Connect</h4>
            {cms.address && (
              <p className="sf-footer-link">
                <MapPin className="w-4 h-4 shrink-0 text-sb-orange" />
                {cms.address}
              </p>
            )}
            {cms.phone && (
              <p className="sf-footer-link">
                <Phone className="w-4 h-4 shrink-0 text-sb-orange" />
                {cms.phone}
              </p>
            )}
            {cms.email && (
              <p className="sf-footer-link">
                <Mail className="w-4 h-4 shrink-0 text-sb-orange" />
                {cms.email}
              </p>
            )}
          </div>

          {/* Newsletter */}
          <div>
            <h4>Subscribe for exciting offers &amp; newsletters</h4>
            {subscribed ? (
              <p className="text-sm text-sb-orange font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Thanks for subscribing!
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address *"
                  required
                  className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border-0 min-h-0"
                />
                <button type="submit" className="w-full bg-white text-gray-900 font-bold text-sm py-2.5 hover:bg-gray-100 transition-colors">
                  Subscribe!
                </button>
              </form>
            )}
            <p className="text-xs text-white/50 mt-3">{cms.newsletterText}</p>
          </div>
        </div>

        <hr className="border-white/10 my-5" />

        <p className="text-center text-xs text-white/45">{cms.copyrightText}</p>
      </div>
    </footer>
  );
}
