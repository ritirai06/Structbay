import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, MapPin, Loader2, Save, RefreshCw, Search } from "lucide-react";

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

const DEMO_CITIES = [
  { _id: "1", name: "Bengaluru", state: "Karnataka", status: "ACTIVE", isServiceable: true, priority: 1, sortOrder: 1 },
  { _id: "2", name: "Hyderabad", state: "Telangana", status: "ACTIVE", isServiceable: true, priority: 2, sortOrder: 2 },
  { _id: "3", name: "Chennai", state: "Tamil Nadu", status: "ACTIVE", isServiceable: true, priority: 3, sortOrder: 3 },
  { _id: "4", name: "Mumbai", state: "Maharashtra", status: "INACTIVE", isServiceable: false, priority: 4, sortOrder: 4 },
  { _id: "5", name: "Pune", state: "Maharashtra", status: "ACTIVE", isServiceable: true, priority: 5, sortOrder: 5 },
];

const emptyForm = { name: "", state: "", status: "ACTIVE", isServiceable: true, priority: 0, sortOrder: 0 };

const inp = "w-full bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors";

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

export function CityManagement() {
  const [cities, setCities] = useState<any[]>(DEMO_CITIES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/cities?limit=200`)
      .then(d => { setCities(d.data || []); setPagination(d.pagination || {}); })
      .catch(() => { setCities(DEMO_CITIES); setPagination({ total: DEMO_CITIES.length, pages: 1, page: 1 }); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm); setModal({ open: true, data: null }); };
  const openEdit = (c: any) => {
    setForm({ name: c.name, state: c.state, status: c.status, isServiceable: c.isServiceable, priority: c.priority, sortOrder: c.sortOrder });
    setModal({ open: true, data: c });
  };

  const save = async () => {
    if (!form.name || !form.state) return alert("Name and state are required.");
    setSaving(true);
    try {
      if (modal.data) await apiFetch(`/cities/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(form) });
      else await apiFetch("/cities", { method: "POST", body: JSON.stringify(form) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const toggle = async (id: string) => {
    await apiFetch(`/cities/${id}/toggle`, { method: "PATCH" }).catch(e => alert(e.message));
    load();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await apiFetch(`/cities/${id}`, { method: "DELETE" }).catch(e => alert(e.message));
    load();
  };

  const filtered = cities.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.state.toLowerCase().includes(search.toLowerCase()));
  const active = filtered.filter(c => c.status === "ACTIVE").length;

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F4E9D8]">City Management</h1>
          <p className="text-[#D4C4A8]/60 text-sm mt-1">{active} active / {filtered.length} total cities</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold px-4 py-2.5 rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" /> Add City
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Cities", value: pagination.total || filtered.length, color: "text-[#F4E9D8]" },
          { label: "Active Cities", value: cities.filter(c => c.status === "ACTIVE").length, color: "text-green-400" },
          { label: "Serviceable", value: cities.filter(c => c.isServiceable).length, color: "text-[#FE5E00]" },
        ].map(s => (
          <div key={s.label} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 text-center">
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#D4C4A8]/50 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4C4A8]/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cities or states..."
            className="w-full pl-9 pr-4 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors" />
        </div>
        <button onClick={load} className="p-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#FE5E00]" /></div>
      ) : (
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                {["City", "State", "Priority", "Sort", "Serviceable", "Status", ""].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#FE5E00] shrink-0" />
                      <span className="font-semibold text-[#F4E9D8]">{c.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[#D4C4A8]/70">{c.state}</td>
                  <td className="py-3.5 px-4 text-[#D4C4A8]/70">{c.priority}</td>
                  <td className="py-3.5 px-4 text-[#D4C4A8]/70">{c.sortOrder}</td>
                  <td className="py-3.5 px-4">
                    <span className={`text-xs font-medium ${c.isServiceable ? "text-green-400" : "text-[#D4C4A8]/40"}`}>
                      {c.isServiceable ? "✓ Yes" : "✗ No"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.status === "ACTIVE" ? "bg-green-500/15 text-green-400 border-green-500/20" : "bg-white/8 text-[#D4C4A8]/60 border-white/12"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] hover:border-white/20 transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggle(c._id)} title={c.status === "ACTIVE" ? "Disable" : "Enable"}
                        className="p-1.5 border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:border-white/20 transition-colors">
                        {c.status === "ACTIVE" ? <ToggleRight className="w-3.5 h-3.5 text-green-400" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => remove(c._id, c.name)}
                        className="p-1.5 border border-red-400/20 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-[#D4C4A8]/40">
              <MapPin className="w-10 h-10 mx-auto mb-3 text-[#D4C4A8]/20" />
              No cities found.
            </div>
          )}
        </div>
      )}

      {modal.open && (
        <Modal title={modal.data ? `Edit — ${modal.data.name}` : "Add City"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#D4C4A8]/60 mb-1 block">City Name *</label>
                <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Bengaluru" />
              </div>
              <div>
                <label className="text-xs text-[#D4C4A8]/60 mb-1 block">State *</label>
                <input className={inp} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="e.g. Karnataka" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Priority</label>
                <input type="number" className={inp} min={0} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Sort Order</label>
                <input type="number" className={inp} min={0} value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Status</label>
                <select className={`${inp} cursor-pointer`} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Serviceable</label>
                <select className={`${inp} cursor-pointer`} value={form.isServiceable ? "true" : "false"} onChange={e => setForm(f => ({ ...f, isServiceable: e.target.value === "true" }))}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            <div className="pt-2 flex gap-2">
              <button onClick={save} disabled={saving || !form.name || !form.state}
                className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold px-4 py-2 rounded-lg text-sm flex-1 justify-center disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {modal.data ? "Update City" : "Add City"}
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
