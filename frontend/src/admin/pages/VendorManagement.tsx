import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Eye, CheckCircle, XCircle, PauseCircle, Loader2, Users, Star } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const getToken = () => localStorage.getItem("adminToken") || "";
async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...opts.headers } });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "API Error");
  return data;
}

const DEMO = [
  { _id: "1", name: "ABC Suppliers Pvt Ltd", email: "abc@suppliers.com", phone: "+91 98765 43210", companyName: "ABC Suppliers Pvt Ltd", gstNumber: "29ABCDE1234F1Z5", city: "Bengaluru", vendorStatus: "APPROVED", status: "ACTIVE", createdAt: "2026-04-10" },
  { _id: "2", name: "XYZ Distributors", email: "xyz@dist.com", phone: "+91 98765 43211", companyName: "XYZ Distributors", gstNumber: "36XYZDE1234F1Z5", city: "Hyderabad", vendorStatus: "APPROVED", status: "ACTIVE", createdAt: "2026-04-15" },
  { _id: "3", name: "PQR Materials Ltd", email: "pqr@materials.com", phone: "+91 98765 43212", companyName: "PQR Materials Ltd", gstNumber: "33PQRDE1234F1Z5", city: "Chennai", vendorStatus: "PENDING_APPROVAL", status: "PENDING", createdAt: "2026-06-01" },
  { _id: "4", name: "LMN Enterprises", email: "lmn@ent.com", phone: "+91 98765 43213", companyName: "LMN Enterprises", gstNumber: "29LMNDE1234F1Z5", city: "Bengaluru", vendorStatus: "REJECTED", status: "REJECTED", createdAt: "2026-05-20" },
];

const VS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: "bg-[#FE5E00]/15 text-[#FE5E00] border-[#FE5E00]/25",
  APPROVED: "bg-green-500/15 text-green-400 border-green-500/20",
  REJECTED: "bg-red-500/15 text-red-400 border-red-500/20",
  SUSPENDED: "bg-gray-500/15 text-gray-400 border-gray-500/20",
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

export function VendorManagement() {
  const [vendors, setVendors] = useState<any[]>(DEMO);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [pagination, setPagination] = useState({ total: DEMO.length, pages: 1, page: 1 });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "30" });
    if (statusFilter) params.set("vendorStatus", statusFilter);
    apiFetch(`/admin/vendors?${params}`)
      .then(d => { setVendors(d.data || []); setPagination(d.pagination || {}); })
      .catch(() => { setVendors(DEMO); })
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

  const filtered = vendors.filter(v => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.companyName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalVendors = pagination.total || DEMO.length;
  const approvedCount = vendors.filter(v => v.vendorStatus === "APPROVED").length;
  const pendingCount = vendors.filter(v => v.vendorStatus === "PENDING_APPROVAL").length;

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#F4E9D8]">Vendor Management</h1>
        <p className="text-[#D4C4A8]/60 text-sm mt-1">Approve, manage and monitor all vendor partners</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-[#F4E9D8]">{totalVendors}</div>
          <div className="text-xs text-[#D4C4A8]/50 mt-1">Total Vendors</div>
        </div>
        <div className="bg-[#1A1A1A] border border-green-500/20 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-green-400">{approvedCount}</div>
          <div className="text-xs text-[#D4C4A8]/50 mt-1">Approved</div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#FE5E00]/20 rounded-xl p-4 text-center cursor-pointer hover:border-[#FE5E00]/40 transition-colors" onClick={() => setStatusFilter("PENDING_APPROVAL")}>
          <div className="text-3xl font-black text-[#FE5E00]">{pendingCount}</div>
          <div className="text-xs text-[#D4C4A8]/50 mt-1">Pending Approval ▼</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4C4A8]/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..."
            className="w-full pl-9 pr-4 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] px-3 py-2 focus:outline-none focus:border-[#FE5E00] transition-colors">
          <option value="">All Status</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
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
                {["Vendor", "Company", "Contact", "GST", "Vendor Status", "Account", "Joined", ""].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#FE5E00]/15 flex items-center justify-center text-[#FE5E00] font-black text-xs shrink-0">
                        {v.name[0]}
                      </div>
                      <p className="font-medium text-[#F4E9D8]">{v.name}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[#D4C4A8]/70">{v.companyName}</td>
                  <td className="py-3.5 px-4">
                    <p className="text-xs text-[#D4C4A8]/70">{v.email}</p>
                    <p className="text-xs text-[#D4C4A8]/50">{v.phone}</p>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-[#D4C4A8]/60">{v.gstNumber || "—"}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${VS_COLORS[v.vendorStatus] || "bg-white/8 text-[#D4C4A8]/60 border-white/12"}`}>
                      {v.vendorStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-xs font-medium ${v.status === "ACTIVE" ? "text-green-400" : "text-[#D4C4A8]/40"}`}>{v.status}</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[#D4C4A8]/50">{new Date(v.createdAt).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex gap-1.5">
                      <button onClick={() => setSelected(v)} className="p-1.5 border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] hover:border-white/20 transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {v.vendorStatus === "PENDING_APPROVAL" && (
                        <>
                          <button onClick={() => approve(v._id)} title="Approve"
                            className="p-1.5 border border-green-500/20 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => reject(v._id)} title="Reject"
                            className="p-1.5 border border-red-400/20 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors">
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
              <Users className="w-10 h-10 mx-auto mb-3 text-[#D4C4A8]/20" />
              <p className="text-[#D4C4A8]/40">No vendors found.</p>
            </div>
          )}
        </div>
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
                <div key={String(k)} className="p-3 bg-[#0D0D0D] border border-white/8 rounded-lg">
                  <p className="text-[10px] text-[#D4C4A8]/50 uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="text-sm font-medium text-[#F4E9D8]">{v}</p>
                </div>
              ))}
            </div>
            {selected.vendorStatus === "PENDING_APPROVAL" && (
              <div className="flex gap-3">
                <button onClick={() => approve(selected._id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors">
                  <CheckCircle className="w-4 h-4" /> Approve Vendor
                </button>
                <button onClick={() => reject(selected._id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm transition-colors">
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
