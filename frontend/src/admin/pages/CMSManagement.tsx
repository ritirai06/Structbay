import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import {
  Plus, Edit, Trash2, ToggleLeft, ToggleRight, Eye,
  Megaphone, Image, Upload, FileText, Globe, Mail, MapPin, Link2,
  BarChart3, Loader2, RefreshCw, Save, Star, Pin, MousePointerClick,
} from "lucide-react";
import { adminFetch as apiFetch, adminUploadImage } from "../../lib/adminApi";
import { AdminDeleteConfirmModal } from "../components/AdminDeleteConfirmModal";
import { AdminBulkToolbar } from "../components/AdminBulkToolbar";
import { useAdminResourceDelete } from "../hooks/useAdminResourceDelete";
import { adminToast } from "../lib/adminToast";

function RatingStarsRow({ rating }: { rating: number }) {
  const n = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
  return (
    <div className="flex items-center gap-0.5 mb-3" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < n ? "fill-sb-orange text-sb-orange" : "text-sb-ink/20"}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function localDayBoundsToISO(start: string, end: string): { startDate: string | null; endDate: string | null } {
  return {
    startDate: start ? new Date(`${start}T00:00:00`).toISOString() : null,
    endDate: end ? new Date(`${end}T23:59:59.999`).toISOString() : null,
  };
}

// ─── Shared Components ────────────────────────────────────────────────────────
function SectionHeader({ title, onAdd, addLabel = "Add" }: { title: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-sb-ink">{title}</h2>
      {onAdd && (
        <Button size="sm" onClick={onAdd} className="bg-sb-orange hover:bg-sb-orange-hover text-black">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> {addLabel}
        </Button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE" || status === "PUBLISHED";
  return (
    <Badge className={active ? "bg-sb-orange/12 text-sb-orange border-sb-orange/22" : "bg-sb-cream-secondary text-sb-ink/55"}>
      {status}
    </Badge>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-center py-10 text-sb-ink/45 text-sm">{text}</p>;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-sb-orange" />
    </div>
  );
}

// ─── Simple Modal ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10">
          <h3 className="font-semibold text-sb-ink">{title}</h3>
          <button onClick={onClose} className="text-sb-ink/55 hover:text-sb-ink text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Homepage Tab ─────────────────────────────────────────────────────────────
type FeatureCardForm = {
  title: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  buttonText: string;
  buttonLink: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
};

const DEFAULT_INTRO_SECTION = {
  title: "Smart Construction Starts With Smarter Sourcing",
  tagline: "Built for Contractors, Backed by Brands.",
  body:
    "Structbay combines the reliability of branded materials, the power of affordable pricing, and the ease of single-window sourcing — everything you need to finish projects faster and better.",
};

const DEFAULT_FEATURE_CARDS: FeatureCardForm[] = [
  {
    title: "Genuine Products, Guaranteed",
    description:
      "All products are sourced directly from trusted manufacturers, ensuring authentic quality at competitive prices.",
    imageUrl: "",
    imagePublicId: "",
    buttonText: "Shop Now",
    buttonLink: "/shop",
    icon: "box",
    isActive: true,
    sortOrder: 0,
  },
  {
    title: "Unmatched Affordability",
    description:
      "Premium construction materials supplied at factory-direct rates, delivering exceptional quality at competitive prices.",
    imageUrl: "",
    imagePublicId: "",
    buttonText: "Shop Now",
    buttonLink: "/shop",
    icon: "lightbulb",
    isActive: true,
    sortOrder: 1,
  },
  {
    title: "A to Z Material Availability",
    description:
      "Complete range of construction essentials available in one place, ensuring convenience at competitive prices.",
    imageUrl: "",
    imagePublicId: "",
    buttonText: "Shop Now",
    buttonLink: "/shop",
    icon: "shapes",
    isActive: true,
    sortOrder: 2,
  },
];

function normalizeFeatureCards(raw: unknown): FeatureCardForm[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: FeatureCardForm[] = [];
  for (let i = 0; i < 3; i++) {
    const c = list[i] as Record<string, unknown> | undefined;
    const d = DEFAULT_FEATURE_CARDS[i];
    out.push({
      title: String(c?.title ?? d.title),
      description: String(c?.description ?? d.description),
      imageUrl: String(c?.imageUrl ?? ""),
      imagePublicId: String(c?.imagePublicId ?? ""),
      buttonText: String(c?.buttonText ?? d.buttonText),
      buttonLink: String(c?.buttonLink ?? d.buttonLink),
      icon: String(c?.icon ?? d.icon),
      isActive: c?.isActive !== false,
      sortOrder: Number(c?.sortOrder ?? i),
    });
  }
  return out;
}

function HomepageTab() {
  const defaultPromo = {
    enabled: true,
    topBarStyle: "center_banner" as "center_banner" | "marquee",
    topBarText: "",
    topBarBg: "#FDE047",
    topBarTextColor: "#171717",
    marqueeSegments: [] as string[],
    marqueeLinesText: "",
    modalEnabled: false,
    modalTitle: "",
    modalSubtitle: "",
    modalHeroImageUrl: "",
    modalHeroImagePublicId: "",
    modalBackgroundImageUrl: "",
    modalBackgroundImagePublicId: "",
    modalBadgeLeft: "Auto applied on checkout",
    modalBadgeRight: "Minimum order value ₹500",
    modalFooterNote: "Offer valid as per Structbay policy. T&C apply.",
    modalSuppressDays: 1,
  };

  const [form, setForm] = useState({
    heroTitle: "",
    heroSubtitle: "",
    heroCtaText: "",
    brandLogoUrl: "",
    heroBackgroundImageUrl: "",
    introSection: { ...DEFAULT_INTRO_SECTION },
    featureCards: DEFAULT_FEATURE_CARDS.map((c) => ({ ...c })),
    storefrontPromo: defaultPromo,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState<null | "hero" | "bg">(null);
  const [uploadingCard, setUploadingCard] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/cms/homepage")
      .then((d: any) => {
        const sp = { ...defaultPromo, ...(d.data.storefrontPromo || {}) } as typeof defaultPromo;
        const segs = Array.isArray(sp.marqueeSegments) ? sp.marqueeSegments : [];
        setForm({
          heroTitle: d.data.heroTitle || "",
          heroSubtitle: d.data.heroSubtitle || "",
          heroCtaText: d.data.heroCtaText || "",
          brandLogoUrl: d.data.brandLogoUrl || "",
          heroBackgroundImageUrl: d.data.heroBackgroundImageUrl || "",
          introSection: {
            ...DEFAULT_INTRO_SECTION,
            ...(d.data.introSection || {}),
          },
          featureCards: normalizeFeatureCards(d.data.featureCards),
          storefrontPromo: {
            ...sp,
            marqueeSegments: segs,
            marqueeLinesText: segs.join("\n"),
          },
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const uploadPromo = async (kind: "hero" | "bg", file: File) => {
    setUploading(kind);
    try {
      const up = await adminUploadImage("/upload/banner", file);
      setForm((f) => ({
        ...f,
        storefrontPromo: {
          ...f.storefrontPromo,
          ...(kind === "hero"
            ? { modalHeroImageUrl: up.url, modalHeroImagePublicId: up.publicId }
            : { modalBackgroundImageUrl: up.url, modalBackgroundImagePublicId: up.publicId }),
        },
      }));
    } finally {
      setUploading(null);
    }
  };

  const uploadFeatureCardImage = async (index: number, file: File) => {
    setUploadingCard(index);
    try {
      const up = await adminUploadImage("/upload/banner", file);
      setForm((f) => {
        const cards = [...f.featureCards];
        cards[index] = { ...cards[index], imageUrl: up.url, imagePublicId: up.publicId };
        return { ...f, featureCards: cards };
      });
    } finally {
      setUploadingCard(null);
    }
  };

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      const { marqueeLinesText, ...restPromo } = form.storefrontPromo;
      const marqueeSegments = String(marqueeLinesText || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        heroTitle: form.heroTitle,
        heroSubtitle: form.heroSubtitle,
        heroCtaText: form.heroCtaText,
        brandLogoUrl: form.brandLogoUrl,
        heroBackgroundImageUrl: form.heroBackgroundImageUrl,
        introSection: form.introSection,
        featureCards: form.featureCards,
        storefrontPromo: { ...restPromo, marqueeSegments },
      };
      await apiFetch("/cms/homepage", { method: "PUT", body: JSON.stringify(payload) });
      setMsg("Homepage & storefront promo updated.");
    } catch (e: any) { setMsg(`Error: ${e.message}`); }
    setSaving(false);
  };

  if (loading) return <Spinner />;

  const sp = form.storefrontPromo;

  return (
    <div className="space-y-8 max-w-3xl">
      <SectionHeader title="Hero Section" />
      <div className="space-y-3">
        <div>
          <label className="text-xs text-sb-ink/55 mb-1 block">Hero Title</label>
          <Input value={form.heroTitle} onChange={e => setForm(f => ({ ...f, heroTitle: e.target.value }))}
            placeholder="India's Largest Construction Marketplace" />
        </div>
        <div>
          <label className="text-xs text-sb-ink/55 mb-1 block">Hero Subtitle</label>
          <Textarea value={form.heroSubtitle} onChange={e => setForm(f => ({ ...f, heroSubtitle: e.target.value }))}
            rows={2} placeholder="Source materials, find vendors, manage projects — all in one place." />
        </div>
        <div>
          <label className="text-xs text-sb-ink/55 mb-1 block">CTA Button Text</label>
          <Input value={form.heroCtaText} onChange={e => setForm(f => ({ ...f, heroCtaText: e.target.value }))}
            placeholder="Start Procuring" />
        </div>
        <div>
          <label className="text-xs text-sb-ink/55 mb-1 block">Brand logo URL</label>
          <Input value={form.brandLogoUrl} onChange={e => setForm(f => ({ ...f, brandLogoUrl: e.target.value }))}
            placeholder="https://… (PNG/SVG recommended)" />
          <p className="text-[10px] text-sb-ink/45 mt-1">Used where the storefront reads CMS brand assets (customer header / marketing).</p>
        </div>
        <div>
          <label className="text-xs text-sb-ink/55 mb-1 block">Hero background image URL</label>
          <Input value={form.heroBackgroundImageUrl} onChange={e => setForm(f => ({ ...f, heroBackgroundImageUrl: e.target.value }))}
            placeholder="Optional full-width hero image" />
        </div>
      </div>

      <div className="border-t border-sb-ink/10 pt-6 space-y-4">
        <SectionHeader title="Intro & feature cards" />
        <p className="text-xs text-sb-ink/45 -mt-2">
          Text and images below the homepage banner — three feature cards with background image, title, description, and CTA.
        </p>

        <div>
          <label className="text-xs text-sb-ink/55 mb-1 block">Intro heading</label>
          <Input
            value={form.introSection.title}
            onChange={(e) => setForm((f) => ({ ...f, introSection: { ...f.introSection, title: e.target.value } }))}
            placeholder={DEFAULT_INTRO_SECTION.title}
          />
        </div>
        <div>
          <label className="text-xs text-sb-ink/55 mb-1 block">Intro tagline (orange line)</label>
          <Input
            value={form.introSection.tagline}
            onChange={(e) => setForm((f) => ({ ...f, introSection: { ...f.introSection, tagline: e.target.value } }))}
            placeholder={DEFAULT_INTRO_SECTION.tagline}
          />
        </div>
        <div>
          <label className="text-xs text-sb-ink/55 mb-1 block">Intro body paragraph</label>
          <Textarea
            rows={3}
            value={form.introSection.body}
            onChange={(e) => setForm((f) => ({ ...f, introSection: { ...f.introSection, body: e.target.value } }))}
            placeholder={DEFAULT_INTRO_SECTION.body}
          />
        </div>

        <div className="space-y-5 pt-2">
          {form.featureCards.map((card, index) => (
            <div key={index} className="rounded-xl border border-sb-ink/12 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-sb-ink">Card {index + 1}</p>
                <label className="flex items-center gap-2 text-xs text-sb-ink/60">
                  <input
                    type="checkbox"
                    checked={card.isActive}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((f) => {
                        const cards = [...f.featureCards];
                        cards[index] = { ...cards[index], isActive: checked };
                        return { ...f, featureCards: cards };
                      });
                    }}
                  />
                  Show on homepage
                </label>
              </div>

              {card.imageUrl ? (
                <img src={card.imageUrl} alt="" className="w-full max-h-36 object-cover rounded-lg border border-sb-ink/10" />
              ) : (
                <div className="h-28 rounded-lg border border-dashed border-sb-ink/15 bg-sb-cream-secondary/50 flex items-center justify-center text-xs text-sb-ink/45">
                  No background image — upload below
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploadingCard === index}
                  onClick={() => document.getElementById(`feature-card-file-${index}`)?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {uploadingCard === index ? "Uploading…" : "Upload image"}
                </Button>
                <input
                  id={`feature-card-file-${index}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void uploadFeatureCardImage(index, file);
                  }}
                />
                {card.imageUrl && (
                  <button
                    type="button"
                    className="text-xs text-red-600 underline"
                    onClick={() =>
                      setForm((f) => {
                        const cards = [...f.featureCards];
                        cards[index] = { ...cards[index], imageUrl: "", imagePublicId: "" };
                        return { ...f, featureCards: cards };
                      })
                    }
                  >
                    Remove image
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Title</label>
                  <Input
                    value={card.title}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => {
                        const cards = [...f.featureCards];
                        cards[index] = { ...cards[index], title: v };
                        return { ...f, featureCards: cards };
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Icon</label>
                  <select
                    className="w-full rounded-md border border-sb-ink/15 bg-white px-3 py-2 text-sm"
                    value={card.icon}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => {
                        const cards = [...f.featureCards];
                        cards[index] = { ...cards[index], icon: v };
                        return { ...f, featureCards: cards };
                      });
                    }}
                  >
                    <option value="box">Box (products)</option>
                    <option value="lightbulb">Lightbulb (affordability)</option>
                    <option value="shapes">Shapes (range)</option>
                    <option value="shield">Shield (quality)</option>
                    <option value="package">Package</option>
                    <option value="building">Building</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Description</label>
                <Textarea
                  rows={2}
                  value={card.description}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => {
                      const cards = [...f.featureCards];
                      cards[index] = { ...cards[index], description: v };
                      return { ...f, featureCards: cards };
                    });
                  }}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Button text</label>
                  <Input
                    value={card.buttonText}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => {
                        const cards = [...f.featureCards];
                        cards[index] = { ...cards[index], buttonText: v };
                        return { ...f, featureCards: cards };
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Button link</label>
                  <Input
                    value={card.buttonLink}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => {
                        const cards = [...f.featureCards];
                        cards[index] = { ...cards[index], buttonLink: v };
                        return { ...f, featureCards: cards };
                      });
                    }}
                    placeholder="/shop"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-sb-ink/10 pt-6 space-y-4">
        <SectionHeader title="Top bar & promotional popup" />
        <p className="text-xs text-sb-ink/45 -mt-2 mb-2">
          HomeRun-style yellow announcement strip + optional centered popup. Upload images for the popup hero (e.g. truck) and background illustration.
        </p>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sp.enabled !== false}
            onChange={(e) => setForm((f) => ({ ...f, storefrontPromo: { ...f.storefrontPromo, enabled: e.target.checked } }))}
          />
          Enable storefront promo (top bar / modal)
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-sb-ink/55 mb-1 block">Top bar style</label>
            <select
              className="w-full rounded-md border border-sb-ink/15 bg-white px-3 py-2 text-sm"
              value={sp.topBarStyle}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  storefrontPromo: { ...f.storefrontPromo, topBarStyle: e.target.value as "center_banner" | "marquee" },
                }))
              }
            >
              <option value="center_banner">Center banner (yellow strip — like reference)</option>
              <option value="marquee">Marquee only (no yellow strip unless text set)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-sb-ink/55 mb-1 block">Suppress popup again (days)</label>
            <Input
              type="number"
              min={0}
              max={90}
              value={sp.modalSuppressDays}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  storefrontPromo: { ...f.storefrontPromo, modalSuppressDays: Number(e.target.value) || 1 },
                }))
              }
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-sb-ink/55 mb-1 block">Top bar message (centered, when style = Center banner)</label>
          <Input
            placeholder='e.g. Free delivery on your first 3 orders above ₹500 🚀'
            value={sp.topBarText}
            onChange={(e) => setForm((f) => ({ ...f, storefrontPromo: { ...f.storefrontPromo, topBarText: e.target.value } }))}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-sb-ink/55 mb-1 block">Top bar background</label>
            <Input
              value={sp.topBarBg}
              onChange={(e) => setForm((f) => ({ ...f, storefrontPromo: { ...f.storefrontPromo, topBarBg: e.target.value } }))}
            />
          </div>
          <div>
            <label className="text-xs text-sb-ink/55 mb-1 block">Top bar text color</label>
            <Input
              value={sp.topBarTextColor}
              onChange={(e) => setForm((f) => ({ ...f, storefrontPromo: { ...f.storefrontPromo, topBarTextColor: e.target.value } }))}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-sb-ink/55 mb-1 block">Marquee lines (one per line, when banner is off or on mobile)</label>
          <Textarea
            rows={4}
            placeholder={"GST Invoice on Every Order\nStructbay Assured"}
            value={sp.marqueeLinesText}
            onChange={(e) =>
              setForm((f) => ({ ...f, storefrontPromo: { ...f.storefrontPromo, marqueeLinesText: e.target.value } }))
            }
          />
        </div>

        <div className="rounded-lg border border-sb-ink/10 bg-sb-cream-secondary/40 p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-sb-ink">
            <input
              type="checkbox"
              checked={!!sp.modalEnabled}
              onChange={(e) => setForm((f) => ({ ...f, storefrontPromo: { ...f.storefrontPromo, modalEnabled: e.target.checked } }))}
            />
            Show promotional popup on storefront
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Popup headline</label>
              <Input
                value={sp.modalTitle}
                onChange={(e) => setForm((f) => ({ ...f, storefrontPromo: { ...f.storefrontPromo, modalTitle: e.target.value } }))}
                placeholder="FREE DELIVERY"
              />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Popup subtitle</label>
              <Input
                value={sp.modalSubtitle}
                onChange={(e) => setForm((f) => ({ ...f, storefrontPromo: { ...f.storefrontPromo, modalSubtitle: e.target.value } }))}
                placeholder="on your first 3 orders!"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Hero image (upload)</label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading === "hero"}
                  onClick={() => document.getElementById("sb-promo-hero-file")?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" /> {uploading === "hero" ? "Uploading…" : "Upload"}
                </Button>
                <input
                  id="sb-promo-hero-file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void uploadPromo("hero", file);
                  }}
                />
                {sp.modalHeroImageUrl && (
                  <a href={sp.modalHeroImageUrl} target="_blank" rel="noreferrer" className="text-xs text-sb-orange underline truncate max-w-[200px]">
                    Preview
                  </a>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Background image (upload)</label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading === "bg"}
                  onClick={() => document.getElementById("sb-promo-bg-file")?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" /> {uploading === "bg" ? "Uploading…" : "Upload"}
                </Button>
                <input
                  id="sb-promo-bg-file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void uploadPromo("bg", file);
                  }}
                />
                {sp.modalBackgroundImageUrl && (
                  <a href={sp.modalBackgroundImageUrl} target="_blank" rel="noreferrer" className="text-xs text-sb-orange underline truncate max-w-[200px]">
                    Preview
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Badge left</label>
              <Input
                value={sp.modalBadgeLeft}
                onChange={(e) => setForm((f) => ({ ...f, storefrontPromo: { ...f.storefrontPromo, modalBadgeLeft: e.target.value } }))}
              />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Badge right</label>
              <Input
                value={sp.modalBadgeRight}
                onChange={(e) => setForm((f) => ({ ...f, storefrontPromo: { ...f.storefrontPromo, modalBadgeRight: e.target.value } }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-sb-ink/55 mb-1 block">Footer note (T&amp;C line)</label>
            <Input
              value={sp.modalFooterNote}
              onChange={(e) => setForm((f) => ({ ...f, storefrontPromo: { ...f.storefrontPromo, modalFooterNote: e.target.value } }))}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={save} disabled={saving} className="bg-sb-orange hover:bg-sb-orange-hover text-black">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save & Publish
        </Button>
        {msg && <span className="text-sm text-sb-orange">{msg}</span>}
      </div>
      <p className="text-xs text-sb-ink/45 pt-2">
        Changes auto-reflect on Customer Homepage, Vendor Homepage, and Public Website.
      </p>
    </div>
  );
}

// ─── Banners Tab ─────────────────────────────────────────────────────────────
const BANNER_IMAGE_MAX_BYTES = 15 * 1024 * 1024;

function BannersTab() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    buttonText: "",
    buttonLink: "#",
    displayOrder: 0,
    status: "ACTIVE",
    imageUrl: "",
    imagePublicId: "",
    titleColor: "",
    subtitleColor: "",
    backgroundColor: "",
    overlayOpacity: "" as string | number,
    textAlign: "right" as "left" | "center" | "right",
    clearImage: false,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/cms/banners?limit=50").then(d => { setBanners(d.data || []); setSelected({}); }).finally(() => setLoading(false));
  }, []);

  const bannerDelete = useAdminResourceDelete("/cms/banners", () => {
    setSelected({});
    load();
  });

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({
      title: "", subtitle: "", buttonText: "", buttonLink: "#", displayOrder: 0, status: "ACTIVE",
      imageUrl: "", imagePublicId: "", titleColor: "", subtitleColor: "", backgroundColor: "", overlayOpacity: "",
      textAlign: "right",
      clearImage: false,
    });
    setModal({ open: true, data: null });
  };
  const openEdit = (b: any) => {
    setForm({
      title: b.title ?? "",
      subtitle: b.subtitle ?? "",
      buttonText: b.buttonText ?? "",
      buttonLink: b.buttonLink || "#",
      displayOrder: b.displayOrder,
      status: b.status,
      imageUrl: b.image?.url || "",
      imagePublicId: b.image?.publicId || "",
      titleColor: b.titleColor || "",
      subtitleColor: b.subtitleColor || "",
      backgroundColor: b.backgroundColor || "",
      overlayOpacity: b.overlayOpacity != null ? b.overlayOpacity : "",
      textAlign: (["left", "center", "right"].includes(String(b.textAlign)) ? b.textAlign : "right") as "left" | "center" | "right",
      clearImage: false,
    });
    setModal({ open: true, data: b });
  };

  const save = async () => {
    setSaving(true);
    try {
      const isEdit = !!modal.data;
      const payload: Record<string, unknown> = {
        title: form.title?.trim() ?? "",
        subtitle: form.subtitle?.trim() ?? "",
        buttonText: form.buttonText?.trim() ?? "",
        buttonLink: form.buttonLink || "#",
        displayOrder: form.displayOrder,
        status: form.status,
      };

      const imageUrl =
        String(form.imageUrl || "").trim() ||
        (isEdit ? String(modal.data?.image?.url || "").trim() : "");
      const imagePublicId =
        String(form.imagePublicId || "").trim() ||
        (isEdit ? String(modal.data?.image?.publicId || "").trim() : "");

      if (form.clearImage) {
        payload.clearImage = true;
      } else if (imageUrl) {
        payload.imageUrl = imageUrl;
        if (imagePublicId) payload.imagePublicId = imagePublicId;
      }

      const tc = String(form.titleColor || "").trim();
      const sc = String(form.subtitleColor || "").trim();
      const bc = String(form.backgroundColor || "").trim();
      if (tc) payload.titleColor = tc;
      else if (isEdit) payload.titleColor = null;
      if (sc) payload.subtitleColor = sc;
      else if (isEdit) payload.subtitleColor = null;
      if (bc) payload.backgroundColor = bc;
      else if (isEdit) payload.backgroundColor = null;

      if (form.overlayOpacity === "" || form.overlayOpacity === undefined || form.overlayOpacity === null) {
        if (isEdit) payload.overlayOpacity = null;
      } else {
        payload.overlayOpacity = Math.min(100, Math.max(0, Number(form.overlayOpacity)));
      }

      const align = String(form.textAlign || "right");
      payload.textAlign = ["left", "center", "right"].includes(align) ? align : "right";

      if (isEdit) await apiFetch(`/cms/banners/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await apiFetch("/cms/banners", { method: "POST", body: JSON.stringify(payload) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const toggle = async (id: string) => {
    await apiFetch(`/cms/banners/${id}/toggle`, { method: "PATCH" }).catch(e => alert(e.message));
    load();
  };

  const remove = (id: string, title: string) => {
    bannerDelete.removeOne(id, title);
  };

  const selectedIds = banners.filter((b) => selected[String(b._id)]).map((b) => String(b._id));
  const allSelected = banners.length > 0 && selectedIds.length === banners.length;
  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    banners.forEach((b) => {
      next[String(b._id)] = true;
    });
    setSelected(next);
  };

  const onBannerImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > BANNER_IMAGE_MAX_BYTES) {
      alert("Image must be 15 MB or smaller.");
      return;
    }
    setUploadingImage(true);
    try {
      const up = await adminUploadImage("/upload/banner", file);
      setForm(f => ({
        ...f,
        imageUrl: up.url,
        imagePublicId: up.publicId || f.imagePublicId,
        clearImage: false,
      }));
      // When editing, persist image immediately (hero banner ≠ product gallery — must not be lost on close).
      if (modal.data?._id) {
        await apiFetch(`/cms/banners/${modal.data._id}`, {
          method: "PATCH",
          body: JSON.stringify({ imageUrl: up.url, imagePublicId: up.publicId || "" }),
        });
        setModal(m => ({
          ...m,
          data: m.data ? { ...m.data, image: { url: up.url, publicId: up.publicId || null } } : m.data,
        }));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const bannerPreviewImage =
    !form.clearImage && (form.imageUrl || modal.data?.image?.url)
      ? form.imageUrl || modal.data?.image?.url
      : "";
  const previewTitleColor = /^#[0-9A-Fa-f]{6}$/.test(String(form.titleColor)) ? form.titleColor : "#faf8f5";
  const previewSubColor = /^#[0-9A-Fa-f]{6}$/.test(String(form.subtitleColor)) ? form.subtitleColor : "#a8a29e";
  const previewBg = /^#[0-9A-Fa-f]{6}$/.test(String(form.backgroundColor)) ? form.backgroundColor : "#1e293b";

  return (
    <>
      <SectionHeader title="Hero Banners" onAdd={openCreate} addLabel="New Banner" />
      <p className="text-xs text-sb-ink/55 mb-4 -mt-2">
        Add multiple <strong className="font-semibold text-sb-ink/70">Active</strong> banners — the homepage hero auto-rotates every few seconds. Use <strong className="font-semibold text-sb-ink/70">Display order</strong> to control slide sequence.
      </p>
      <AdminBulkToolbar
        totalCount={banners.length}
        selectedCount={selectedIds.length}
        allSelected={allSelected}
        onToggleAll={toggleAll}
        onDeleteSelected={() =>
          bannerDelete.removeMany(selectedIds, `${selectedIds.length} banners`)
        }
        onDeleteAll={() =>
          bannerDelete.removeMany(
            banners.map((b) => String(b._id)),
            `all ${banners.length} banners`
          )
        }
        itemLabel="banners"
        disabled={bannerDelete.busy || loading}
      />
      {loading ? <Spinner /> : banners.length === 0 ? <EmptyState text="No banners yet. Create your first banner." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {banners.map(b => (
            <div key={b._id} className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3 gap-2">
                <label className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-sb-ink/25 accent-sb-orange"
                    checked={!!selected[String(b._id)]}
                    onChange={() =>
                      setSelected((s) => ({ ...s, [String(b._id)]: !s[String(b._id)] }))
                    }
                  />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sb-ink truncate">{b.title}</p>
                  {b.subtitle && <p className="text-xs text-sb-ink/55 mt-0.5 line-clamp-2">{b.subtitle}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {b.backgroundColor && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-sb-ink/15" title="Background">BG {b.backgroundColor}</span>
                )}
                {(b.titleColor || b.subtitleColor) && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-sb-ink/15" title="Text colors">Text colors</span>
                )}
              </div>
                </div>
                </label>
                <StatusBadge status={b.status} />
              </div>
              {b.image?.url && <img src={b.image.url} alt={b.title} className="w-full h-28 object-cover rounded-lg mb-3 bg-[#111]" />}
              <div className="flex items-center gap-2 text-xs text-sb-ink/50 mb-3">
                <span>Order: {b.displayOrder}</span>
                {b.buttonText && <span>· CTA: {b.buttonText}</span>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(b)}><Edit className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
                <Button variant="outline" size="sm" onClick={() => toggle(b._id)}>
                  {b.status === "ACTIVE" ? <ToggleRight className="h-3.5 w-3.5 text-sb-orange" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(b._id, b.title)} className="text-sb-ink/55 border-sb-ink/18 hover:bg-sb-cream-secondary">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminDeleteConfirmModal
        open={!!bannerDelete.pending}
        title={bannerDelete.modalTitle}
        description={bannerDelete.modalDescription}
        busy={bannerDelete.busy}
        onCancel={bannerDelete.cancelDelete}
        onConfirm={bannerDelete.confirm}
      />

      {modal.open && (
        <Modal title={modal.data ? "Edit Banner" : "Create Banner"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Title</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Optional — shown on the hero image" />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Sub-heading</label>
              <Textarea
                value={form.subtitle}
                onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                rows={3}
                placeholder="Shown below the main title on the homepage hero (e.g. tagline or offer)."
              />
              <p className="text-[10px] text-sb-ink/45 mt-1">Optional. Leave empty if you only want the title.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Background color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    aria-label="Pick background color"
                    className="h-9 w-12 rounded border border-sb-ink/15 cursor-pointer bg-sb-cream shrink-0"
                    value={/^#[0-9A-Fa-f]{6}$/.test(String(form.backgroundColor)) ? form.backgroundColor : "#1e293b"}
                    onChange={e => setForm(f => ({ ...f, backgroundColor: e.target.value }))}
                  />
                  <Input
                    className="flex-1 min-w-0"
                    value={form.backgroundColor}
                    onChange={e => setForm(f => ({ ...f, backgroundColor: e.target.value }))}
                    placeholder="#1e293b or leave empty for theme default"
                  />
                </div>
                <p className="text-[10px] text-sb-ink/45 mt-1">Used when there is no image, or as base behind the image.</p>
              </div>
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Image overlay strength</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.overlayOpacity === "" ? "" : form.overlayOpacity}
                  onChange={e => setForm(f => ({ ...f, overlayOpacity: e.target.value === "" ? "" : +e.target.value }))}
                  placeholder="e.g. 78 (default if empty)"
                />
                <p className="text-[10px] text-sb-ink/45 mt-1">0 = light overlay, 100 = very dark (readability on bright photos).</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Text alignment</label>
                <select
                  className="w-full rounded-md border border-sb-ink/15 bg-white px-3 py-2 text-sm"
                  value={form.textAlign}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      textAlign: e.target.value as "left" | "center" | "right",
                    }))
                  }
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right (default)</option>
                </select>
                <p className="text-[10px] text-sb-ink/45 mt-1">Position of title, subtitle, and buttons on the hero image.</p>
              </div>
              <div aria-hidden className="hidden sm:block" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Title color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    aria-label="Pick title color"
                    className="h-9 w-12 rounded border border-sb-ink/15 cursor-pointer bg-sb-cream shrink-0"
                    value={/^#[0-9A-Fa-f]{6}$/.test(String(form.titleColor)) ? form.titleColor : "#faf8f5"}
                    onChange={e => setForm(f => ({ ...f, titleColor: e.target.value }))}
                  />
                  <Input
                    className="flex-1 min-w-0"
                    value={form.titleColor}
                    onChange={e => setForm(f => ({ ...f, titleColor: e.target.value }))}
                    placeholder="Empty = default cream"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Sub-heading color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    aria-label="Pick sub-heading color"
                    className="h-9 w-12 rounded border border-sb-ink/15 cursor-pointer bg-sb-cream shrink-0"
                    value={/^#[0-9A-Fa-f]{6}$/.test(String(form.subtitleColor)) ? form.subtitleColor : "#a8a29e"}
                    onChange={e => setForm(f => ({ ...f, subtitleColor: e.target.value }))}
                  />
                  <Input
                    className="flex-1 min-w-0"
                    value={form.subtitleColor}
                    onChange={e => setForm(f => ({ ...f, subtitleColor: e.target.value }))}
                    placeholder="Empty = default muted"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Hero banner image</label>
              <p className="text-[10px] text-sb-ink/45 mb-2">
                Wide photo (16:9 or wider). JPEG, PNG, or WebP — max 15 MB. Uses <code className="text-sb-orange">/upload/banner</code> — separate from product images.
              </p>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-sb-ink/15 bg-sb-cream text-sm text-sb-ink cursor-pointer hover:border-sb-orange/50 transition-colors">
                  <Upload className="h-4 w-4 text-sb-orange" />
                  {uploadingImage ? "Uploading…" : "Upload hero image"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/jpg" className="hidden" disabled={uploadingImage} onChange={onBannerImagePick} />
                </label>
                {bannerPreviewImage && (
                  <span className="text-[10px] text-sb-orange/90">
                    {modal.data?._id ? "Image saved to banner." : "Image ready — click Update/Create to publish."}
                  </span>
                )}
                {bannerPreviewImage && (
                  <button
                    type="button"
                    className="text-[10px] text-sb-ink/55 hover:text-red-600 underline"
                    onClick={() => setForm(f => ({ ...f, imageUrl: "", imagePublicId: "", clearImage: true }))}
                  >
                    Remove image
                  </button>
                )}
              </div>
              {bannerPreviewImage && (
                <img src={bannerPreviewImage} alt="" className="w-full max-h-36 object-cover rounded-lg mb-2 border border-sb-ink/10" />
              )}
              <div
                className="rounded-lg overflow-hidden border border-sb-ink/10 mb-2 min-h-[88px] relative"
                style={{ backgroundColor: previewBg }}
              >
                {bannerPreviewImage && (
                  <img src={bannerPreviewImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
                <div
                  className={`relative p-4 ${
                    form.textAlign === "center"
                      ? "text-center"
                      : form.textAlign === "left"
                        ? "text-left"
                        : "text-right"
                  }`}
                >
                  {form.title?.trim() ? (
                    <p className="font-bold text-lg leading-tight" style={{ color: previewTitleColor }}>
                      {form.title.trim()}
                    </p>
                  ) : (
                    <p className="text-sm italic opacity-60" style={{ color: previewSubColor }}>
                      No title — only the image will show on the storefront
                    </p>
                  )}
                  {form.subtitle && (
                    <p className="text-sm mt-1" style={{ color: previewSubColor }}>{form.subtitle}</p>
                  )}
                </div>
              </div>
              <Input
                value={form.clearImage ? "" : form.imageUrl}
                onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value, clearImage: false }))}
                placeholder="Or paste image URL (https://…)"
              />
              <p className="text-[10px] text-sb-ink/45 mt-1">Upload is recommended. URL is optional if you uploaded.</p>
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Image public ID (optional)</label>
              <Input value={form.imagePublicId} onChange={e => setForm(f => ({ ...f, imagePublicId: e.target.value }))} placeholder="Filled automatically on upload" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-sb-ink/55 mb-1 block">Button Text</label>
                <Input value={form.buttonText} onChange={e => setForm(f => ({ ...f, buttonText: e.target.value }))} /></div>
              <div><label className="text-xs text-sb-ink/55 mb-1 block">Button Link</label>
                <Input value={form.buttonLink} onChange={e => setForm(f => ({ ...f, buttonLink: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-sb-ink/55 mb-1 block">Display Order</label>
                <Input type="number" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: +e.target.value }))} /></div>
              <div><label className="text-xs text-sb-ink/55 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-sb-cream border border-sb-ink/15 rounded-md px-3 py-2 text-sm text-sb-ink">
                  <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option>
                </select></div>
            </div>
            <div className="pt-2 flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-sb-orange hover:bg-sb-orange-hover text-black flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {modal.data ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Blogs Tab ────────────────────────────────────────────────────────────────
function BlogsTab() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState({ title: "", description: "", content: "", author: "Structbay Team", status: "DRAFT", isFeatured: false, tags: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/cms/blogs?limit=50").then(d => setBlogs(d.data || [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const blogDelete = useAdminResourceDelete("/cms/blogs", load);

  const openCreate = () => { setForm({ title: "", description: "", content: "", author: "Structbay Team", status: "DRAFT", isFeatured: false, tags: "" }); setModal({ open: true, data: null }); };
  const openEdit = (b: any) => { setForm({ title: b.title, description: b.description || "", content: b.content || "", author: b.author, status: b.status, isFeatured: b.isFeatured, tags: (b.tags || []).join(", ") }); setModal({ open: true, data: b }); };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) };
    try {
      if (modal.data) await apiFetch(`/cms/blogs/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await apiFetch("/cms/blogs", { method: "POST", body: JSON.stringify(payload) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const remove = (id: string, title: string) => {
    blogDelete.removeOne(id, title);
  };

  const statusColor = (s: string) => ({ PUBLISHED: "text-sb-orange", DRAFT: "text-sb-orange", SCHEDULED: "text-sb-ink", ARCHIVED: "text-sb-ink/45" }[s] || "");

  return (
    <>
      <SectionHeader title="Blog Posts" onAdd={openCreate} addLabel="New Blog" />
      {loading ? <Spinner /> : blogs.length === 0 ? <EmptyState text="No blog posts yet." /> : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {blogs.map(b => (
            <div key={b._id} className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <span className={`text-xs font-semibold ${statusColor(b.status)}`}>{b.status}</span>
                {b.isFeatured && (
                  <span className="inline-flex items-center gap-1 text-xs text-sb-orange font-medium">
                    <Star className="w-3 h-3 fill-sb-orange text-sb-orange shrink-0" aria-hidden />
                    Featured
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-sb-ink text-sm mb-1 line-clamp-2">{b.title}</h4>
              {b.description && <p className="text-xs text-sb-ink/55 line-clamp-2 flex-1">{b.description}</p>}
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => openEdit(b)} className="flex-1"><Edit className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
                <Button variant="outline" size="sm" onClick={() => remove(b._id, b.title)} className="text-sb-ink/55 border-sb-ink/18 hover:bg-sb-cream-secondary"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <Modal title={modal.data ? "Edit Blog" : "Create Blog"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div><label className="text-xs text-sb-ink/55 mb-1 block">Title *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><label className="text-xs text-sb-ink/55 mb-1 block">Description (Summary)</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div><label className="text-xs text-sb-ink/55 mb-1 block">Content (HTML)</label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-sb-ink/55 mb-1 block">Author</label>
                <Input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} /></div>
              <div><label className="text-xs text-sb-ink/55 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-sb-cream border border-sb-ink/15 rounded-md px-3 py-2 text-sm text-sb-ink">
                  {["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"].map(s => <option key={s} value={s}>{s}</option>)}
                </select></div>
            </div>
            <div><label className="text-xs text-sb-ink/55 mb-1 block">Tags (comma-separated)</label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="cement, construction, tips" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} id="featured" />
              <label htmlFor="featured" className="text-sm text-sb-ink/60">Featured Post</label>
            </div>
            <div className="pt-2 flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-sb-orange hover:bg-sb-orange-hover text-black flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {modal.data ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      <AdminDeleteConfirmModal
        open={!!blogDelete.pending}
        title={blogDelete.modalTitle}
        description={blogDelete.modalDescription}
        busy={blogDelete.busy}
        onCancel={blogDelete.cancelDelete}
        onConfirm={blogDelete.confirm}
      />
    </>
  );
}

// ─── Announcements Tab ────────────────────────────────────────────────────────
function AnnouncementsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    isPinned: false,
    status: "ACTIVE",
    startDate: "",
    endDate: "",
    imageUrl: "",
    imagePublicId: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/cms/announcements?limit=50").then(d => setItems(d.data || [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const announcementDelete = useAdminResourceDelete("/cms/announcements", load);

  const onAnnouncementImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingImage(true);
    try {
      const up = await adminUploadImage("/upload/banner", file);
      setForm(f => ({ ...f, imageUrl: up.url, imagePublicId: up.publicId || f.imagePublicId }));
    } catch (err: any) {
      alert(err?.message || "Image upload failed");
    }
    setUploadingImage(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { startDate, endDate, ...rest } = form;
      const bounds = localDayBoundsToISO(startDate, endDate);
      const payload: Record<string, unknown> = {
        ...rest,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
        imageUrl: form.imageUrl.trim() || null,
        imagePublicId: form.imagePublicId.trim() || null,
      };
      if (modal.data) await apiFetch(`/cms/announcements/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await apiFetch("/cms/announcements", { method: "POST", body: JSON.stringify(payload) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const remove = (id: string, title: string) => {
    announcementDelete.removeOne(id, title);
  };

  const priorityColor: Record<string, string> = { LOW: "text-sb-ink/50", MEDIUM: "text-sb-ink", HIGH: "text-sb-orange", URGENT: "text-sb-ink/55" };

  const emptyForm = () => ({
    title: "",
    description: "",
    priority: "MEDIUM",
    isPinned: false,
    status: "ACTIVE",
    startDate: "",
    endDate: "",
    imageUrl: "",
    imagePublicId: "",
  });

  return (
    <>
      <SectionHeader
        title="Announcements"
        onAdd={() => {
          setForm(emptyForm());
          setModal({ open: true, data: null });
        }}
        addLabel="New Announcement"
      />
      <p className="text-xs text-sb-ink/45 mb-4 leading-relaxed">
        Shown as a <strong className="text-sb-ink">centered popup</strong> on the public homepage while dates are in range. Customers who tap &quot;Got it&quot; won&apos;t see it again until the <strong className="text-sb-ink">next calendar day</strong> (so important notices can reappear daily during the campaign window).
      </p>
      {loading ? <Spinner /> : items.length === 0 ? <EmptyState text="No announcements." /> : (
        <div className="space-y-3">
          {items.map(a => (
            <div key={a._id} className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex gap-3 min-w-0 flex-1">
                {a.image?.url && (
                  <img src={a.image.url} alt="" className="w-14 h-14 rounded-lg object-cover border border-sb-ink/10 shrink-0 bg-[#111]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {a.isPinned && (
                      <span className="inline-flex items-center text-sb-orange" title="Pinned">
                        <Pin className="w-3.5 h-3.5" aria-hidden />
                      </span>
                    )}
                    <span className={`text-xs font-bold ${priorityColor[a.priority]}`}>{a.priority}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="font-semibold text-sb-ink text-sm">{a.title}</p>
                  {a.description && <p className="text-xs text-sb-ink/55 mt-0.5 truncate">{a.description}</p>}
                  <p className="text-[10px] text-sb-ink/45 mt-1">
                    {(a.startDate || a.endDate) ? (
                      <>
                        {a.startDate ? `From ${isoToDateInput(a.startDate)}` : "No start"}
                        {" · "}
                        {a.endDate ? `To ${isoToDateInput(a.endDate)}` : "No end"}
                      </>
                    ) : (
                      "No date window (always eligible while ACTIVE)"
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setForm({
                      title: a.title,
                      description: a.description || "",
                      priority: a.priority,
                      isPinned: !!a.isPinned,
                      status: a.status,
                      startDate: isoToDateInput(a.startDate),
                      endDate: isoToDateInput(a.endDate),
                      imageUrl: a.image?.url || "",
                      imagePublicId: a.image?.publicId || "",
                    });
                    setModal({ open: true, data: a });
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(a._id, a.title)} className="text-sb-ink/55 border-sb-ink/18 hover:bg-sb-cream-secondary"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal.open && (
        <Modal title={modal.data ? "Edit Announcement" : "Create Announcement"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div><label className="text-xs text-sb-ink/55 mb-1 block">Title *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><label className="text-xs text-sb-ink/55 mb-1 block">Description</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>

            <div className="rounded-lg border border-dashed border-sb-ink/20 bg-sb-cream/80 p-3 space-y-2">
              <p className="text-xs font-semibold text-sb-ink">Popup image (optional)</p>
              <p className="text-[11px] text-sb-ink/50 leading-relaxed">
                Upload a wide or square visual — it appears inside the homepage popup above the text, similar to express-delivery promos.
              </p>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-sb-ink/15 bg-sb-cream text-sm cursor-pointer hover:bg-sb-cream-secondary">
                <Upload className="h-3.5 w-3.5" />
                {uploadingImage ? "Uploading…" : "Upload image"}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={e => void onAnnouncementImagePick(e)} />
              </label>
              <Input
                value={form.imageUrl}
                onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="Or paste image URL"
                className="text-xs"
              />
              {form.imageUrl && (
                <img src={form.imageUrl} alt="" className="w-full max-h-40 object-contain rounded-lg border border-sb-ink/10 bg-[#111]" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Show from (date)</label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Show until (date)</label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <p className="text-[11px] text-sb-ink/45 -mt-1">
              Leave both empty for no date filter. Within this window the popup can appear again each day after the customer dismisses it.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-sb-ink/55 mb-1 block">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full bg-sb-cream border border-sb-ink/15 rounded-md px-3 py-2 text-sm text-sb-ink">
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map(p => <option key={p} value={p}>{p}</option>)}
                </select></div>
              <div><label className="text-xs text-sb-ink/55 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-sb-cream border border-sb-ink/15 rounded-md px-3 py-2 text-sm text-sb-ink">
                  <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option>
                </select></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} id="pinned" />
              <label htmlFor="pinned" className="text-sm text-sb-ink/60">Pin Announcement</label>
            </div>
            <div className="pt-2 flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-sb-orange hover:bg-sb-orange-hover text-black flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {modal.data ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      <AdminDeleteConfirmModal
        open={!!announcementDelete.pending}
        title={announcementDelete.modalTitle}
        description={announcementDelete.modalDescription}
        busy={announcementDelete.busy}
        onCancel={announcementDelete.cancelDelete}
        onConfirm={announcementDelete.confirm}
      />
    </>
  );
}

// ─── Testimonials Tab ─────────────────────────────────────────────────────────
function TestimonialsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState({ customerName: "", designation: "", company: "", review: "", rating: 5, isFeatured: false, status: "ACTIVE" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/cms/testimonials?limit=50").then(d => setItems(d.data || [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const testimonialDelete = useAdminResourceDelete("/cms/testimonials", load);

  const save = async () => {
    setSaving(true);
    try {
      if (modal.data) await apiFetch(`/cms/testimonials/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(form) });
      else await apiFetch("/cms/testimonials", { method: "POST", body: JSON.stringify(form) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const remove = (id: string, name: string) => {
    testimonialDelete.removeOne(id, name);
  };

  return (
    <>
      <SectionHeader title="Testimonials" onAdd={() => { setForm({ customerName: "", designation: "", company: "", review: "", rating: 5, isFeatured: false, status: "ACTIVE" }); setModal({ open: true, data: null }); }} addLabel="Add Testimonial" />
      {loading ? <Spinner /> : items.length === 0 ? <EmptyState text="No testimonials yet." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(t => (
            <div key={t._id} className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sb-ink text-sm">{t.customerName}</p>
                  {t.designation && <p className="text-xs text-sb-ink/55">{t.designation}{t.company ? `, ${t.company}` : ""}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  {t.isFeatured && (
                    <span className="inline-flex items-center text-sb-orange" title="Featured">
                      <Star className="w-3.5 h-3.5 fill-sb-orange text-sb-orange" aria-hidden />
                    </span>
                  )}
                  <StatusBadge status={t.status} />
                </div>
              </div>
              <p className="text-sm text-sb-ink/70 line-clamp-3 mb-2">"{t.review}"</p>
              <RatingStarsRow rating={t.rating} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setForm({ customerName: t.customerName, designation: t.designation || "", company: t.company || "", review: t.review, rating: t.rating, isFeatured: t.isFeatured, status: t.status }); setModal({ open: true, data: t }); }}><Edit className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
                <Button variant="outline" size="sm" onClick={() => remove(t._id, t.customerName)} className="text-sb-ink/55 border-sb-ink/18 hover:bg-sb-cream-secondary"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal.open && (
        <Modal title={modal.data ? "Edit Testimonial" : "Add Testimonial"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div><label className="text-xs text-sb-ink/55 mb-1 block">Customer Name *</label>
              <Input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-sb-ink/55 mb-1 block">Designation</label>
                <Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} /></div>
              <div><label className="text-xs text-sb-ink/55 mb-1 block">Company</label>
                <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs text-sb-ink/55 mb-1 block">Review *</label>
              <Textarea value={form.review} onChange={e => setForm(f => ({ ...f, review: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-sb-ink/55 mb-1 block">Rating (1–5)</label>
                <Input type="number" min={1} max={5} value={form.rating} onChange={e => setForm(f => ({ ...f, rating: +e.target.value }))} /></div>
              <div><label className="text-xs text-sb-ink/55 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-sb-cream border border-sb-ink/15 rounded-md px-3 py-2 text-sm text-sb-ink">
                  <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option>
                </select></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} id="tfeatured" />
              <label htmlFor="tfeatured" className="text-sm text-sb-ink/60">Featured Testimonial</label>
            </div>
            <div className="pt-2 flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-sb-orange hover:bg-sb-orange-hover text-black flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {modal.data ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      <AdminDeleteConfirmModal
        open={!!testimonialDelete.pending}
        title={testimonialDelete.modalTitle}
        description={testimonialDelete.modalDescription}
        busy={testimonialDelete.busy}
        onCancel={testimonialDelete.cancelDelete}
        onConfirm={testimonialDelete.confirm}
      />
    </>
  );
}

// ─── SEO Tab ──────────────────────────────────────────────────────────────────
function SEOTab() {
  const PAGES = ["home", "about", "contact", "blog", "categories", "shop"];
  const [selected, setSelected] = useState("home");
  const [form, setForm] = useState({ metaTitle: "", metaDescription: "", keywords: "", ogTitle: "", ogDescription: "", canonicalUrl: "", robotsDirective: "index,follow" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback((page: string) => {
    setLoading(true);
    apiFetch(`/cms/seo?page=${page}`)
      .then(d => {
        const entry = (d.data || []).find((s: any) => s.page === page);
        setForm({
          metaTitle: entry?.metaTitle || "",
          metaDescription: entry?.metaDescription || "",
          keywords: (entry?.keywords || []).join(", "),
          ogTitle: entry?.ogTitle || "",
          ogDescription: entry?.ogDescription || "",
          canonicalUrl: entry?.canonicalUrl || "",
          robotsDirective: entry?.robotsDirective || "index,follow",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(selected); }, [selected, load]);

  const save = async () => {
    setSaving(true); setMsg("");
    const payload = { page: selected, ...form, keywords: form.keywords.split(",").map((k: string) => k.trim()).filter(Boolean) };
    try {
      await apiFetch("/cms/seo", { method: "POST", body: JSON.stringify(payload) });
      setMsg(`SEO saved for "${selected}"`);
    } catch (e: any) { setMsg(`Error: ${e.message}`); }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl">
      <SectionHeader title="SEO Management" />
      <div className="flex flex-wrap gap-2 mb-5">
        {PAGES.map(p => (
          <button key={p} onClick={() => setSelected(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selected === p ? "bg-sb-orange text-black" : "bg-sb-cream-secondary border border-sb-ink/10 text-sb-ink/60 hover:border-sb-orange/50"}`}>
            {p}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <div className="space-y-3">
          <div><label className="text-xs text-sb-ink/55 mb-1 block">Meta Title</label>
            <Input value={form.metaTitle} onChange={e => setForm(f => ({ ...f, metaTitle: e.target.value }))} /></div>
          <div><label className="text-xs text-sb-ink/55 mb-1 block">Meta Description</label>
            <Textarea value={form.metaDescription} onChange={e => setForm(f => ({ ...f, metaDescription: e.target.value }))} rows={2} /></div>
          <div><label className="text-xs text-sb-ink/55 mb-1 block">Keywords (comma-separated)</label>
            <Input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="construction, cement, steel" /></div>
          <div><label className="text-xs text-sb-ink/55 mb-1 block">OG Title</label>
            <Input value={form.ogTitle} onChange={e => setForm(f => ({ ...f, ogTitle: e.target.value }))} /></div>
          <div><label className="text-xs text-sb-ink/55 mb-1 block">OG Description</label>
            <Textarea value={form.ogDescription} onChange={e => setForm(f => ({ ...f, ogDescription: e.target.value }))} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-sb-ink/55 mb-1 block">Canonical URL</label>
              <Input value={form.canonicalUrl} onChange={e => setForm(f => ({ ...f, canonicalUrl: e.target.value }))} placeholder="https://structbay.com/" /></div>
            <div><label className="text-xs text-sb-ink/55 mb-1 block">Robots</label>
              <select value={form.robotsDirective} onChange={e => setForm(f => ({ ...f, robotsDirective: e.target.value }))}
                className="w-full bg-sb-cream border border-sb-ink/15 rounded-md px-3 py-2 text-sm text-sb-ink">
                {["index,follow", "noindex,nofollow", "index,nofollow", "noindex,follow"].map(r => <option key={r} value={r}>{r}</option>)}
              </select></div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={save} disabled={saving} className="bg-sb-orange hover:bg-sb-orange-hover text-black">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save SEO
            </Button>
            {msg && <span className="text-sm text-sb-orange">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contact Tab ──────────────────────────────────────────────────────────────
function ContactTab() {
  const [form, setForm] = useState({ phone: "", email: "", supportEmail: "", address: "", whatsapp: "", mapLink: "", workingHours: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    apiFetch("/cms/contact").then(d => setForm({ phone: d.data.phone || "", email: d.data.email || "", supportEmail: d.data.supportEmail || "", address: d.data.address || "", whatsapp: d.data.whatsapp || "", mapLink: d.data.mapLink || "", workingHours: d.data.workingHours || "" })).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    try { await apiFetch("/cms/contact", { method: "PUT", body: JSON.stringify(form) }); setMsg("Contact info updated."); }
    catch (e: any) { setMsg(`Error: ${e.message}`); }
    setSaving(false);
  };

  if (loading) return <Spinner />;

  return (
    <div className="max-w-xl">
      <SectionHeader title="Contact Information" />
      <div className="space-y-3">
        {[
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "supportEmail", label: "Support Email" },
          { key: "whatsapp", label: "WhatsApp" },
          { key: "address", label: "Address" },
          { key: "mapLink", label: "Google Maps Link" },
          { key: "workingHours", label: "Working Hours" },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs text-sb-ink/55 mb-1 block">{label}</label>
            <Input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
          </div>
        ))}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={save} disabled={saving} className="bg-sb-orange hover:bg-sb-orange-hover text-black">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
          {msg && <span className="text-sm text-sb-orange">{msg}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Ads Tab ──────────────────────────────────────────────────────────────────
function AdsTab() {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState({
    title: "",
    imageUrl: "",
    imagePublicId: "",
    link: "#",
    placement: "HOME_TOP",
    status: "ACTIVE",
    startDate: "",
    endDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/cms/ads?limit=50").then(d => setAds(d.data || [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const adDelete = useAdminResourceDelete("/cms/ads", load);

  const onAdImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingImage(true);
    try {
      const up = await adminUploadImage("/upload/banner", file);
      setForm(f => ({ ...f, imageUrl: up.url, imagePublicId: up.publicId || f.imagePublicId }));
    } catch (err: any) {
      alert(err?.message || "Image upload failed");
    }
    setUploadingImage(false);
  };

  const save = async () => {
    if (!form.imageUrl?.trim()) {
      alert("Please upload an image or paste an image URL.");
      return;
    }
    setSaving(true);
    try {
      const { startDate, endDate, ...rest } = form;
      const bounds = localDayBoundsToISO(startDate, endDate);
      const payload = {
        ...rest,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
        imageUrl: form.imageUrl.trim(),
        imagePublicId: form.imagePublicId.trim() || undefined,
      };
      if (modal.data) await apiFetch(`/cms/ads/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await apiFetch("/cms/ads", { method: "POST", body: JSON.stringify(payload) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const remove = (id: string, title: string) => {
    adDelete.removeOne(id, title || "ad");
  };

  const emptyAdForm = () => ({
    title: "",
    imageUrl: "",
    imagePublicId: "",
    link: "#",
    placement: "HOME_TOP",
    status: "ACTIVE",
    startDate: "",
    endDate: "",
  });

  return (
    <>
      <SectionHeader title="Advertisements" onAdd={() => { setForm(emptyAdForm()); setModal({ open: true, data: null }); }} addLabel="New Ad" />
      <p className="text-xs text-sb-ink/45 mb-4 leading-relaxed">
        Banner-style placements on the storefront. Use <strong className="text-sb-ink">upload</strong> for a crisp creative (same flow as homepage popup assets). Optional <strong className="text-sb-ink">run dates</strong> hide the ad outside the window.
      </p>
      {loading ? <Spinner /> : ads.length === 0 ? <EmptyState text="No advertisements." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {ads.map(a => (
            <div key={a._id} className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-sb-ink text-sm truncate flex-1 mr-2">{a.title}</p>
                <StatusBadge status={a.status} />
              </div>
              {a.image?.url && <img src={a.image.url} alt={a.title} className="w-full h-20 object-cover rounded-lg mb-2 bg-[#111]" />}
              <div className="flex items-center flex-wrap gap-3 text-xs text-sb-ink/50 mb-1">
                <span className="bg-sb-orange/15 text-sb-orange px-2 py-0.5 rounded">{a.placement}</span>
                {(a.startDate || a.endDate) && (
                  <span className="text-[10px]">
                    {a.startDate ? isoToDateInput(a.startDate) : "…"} → {a.endDate ? isoToDateInput(a.endDate) : "…"}
                  </span>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-3 text-xs text-sb-ink/50 mb-3">
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 shrink-0 text-sb-ink/45" aria-hidden />
                  {a.impressions}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MousePointerClick className="w-3.5 h-3.5 shrink-0 text-sb-ink/45" aria-hidden />
                  {a.clicks}
                </span>
                {a.impressions > 0 && <span>CTR: {a.ctr}%</span>}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setForm({
                      title: a.title,
                      imageUrl: a.image?.url || "",
                      imagePublicId: a.image?.publicId || "",
                      link: a.link || "#",
                      placement: a.placement,
                      status: a.status,
                      startDate: isoToDateInput(a.startDate),
                      endDate: isoToDateInput(a.endDate),
                    });
                    setModal({ open: true, data: a });
                  }}
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" />Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(a._id, a.title)} className="text-sb-ink/55 border-sb-ink/18 hover:bg-sb-cream-secondary"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal.open && (
        <Modal title={modal.data ? "Edit Ad" : "Create Ad"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div><label className="text-xs text-sb-ink/55 mb-1 block">Title *</label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>

            <div className="rounded-lg border border-dashed border-sb-ink/20 bg-sb-cream/80 p-3 space-y-2">
              <p className="text-xs font-semibold text-sb-ink">Creative image *</p>
              <p className="text-[11px] text-sb-ink/50 leading-relaxed">
                Upload a banner image (recommended wide ratio). This is the same image pipeline used for homepage popup-style graphics.
              </p>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-sb-ink/15 bg-sb-cream text-sm cursor-pointer hover:bg-sb-cream-secondary">
                <Upload className="h-3.5 w-3.5" />
                {uploadingImage ? "Uploading…" : "Upload image"}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={e => void onAdImagePick(e)} />
              </label>
              <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="Or paste image URL (https://…)" />
              {form.imageUrl && (
                <img src={form.imageUrl} alt="" className="w-full max-h-36 object-cover rounded-lg border border-sb-ink/10 bg-[#111]" />
              )}
            </div>

            <div><label className="text-xs text-sb-ink/55 mb-1 block">Link</label><Input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} /></div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Run from (date)</label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Run until (date)</label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-sb-ink/55 mb-1 block">Placement</label>
                <select value={form.placement} onChange={e => setForm(f => ({ ...f, placement: e.target.value }))}
                  className="w-full bg-sb-cream border border-sb-ink/15 rounded-md px-3 py-2 text-sm text-sb-ink">
                  {["HOME_TOP", "HOME_MID", "HOME_BOTTOM", "SIDEBAR", "CATEGORY_PAGE", "SEARCH_PAGE"].map(p => <option key={p} value={p}>{p}</option>)}
                </select></div>
              <div><label className="text-xs text-sb-ink/55 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-sb-cream border border-sb-ink/15 rounded-md px-3 py-2 text-sm text-sb-ink">
                  <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option>
                </select></div>
            </div>
            <div className="pt-2 flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-sb-orange hover:bg-sb-orange-hover text-black flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {modal.data ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      <AdminDeleteConfirmModal
        open={!!adDelete.pending}
        title={adDelete.modalTitle}
        description={adDelete.modalDescription}
        busy={adDelete.busy}
        onCancel={adDelete.cancelDelete}
        onConfirm={adDelete.confirm}
      />
    </>
  );
}

// ─── Footer & Policies Tab ────────────────────────────────────────────────────
type PolicySectionForm = { title: string; bodyText: string };

function sectionsToForm(sections: any[]): PolicySectionForm[] {
  if (!Array.isArray(sections) || !sections.length) {
    return [{ title: "", bodyText: "" }];
  }
  return sections.map((s) => ({
    title: s.title || "",
    bodyText: Array.isArray(s.body) ? s.body.join("\n") : "",
  }));
}

function sectionsFromForm(sections: PolicySectionForm[]) {
  return sections
    .map((s) => ({
      title: s.title.trim(),
      body: s.bodyText.split("\n").map((l) => l.trim()).filter(Boolean),
    }))
    .filter((s) => s.title);
}

function FooterTab() {
  const [footer, setFooter] = useState({
    companyDescription: "",
    address: "",
    phone: "",
    email: "",
    newsletterText: "",
    copyrightText: "",
  });
  const [quickLinks, setQuickLinks] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [footerMsg, setFooterMsg] = useState("");
  const [savingFooter, setSavingFooter] = useState(false);

  const [linkModal, setLinkModal] = useState<{ open: boolean; data: any | null }>({ open: false, data: null });
  const [linkForm, setLinkForm] = useState({ label: "", href: "", sortOrder: 0 });
  const [savingLink, setSavingLink] = useState(false);

  const [policyModal, setPolicyModal] = useState<{ open: boolean; data: any | null }>({ open: false, data: null });
  const [policyForm, setPolicyForm] = useState({
    slug: "",
    title: "",
    subtitle: "",
    lastUpdated: "",
    sortOrder: 0,
    isActive: true,
    sections: [{ title: "", bodyText: "" }] as PolicySectionForm[],
  });
  const [savingPolicy, setSavingPolicy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/cms/footer"),
      apiFetch("/cms/policies/all"),
    ])
      .then(([footerRes, policiesRes]) => {
        const f = footerRes.data || {};
        setFooter({
          companyDescription: f.companyDescription || "",
          address: f.address || "",
          phone: f.phone || "",
          email: f.email || "",
          newsletterText: f.newsletterText || "",
          copyrightText: f.copyrightText || "",
        });
        setQuickLinks(Array.isArray(f.quickLinks) ? f.quickLinks : []);
        setPolicies(Array.isArray(policiesRes.data) ? policiesRes.data : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const quickLinkDelete = useAdminResourceDelete("/cms/footer/quick-links", load);
  const policyDelete = useAdminResourceDelete("/cms/policies", load);

  const saveFooter = async () => {
    setSavingFooter(true);
    setFooterMsg("");
    try {
      await apiFetch("/cms/footer", { method: "PATCH", body: JSON.stringify(footer) });
      setFooterMsg("Footer details saved.");
    } catch (e: any) {
      setFooterMsg(`Error: ${e.message}`);
    }
    setSavingFooter(false);
  };

  const saveQuickLink = async () => {
    if (!linkForm.label.trim() || !linkForm.href.trim()) return;
    setSavingLink(true);
    try {
      if (linkModal.data?._id) {
        await apiFetch(`/cms/footer/quick-links/${linkModal.data._id}`, {
          method: "PATCH",
          body: JSON.stringify(linkForm),
        });
      } else {
        await apiFetch("/cms/footer/quick-links", {
          method: "POST",
          body: JSON.stringify(linkForm),
        });
      }
      setLinkModal({ open: false, data: null });
      load();
    } catch (e: any) {
      alert(e.message || "Failed to save quick link");
    }
    setSavingLink(false);
  };

  const deleteQuickLink = (id: string, label: string) => {
    quickLinkDelete.removeOne(id, label);
  };

  const savePolicy = async () => {
    if (!policyForm.slug.trim() || !policyForm.title.trim()) return;
    setSavingPolicy(true);
    const payload = {
      slug: policyForm.slug.trim().toLowerCase(),
      title: policyForm.title.trim(),
      subtitle: policyForm.subtitle.trim(),
      lastUpdated: policyForm.lastUpdated.trim(),
      sortOrder: Number(policyForm.sortOrder) || 0,
      isActive: policyForm.isActive,
      sections: sectionsFromForm(policyForm.sections),
    };
    try {
      if (policyModal.data?._id) {
        await apiFetch(`/cms/policies/${policyModal.data._id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/cms/policies", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setPolicyModal({ open: false, data: null });
      load();
    } catch (e: any) {
      alert(e.message || "Failed to save policy");
    }
    setSavingPolicy(false);
  };

  const deletePolicy = (id: string, title: string) => {
    policyDelete.removeOne(id, title);
  };

  const openPolicyEditor = (p: any | null) => {
    if (p) {
      setPolicyForm({
        slug: p.slug || "",
        title: p.title || "",
        subtitle: p.subtitle || "",
        lastUpdated: p.lastUpdated || "",
        sortOrder: Number(p.sortOrder) || 0,
        isActive: p.isActive !== false,
        sections: sectionsToForm(p.sections),
      });
      setPolicyModal({ open: true, data: p });
    } else {
      setPolicyForm({
        slug: "",
        title: "",
        subtitle: "",
        lastUpdated: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
        sortOrder: policies.length,
        isActive: true,
        sections: [{ title: "", bodyText: "" }],
      });
      setPolicyModal({ open: true, data: null });
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <SectionHeader title="Footer details" />
        <p className="text-xs text-sb-ink/45 mb-4 leading-relaxed">
          Company blurb, contact lines, and copyright shown in the storefront footer.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-sb-ink/55 mb-1 block">Company description</label>
            <Textarea
              rows={3}
              value={footer.companyDescription}
              onChange={(e) => setFooter((f) => ({ ...f, companyDescription: e.target.value }))}
            />
          </div>
          {[
            { key: "address", label: "Address" },
            { key: "phone", label: "Phone" },
            { key: "email", label: "Email" },
            { key: "newsletterText", label: "Newsletter text" },
            { key: "copyrightText", label: "Copyright line" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-sb-ink/55 mb-1 block">{label}</label>
              <Input
                value={(footer as any)[key]}
                onChange={(e) => setFooter((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={saveFooter} disabled={savingFooter} className="bg-sb-orange hover:bg-sb-orange-hover text-black">
              {savingFooter ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save footer
            </Button>
            {footerMsg && <span className="text-sm text-sb-orange">{footerMsg}</span>}
          </div>
        </div>
      </div>

      <div>
        <SectionHeader
          title="Quick links"
          onAdd={() => {
            setLinkForm({ label: "", href: "/", sortOrder: quickLinks.length });
            setLinkModal({ open: true, data: null });
          }}
          addLabel="Add link"
        />
        <p className="text-xs text-sb-ink/45 mb-4">
          Links in the footer Quick Links column. Use paths like <code className="text-sb-ink/70">/privacy</code> or <code className="text-sb-ink/70">/policy/your-slug</code>.
        </p>
        {quickLinks.length === 0 ? (
          <EmptyState text="No quick links yet." />
        ) : (
          <div className="space-y-2">
            {quickLinks.map((link) => (
              <div key={link._id} className="flex items-center gap-3 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-sb-ink truncate">{link.label}</p>
                  <p className="text-xs text-sb-ink/50 truncate">{link.href}</p>
                </div>
                <span className="text-[10px] text-sb-ink/40 shrink-0">#{link.sortOrder}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLinkForm({
                      label: link.label || "",
                      href: link.href || "",
                      sortOrder: Number(link.sortOrder) || 0,
                    });
                    setLinkModal({ open: true, data: link });
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sb-ink/55 border-sb-ink/18"
                  onClick={() => deleteQuickLink(link._id, link.label || "quick link")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionHeader title="Policy pages" onAdd={() => openPolicyEditor(null)} addLabel="Add policy" />
        <p className="text-xs text-sb-ink/45 mb-4">
          Legal / policy content for footer links. Edits appear on the storefront immediately. Slug <code className="text-sb-ink/70">privacy</code> maps to <code className="text-sb-ink/70">/privacy</code>; custom slugs use <code className="text-sb-ink/70">/policy/slug</code>.
        </p>
        {policies.length === 0 ? (
          <EmptyState text="No policies yet." />
        ) : (
          <div className="space-y-2">
            {policies.map((p) => (
              <div key={p._id} className="flex items-start gap-3 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-sb-ink">{p.title}</p>
                    <Badge className={p.isActive !== false ? "bg-sb-orange/12 text-sb-orange" : "bg-sb-cream-secondary text-sb-ink/55"}>
                      {p.isActive !== false ? "Active" : "Hidden"}
                    </Badge>
                  </div>
                  <p className="text-xs text-sb-ink/50 mt-0.5">/{p.slug} · {(p.sections || []).length} section(s)</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openPolicyEditor(p)}>
                  <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sb-ink/55 border-sb-ink/18"
                  onClick={() => deletePolicy(p._id, p.title)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {linkModal.open && (
        <Modal title={linkModal.data ? "Edit quick link" : "Add quick link"} onClose={() => setLinkModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Label *</label>
              <Input value={linkForm.label} onChange={(e) => setLinkForm((f) => ({ ...f, label: e.target.value }))} placeholder="Privacy Policy" />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">URL path *</label>
              <Input value={linkForm.href} onChange={(e) => setLinkForm((f) => ({ ...f, href: e.target.value }))} placeholder="/privacy" />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Sort order</label>
              <Input type="number" value={linkForm.sortOrder} onChange={(e) => setLinkForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveQuickLink} disabled={savingLink} className="bg-sb-orange hover:bg-sb-orange-hover text-black flex-1">
                {savingLink ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
              <Button variant="outline" onClick={() => setLinkModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {policyModal.open && (
        <Modal title={policyModal.data ? "Edit policy" : "Create policy"} onClose={() => setPolicyModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Slug *</label>
                <Input
                  value={policyForm.slug}
                  onChange={(e) => setPolicyForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  placeholder="privacy"
                  disabled={!!policyModal.data}
                />
              </div>
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Sort order</label>
                <Input type="number" value={policyForm.sortOrder} onChange={(e) => setPolicyForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Title *</label>
              <Input value={policyForm.title} onChange={(e) => setPolicyForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Subtitle</label>
              <Input value={policyForm.subtitle} onChange={(e) => setPolicyForm((f) => ({ ...f, subtitle: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Last updated (display text)</label>
              <Input value={policyForm.lastUpdated} onChange={(e) => setPolicyForm((f) => ({ ...f, lastUpdated: e.target.value }))} placeholder="17 June 2026" />
            </div>
            <label className="flex items-center gap-2 text-sm text-sb-ink">
              <input
                type="checkbox"
                checked={policyForm.isActive}
                onChange={(e) => setPolicyForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Visible on storefront
            </label>

            <div className="border-t border-sb-ink/10 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-sb-ink/55">Sections</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPolicyForm((f) => ({ ...f, sections: [...f.sections, { title: "", bodyText: "" }] }))}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add section
                </Button>
              </div>
              {policyForm.sections.map((sec, idx) => (
                <div key={idx} className="rounded-lg border border-sb-ink/10 p-3 space-y-2 bg-sb-cream/50">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-sb-ink/55">Section {idx + 1} title</label>
                    {policyForm.sections.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => setPolicyForm((f) => ({ ...f, sections: f.sections.filter((_, i) => i !== idx) }))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <Input
                    value={sec.title}
                    onChange={(e) => setPolicyForm((f) => {
                      const sections = [...f.sections];
                      sections[idx] = { ...sections[idx], title: e.target.value };
                      return { ...f, sections };
                    })}
                    placeholder="1. Overview"
                  />
                  <Textarea
                    rows={4}
                    value={sec.bodyText}
                    onChange={(e) => setPolicyForm((f) => {
                      const sections = [...f.sections];
                      sections[idx] = { ...sections[idx], bodyText: e.target.value };
                      return { ...f, sections };
                    })}
                    placeholder="One paragraph per line"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={savePolicy} disabled={savingPolicy} className="bg-sb-orange hover:bg-sb-orange-hover text-black flex-1">
                {savingPolicy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {policyModal.data ? "Update policy" : "Create policy"}
              </Button>
              <Button variant="outline" onClick={() => setPolicyModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      <AdminDeleteConfirmModal
        open={!!quickLinkDelete.pending}
        title={quickLinkDelete.modalTitle}
        description={quickLinkDelete.modalDescription}
        busy={quickLinkDelete.busy}
        onCancel={quickLinkDelete.cancelDelete}
        onConfirm={quickLinkDelete.confirm}
      />
      <AdminDeleteConfirmModal
        open={!!policyDelete.pending}
        title={policyDelete.modalTitle}
        description={policyDelete.modalDescription}
        busy={policyDelete.busy}
        onCancel={policyDelete.cancelDelete}
        onConfirm={policyDelete.confirm}
      />
    </div>
  );
}

// ─── Landing Pages Tab ────────────────────────────────────────────────────────
type LandingSectionForm = { title: string; bodyText: string };

function landingSectionsToForm(sections: any[] | undefined): LandingSectionForm[] {
  if (!Array.isArray(sections) || sections.length === 0) return [{ title: "", bodyText: "" }];
  return sections.map((s) => ({
    title: s.title || "",
    bodyText: Array.isArray(s.body) ? s.body.join("\n") : "",
  }));
}

function landingSectionsFromForm(sections: LandingSectionForm[]) {
  return sections
    .filter((s) => s.title.trim() || s.bodyText.trim())
    .map((s) => ({
      title: s.title.trim(),
      body: s.bodyText.split("\n").map((l) => l.trim()).filter(Boolean),
    }));
}

function LandingPagesTab() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; data: any | null }>({ open: false, data: null });
  const [form, setForm] = useState({
    slug: "",
    title: "",
    subtitle: "",
    sortOrder: 0,
    isActive: true,
    sections: [{ title: "", bodyText: "" }] as LandingSectionForm[],
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/cms/landing-pages/all")
      .then((d) => setPages(Array.isArray(d.data) ? d.data : []))
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const landingDelete = useAdminResourceDelete("/cms/landing-pages", load);

  const openEditor = (p: any | null) => {
    if (p) {
      setForm({
        slug: p.slug || "",
        title: p.title || "",
        subtitle: p.subtitle || "",
        sortOrder: Number(p.sortOrder) || 0,
        isActive: p.isActive !== false,
        sections: landingSectionsToForm(p.sections),
      });
      setModal({ open: true, data: p });
    } else {
      setForm({
        slug: "",
        title: "",
        subtitle: "",
        sortOrder: pages.length,
        isActive: true,
        sections: [{ title: "", bodyText: "" }],
      });
      setModal({ open: true, data: null });
    }
  };

  const save = async () => {
    if (!form.slug.trim() || !form.title.trim()) return;
    setSaving(true);
    const payload = {
      slug: form.slug.trim().toLowerCase(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      pageType: "content",
      calculatorType: "none",
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
      sections: landingSectionsFromForm(form.sections),
    };
    try {
      if (modal.data?._id) {
        await apiFetch(`/cms/landing-pages/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/cms/landing-pages", { method: "POST", body: JSON.stringify(payload) });
      }
      setModal({ open: false, data: null });
      load();
    } catch (e: any) {
      alert(e.message || "Save failed");
    }
    setSaving(false);
  };

  const remove = (id: string, title: string) => {
    landingDelete.removeOne(id, title);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionHeader title="Landing pages" onAdd={() => openEditor(null)} addLabel="Add page" />
      <p className="text-xs text-sb-ink/45 -mt-2 leading-relaxed">
        Public URLs: <code className="text-sb-orange">/lp/your-slug</code>
      </p>

      {pages.length === 0 ? (
        <p className="text-sm text-sb-ink/45">No landing pages yet.</p>
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <div key={p._id} className="flex flex-wrap items-center justify-between gap-3 bg-sb-cream-secondary border border-sb-ink/10 rounded-xl px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-sb-ink">{p.title}</p>
                <p className="text-xs text-sb-ink/50">/lp/{p.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={p.isActive !== false ? "bg-sb-orange/12 text-sb-orange" : "bg-gray-100 text-gray-500"}>
                  {p.isActive !== false ? "Active" : "Hidden"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => openEditor(p)}>
                  <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => void remove(p._id, p.title)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <Modal title={modal.data ? `Edit — ${modal.data.title}` : "Create landing page"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Slug *</label>
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="summer-sale" disabled={!!modal.data} />
              </div>
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Sort order</label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: +e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Title *</label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Subtitle</label>
              <Input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
              Active (visible on storefront)
            </label>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-sb-ink/55">Sections</p>
              {form.sections.map((sec, idx) => (
                <div key={idx} className="border border-sb-ink/10 rounded-lg p-3 space-y-2">
                  <Input
                    value={sec.title}
                    onChange={(e) => setForm((f) => {
                      const sections = [...f.sections];
                      sections[idx] = { ...sections[idx], title: e.target.value };
                      return { ...f, sections };
                    })}
                    placeholder="Section title"
                  />
                  <Textarea
                    rows={3}
                    value={sec.bodyText}
                    onChange={(e) => setForm((f) => {
                      const sections = [...f.sections];
                      sections[idx] = { ...sections[idx], bodyText: e.target.value };
                      return { ...f, sections };
                    })}
                    placeholder="One bullet per line"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setForm((f) => ({ ...f, sections: [...f.sections, { title: "", bodyText: "" }] }))}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add section
              </Button>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => void save()} disabled={saving || !form.slug.trim() || !form.title.trim()} className="bg-sb-orange hover:bg-sb-orange-hover text-black flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
              <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      <AdminDeleteConfirmModal
        open={!!landingDelete.pending}
        title={landingDelete.modalTitle}
        description={landingDelete.modalDescription}
        busy={landingDelete.busy}
        onCancel={landingDelete.cancelDelete}
        onConfirm={landingDelete.confirm}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function PageBannersTab() {
  const [form, setForm] = useState({
    aboutUsUrl: "",
    aboutUsPublicId: "",
    contactUsUrl: "",
    contactUsPublicId: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState<null | "about" | "contact">(null);

  useEffect(() => {
    apiFetch("/cms/homepage").then((d: any) => {
      const pb = d.data.pageBanners || {};
      setForm({
        aboutUsUrl: pb.aboutUsUrl || "",
        aboutUsPublicId: pb.aboutUsPublicId || "",
        contactUsUrl: pb.contactUsUrl || "",
        contactUsPublicId: pb.contactUsPublicId || "",
      });
    }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      await apiFetch("/cms/homepage", {
        method: "PUT",
        body: JSON.stringify({ pageBanners: form }),
      });
      setMsg("Page banners updated.");
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
    setSaving(false);
  };

  const doUpload = async (kind: "about" | "contact", file: File) => {
    setUploading(kind);
    try {
      const res = await adminUploadImage("/upload/banner", file);
      setForm(f => ({
        ...f,
        [`${kind}UsUrl`]: res.url,
        [`${kind}UsPublicId`]: res.public_id || "",
      }));
    } catch (e: any) {
      alert("Upload failed: " + e.message);
    }
    setUploading(null);
  };

  if (loading) return <Spinner />;

  return (
    <div className="max-w-2xl space-y-8">
      <SectionHeader title="Page Banners" subtitle="Manage header background images for About Us and Contact Us pages" />
      
      <div className="space-y-6">
        <div>
          <label className="text-sm font-semibold mb-2 block">About Us Banner</label>
          <div className="p-4 border rounded-xl bg-gray-50 flex items-start gap-4">
            {form.aboutUsUrl ? (
              <div className="w-48 h-24 border rounded overflow-hidden relative bg-black shrink-0">
                <img src={form.aboutUsUrl} alt="About Us" className="w-full h-full object-cover opacity-60" />
                <button
                  onClick={() => setForm(f => ({ ...f, aboutUsUrl: "", aboutUsPublicId: "" }))}
                  className="absolute top-1 right-1 bg-white p-1 rounded-full text-red-500 shadow hover:bg-red-50"
                  title="Remove image"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="w-48 h-24 border border-dashed rounded flex flex-col items-center justify-center text-gray-400 bg-white shrink-0">
                <Image className="w-6 h-6 mb-1" />
                <span className="text-xs">No Image</span>
              </div>
            )}
            <div className="flex-1">
              <label className="inline-block px-4 py-2 bg-white border border-gray-300 rounded text-sm cursor-pointer hover:bg-gray-50">
                {uploading === "about" ? "Uploading..." : "Upload New Image"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={e => e.target.files?.[0] && doUpload("about", e.target.files[0])}
                  disabled={uploading !== null}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">Used on the /about page hero section.</p>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold mb-2 block">Contact Us Banner</label>
          <div className="p-4 border rounded-xl bg-gray-50 flex items-start gap-4">
            {form.contactUsUrl ? (
              <div className="w-48 h-24 border rounded overflow-hidden relative bg-black shrink-0">
                <img src={form.contactUsUrl} alt="Contact Us" className="w-full h-full object-cover opacity-60" />
                <button
                  onClick={() => setForm(f => ({ ...f, contactUsUrl: "", contactUsPublicId: "" }))}
                  className="absolute top-1 right-1 bg-white p-1 rounded-full text-red-500 shadow hover:bg-red-50"
                  title="Remove image"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="w-48 h-24 border border-dashed rounded flex flex-col items-center justify-center text-gray-400 bg-white shrink-0">
                <Image className="w-6 h-6 mb-1" />
                <span className="text-xs">No Image</span>
              </div>
            )}
            <div className="flex-1">
              <label className="inline-block px-4 py-2 bg-white border border-gray-300 rounded text-sm cursor-pointer hover:bg-gray-50">
                {uploading === "contact" ? "Uploading..." : "Upload New Image"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={e => e.target.files?.[0] && doUpload("contact", e.target.files[0])}
                  disabled={uploading !== null}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">Used on the /contact page hero section.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <Button onClick={save} disabled={saving} className="bg-sb-orange hover:bg-sb-orange-hover text-black">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Banners
          </Button>
          {msg && <span className="text-sm text-sb-orange font-medium">{msg}</span>}
        </div>
      </div>
    </div>
  );
}

export function CMSManagement() {
  const location = useLocation();
  const defaultTab = location.pathname.includes("landing-pages") ? "landing" : "homepage";

  return (
    <div className="p-6 min-h-full">
      <div className="mb-6">
        <h1 className="admin-page-title text-sb-ink">CMS & Platform Control Center</h1>
        <p className="text-sb-ink/55 text-sm mt-1">
          All content changes reflect instantly across Customer Panel, Vendor Panel, and Public Website.
        </p>
      </div>

      <Tabs defaultValue={defaultTab} key={defaultTab} className="space-y-5">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max gap-1 bg-white border border-gray-200 p-1 shadow-sm">
            <TabsTrigger value="homepage"><Globe className="h-3.5 w-3.5 mr-1.5" />Homepage</TabsTrigger>
            <TabsTrigger value="banners"><Image className="h-3.5 w-3.5 mr-1.5" />Banners</TabsTrigger>
            <TabsTrigger value="pagebanners"><Image className="h-3.5 w-3.5 mr-1.5" />Page Banners</TabsTrigger>
            <TabsTrigger value="blogs"><FileText className="h-3.5 w-3.5 mr-1.5" />Blogs</TabsTrigger>
            <TabsTrigger value="landing"><FileText className="h-3.5 w-3.5 mr-1.5" />Landing pages</TabsTrigger>
            <TabsTrigger value="announcements"><Megaphone className="h-3.5 w-3.5 mr-1.5" />Announcements</TabsTrigger>
            <TabsTrigger value="testimonials"><Eye className="h-3.5 w-3.5 mr-1.5" />Testimonials</TabsTrigger>
            <TabsTrigger value="ads"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Ads</TabsTrigger>
            <TabsTrigger value="seo"><Globe className="h-3.5 w-3.5 mr-1.5" />SEO</TabsTrigger>
            <TabsTrigger value="contact"><Mail className="h-3.5 w-3.5 mr-1.5" />Contact</TabsTrigger>
            <TabsTrigger value="footer"><Link2 className="h-3.5 w-3.5 mr-1.5" />Footer & Policies</TabsTrigger>
            <TabsTrigger value="marketplace"><MapPin className="h-3.5 w-3.5 mr-1.5" />Marketplace</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="homepage"><HomepageTab /></TabsContent>
        <TabsContent value="banners"><BannersTab /></TabsContent>
        <TabsContent value="pagebanners"><PageBannersTab /></TabsContent>
        <TabsContent value="blogs"><BlogsTab /></TabsContent>
        <TabsContent value="landing"><LandingPagesTab /></TabsContent>
        <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>
        <TabsContent value="testimonials"><TestimonialsTab /></TabsContent>
        <TabsContent value="ads"><AdsTab /></TabsContent>
        <TabsContent value="seo"><SEOTab /></TabsContent>
        <TabsContent value="contact"><ContactTab /></TabsContent>
        <TabsContent value="footer"><FooterTab /></TabsContent>
        <TabsContent value="marketplace"><MarketplaceTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Marketplace Config Tab ───────────────────────────────────────────────────
function MarketplaceTab() {
  return (
    <div className="max-w-xl space-y-4">
      <SectionHeader title="Marketplace configuration" />
      <p className="text-xs text-sb-ink/55 leading-relaxed">
        Service cities and PINs are managed in <strong className="text-sb-ink">City Management</strong>. Hero slides, ads, and logos are managed in the{" "}
        <strong className="text-sb-ink">Banners</strong>, <strong className="text-sb-ink">Ads</strong>, and <strong className="text-sb-ink">Homepage</strong> tabs.
      </p>

      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-sb-ink mb-2">City &amp; PIN coverage</h3>
        <p className="text-xs text-sb-ink/50 leading-relaxed">
          Add active serviceable cities and PIN lists under <span className="text-sb-orange">Cities</span> in the sidebar. Customer PIN checks use that data only.
        </p>
      </div>

      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-sb-ink mb-2">Trust &amp; marketing visuals</h3>
        <p className="text-xs text-sb-ink/50 leading-relaxed mb-3">
          Use Banners and Ads for promotional images; use Homepage for hero copy and optional brand logo / hero background URLs.
        </p>
      </div>
    </div>
  );
}
