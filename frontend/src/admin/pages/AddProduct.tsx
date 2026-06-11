import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { ArrowLeft, Plus, Trash2, Loader2, Save, Shield, Zap, TrendingUp, Star, MapPin } from "lucide-react";
import { adminPath } from "../../lib/portalRoutes";
import { adminFetch as apiFetch } from "../../lib/adminApi";

const VARIATION_ATTRS = ["weight", "grade", "size", "color", "finish", "diameter"];

const emptyForm = {
  name: "", sku: "", category: "", brand: "",
  shortDescription: "", description: "",
  gstPercentage: 18, status: "DRAFT",
  isFeatured: false, isTopSelling: false, isAssured: false, isExpress: false,
  displayOrder: 0,
  seo: { metaTitle: "", metaDescription: "", metaKeywords: [] },
  faqs: [] as { question: string; answer: string }[],
  videos: [] as { title: string; url: string }[],
  documents: [] as { name: string; url: string }[],
};

const emptyVariation = { weight: "", grade: "", size: "", color: "", finish: "", diameter: "", sku: "" };

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="text-xs text-[#D4C4A8]/60 mb-1.5 block font-medium">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inp = "w-full bg-[#171717] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] focus:ring-1 focus:ring-[#FE5E00]/20 transition-colors";
const sel = `${inp} cursor-pointer`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/8">
        <h3 className="font-semibold text-[#F4E9D8] text-sm">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label, icon: Icon, accent = "#FE5E00" }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; icon: any; accent?: string;
}) {
  return (
    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${checked ? "border-[#FE5E00]/30 bg-[#FE5E00]/5" : "border-white/8 bg-[#111] hover:border-white/15"}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${checked ? "bg-[#FE5E00]/20" : "bg-white/5"}`}>
        <Icon className={`w-4 h-4 ${checked ? "text-[#FE5E00]" : "text-[#D4C4A8]/40"}`} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${checked ? "text-[#F4E9D8]" : "text-[#D4C4A8]/60"}`}>{label}</p>
      </div>
      <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${checked ? "bg-[#FE5E00]" : "bg-white/15"}`}
        onClick={() => onChange(!checked)}>
        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
      </div>
    </label>
  );
}

export function AddProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState(emptyForm);
  const [variations, setVariations] = useState<any[]>([]);
  const [newVar, setNewVar] = useState(emptyVariation);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
  const [tab, setTab] = useState<"info" | "media" | "variations" | "seo" | "faqs">("info");
  const [catalogCategories, setCatalogCategories] = useState<{ _id: string; name: string }[]>([]);
  /** `categoryId` = brand's linked category (Brands admin); null = legacy / any category */
  const [catalogBrands, setCatalogBrands] = useState<{ _id: string; name: string; categoryId: string | null }[]>([]);

  useEffect(() => {
    apiFetch("/categories?limit=200&status=ACTIVE")
      .then(d => setCatalogCategories((d.data || []).map((c: { _id: string; name: string }) => ({ _id: c._id, name: c.name }))))
      .catch(() => setCatalogCategories([]));
    apiFetch("/brands?limit=200&status=ACTIVE")
      .then(d =>
        setCatalogBrands(
          (d.data || []).map((b: { _id: string; name: string; category?: { _id: string } | string | null }) => ({
            _id: b._id,
            name: b.name,
            categoryId: b.category && typeof b.category === "object" && "_id" in b.category ? b.category._id : (b.category as string) || null,
          }))
        )
      )
      .catch(() => setCatalogBrands([]));
  }, []);

  /** Brands linked to the selected category, plus legacy brands with no category set */
  const brandsForCategory = useMemo(() => {
    if (!form.category) return catalogBrands;
    return catalogBrands.filter(
      b => !b.categoryId || String(b.categoryId) === String(form.category)
    );
  }, [catalogBrands, form.category]);

  const brandSelectOptions = useMemo(() => {
    const list = [...brandsForCategory].sort((a, b) => a.name.localeCompare(b.name));
    if (form.brand && !list.some(b => String(b._id) === String(form.brand))) {
      const current = catalogBrands.find(b => String(b._id) === String(form.brand));
      if (current) return [current, ...list];
    }
    return list;
  }, [brandsForCategory, form.brand, catalogBrands]);

  useEffect(() => {
    if (!form.category || !form.brand || catalogBrands.length === 0) return;
    const allowed = brandsForCategory.some(b => String(b._id) === String(form.brand));
    if (!allowed) set("brand", "");
  }, [form.category, form.brand, brandsForCategory, catalogBrands.length]);

  useEffect(() => {
    if (!isEdit) return;
    apiFetch(`/products/${id}`)
      .then(d => {
        const p = d.data;
        setForm({
          name: p.name, sku: p.sku, category: p.category?._id || p.category,
          brand: p.brand?._id || p.brand, shortDescription: p.shortDescription || "",
          description: p.description || "", gstPercentage: p.gstPercentage,
          status: p.status, isFeatured: p.isFeatured, isTopSelling: p.isTopSelling,
          isAssured: p.isAssured, isExpress: p.isExpress, displayOrder: p.displayOrder,
          seo: p.seo || { metaTitle: "", metaDescription: "", metaKeywords: [] },
          faqs: p.faqs || [], videos: p.videos || [], documents: p.documents || [],
        });
        setVariations(p.variations || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const save = async () => {
    if (!form.name || !form.sku) return alert("Name and SKU are required.");
    setSaving(true);
    try {
      const body = {
        ...form,
        documents: form.documents.filter(d => d.name.trim() && d.url.trim()),
        videos: form.videos.filter(v => v.title.trim() || v.url.trim()),
      };
      if (isEdit) await apiFetch(`/products/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await apiFetch("/products", { method: "POST", body: JSON.stringify(body) });
      navigate(adminPath("products"));
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const addVariation = async () => {
    if (!isEdit) return alert("Save product first to add variations.");
    try {
      const v = await apiFetch(`/products/${id}/variations`, {
        method: "POST",
        body: JSON.stringify({ attributes: newVar, sku: newVar.sku || undefined }),
      });
      setVariations(prev => [...prev, v.data]);
      setNewVar(emptyVariation);
    } catch (e: any) { alert(e.message); }
  };

  const deleteVariation = async (varId: string) => {
    if (!confirm("Delete this variation?")) return;
    await apiFetch(`/products/${id}/variations/${varId}`, { method: "DELETE" }).catch(e => alert(e.message));
    setVariations(prev => prev.filter(v => v._id !== varId));
  };

  const addFaq = () => {
    if (!newFaq.question || !newFaq.answer) return;
    set("faqs", [...form.faqs, { ...newFaq }]);
    setNewFaq({ question: "", answer: "" });
  };

  const TABS = [
    { key: "info", label: "General" },
    { key: "media", label: "Media" },
    { key: "variations", label: "Variations" },
    { key: "seo", label: "SEO" },
    { key: "faqs", label: "FAQs" },
  ] as const;

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-[#FE5E00]" /></div>;

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(adminPath("products"))}
          className="flex items-center gap-2 text-sm text-[#D4C4A8]/60 hover:text-[#F4E9D8] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#F4E9D8]">{isEdit ? "Edit Product" : "Add Product"}</h1>
            <p className="text-[#D4C4A8]/60 text-sm mt-1">Admin-only product management</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { set("status", "DRAFT"); save(); }}
              className="px-4 py-2.5 border border-white/15 rounded-lg text-sm text-[#D4C4A8] hover:border-white/30 transition-colors">
              Save Draft
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? "Update Product" : "Publish Product"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#1A1A1A] border border-white/10 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? "bg-[#FE5E00] text-[#0D0D0D]" : "text-[#D4C4A8]/60 hover:text-[#F4E9D8]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">

          {/* General Info */}
          {tab === "info" && (
            <Section title="General Information">
              <Field label="Product Name" required>
                <input className={inp} placeholder="e.g. Cement PPC 53 Grade" value={form.name} onChange={e => set("name", e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="SKU" required>
                  <input className={inp} placeholder="CEM-PPC-53-001" value={form.sku} onChange={e => set("sku", e.target.value.toUpperCase())} />
                </Field>
                <Field label="GST Percentage" required>
                  <select className={sel} value={form.gstPercentage} onChange={e => set("gstPercentage", +e.target.value)}>
                    {[0, 5, 12, 18, 28].map(g => <option key={g} value={g}>{g}%</option>)}
                  </select>
                </Field>
              </div>
              <p className="text-xs text-[#D4C4A8]/50 -mt-2">List and storefront prices are excluding GST; GST is applied at checkout using this rate.</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Category" required>
                  <select className={sel} value={form.category} onChange={e => set("category", e.target.value)}>
                    <option value="">Select category</option>
                    {catalogCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Brand" required>
                  <select className={sel} value={form.brand} onChange={e => set("brand", e.target.value)} disabled={!form.category}>
                    <option value="">{form.category ? "Select brand" : "Select category first"}</option>
                    {brandSelectOptions.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </Field>
              </div>
              <p className="text-xs text-[#D4C4A8]/50 -mt-2">
                Brands are filtered by the <strong className="text-[#D4C4A8]/70">parent category</strong> set under{" "}
                <Link to={adminPath("brands")} className="text-[#FE5E00] hover:underline">Brands</Link>
                {" "}(legacy brands with no category stay available for every category).
              </p>
              <div className="rounded-lg border border-[#FE5E00]/25 bg-[#FE5E00]/5 px-4 py-3 flex gap-3 items-start">
                <MapPin className="w-4 h-4 text-[#FE5E00] shrink-0 mt-0.5" />
                <div className="text-xs text-[#D4C4A8]/80 leading-relaxed">
                  <span className="font-semibold text-[#F4E9D8]">City-wise listing on the storefront</span> is not set on this screen.
                  A product appears for customers in a city only when that city has both{" "}
                  <strong className="text-[#F4E9D8]/90">visible pricing</strong> and{" "}
                  <strong className="text-[#F4E9D8]/90">available stock</strong>.
                  Use{" "}
                  <Link to={adminPath("pricing")} className="text-[#FE5E00] hover:underline">Pricing</Link>
                  {" "}and{" "}
                  <Link to={adminPath("inventory")} className="text-[#FE5E00] hover:underline">Inventory</Link>
                  {" "}per city (and <Link to={adminPath("cities")} className="text-[#FE5E00] hover:underline">Cities</Link> for serviceable locations).
                </div>
              </div>
              <Field label="Short Description">
                <textarea className={`${inp} resize-none`} rows={2} placeholder="Brief description (max 500 chars)" value={form.shortDescription} onChange={e => set("shortDescription", e.target.value)} />
              </Field>
              <Field label="Full Description">
                <textarea className={`${inp} resize-none`} rows={6} placeholder="Detailed product description, features and specifications..." value={form.description} onChange={e => set("description", e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Display Order">
                  <input type="number" className={inp} min={0} value={form.displayOrder} onChange={e => set("displayOrder", +e.target.value)} />
                </Field>
                <Field label="Status">
                  <select className={sel} value={form.status} onChange={e => set("status", e.target.value)}>
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </Field>
              </div>
            </Section>
          )}

          {/* Media */}
          {tab === "media" && (
            <Section title="Product Media">
              <Field label="Product Images">
                <div className="border-2 border-dashed border-white/15 rounded-lg p-8 text-center hover:border-[#FE5E00]/40 transition-colors">
                  <p className="text-sm text-[#D4C4A8]/60 mb-3">Use the Upload endpoint to get Cloudinary URLs, then attach them to the product</p>
                  <Link to={adminPath("cms")} className="text-[#FE5E00] text-sm hover:underline">Open CMS / media →</Link>
                </div>
              </Field>
              <Field label="Product Videos">
                {form.videos.map((v, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input className={`${inp} flex-1`} placeholder="Title" value={v.title} onChange={e => {
                      const vids = [...form.videos]; vids[i].title = e.target.value; set("videos", vids);
                    }} />
                    <input className={`${inp} flex-1`} placeholder="YouTube/Vimeo URL" value={v.url} onChange={e => {
                      const vids = [...form.videos]; vids[i].url = e.target.value; set("videos", vids);
                    }} />
                    <button onClick={() => set("videos", form.videos.filter((_, j) => j !== i))}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={() => set("videos", [...form.videos, { title: "", url: "" }])}
                  className="flex items-center gap-2 text-sm text-[#FE5E00] hover:text-[#E05200] transition-colors">
                  <Plus className="w-4 h-4" /> Add Video
                </button>
              </Field>
              <Field label="Product documents (PDF / spec sheets)">
                <p className="text-xs text-[#D4C4A8]/50 mb-2">Add display name and URL (e.g. from CMS upload or Cloudinary).</p>
                {form.documents.map((doc, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input className={`${inp} flex-1`} placeholder="Document name" value={doc.name} onChange={e => {
                      const next = [...form.documents]; next[i] = { ...next[i], name: e.target.value }; set("documents", next);
                    }} />
                    <input className={`${inp} flex-1`} placeholder="https://..." value={doc.url} onChange={e => {
                      const next = [...form.documents]; next[i] = { ...next[i], url: e.target.value }; set("documents", next);
                    }} />
                    <button type="button" onClick={() => set("documents", form.documents.filter((_, j) => j !== i))}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => set("documents", [...form.documents, { name: "", url: "" }])}
                  className="flex items-center gap-2 text-sm text-[#FE5E00] hover:text-[#E05200] transition-colors">
                  <Plus className="w-4 h-4" /> Add document
                </button>
              </Field>
            </Section>
          )}

          {/* Variations */}
          {tab === "variations" && (
            <Section title="Product Variations">
              {!isEdit && (
                <p className="text-xs text-[#D4C4A8]/50 bg-[#111] border border-white/8 rounded-lg p-3">
                  💡 Save the product first to add variations.
                </p>
              )}
              {variations.length > 0 && (
                <div className="space-y-2">
                  {variations.map(v => (
                    <div key={v._id} className="flex items-center gap-3 p-3 bg-[#111] border border-white/8 rounded-lg">
                      <div className="flex-1 flex flex-wrap gap-2">
                        {Object.entries(v.attributes || {}).filter(([k, val]) => k !== 'custom' && val).map(([k, val]) => (
                          <span key={k} className="text-xs bg-[#2A2A2A] border border-white/10 text-[#D4C4A8] px-2 py-0.5 rounded-full capitalize">
                            {k}: {val as string}
                          </span>
                        ))}
                        {v.sku && <span className="text-xs font-mono text-[#D4C4A8]/50">{v.sku}</span>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${v.status === "ACTIVE" ? "bg-green-500/15 text-green-400 border-green-500/20" : "bg-white/8 text-[#D4C4A8]/60 border-white/12"}`}>{v.status}</span>
                      <button onClick={() => deleteVariation(v._id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {isEdit && (
                <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-[#0D0D0D]">
                  <p className="text-xs font-semibold text-[#D4C4A8]/60 uppercase tracking-wider">Add New Variation</p>
                  <div className="grid grid-cols-3 gap-2">
                    {VARIATION_ATTRS.map(attr => (
                      <div key={attr}>
                        <label className="text-xs text-[#D4C4A8]/50 mb-1 block capitalize">{attr}</label>
                        <input className={inp} placeholder={`e.g. ${attr === "weight" ? "50kg" : attr === "grade" ? "M30" : attr}`}
                          value={(newVar as any)[attr]} onChange={e => setNewVar(v => ({ ...v, [attr]: e.target.value }))} />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs text-[#D4C4A8]/50 mb-1 block">SKU (optional)</label>
                      <input className={inp} placeholder="Variant SKU" value={newVar.sku} onChange={e => setNewVar(v => ({ ...v, sku: e.target.value }))} />
                    </div>
                  </div>
                  <button onClick={addVariation} className="flex items-center gap-2 bg-[#FE5E00]/15 hover:bg-[#FE5E00]/25 text-[#FE5E00] font-medium px-4 py-2 rounded-lg text-sm transition-colors">
                    <Plus className="w-4 h-4" /> Add Variation
                  </button>
                </div>
              )}
            </Section>
          )}

          {/* SEO */}
          {tab === "seo" && (
            <Section title="SEO Settings">
              <Field label="Meta Title">
                <input className={inp} placeholder="SEO title (max 60 chars)" value={form.seo.metaTitle}
                  onChange={e => set("seo", { ...form.seo, metaTitle: e.target.value })} />
              </Field>
              <Field label="Meta Description">
                <textarea className={`${inp} resize-none`} rows={3} placeholder="SEO description (max 160 chars)"
                  value={form.seo.metaDescription} onChange={e => set("seo", { ...form.seo, metaDescription: e.target.value })} />
              </Field>
              <Field label="Meta Keywords (comma separated)">
                <input className={inp} placeholder="cement, construction, building materials"
                  value={form.seo.metaKeywords?.join(", ")}
                  onChange={e => set("seo", { ...form.seo, metaKeywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean) })} />
              </Field>
            </Section>
          )}

          {/* FAQs */}
          {tab === "faqs" && (
            <Section title="Product FAQs">
              {form.faqs.map((faq, i) => (
                <div key={i} className="p-3 bg-[#111] border border-white/8 rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[#F4E9D8]">Q: {faq.question}</p>
                    <button onClick={() => set("faqs", form.faqs.filter((_, j) => j !== i))}
                      className="p-1 text-red-400 hover:bg-red-400/10 rounded shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-[#D4C4A8]/60">A: {faq.answer}</p>
                </div>
              ))}
              <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-[#0D0D0D]">
                <Field label="Question">
                  <input className={inp} value={newFaq.question} onChange={e => setNewFaq(f => ({ ...f, question: e.target.value }))} />
                </Field>
                <Field label="Answer">
                  <textarea className={`${inp} resize-none`} rows={2} value={newFaq.answer} onChange={e => setNewFaq(f => ({ ...f, answer: e.target.value }))} />
                </Field>
                <button onClick={addFaq} className="flex items-center gap-2 bg-[#FE5E00]/15 hover:bg-[#FE5E00]/25 text-[#FE5E00] font-medium px-4 py-2 rounded-lg text-sm transition-colors">
                  <Plus className="w-4 h-4" /> Add FAQ
                </button>
              </div>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Section title="Product Badges">
            <div className="space-y-2">
              <Toggle checked={form.isAssured} onChange={v => set("isAssured", v)} label="StructBay Assured" icon={Shield} />
              <Toggle checked={form.isExpress} onChange={v => set("isExpress", v)} label="StructBay Express" icon={Zap} />
              <Toggle checked={form.isFeatured} onChange={v => set("isFeatured", v)} label="Featured Product" icon={Star} />
              <Toggle checked={form.isTopSelling} onChange={v => set("isTopSelling", v)} label="Top Selling" icon={TrendingUp} />
            </div>
          </Section>

          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-[#F4E9D8] text-sm">Quick Save</h3>
            <button onClick={save} disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? "Update Product" : "Publish Product"}
            </button>
            <button onClick={() => navigate(adminPath("products"))}
              className="w-full py-2.5 border border-white/15 rounded-lg text-sm text-[#D4C4A8] hover:border-white/30 transition-colors">
              Cancel
            </button>
          </div>

          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4">
            <h3 className="font-semibold text-[#F4E9D8] text-sm mb-3">Quick Links</h3>
            <div className="space-y-2">
              {isEdit && [
                { label: "→ Manage Pricing", to: `${adminPath("pricing")}?product=${id}` },
                { label: "→ Manage Inventory", to: `${adminPath("inventory")}?product=${id}` },
              ].map(l => (
                <Link key={l.label} to={l.to} className="block text-sm text-[#FE5E00] hover:underline">{l.label}</Link>
              ))}
              {!isEdit && <p className="text-xs text-[#D4C4A8]/40">Save product first to manage pricing & inventory</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
