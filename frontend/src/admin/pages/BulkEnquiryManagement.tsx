import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Eye, FileText, Loader2, Briefcase } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-sb-orange/15 text-sb-orange border-sb-orange/25",
  IN_PROGRESS: "bg-sb-orange/12 text-sb-orange border-sb-orange/25",
  QUOTED: "bg-sb-cream-secondary text-sb-ink border-sb-ink/12",
  CONVERTED: "bg-sb-orange/12 text-sb-orange border-sb-orange/22",
  CLOSED: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

const inp = "w-full bg-sb-cream border border-sb-ink/10 rounded-lg px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange transition-colors";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10 sticky top-0 bg-sb-cream-secondary">
          <h3 className="font-bold text-sb-ink">{title}</h3>
          <button onClick={onClose} className="text-sb-ink/55 hover:text-sb-ink text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function BulkEnquiryManagement() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, new: 0, inProgress: 0, quoted: 0, converted: 0 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    apiFetch(`/bulk-enquiries?limit=30`)
      .then(d => setItems(d.data || []))
      .catch((e) => {
        setItems([]);
        setLoadError(e instanceof Error ? e.message : "Failed to load bulk enquiries.");
      })
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
    <div className="p-6 bg-sb-cream min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-sb-ink">Bulk Enquiry Management</h1>
        <p className="text-sb-ink/55 text-sm mt-1">Large-scale project enquiries with document uploads</p>
      </div>

      {loadError && (
        <div className="mb-5 rounded-xl border border-sb-orange/30 bg-sb-orange/10 px-4 py-3 text-sm text-sb-ink">
          <p className="font-semibold">Could not load bulk enquiries</p>
          <p className="mt-1 whitespace-pre-wrap">{loadError}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total, color: "text-sb-ink" },
          { label: "New", value: stats.new, color: "text-sb-orange" },
          { label: "In Progress", value: stats.inProgress, color: "text-sb-orange" },
          { label: "Quoted", value: stats.quoted, color: "text-sb-ink" },
          { label: "Converted", value: stats.converted, color: "text-sb-orange" },
        ].map(s => (
          <div key={s.label} className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-sb-ink/50 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sb-ink/45" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search enquiries..."
            className="w-full pl-9 pr-4 py-2 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange transition-colors" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sm text-sb-ink px-3 py-2 focus:outline-none focus:border-sb-orange transition-colors">
          <option value="">All Status</option>
          {["NEW", "IN_PROGRESS", "QUOTED", "CONVERTED", "CLOSED"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={load} className="p-2 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-sb-orange" /></div> : (
        <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sb-ink/10">
                {["Enquiry ID", "Customer", "City", "Requirement", "Attachments", "Assigned To", "Status", "Date", ""].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-sb-ink/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item._id} className="border-b border-sb-ink/8 hover:bg-sb-cream-secondary/90 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs font-bold text-sb-orange">{item.enquiryNumber}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-sb-ink">{item.customerName}</p>
                    <p className="text-xs text-sb-ink/50">{item.customerPhone}</p>
                  </td>
                  <td className="py-3.5 px-4 text-sb-ink/65">{item.city}</td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="text-xs text-sb-ink/65 line-clamp-2">{item.requirement}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-sb-ink/45" />
                      <span className="font-semibold text-sb-ink">{item.attachments?.length || 0}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {item.assignedTo
                      ? <span className="text-xs text-sb-ink/65">{item.assignedTo.name}</span>
                      : <span className="text-xs text-sb-ink/45 italic">Unassigned</span>
                    }
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[item.status] || "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/12"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-sb-ink/50">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4">
                    <button onClick={() => setSelected(item)} className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink hover:border-sb-ink/20 transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Briefcase className="w-10 h-10 mx-auto mb-3 text-sb-ink/20" />
              <p className="text-sb-ink/45">No bulk enquiries found.</p>
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
                <div key={String(k)} className="p-3 bg-sb-cream border border-sb-ink/10 rounded-lg">
                  <p className="text-[10px] text-sb-ink/50 uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="text-sm font-medium text-sb-ink">{v}</p>
                </div>
              ))}
            </div>
            <div className="p-3 bg-sb-cream border border-sb-ink/10 rounded-lg">
              <p className="text-[10px] text-sb-ink/50 uppercase tracking-wide mb-1">Requirement</p>
              <p className="text-sm text-sb-ink/70">{selected.requirement}</p>
            </div>
            {selected.attachments?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-2">Attachments ({selected.attachments.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selected.attachments.map((a: any, i: number) => (
                    <a key={i} href={a.url || "#"} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-sb-cream border border-sb-ink/10 rounded-lg text-xs text-sb-ink/60 hover:border-sb-orange/40 hover:text-sb-orange transition-colors">
                      <FileText className="w-3 h-3" /> {a.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-2">Update Status</p>
              <div className="grid grid-cols-3 gap-2">
                {["NEW", "IN_PROGRESS", "QUOTED", "CONVERTED", "CLOSED"].map(s => (
                  <button key={s} onClick={() => update(selected._id, { status: s })}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors ${selected.status === s ? "bg-sb-orange text-white border-sb-orange" : "border-sb-ink/10 text-sb-ink/65 hover:border-sb-orange/40 hover:text-sb-orange"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-2">Admin Notes</p>
              <textarea className={`${inp} resize-none`} rows={3} defaultValue={selected.adminNotes || ""} id={`enq-note-${selected._id}`} placeholder="Internal notes..." />
              <button onClick={() => update(selected._id, { adminNotes: (document.getElementById(`enq-note-${selected._id}`) as HTMLTextAreaElement)?.value })}
                className="mt-2 px-4 py-2 bg-sb-orange/15 hover:bg-sb-orange/25 text-sb-orange font-medium rounded-lg text-sm transition-colors">
                Save Notes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
