import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Loader2, Save, RefreshCw, Search, Award, Image } from "lucide-react";
import { Badge } from "@shared/components/ui/badge";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const getToken = () => localStorage.getItem("adminToken") || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...opts.headers },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "API Error");
  return data;
}

const DEMO_BRANDS = [
  { _id: "1", name: "UltraTech", slug: "ultratech", description: "India's No.1 cement brand", status: "ACTIVE", sortOrder: 1, logo: { url: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=80&h=80&fit=crop" } },
  { _id: "2", name: "TATA Steel", slug: "tata-steel", description: "Premium quality steel", status: "ACTIVE", sortOrder: 2, logo: { url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=80&h=80&fit=crop" } },
  { _id: "3", name: "ACC", slug: "acc", description: "Trusted cement since 1936", status: "ACTIVE", sortOrder: 3, logo: { url: null } },
  { _id: "4", name: "Asian Paints", slug: "asian-paints", description: "India's #1 paint company", status: "ACTIVE", sortOrder: 4, logo: { url: null } },
  { _id: "5", name: "Ambuja", slug: "ambuja", description: "Strength of steel, beauty of art", status: "INACTIVE", sortOrder: 5, logo: { url: null } },
];

const emptyForm = { name: "", description: "", sortOrder: 0, status: "ACTIVE" };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl w-full max-w-md">
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
  const [brands, setBrands] = useState<any[]>(DEMO_BRANDS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "24" });
    if (search) params.set("search", search);
    apiFetch(`/brands?${params}`)
      .then(d => { setBrands(d.data || []); setPagination(d.pagination || {}); })
      .catch(() => { setBrands(DEMO_BRANDS); setPagination({ total: DEMO_BRANDS.length, pages: 1, page: 1 }); })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm); setModal({ open: true, data: null }); };
  const openEdit = (b: any) => {
    setForm({ name: b.name, description: b.description || "", sortOrder: b.sortOrder, status: b.status });
    setModal({ open: true, data: b });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal.data) await apiFetch(`/brands/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(form) });
      else await apiFetch("/brands", { method: "POST", body: JSON.stringify(form) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
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

  const filtered = brands.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F4E9D8]">Brand Management</h1>
          <p className="text-[#D4C4A8]/60 text-sm mt-1">{pagination.total || filtered.length} brands — Dynamic brand landing pages</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold px-4 py-2.5 rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" /> Add Brand
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4C4A8]/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search brands..."
            className="w-full pl-9 pr-4 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors" />
        </div>
        <button onClick={() => load()} className="p-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#FE5E00]" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(brand => (
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

      {filtered.length === 0 && !loading && (
        <div className="text-center py-16">
          <Award className="w-12 h-12 text-[#D4C4A8]/20 mx-auto mb-3" />
          <p className="text-[#D4C4A8]/40">No brands found. Create your first brand.</p>
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <Modal title={modal.data ? `Edit — ${modal.data.name}` : "Create Brand"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Brand Name *</label>
              <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. UltraTech Cement" />
            </div>
            <div>
              <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Description</label>
              <textarea className={`${inp} resize-none`} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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
