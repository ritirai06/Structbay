import { useState, useEffect } from "react";

export interface QuickLink {
  _id: string;
  label: string;
  href: string;
  sortOrder: number;
}

export interface FooterData {
  companyDescription: string;
  address: string;
  phone: string;
  email: string;
  newsletterText: string;
  copyrightText: string;
  quickLinks: QuickLink[];
  socialLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
    youtube: string;
  };
}

import { FOOTER_QUICK_LINKS } from "@shared/constants/footerQuickLinks";

const DEFAULTS: FooterData = {
  companyDescription:
    "StructBay combines the reliability of branded materials, the power of affordable pricing, and the ease of single-window sourcing — everything you need to finish projects faster and better.",
  address: "Vidyaranyapura, Bengaluru",
  phone: "+91 70905 70505",
  email: "hello@structbay.com",
  newsletterText: "Subscribe for exciting offers & newsletters",
  copyrightText: "© 2026 StructBay. All Rights Reserved. Developed By HSDA Digital.",
  quickLinks: FOOTER_QUICK_LINKS.map((l, i) => ({
    _id: String(i + 1),
    label: l.label,
    href: l.href,
    sortOrder: l.sortOrder,
  })),
  socialLinks: {
    facebook:  "#",
    twitter:   "#",
    instagram: "#",
    linkedin:  "#",
    youtube:   "#",
  },
};

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/v1";

export function useFooterCMS() {
  const [data, setData] = useState<FooterData>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/cms/footer`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(json => {
        if (!cancelled && json?.data) {
          const api = json.data as Partial<FooterData>;
          const quickLinks =
            Array.isArray(api.quickLinks) && api.quickLinks.length > 0
              ? api.quickLinks
              : DEFAULTS.quickLinks;
          setData((prev) => ({ ...prev, ...api, quickLinks }));
        }
      })
      .catch(() => { /* silently use defaults */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { data, loading };
}
