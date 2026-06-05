import { useState, useEffect, useCallback } from "react";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Plus, Edit, Trash2, ToggleLeft, ToggleRight,
  FolderTree, Loader2, Save, RefreshCw, Search
} from "lucide-react";

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

function Spinner() {
  return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#FE5E00]" /></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-bold text-[#F4E9D8]">{title}</h3>
          <button onClick={onClose} className="text-[#D4C4A8]/60 hover:text-[#F4E9D8] text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const emptyForm = { name: "", description: "", icon: "", sortOrder: 0, status: "ACTIVE" };

export function CategoryManagement() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "24", sortBy: "sortOrder", sortOrder: "asc" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    apiFetch(`/categories?${params}`)
      .then(d => { setCategories(d.data || []); setPagination(d.pagination || {}); })
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm); setModal({ open: true, data: null }); };
  const openEdit = (c: any) => {
    setForm({ name: c.name, description: c.description || "", icon: c.icon || "", sortOrder: c.sortOrder, status: c.status });
    setModal({ open: true, data: c });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal.data) await apiFetch(`/categories/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(form) });
      else await apiFetch("/categories", { method: "POST", body: JSON.stringify(form) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const toggle = async (id: string) => {
    await apiFetch(`/categories/${id}/toggle`, { method: "PATCH" }).catch(e => alert(e.message));
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this category? This action cannot be undone.")) return;
    await apiFetch(`/categories/${id}`, { method: "DELETE" }).catch(e => alert(e.message));
    load();
  };

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F4E9D8]">Category Management</h1>
          <p className="text-[#D4C4A8]/60 text-sm mt-1">
            Changes reflect in Customer Panel, Vendor Panel, RFQ Forms, Search Filters & Homepage.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#FE5E00] hover:bg-[#E05200] text-black shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4C4A8]/40" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories..."
            className="pl-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#1A1A1A] border border-white/15 rounded-md px-3 py-2 text-sm text-[#F4E9D8]">
          <option value="">All Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => load()} className="shrink-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-5 text-sm text-[#D4C4A8]/60">
        <span>{pagination.total || 0} total categories</span>
        <span>{categories.filter(c => c.status === "ACTIVE").length} active</span>
      </div>

      {loading ? <Spinner /> : categories.length === 0 ? (
        <div className="text-center py-16">
          <FolderTree className="h-12 w-12 text-[#D4C4A8]/20 mx-auto mb-3" />
          <p className="text-[#D4C4A8]/40">No categories found. Create your first category.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map(c => (
            <div key={c._id} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {c.icon ? (
                    <span className="text-2xl shrink-0">{c.icon}</span>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-[#FE5E00]/15 flex items-center justify-center shrink-0">
                      <FolderTree className="h-4 w-4 text-[#FE5E00]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-[#F4E9D8] text-sm truncate">{c.name}</p>
                    <p className="text-xs text-[#D4C4A8]/50 truncate">/{c.slug}</p>
                  </div>
                </div>
                <Badge className={c.status === "ACTIVE" ? "bg-green-500/15 text-green-400 border-green-500/25 shrink-0 ml-2" : "bg-white/10 text-[#D4C4A8]/60 shrink-0 ml-2"}>
                  {c.status}
                </Badge>
              </div>

              {c.image?.url && (
                <img src={c.image.url} alt={c.name} className="w-full h-20 object-cover rounded-lg mb-3 bg-[#111]" />
              )}

              {c.description && (
                <p className="text-xs text-[#D4C4A8]/60 mb-3 line-clamp-2">{c.description}</p>
              )}

              <div className="text-xs text-[#D4C4A8]/40 mb-3">Sort Order: {c.sortOrder}</div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="flex-1">
                  <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggle(c._id)} title={c.status === "ACTIVE" ? "Disable" : "Enable"}>
                  {c.status === "ACTIVE"
                    ? <ToggleRight className="h-3.5 w-3.5 text-green-400" />
                    : <ToggleLeft className="h-3.5 w-3.5 text-[#D4C4A8]/40" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(c._id)} className="text-red-400 border-red-400/30 hover:bg-red-400/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => load(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${p === pagination.page ? "bg-[#FE5E00] text-black" : "bg-[#1A1A1A] border border-white/10 text-[#D4C4A8] hover:border-[#FE5E00]/50"}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <Modal title={modal.data ? `Edit — ${modal.data.name}` : "Create Category"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Category Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Civil Construction" />
            </div>
            <div>
              <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Description</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div>
              <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Icon (emoji or CSS class)</label>
              <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🏗️" />
              {form.icon && <span className="text-3xl mt-1 block">{form.icon}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Sort Order</label>
                <Input type="number" min={0} value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-[#0D0D0D] border border-white/15 rounded-md px-3 py-2 text-sm text-[#F4E9D8]">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
            <div className="pt-2 flex gap-2">
              <Button onClick={save} disabled={saving || !form.name} className="bg-[#FE5E00] hover:bg-[#E05200] text-black flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {modal.data ? "Update Category" : "Create Category"}
              </Button>
              <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
