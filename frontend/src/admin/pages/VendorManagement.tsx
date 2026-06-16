import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Eye, CheckCircle, XCircle, Loader2, Users, Plus } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";

const VS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: "bg-sb-orange/12 text-sb-orange border-sb-orange/25",
  APPROVED: "bg-sb-cream-secondary text-sb-ink border-sb-ink/12",
  REJECTED: "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/15",
  SUSPENDED: "bg-sb-cream-secondary text-sb-ink/50 border-sb-ink/12",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-sb-ink/10 bg-sb-cream shadow-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-sb-ink/10 bg-sb-cream-secondary px-5 py-4">
          <h3 className="font-semibold text-sb-ink">{title}</h3>
          <button type="button" onClick={onClose} className="text-xl text-sb-ink/45 hover:text-sb-ink">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const emptyVendorForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  companyName: "",
  contactPerson: "",
  gstNumber: "",
  businessRegNumber: "",
};

const inp = "w-full bg-sb-cream border border-sb-ink/10 rounded-lg px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange";

export function VendorManagement() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyVendorForm);
  const [addSaving, setAddSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "30" });
    if (statusFilter) params.set("vendorStatus", statusFilter);
    apiFetch(`/admin/vendors?${params}`)
      .then(d => { setVendors(d.data || []); setPagination(d.pagination || {}); })
      .catch(() => { setVendors([]); setPagination({ total: 0, pages: 1, page: 1 }); })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    await apiFetch(`/admin/vendors/${id}/approve`, { method: "PUT" }).catch(e => alert(e.message));
    load(); setSelected(null);
  };

  const reject = async (id: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    await apiFetch(`/admin/vendors/${id}/reject`, { method: "PUT", body: JSON.stringify({ reason }) }).catch(e => alert(e.message));
    load(); setSelected(null);
  };

  const submitAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSaving(true);
    const payload: Record<string, string> = {
      name: addForm.name.trim(),
      email: addForm.email.trim(),
      phone: addForm.phone.replace(/\D/g, "").slice(0, 10),
      password: addForm.password,
      companyName: addForm.companyName.trim(),
    };
    const cp = addForm.contactPerson.trim();
    if (cp) payload.contactPerson = cp;
    const gst = addForm.gstNumber.replace(/\s/g, "").toUpperCase();
    if (gst) payload.gstNumber = gst;
    const br = addForm.businessRegNumber.trim();
    if (br) payload.businessRegNumber = br;
    try {
      await apiFetch("/admin/vendors", { method: "POST", body: JSON.stringify(payload) });
      setAddOpen(false);
      setAddForm(emptyVendorForm);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create vendor");
    } finally {
      setAddSaving(false);
    }
  };

  const filtered = vendors.filter(v => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.companyName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalVendors = pagination.total || 0;
  const approvedCount = vendors.filter(v => v.vendorStatus === "APPROVED").length;
  const pendingCount = vendors.filter(v => v.vendorStatus === "PENDING_APPROVAL").length;

  return (
    <div className="p-6 bg-sb-cream min-h-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-sb-ink">Vendor Management</h1>
          <p className="mt-1 text-sm text-sb-ink/55">Onboard vendors here; public self-registration is off unless the server enables it.</p>
        </div>
        <button
          type="button"
          onClick={() => { setAddForm(emptyVendorForm); setAddOpen(true); }}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-sb-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-sb-orange-hover"
        >
          <Plus className="w-4 h-4" /> Add vendor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-sb-ink">{totalVendors}</div>
          <div className="text-xs text-sb-ink/50 mt-1">Total Vendors</div>
        </div>
        <div className="bg-sb-cream-secondary border border-sb-orange/22 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-sb-ink">{approvedCount}</div>
          <div className="text-xs text-sb-ink/50 mt-1">Approved</div>
        </div>
        <div className="bg-sb-cream-secondary border-b border-sb-ink/10 border border-sb-orange/20 rounded-xl p-4 text-center cursor-pointer hover:border-sb-orange/40 transition-colors" onClick={() => setStatusFilter("PENDING_APPROVAL")}>
          <div className="text-3xl font-black text-sb-orange">{pendingCount}</div>
          <div className="text-xs text-sb-ink/50 mt-1">Pending Approval ▼</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sb-ink/45" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..."
            className="w-full pl-9 pr-4 py-2 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange transition-colors" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sm text-sb-ink px-3 py-2 focus:outline-none focus:border-sb-orange transition-colors">
          <option value="">All Status</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
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
                {["Vendor", "Company", "Contact", "GST", "Vendor Status", "Account", "Joined", ""].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-sb-ink/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v._id} className="border-b border-sb-ink/8 hover:bg-sb-cream-secondary/90 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-sb-orange/15 flex items-center justify-center text-sb-orange font-black text-xs shrink-0">
                        {v.name[0]}
                      </div>
                      <p className="font-medium text-sb-ink">{v.name}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-sb-ink/65">{v.companyName}</td>
                  <td className="py-3.5 px-4">
                    <p className="text-xs text-sb-ink/65">{v.email}</p>
                    <p className="text-xs text-sb-ink/50">{v.phone}</p>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-sb-ink/55">{v.gstNumber || "—"}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${VS_COLORS[v.vendorStatus] || "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/12"}`}>
                      {v.vendorStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-xs font-medium ${v.status === "ACTIVE" ? "text-sb-orange" : "text-sb-ink/45"}`}>{v.status}</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-sb-ink/50">{new Date(v.createdAt).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex gap-1.5">
                      <button onClick={() => setSelected(v)} className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink hover:border-sb-ink/20 transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {v.vendorStatus === "PENDING_APPROVAL" && (
                        <>
                          <button onClick={() => approve(v._id)} title="Approve"
                            className="p-1.5 border border-sb-orange/22 rounded-lg text-sb-orange hover:bg-sb-orange/10 transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => reject(v._id)} title="Reject"
                            className="p-1.5 border border-sb-ink/18 rounded-lg text-sb-ink/55 hover:bg-sb-cream-secondary transition-colors">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-sb-ink/20" />
              <p className="text-sb-ink/45">No vendors found.</p>
            </div>
          )}
        </div>
      )}

      {addOpen && (
        <Modal title="Add vendor" onClose={() => !addSaving && setAddOpen(false)}>
          <form onSubmit={submitAddVendor} className="space-y-3">
            <p className="text-xs text-sb-ink/55">
              Creates an approved vendor who can log in immediately. Password must meet platform rules (upper, lower, number, special, 8+ chars).
            </p>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Contact name *</label>
              <input className={inp} value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Email *</label>
              <input className={inp} type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Phone (10 digit) *</label>
              <input className={inp} value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" required />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Company *</label>
              <input className={inp} value={addForm.companyName} onChange={e => setAddForm(f => ({ ...f, companyName: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Contact person (optional)</label>
              <input className={inp} value={addForm.contactPerson} onChange={e => setAddForm(f => ({ ...f, contactPerson: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">GST (optional)</label>
              <input className={inp} value={addForm.gstNumber} onChange={e => setAddForm(f => ({ ...f, gstNumber: e.target.value }))} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Business reg. no. (optional)</label>
              <input className={inp} value={addForm.businessRegNumber} onChange={e => setAddForm(f => ({ ...f, businessRegNumber: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Initial password *</label>
              <input className={inp} type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={addSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sb-orange text-white font-bold text-sm disabled:opacity-50">
                {addSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create vendor
              </button>
              <button type="button" disabled={addSaving} onClick={() => setAddOpen(false)} className="px-4 py-2.5 rounded-lg border border-sb-ink/15 text-sb-ink/60 text-sm">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selected && (
        <Modal title={`Vendor — ${selected.name}`} onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Company", selected.companyName],
                ["Email", selected.email],
                ["Phone", selected.phone],
                ["GST Number", selected.gstNumber || "—"],
                ["Vendor Status", selected.vendorStatus],
                ["Account Status", selected.status],
              ].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-sb-cream border border-sb-ink/10 rounded-lg">
                  <p className="text-[10px] text-sb-ink/50 uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="text-sm font-medium text-sb-ink">{v}</p>
                </div>
              ))}
            </div>
            {selected.vendorStatus === "PENDING_APPROVAL" && (
              <div className="flex gap-3">
                <button onClick={() => approve(selected._id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-sb-orange hover:bg-sb-orange-hover text-white font-bold rounded-lg text-sm transition-colors">
                  <CheckCircle className="w-4 h-4" /> Approve Vendor
                </button>
                <button onClick={() => reject(selected._id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-sb-ink hover:bg-sb-ink/90 text-white font-bold rounded-lg text-sm transition-colors">
                  <XCircle className="w-4 h-4" /> Reject Vendor
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
