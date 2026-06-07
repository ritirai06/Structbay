import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Eye, FileText, Loader2, Briefcase } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const getToken = () => localStorage.getItem("adminToken") || "";
async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...opts.headers } });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "API Error");
  return data;
}

const DEMO = [
  { _id: "1", enquiryNumber: "BLKENQ202606010001", customerName: "Metro Construction Ltd", customerPhone: "+91 98765 43210", customerEmail: "metro@construction.com", city: "Bengaluru", requirement: "Bulk cement and steel supply for metro station construction project — 2000MT cement, 500MT steel", attachments: [{ name: "BOQ.pdf" }, { name: "Drawings.pdf" }, { name: "Specs.pdf" }], assignedTo: null, status: "NEW", createdAt: "2026-06-04" },
  { _id: "2", enquiryNumber: "BLKENQ202606010002", customerName: "Smart City Developers", customerPhone: "+91 98765 43211", customerEmail: "info@smartcity.com", city: "Hyderabad", requirement: "Complete material supply for 500-unit township project over 24 months", attachments: [{ name: "Project.pdf" }, { name: "BOQ.xlsx" }, { name: "Schedule.pdf" }, { name: "TnC.pdf" }, { name: "Map.pdf" }], assignedTo: { name: "Amit Singh" }, status: "IN_PROGRESS", createdAt: "2026-06-03" },
  { _id: "3", enquiryNumber: "BLKENQ202606010003", customerName: "Highway Projects Inc", customerPhone: "+91 98765 43212", customerEmail: "hpi@highway.com", city: "Chennai", requirement: "Road construction materials for 12km highway project — aggregate, bitumen, concrete", attachments: [{ name: "RFQ.pdf" }, { name: "DPR.pdf" }], assignedTo: { name: "Priya Sharma" }, status: "QUOTED", createdAt: "2026-06-01" },
];

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-[#FE5E00]/15 text-[#FE5E00] border-[#FE5E00]/25",
  IN_PROGRESS: "bg-[#C9A227]/15 text-[#C9A227] border-[#C9A227]/25",
  QUOTED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  CONVERTED: "bg-green-500/15 text-green-400 border-green-500/20",
  CLOSED: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

const inp = "w-full bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#1A1A1A]">
          <h3 className="font-bold text-[#F4E9D8]">{title}</h3>
          <button onClick={onClose} className="text-[#D4C4A8]/60 hover:text-[#F4E9D8] text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function BulkEnquiryManagement() {
  const [items, setItems] = useState<any[]>(DEMO);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [stats, setStats] = useState({ total: 78, new: 15, inProgress: 32, quoted: 12, converted: 31 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/bulk-enquiries?limit=30`)
      .then(d => setItems(d.data || []))
      .catch(() => setItems(DEMO))
      .finally(() => setLoading(false));
    apiFetch("/bulk-enquiries/stats").then(d => setStats(d.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (id: string, patch: any) => {
    setSaving(true);
    await apiFetch(`/bulk-enquiries/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).catch(e => alert(e.message));
    load();
    setSaving(false);
    if (patch.status && selected) setSelected((prev: any) => ({ ...prev, ...patch }));
  };

  const filtered = items.filter(i => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (search && !i.enquiryNumber.includes(search) && !i.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#F4E9D8]">Bulk Enquiry Management</h1>
        <p className="text-[#D4C4A8]/60 text-sm mt-1">Large-scale project enquiries with document uploads</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total, color: "text-[#F4E9D8]" },
          { label: "New", value: stats.new, color: "text-[#FE5E00]" },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search enquiries..."
            className="w-full pl-9 pr-4 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] px-3 py-2 focus:outline-none focus:border-[#FE5E00] transition-colors">
          <option value="">All Status</option>
          {["NEW", "IN_PROGRESS", "QUOTED", "CONVERTED", "CLOSED"].map(s => <option key={s} value={s}>{s}</option>)}
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
                {["Enquiry ID", "Customer", "City", "Requirement", "Attachments", "Assigned To", "Status", "Date", ""].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#FE5E00]">{item.enquiryNumber}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-[#F4E9D8]">{item.customerName}</p>
                    <p className="text-xs text-[#D4C4A8]/50">{item.customerPhone}</p>
                  </td>
                  <td className="py-3.5 px-4 text-[#D4C4A8]/70">{item.city}</td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="text-xs text-[#D4C4A8]/70 line-clamp-2">{item.requirement}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#D4C4A8]/40" />
                      <span className="font-semibold text-[#F4E9D8]">{item.attachments?.length || 0}</span>
                    </div>
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
              <Briefcase className="w-10 h-10 mx-auto mb-3 text-[#D4C4A8]/20" />
              <p className="text-[#D4C4A8]/40">No bulk enquiries found.</p>
            </div>
          )}
        </div>
      )}

      {selected && (
        <Modal title={`Enquiry — ${selected.enquiryNumber}`} onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Customer", selected.customerName],
                ["Phone", selected.customerPhone],
                ["Email", selected.customerEmail || "—"],
                ["City", selected.city || "—"],
              ].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-[#0D0D0D] border border-white/8 rounded-lg">
                  <p className="text-[10px] text-[#D4C4A8]/50 uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="text-sm font-medium text-[#F4E9D8]">{v}</p>
                </div>
              ))}
            </div>
            <div className="p-3 bg-[#0D0D0D] border border-white/8 rounded-lg">
              <p className="text-[10px] text-[#D4C4A8]/50 uppercase tracking-wide mb-1">Requirement</p>
              <p className="text-sm text-[#D4C4A8]/80">{selected.requirement}</p>
            </div>
            {selected.attachments?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#D4C4A8]/60 uppercase tracking-wider mb-2">Attachments ({selected.attachments.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selected.attachments.map((a: any, i: number) => (
                    <a key={i} href={a.url || "#"} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D0D0D] border border-white/10 rounded-lg text-xs text-[#D4C4A8] hover:border-[#FE5E00]/40 hover:text-[#FE5E00] transition-colors">
                      <FileText className="w-3 h-3" /> {a.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-[#D4C4A8]/60 uppercase tracking-wider mb-2">Update Status</p>
              <div className="grid grid-cols-3 gap-2">
                {["NEW", "IN_PROGRESS", "QUOTED", "CONVERTED", "CLOSED"].map(s => (
                  <button key={s} onClick={() => update(selected._id, { status: s })}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors ${selected.status === s ? "bg-[#FE5E00] text-[#0D0D0D] border-[#FE5E00]" : "border-white/10 text-[#D4C4A8]/70 hover:border-[#FE5E00]/40 hover:text-[#FE5E00]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#D4C4A8]/60 uppercase tracking-wider mb-2">Admin Notes</p>
              <textarea className={`${inp} resize-none`} rows={3} defaultValue={selected.adminNotes || ""} id={`enq-note-${selected._id}`} placeholder="Internal notes..." />
              <button onClick={() => update(selected._id, { adminNotes: (document.getElementById(`enq-note-${selected._id}`) as HTMLTextAreaElement)?.value })}
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
