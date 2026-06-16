import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Eye, Loader2, UserCircle } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-sb-orange/12 text-sb-orange border-sb-orange/22",
  PENDING: "bg-sb-orange/15 text-sb-orange border-sb-orange/25",
  SUSPENDED: "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/15",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10">
          <h3 className="font-bold text-sb-ink">{title}</h3>
          <button onClick={onClose} className="text-sb-ink/55 hover:text-sb-ink text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function CustomerManagement() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/admin/users?role=CUSTOMER&limit=50")
      .then(d => { setCustomers(d.data || []); setPagination(d.pagination || {}); })
      .catch(() => { setCustomers([]); setPagination({ total: 0, pages: 1, page: 1 }); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await apiFetch(`/admin/users/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }).catch(e => alert(e.message));
    load(); setSelected(null);
  };

  const filtered = customers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));

  const totalCustomers = pagination.total || 0;
  const activeCount = customers.filter(c => c.status === "ACTIVE").length;

  return (
    <div className="p-6 bg-sb-cream min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-sb-ink">Customer Management</h1>
        <p className="text-sb-ink/55 text-sm mt-1">View, manage and monitor all registered customers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-sb-ink">{totalCustomers}</div>
          <div className="text-xs text-sb-ink/50 mt-1">Total Customers</div>
        </div>
        <div className="bg-sb-cream-secondary border border-sb-orange/22 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-sb-orange">{activeCount}</div>
          <div className="text-xs text-sb-ink/50 mt-1">Active</div>
        </div>
        <div className="bg-sb-cream-secondary border border-sb-orange/20 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-sb-orange">{customers.filter(c => c.status === "PENDING").length}</div>
          <div className="text-xs text-sb-ink/50 mt-1">Pending Verification</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sb-ink/45" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
            className="w-full pl-9 pr-4 py-2 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange transition-colors" />
        </div>
        <button onClick={load} className="p-2 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-sb-orange" /></div> : (
        <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sb-ink/10">
                {["Customer", "Email", "Phone", "Status", "Joined", ""].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-sb-ink/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c._id} className="border-b border-sb-ink/8 hover:bg-sb-cream-secondary/90 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-sb-cream-secondary flex items-center justify-center shrink-0">
                        <UserCircle className="w-5 h-5 text-sb-ink/45" />
                      </div>
                      <span className="font-medium text-sb-ink">{c.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-sb-ink/65">{c.email}</td>
                  <td className="py-3.5 px-4 text-sb-ink/65">{c.phone || "—"}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[c.status] || "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/12"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-sb-ink/50">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4">
                    <button onClick={() => setSelected(c)} className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink hover:border-sb-ink/20 transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <UserCircle className="w-10 h-10 mx-auto mb-3 text-sb-ink/20" />
              <p className="text-sb-ink/45">No customers found.</p>
            </div>
          )}
        </div>
      )}

      {selected && (
        <Modal title={`Customer — ${selected.name}`} onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Name", selected.name],
                ["Email", selected.email],
                ["Phone", selected.phone || "—"],
                ["Status", selected.status],
                ["Email Verified", selected.isEmailVerified ? "Yes" : "No"],
                ["Joined", new Date(selected.createdAt).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-sb-cream border border-sb-ink/10 rounded-lg">
                  <p className="text-[10px] text-sb-ink/50 uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="text-sm font-medium text-sb-ink">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              {selected.status !== "ACTIVE" && (
                <button onClick={() => updateStatus(selected._id, "ACTIVE")}
                  className="flex-1 py-2.5 bg-sb-orange hover:bg-sb-orange-hover text-white font-bold rounded-lg text-sm transition-colors">
                  Activate
                </button>
              )}
              {selected.status !== "SUSPENDED" && (
                <button onClick={() => updateStatus(selected._id, "SUSPENDED")}
                  className="flex-1 py-2.5 bg-sb-ink hover:bg-sb-ink/90 text-white font-bold rounded-lg text-sm transition-colors">
                  Suspend
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
