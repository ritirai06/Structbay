import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ChevronRight, Loader2 } from "lucide-react";
import type { PolicyDoc } from "../lib/policyContent";
import { POLICY_DOCS } from "../lib/policyContent";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/v1";

async function fetchPolicy(slug: string): Promise<PolicyDoc | null> {
  try {
    const res = await fetch(`${API_BASE}/cms/policies/${encodeURIComponent(slug)}`);
    const json = await res.json();
    if (res.ok && json?.data) return json.data as PolicyDoc;
  } catch {
    /* fallback below */
  }
  return POLICY_DOCS[slug] ?? null;
}

function PolicyPageView({ slug }: { slug: string }) {
  const [doc, setDoc] = useState<PolicyDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPolicy(slug).then((d) => {
      if (!cancelled) setDoc(d);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E85A00]" aria-label="Loading policy" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-semibold text-black mb-2">Policy not found</p>
        <Link to="/" className="text-[#E85A00] hover:underline text-sm font-medium">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-black text-white border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-10 sm:py-12">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-4 flex-wrap">
            <Link to="/" className="hover:text-[#E85A00] transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span className="text-white/90">{doc.title}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{doc.title}</h1>
          <p className="text-white/70 text-sm sm:text-base mt-2 max-w-2xl">{doc.subtitle}</p>
          {doc.lastUpdated && (
            <p className="text-white/45 text-xs mt-4">Last updated: {doc.lastUpdated}</p>
          )}
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-10 sm:py-12">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-8">
          {(doc.sections || []).map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-black mb-3 pb-2 border-b border-[#E85A00]/30">
                {section.title}
              </h2>
              <div className="space-y-3 text-sm sm:text-[15px] text-gray-600 leading-relaxed">
                {(section.body || []).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Questions?{" "}
          <a href="mailto:hello@structbay.com" className="text-[#E85A00] hover:underline font-medium">
            hello@structbay.com
          </a>{" "}
          · +91 70905 70505
        </p>
      </article>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return <PolicyPageView slug="privacy" />;
}

export function TermsPage() {
  return <PolicyPageView slug="terms" />;
}

export function ReturnsPolicyPage() {
  return <PolicyPageView slug="returns" />;
}

export function ShippingPolicyPage() {
  return <PolicyPageView slug="shipping" />;
}

export function DynamicPolicyPage() {
  const { slug } = useParams<{ slug: string }>();
  return <PolicyPageView slug={slug || ""} />;
}
