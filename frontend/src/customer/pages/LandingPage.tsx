import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ChevronRight, FileText, Loader2 } from "lucide-react";
import { api } from "../lib/api";

type LandingSection = { title?: string; body?: string[] };
type LandingDoc = {
  slug: string;
  title: string;
  subtitle?: string;
  sections?: LandingSection[];
};

export function LandingPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [doc, setDoc] = useState<LandingDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    api.getLandingPage(slug)
      .then((res) => {
        if (!cancelled) setDoc(res?.data ?? null);
      })
      .catch((e) => {
        if (!cancelled) {
          setDoc(null);
          setErr(e instanceof Error ? e.message : "Page not found");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#E85A00]" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-lg font-semibold text-black mb-2">{err || "Page not found"}</p>
        <Link to="/" className="text-[#E85A00] text-sm font-medium hover:underline">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-[#E85A00]">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-black font-medium">{doc.title}</span>
      </nav>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-[#E85A00]/15 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#E85A00]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black">{doc.title}</h1>
            {doc.subtitle && <p className="text-sm text-gray-500 mt-0.5">{doc.subtitle}</p>}
          </div>
        </div>
      </div>

      {Array.isArray(doc.sections) && doc.sections.length > 0 && (
        <div className="space-y-6">
          {doc.sections.map((sec, i) => (
            <section key={i} className="rounded-2xl border border-gray-200 bg-white p-6">
              {sec.title && <h2 className="font-semibold text-black mb-3">{sec.title}</h2>}
              {Array.isArray(sec.body) && (
                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                  {sec.body.map((line, j) => (
                    <li key={j}>{line}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
