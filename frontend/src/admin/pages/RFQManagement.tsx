import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Eye, UserPlus, Loader2, ClipboardList } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const getToken = () => localStorage.getItem("adminToken") || "";
async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...opts.headers } });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "API Error");
  return data;
}

const DEMO = [
  { _id: "1", rfqNumber: "RFQCON260604001", customerName: "ABC Builders", customerPhone: "+91 98765 43210", grade: "M30", quantity: 50, location: "Whitefield", city: "Bengaluru", pumpRequired: true, status: "PENDING", assignedTo: null, createdAt: "2026-06-04" },
  { _id: "2", rfqNumber: "RFQCON260603002", customerName: "XYZ Construction", customerPhone: "+91 98765 43211", grade: "M25", quantity: 30, location: "Hitech City", city: "Hyderabad", pumpRequired: false, status: "IN_PROGRESS", assignedTo: { name: "Rajesh Kumar" }, createdAt: "2026-06-03" },
  { _id: "3", rfqNumber: "RFQCON260602003", customerName: "PQR Developers", customerPhone: "+91 98765 43212", grade: "M40", quantity: 75, location: "OMR", city: "Chennai", pumpRequired: true, status: "QUOTED", assignedTo: { name: "Priya Sharma" }, createdAt: "2026-06-02" },
  { _id: "4", rfqNumber: "RFQCON260601004", customerName: "Metro Projects", customerPhone: "+91 98765 43213", grade: "M35", quantity: 200, location: "Electronic City", city: "Bengaluru", pumpRequired: true, status: "CONVERTED", assignedTo: { name: "Amit Singh" }, createdAt: "2026-06-01" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-[#FE5E00]/15 text-[#FE5E00] border-[#FE5E00]/25",
  IN_PROGRESS: "bg-[#C9A227]/15 text-[#C9A227] border-[#C9A227]/25",
  QUOTED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  CONVERTED: "bg-green-500/15 text-green-400 border-green-500/20",
  CANCELLED: "bg-red-500/15 text-red-400 border-red-500/20",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#1A1A1A]">
          <h3 className="font-bold text-[#F4E9D8]">{title}</h3>
          <button onClick={onClose} className="text-[#D4C4A8]/60 hover:text-[#F4E9D8] text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inp = "w-full bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors";

export function RFQManagement() {
  const [items, setItems] = useState<any[]>(DEMO);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [stats, setStats] = useState({ total: 156, pending: 23, inProgress: 45, quoted: 33, converted: 88 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "20" });
    if (statusFilter) params.set("status", statusFilter);
    apiFetch(`/concrete-rfqs?${params}`)
      .then(d => setItems(d.data || []))
      .catch(() => setItems(DEMO))
      .finally(() => setLoading(false));
    apiFetch("/concrete-rfqs/stats").then(d => setStats(d.data)).catch(() => {});
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const update = async (id: string, patch: any) => {
    setSaving(true);
    await apiFetch(`/concrete-rfqs/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).catch(e => alert(e.message));
    load();
    setSaving(false);
    setSelected(null);
  };

  const filtered = items.filter(i => !search || i.rfqNumber.includes(search) || i.customerName.toLowerCase().includes(search.toLowerCase()) || i.city.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#F4E9D8]">Concrete RFQ Management</h1>
        <p className="text-[#D4C4A8]/60 text-sm mt-1">Ready-Mix Concrete quotation requests — RFQCON format</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total RFQs", value: stats.total, color: "text-[#F4E9D8]" },
          { label: "Pending", value: stats.pending, color: "text-[#FE5E00]" },
          { label: "In Progress", value: stats.inProgress, color: "text-[#C9A227]" },
          { label: "Quoted", value: stats.quoted, color: "text-blue-400" },
          { label: "Converted", value: stats.converted, color: "text-green-400" },
        ].map(s => (
          <div key={s.label} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#D4C4A8]/50 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4C4A8]/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search RFQ number, customer, city..."
            className="w-full pl-9 pr-4 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] px-3 py-2 focus:outline-none focus:border-[#FE5E00] transition-colors">
          <option value="">All Status</option>
          {["PENDING", "IN_PROGRESS", "QUOTED", "CONVERTED", "CANCELLED"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={load} className="p-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#FE5E00]" /></div> : (
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                {["RFQ No.", "Customer", "Grade", "Quantity", "Location / City", "Pump", "Assigned To", "Status", "Date", ""].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#FE5E00]">{item.rfqNumber}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-[#F4E9D8]">{item.customerName}</p>
                    <p className="text-xs text-[#D4C4A8]/50">{item.customerPhone}</p>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#C9A227]">{item.grade}</td>
                  <td className="py-3.5 px-4 text-[#D4C4A8]/70">{item.quantity} m³</td>
                  <td className="py-3.5 px-4">
                    <p className="text-[#D4C4A8]/70">{item.location}</p>
                    <p className="text-xs text-[#D4C4A8]/50">{item.city}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-xs font-medium ${item.pumpRequired ? "text-[#FE5E00]" : "text-[#D4C4A8]/40"}`}>
                      {item.pumpRequired ? "✓ Yes" : "No"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {item.assignedTo
                      ? <span className="text-xs text-[#D4C4A8]/70">{item.assignedTo.name}</span>
                      : <span className="text-xs text-[#D4C4A8]/40 italic">Unassigned</span>
                    }
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[item.status] || "bg-white/8 text-[#D4C4A8]/60 border-white/12"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[#D4C4A8]/50">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4">
                    <button onClick={() => setSelected(item)} className="p-1.5 border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] hover:border-white/20 transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-[#D4C4A8]/20" />
              <p className="text-[#D4C4A8]/40">No RFQs found.</p>
            </div>
          )}
        </div>
      )}

      {selected && (
        <Modal title={`RFQ — ${selected.rfqNumber}`} onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Customer", selected.customerName],
                ["Phone", selected.customerPhone],
                ["Grade", selected.grade],
                ["Quantity", `${selected.quantity} m³`],
                ["Location", selected.location],
                ["City", selected.city],
                ["Pump Required", selected.pumpRequired ? "Yes" : "No"],
                ["Status", selected.status],
              ].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-[#0D0D0D] border border-white/8 rounded-lg">
                  <p className="text-[10px] text-[#D4C4A8]/50 uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="text-sm font-medium text-[#F4E9D8]">{v}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold text-[#D4C4A8]/60 uppercase tracking-wider mb-2">Update Status</p>
              <div className="grid grid-cols-3 gap-2">
                {["PENDING", "IN_PROGRESS", "QUOTED", "CONVERTED", "CANCELLED"].map(s => (
                  <button key={s} onClick={() => update(selected._id, { status: s })}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors ${selected.status === s ? "bg-[#FE5E00] text-[#0D0D0D] border-[#FE5E00]" : "border-white/10 text-[#D4C4A8]/70 hover:border-[#FE5E00]/40 hover:text-[#FE5E00]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#D4C4A8]/60 uppercase tracking-wider mb-2">Admin Notes</p>
              <textarea className={`${inp} resize-none`} rows={3}
                defaultValue={selected.adminNotes || ""}
                id={`note-${selected._id}`}
                placeholder="Add notes for this RFQ..." />
              <button
                onClick={() => update(selected._id, { adminNotes: (document.getElementById(`note-${selected._id}`) as HTMLTextAreaElement)?.value })}
                className="mt-2 px-4 py-2 bg-[#FE5E00]/15 hover:bg-[#FE5E00]/25 text-[#FE5E00] font-medium rounded-lg text-sm transition-colors">
                Save Notes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
