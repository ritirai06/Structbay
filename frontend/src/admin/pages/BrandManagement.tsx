import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Loader2, Save, RefreshCw, Search, Award, Image, Upload } from "lucide-react";
import { BulkImportCsvModal } from "../components/BulkImportCsvModal";
import { BRAND_BULK_TEMPLATE, parseBrandBulkCsv } from "../lib/adminBulkCsvParsers";
import { adminFetch as apiFetch, adminUploadImage } from "../../lib/adminApi";

const emptyForm = {
  name: "",
  description: "",
  sortOrder: 0,
  status: "ACTIVE",
  category: "",
  logo: null as null | { url: string; publicId: string },
  banner: null as null | { url: string; publicId: string },
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-bold text-[#F4E9D8]">{title}</h3>
          <button onClick={onClose} className="text-[#D4C4A8]/60 hover:text-[#F4E9D8] text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inp = "w-full bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors";

export function BrandManagement() {
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<null | "logo" | "banner">(null);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    apiFetch("/categories?limit=200&sortBy=sortOrder&sortOrder=asc")
      .then(d => setCategories(d.data || []))
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "24" });
    if (search) params.set("search", search);
    if (categoryFilter) params.set("category", categoryFilter);
    apiFetch(`/brands?${params}`)
      .then(d => { setBrands(d.data || []); setPagination(d.pagination || {}); })
      .catch(() => { setBrands([]); setPagination({ total: 0, pages: 1, page: 1 }); })
      .finally(() => setLoading(false));
  }, [search, categoryFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm); setModal({ open: true, data: null }); };
  const openEdit = (b: any) => {
    setForm({
      name: b.name,
      description: b.description || "",
      sortOrder: b.sortOrder,
      status: b.status,
      category: typeof b.category === "object" && b.category?._id ? b.category._id : (b.category || ""),
      logo: b.logo?.url ? { url: b.logo.url, publicId: b.logo.publicId || "" } : null,
      banner: b.banner?.url ? { url: b.banner.url, publicId: b.banner.publicId || "" } : null,
    });
    setModal({ open: true, data: b });
  };

  const save = async () => {
    if (!form.category) {
      alert("Please select a category (e.g. Cement).");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description,
        sortOrder: form.sortOrder,
        status: form.status,
        category: form.category,
      };
      body.logo = form.logo?.url ? form.logo : null;
      body.banner = form.banner?.url ? form.banner : null;
      if (modal.data) await apiFetch(`/brands/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await apiFetch("/brands", { method: "POST", body: JSON.stringify(body) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const onPickFile = async (field: "logo" | "banner", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(field);
    try {
      const path = field === "logo" ? "/upload/brand-logo" : "/upload/brand-banner";
      const up = await adminUploadImage(path, file);
      setForm(f => ({ ...f, [field]: up }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const toggle = async (id: string) => {
    await apiFetch(`/brands/${id}/toggle`, { method: "PATCH" }).catch(e => alert(e.message));
    load();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await apiFetch(`/brands/${id}`, { method: "DELETE" }).catch(e => alert(e.message));
    load();
  };

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F4E9D8]">Brand Management</h1>
          <p className="text-[#D4C4A8]/60 text-sm mt-1">
            {pagination.total || brands.length} brands — each linked to a category (e.g. several brands under Cement). Upload logo & banner for customers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-2 border border-white/15 bg-[#1A1A1A] hover:border-[#FE5E00]/40 text-[#F4E9D8] font-bold px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            <Upload className="w-4 h-4 text-[#FE5E00]" /> Bulk CSV
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold px-4 py-2.5 rounded-lg text-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Brand
          </button>
        </div>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4C4A8]/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search brands..."
            className="w-full pl-9 pr-4 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors" />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] px-3 py-2 min-w-[160px] focus:outline-none focus:border-[#FE5E00]"
        >
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <button type="button" onClick={() => load()} className="p-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#FE5E00]" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {brands.map(brand => (
            <div key={brand._id} className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors group">
              {/* Banner / Logo Area */}
              <div className="h-24 bg-[#222] relative flex items-center justify-center border-b border-white/8">
                {brand.banner?.url
                  ? <img src={brand.banner.url} alt="" className="w-full h-full object-cover" />
                  : <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A]">
                      <Image className="w-8 h-8 text-[#D4C4A8]/20" />
                    </div>
                }
                <div className="absolute bottom-2 left-3">
                  {brand.logo?.url
                    ? <img src={brand.logo.url} alt={brand.name} className="w-10 h-10 rounded-lg object-cover border-2 border-[#1A1A1A] bg-[#1A1A1A]" />
                    : <div className="w-10 h-10 rounded-lg bg-[#FE5E00]/15 border-2 border-[#1A1A1A] flex items-center justify-center">
                        <Award className="w-5 h-5 text-[#FE5E00]" />
                      </div>
                  }
                </div>
                <div className="absolute top-2 right-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${brand.status === "ACTIVE" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/8 text-[#D4C4A8]/60 border-white/12"}`}>
                    {brand.status}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-2">
                  <p className="font-bold text-[#F4E9D8] text-sm">{brand.name}</p>
                  <p className="text-xs text-[#D4C4A8]/50">/brands/{brand.slug}</p>
                  {brand.category?.name && (
                    <p className="text-[10px] text-[#FE5E00]/90 mt-1 font-medium">Category: {brand.category.name}</p>
                  )}
                </div>
                {brand.description && (
                  <p className="text-xs text-[#D4C4A8]/60 line-clamp-2 mb-3">{brand.description}</p>
                )}
                <div className="text-xs text-[#D4C4A8]/40 mb-3">Sort: {brand.sortOrder}</div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(brand)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-white/10 rounded-lg text-xs text-[#D4C4A8] hover:border-[#FE5E00]/50 hover:text-[#FE5E00] transition-colors">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => toggle(brand._id)} title={brand.status === "ACTIVE" ? "Disable" : "Enable"}
                    className="p-2 border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:border-white/20 hover:text-[#F4E9D8] transition-colors">
                    {brand.status === "ACTIVE" ? <ToggleRight className="w-3.5 h-3.5 text-green-400" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => remove(brand._id, brand.name)}
                    className="p-2 border border-red-400/20 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {brands.length === 0 && !loading && (
        <div className="text-center py-16">
          <Award className="w-12 h-12 text-[#D4C4A8]/20 mx-auto mb-3" />
          <p className="text-[#D4C4A8]/40">No brands found. Create your first brand.</p>
        </div>
      )}

      <BulkImportCsvModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk import brands (CSV)"
        instructions={`Up to 200 rows. Required: name, and one of categorySlug, categoryId, or categoryName.\nIf a category slug is not in the database yet, it is created automatically as an ACTIVE category (you can rename or add images later under Category Management).\nIf a brand name already exists, that brand is updated (many brands can belong to the same category).\nOptional: description, sortOrder, status (ACTIVE|INACTIVE).\nLogo/banner: upload via Edit after import.`}
        templateCsv={BRAND_BULK_TEMPLATE}
        templateFileName="structbay-brands-bulk-template.csv"
        apiPath="/brands/bulk-import"
        parseRows={parseBrandBulkCsv}
        onSuccess={() => load(pagination.page)}
      />

      {/* Modal */}
      {modal.open && (
        <Modal title={modal.data ? `Edit — ${modal.data.name}` : "Create Brand"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Brand Name *</label>
              <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. UltraTech Cement" />
            </div>
            <div>
              <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Category *</label>
              <select
                className={`${inp} cursor-pointer`}
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                required
              >
                <option value="">Select category (e.g. Cement)</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Description</label>
              <textarea className={`${inp} resize-none`} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-[#D4C4A8]/60">Customer-facing images (JPEG/PNG/WebP, max 5MB)</p>
              <div className="flex flex-wrap gap-3">
                <div>
                  <span className="text-[10px] text-[#D4C4A8]/50 block mb-1">Logo</span>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/15 bg-[#0D0D0D] text-xs text-[#F4E9D8]">
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/jpg" className="hidden" disabled={uploading === "logo"} onChange={e => onPickFile("logo", e)} />
                    {uploading === "logo" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    {form.logo?.url ? "Replace" : "Upload"}
                  </label>
                  {form.logo?.url && <img src={form.logo.url} alt="" className="mt-2 h-12 w-12 rounded object-cover border border-white/10" />}
                </div>
                <div>
                  <span className="text-[10px] text-[#D4C4A8]/50 block mb-1">Banner</span>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/15 bg-[#0D0D0D] text-xs text-[#F4E9D8]">
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/jpg" className="hidden" disabled={uploading === "banner"} onChange={e => onPickFile("banner", e)} />
                    {uploading === "banner" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    {form.banner?.url ? "Replace" : "Upload"}
                  </label>
                  {form.banner?.url && <img src={form.banner.url} alt="" className="mt-2 h-10 w-24 rounded object-cover border border-white/10" />}
                </div>
              </div>
              {(form.logo?.url || form.banner?.url) && (
                <button type="button" className="text-xs text-red-400 hover:underline" onClick={() => setForm(f => ({ ...f, logo: null, banner: null }))}>
                  Clear logo & banner
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Sort Order</label>
                <input type="number" className={inp} min={0} value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Status</label>
                <select className={`${inp} cursor-pointer`} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
            <div className="pt-2 flex gap-2">
              <button onClick={save} disabled={saving || !form.name}
                className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold px-4 py-2 rounded-lg text-sm flex-1 justify-center disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {modal.data ? "Update Brand" : "Create Brand"}
              </button>
              <button onClick={() => setModal({ open: false, data: null })}
                className="px-4 py-2 border border-white/15 rounded-lg text-sm text-[#D4C4A8] hover:border-white/30 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
