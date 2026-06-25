import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, RefreshCw, Eye, CheckCircle, XCircle, Loader2, Users, Plus, Edit, ToggleLeft, ToggleRight } from "lucide-react";
import { useNavigate } from "react-router";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import { adminToast } from "../lib/adminToast";
import { AdminInputModal } from "../components/AdminInputModal";
import { useAdminListDelete } from "../hooks/useAdminListDelete";
import {
  AdminListDeleteControls,
  AdminRowDeleteButton,
  AdminTableSelectCell,
  AdminTableSelectHeader,
} from "../components/AdminListDeleteControls";

const VS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: "bg-sb-orange/12 text-sb-orange border-sb-orange/25",
  APPROVED: "bg-sb-cream-secondary text-sb-ink border-sb-ink/12",
  REJECTED: "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/15",
  SUSPENDED: "bg-sb-cream-secondary text-sb-ink/50 border-sb-ink/12",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-sb-ink/10 bg-sb-cream shadow-xl flex flex-col overflow-hidden max-h-[90vh] modal-container">
        <div className="flex items-center justify-between border-b border-sb-ink/10 bg-sb-cream-secondary px-5 py-4 shrink-0">
          <h3 className="font-semibold text-sb-ink text-base">{title}</h3>
          <button type="button" onClick={onClose} className="text-2xl text-sb-ink/45 hover:text-sb-ink leading-none">
            ×
          </button>
        </div>
        <div className="p-6 overflow-y-auto modal-body flex-1">
          {children}
        </div>
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
  companyAddress: "",
  warehouseAddress: "",
  contactPersonName: "",
  contactPersonPhone: "",
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  branchName: "",
};

const inp = "w-full bg-sb-cream border border-sb-ink/10 rounded-lg px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange";

export function VendorManagement() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyVendorForm);
  const [addSaving, setAddSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(emptyVendorForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addFile, setAddFile] = useState<File | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);

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
    try {
      await apiFetch(`/admin/vendors/${id}/approve`, { method: "PUT" });
      adminToast.success("Vendor approved");
    } catch (e) {
      adminToast.error(e instanceof Error ? e.message : "Approve failed");
    }
    load(); setSelected(null);
  };

  const reject = async (id: string, reason: string) => {
    try {
      await apiFetch(`/admin/vendors/${id}/reject`, { method: "PUT", body: JSON.stringify({ reason }) });
      adminToast.success("Vendor rejected");
    } catch (e) {
      adminToast.error(e instanceof Error ? e.message : "Reject failed");
    }
    load(); setSelected(null);
  };

  const submitAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSaving(true);
    const payload: any = {
      name: addForm.name.trim(),
      email: addForm.email.trim(),
      phone: addForm.phone.replace(/\D/g, "").slice(0, 10),
      password: addForm.password,
      companyName: addForm.companyName.trim(),
      contactPerson: addForm.contactPerson.trim() || addForm.name.trim(),
      gstNumber: addForm.gstNumber.trim().toUpperCase() || undefined,
      businessRegNumber: addForm.businessRegNumber.trim() || undefined,
      companyAddress: addForm.companyAddress.trim() || undefined,
      warehouseAddress: addForm.warehouseAddress.trim() || undefined,
      contactPersonName: addForm.contactPersonName.trim() || addForm.contactPerson.trim() || addForm.name.trim(),
      contactPersonPhone: addForm.contactPersonPhone.replace(/\D/g, "").slice(0, 10) || addForm.phone.replace(/\D/g, "").slice(0, 10),
      bankDetails: {
        accountHolderName: addForm.accountHolderName.trim() || undefined,
        bankName: addForm.bankName.trim() || undefined,
        accountNumber: addForm.accountNumber.trim() || undefined,
        ifscCode: addForm.ifscCode.trim().toUpperCase() || undefined,
        branchName: addForm.branchName.trim() || undefined,
      }
    };

    try {
      const res = await apiFetch<any>("/admin/vendors", { method: "POST", body: JSON.stringify(payload) });
      const newVendorId = res.data?._id || res.data?.id;

      if (newVendorId && addFile) {
        const fd = new FormData();
        fd.append("document", addFile);
        await apiFetch(`/admin/vendors/${newVendorId}/documents`, { method: "POST", body: fd });
      }

      setAddOpen(false);
      setAddForm(emptyVendorForm);
      setAddFile(null);
      load();
      adminToast.success("Vendor created successfully");
    } catch (err) {
      adminToast.error(err instanceof Error ? err.message : "Failed to create vendor");
    } finally {
      setAddSaving(false);
    }
  };

  const startEdit = (v: any) => {
    setEditingId(v._id);
    setEditForm({
      name: v.name || "",
      email: v.email || "",
      phone: v.phone || "",
      password: "",
      companyName: v.companyName || "",
      contactPerson: v.contactPerson || "",
      gstNumber: v.gstNumber || "",
      businessRegNumber: v.businessRegNumber || "",
      companyAddress: v.companyAddress || "",
      warehouseAddress: v.warehouseAddress || "",
      contactPersonName: v.contactPersonName || v.contactPerson || v.name || "",
      contactPersonPhone: v.contactPersonPhone || v.phone || "",
      accountHolderName: v.bankDetails?.accountHolderName || "",
      bankName: v.bankDetails?.bankName || "",
      accountNumber: v.bankDetails?.accountNumber || "",
      ifscCode: v.bankDetails?.ifscCode || "",
      branchName: v.bankDetails?.branchName || v.bankDetails?.branch || "",
    });
    setEditFile(null);
    setEditOpen(true);
  };

  const submitEditVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    const payload: any = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.replace(/\D/g, "").slice(0, 10),
      companyName: editForm.companyName.trim(),
      contactPerson: editForm.contactPerson.trim() || editForm.name.trim(),
      gstNumber: editForm.gstNumber.trim().toUpperCase() || undefined,
      businessRegNumber: editForm.businessRegNumber.trim() || undefined,
      companyAddress: editForm.companyAddress.trim() || undefined,
      warehouseAddress: editForm.warehouseAddress.trim() || undefined,
      contactPersonName: editForm.contactPersonName.trim() || editForm.contactPerson.trim() || editForm.name.trim(),
      contactPersonPhone: editForm.contactPersonPhone.replace(/\D/g, "").slice(0, 10) || editForm.phone.replace(/\D/g, "").slice(0, 10),
      bankDetails: {
        accountHolderName: editForm.accountHolderName.trim() || undefined,
        bankName: editForm.bankName.trim() || undefined,
        accountNumber: editForm.accountNumber.trim() || undefined,
        ifscCode: editForm.ifscCode.trim().toUpperCase() || undefined,
        branchName: editForm.branchName.trim() || undefined,
      }
    };

    if (editForm.password) {
      payload.password = editForm.password;
    }

    try {
      await apiFetch(`/admin/vendors/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });

      if (editFile) {
        const fd = new FormData();
        fd.append("document", editFile);
        await apiFetch(`/admin/vendors/${editingId}/documents`, { method: "POST", body: fd });
      }

      setEditOpen(false);
      setEditingId(null);
      setEditFile(null);
      load();
      adminToast.success("Vendor updated successfully");
    } catch (err) {
      adminToast.error(err instanceof Error ? err.message : "Failed to update vendor");
    } finally {
      setEditSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await apiFetch(`/admin/vendors/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      adminToast.success(`Vendor status set to ${newStatus}`);
      load();
    } catch (err) {
      adminToast.error(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  const filtered = vendors.filter(v => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.companyName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalVendors = pagination.total || 0;
  const approvedCount = vendors.filter(v => v.vendorStatus === "APPROVED").length;
  const pendingCount = vendors.filter(v => v.vendorStatus === "PENDING_APPROVAL").length;

  const visibleIds = useMemo(() => filtered.map((v) => String(v._id)), [filtered]);
  const deleteHook = useAdminListDelete({
    singleDeleteUrl: (id) => `/admin/vendors/${id}`,
    bulkDeleteUrl: "/admin/vendors/bulk-delete",
    onSuccess: load,
    itemLabel: "vendors",
  });

  return (
    <div className="admin-page">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="admin-page-title text-sb-ink">Vendor Management</h1>
          <p className="admin-page-desc">Onboard vendors here; public self-registration is off unless the server enables it.</p>
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
          <div className="admin-stat-value text-sb-ink">{totalVendors}</div>
          <div className="text-xs text-sb-ink/50 mt-1">Total Vendors</div>
        </div>
        <div className="bg-sb-cream-secondary border border-sb-orange/22 rounded-xl p-4 text-center">
          <div className="admin-stat-value text-sb-ink">{approvedCount}</div>
          <div className="text-xs text-sb-ink/50 mt-1">Approved</div>
        </div>
        <div className="bg-sb-cream-secondary border-b border-sb-ink/10 border border-sb-orange/20 rounded-xl p-4 text-center cursor-pointer hover:border-sb-orange/40 transition-colors" onClick={() => setStatusFilter("PENDING_APPROVAL")}>
          <div className="admin-stat-value text-sb-orange">{pendingCount}</div>
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

      <AdminListDeleteControls
        deleteHook={deleteHook}
        visibleIds={visibleIds}
        disabled={loading || deleteHook.busy}
        itemLabel="vendors"
      />

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-sb-orange" /></div> : (
        <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl overflow-hidden">
          <div className="sb-table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sb-ink/10">
                  <AdminTableSelectHeader
                    checked={deleteHook.allVisibleSelected(visibleIds)}
                    onChange={() => deleteHook.toggleAllVisible(visibleIds)}
                  />
                  {["Company", "Vendor ID", "Contact Person", "Mobile Number", "Approval Status", "Account Status", "Joined", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-sb-ink/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const rowId = String(v._id);
                  return (
                    <tr key={v._id} className="border-b border-sb-ink/8 hover:bg-sb-cream-secondary/90 transition-colors">
                      <AdminTableSelectCell
                        checked={deleteHook.isSelected(rowId)}
                        onChange={() => deleteHook.toggleRow(rowId)}
                        ariaLabel={`Select vendor ${v.name}`}
                      />
                      <td className="py-3.5 px-4 font-medium text-sb-ink">
                        <div>
                          <p className="font-semibold">{v.companyName || "—"}</p>
                          <p className="text-xs text-sb-ink/50">{v.name}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {v.referenceNumber ? (
                          <span className="font-mono text-xs bg-sb-orange/10 text-sb-orange border border-sb-orange/20 rounded px-1.5 py-0.5">{v.referenceNumber}</span>
                        ) : (
                          <span className="text-xs text-sb-ink/35">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-sb-ink/65">{v.contactPersonName || v.contactPerson || "—"}</td>
                      <td className="py-3.5 px-4">
                        <p className="text-xs text-sb-ink/65">{v.phone}</p>
                        <p className="text-xs text-sb-ink/50">{v.email}</p>
                      </td>
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
                          <button onClick={() => navigate(`/vendors/${v._id}`)} title="View profile" className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink hover:border-sb-ink/20 transition-colors bg-sb-cream">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => startEdit(v)} title="Edit profile" className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink hover:border-sb-ink/20 transition-colors bg-sb-cream">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => toggleStatus(v._id, v.status)} title={v.status === "ACTIVE" ? "Deactivate account" : "Activate account"} className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink hover:border-sb-ink/20 transition-colors bg-sb-cream">
                            {v.status === "ACTIVE" ? <ToggleRight className="w-3.5 h-3.5 text-sb-orange" /> : <ToggleLeft className="w-3.5 h-3.5 text-sb-ink/40" />}
                          </button>
                          {v.vendorStatus === "PENDING_APPROVAL" && (
                            <>
                              <button onClick={() => approve(v._id)} title="Approve" className="p-1.5 border border-sb-orange/22 rounded-lg text-sb-orange hover:bg-sb-orange/10 transition-colors bg-sb-cream">
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setRejectTarget(v._id)} title="Reject" className="p-1.5 border border-sb-ink/18 rounded-lg text-sb-ink/55 hover:bg-sb-cream-secondary transition-colors bg-sb-cream">
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <AdminRowDeleteButton
                            onClick={() => deleteHook.requestDelete([rowId], v.companyName || v.name)}
                            disabled={deleteHook.busy}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-sb-ink/20" />
              <p className="text-sb-ink/45">No vendors found.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Vendor Modal */}
      {addOpen && (
        <Modal title="Add Vendor" onClose={() => !addSaving && setAddOpen(false)}>
          <form onSubmit={submitAddVendor} className="space-y-6">
            {/* Section 1: Basic Info */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs text-sb-orange uppercase tracking-wider border-b border-sb-ink/10 pb-1">Section 1 – Basic Information</h4>
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="text-xs text-sb-ink/55 mb-1 block">Initial password *</label>
                  <input className={inp} type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} required />
                </div>
              </div>
            </div>

            {/* Section 2: Business Info */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs text-sb-orange uppercase tracking-wider border-b border-sb-ink/10 pb-1">Section 2 – Business Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-sb-ink/55 mb-1 block">Company Name *</label>
                  <input className={inp} value={addForm.companyName} onChange={e => setAddForm(f => ({ ...f, companyName: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">GST Number (optional)</label>
                  <input className={inp} value={addForm.gstNumber} onChange={e => setAddForm(f => ({ ...f, gstNumber: e.target.value }))} placeholder="22AAAAA0000A1Z5" />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Business Registration Number</label>
                  <input className={inp} value={addForm.businessRegNumber} onChange={e => setAddForm(f => ({ ...f, businessRegNumber: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-sb-ink/55 mb-1 block">Company Address</label>
                  <textarea rows={2} className={inp} value={addForm.companyAddress} onChange={e => setAddForm(f => ({ ...f, companyAddress: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-sb-ink/55 mb-1 block">Warehouse Address</label>
                  <textarea rows={2} className={inp} value={addForm.warehouseAddress} onChange={e => setAddForm(f => ({ ...f, warehouseAddress: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Section 3: Contact Info */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs text-sb-orange uppercase tracking-wider border-b border-sb-ink/10 pb-1">Section 3 – Contact Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Contact Person Name</label>
                  <input className={inp} value={addForm.contactPersonName} onChange={e => setAddForm(f => ({ ...f, contactPersonName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Contact Person Phone</label>
                  <input className={inp} value={addForm.contactPersonPhone} onChange={e => setAddForm(f => ({ ...f, contactPersonPhone: e.target.value }))} placeholder="9876543210" />
                </div>
              </div>
            </div>

            {/* Section 4: Banking Info */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs text-sb-orange uppercase tracking-wider border-b border-sb-ink/10 pb-1">Section 4 – Banking Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Account Holder Name</label>
                  <input className={inp} value={addForm.accountHolderName} onChange={e => setAddForm(f => ({ ...f, accountHolderName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Bank Name</label>
                  <input className={inp} value={addForm.bankName} onChange={e => setAddForm(f => ({ ...f, bankName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Account Number</label>
                  <input className={inp} value={addForm.accountNumber} onChange={e => setAddForm(f => ({ ...f, accountNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">IFSC Code</label>
                  <input className={inp} value={addForm.ifscCode} onChange={e => setAddForm(f => ({ ...f, ifscCode: e.target.value }))} placeholder="SBIN0001234" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-sb-ink/55 mb-1 block">Branch Name</label>
                  <input className={inp} value={addForm.branchName} onChange={e => setAddForm(f => ({ ...f, branchName: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-sb-ink/55 mb-1 block">Cancelled Cheque Upload</label>
                  <input type="file" accept="image/*,application/pdf" onChange={e => setAddFile(e.target.files?.[0] || null)} className="w-full text-xs text-sb-ink/60" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-sb-ink/10">
              <button type="submit" disabled={addSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sb-orange hover:bg-sb-orange-hover text-white font-bold text-sm disabled:opacity-50 transition-colors">
                {addSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Vendor
              </button>
              <button type="button" disabled={addSaving} onClick={() => setAddOpen(false)} className="px-5 py-2.5 rounded-lg border border-sb-ink/15 text-sb-ink/60 text-sm hover:bg-sb-cream-secondary transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Vendor Modal */}
      {editOpen && (
        <Modal title={`Edit Vendor — ${editForm.companyName}`} onClose={() => !editSaving && setEditOpen(false)}>
          <form onSubmit={submitEditVendor} className="space-y-6">
            {/* Section 1: Basic Info */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs text-sb-orange uppercase tracking-wider border-b border-sb-ink/10 pb-1">Section 1 – Basic Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Contact name *</label>
                  <input className={inp} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Email *</label>
                  <input className={inp} type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Phone (10 digit) *</label>
                  <input className={inp} value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">New password (optional)</label>
                  <input className={inp} type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank to keep current" />
                </div>
              </div>
            </div>

            {/* Section 2: Business Info */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs text-sb-orange uppercase tracking-wider border-b border-sb-ink/10 pb-1">Section 2 – Business Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-sb-ink/55 mb-1 block">Company Name *</label>
                  <input className={inp} value={editForm.companyName} onChange={e => setEditForm(f => ({ ...f, companyName: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">GST Number</label>
                  <input className={inp} value={editForm.gstNumber} onChange={e => setEditForm(f => ({ ...f, gstNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Business Registration Number</label>
                  <input className={inp} value={editForm.businessRegNumber} onChange={e => setEditForm(f => ({ ...f, businessRegNumber: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-sb-ink/55 mb-1 block">Company Address</label>
                  <textarea rows={2} className={inp} value={editForm.companyAddress} onChange={e => setEditForm(f => ({ ...f, companyAddress: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-sb-ink/55 mb-1 block">Warehouse Address</label>
                  <textarea rows={2} className={inp} value={editForm.warehouseAddress} onChange={e => setEditForm(f => ({ ...f, warehouseAddress: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Section 3: Contact Info */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs text-sb-orange uppercase tracking-wider border-b border-sb-ink/10 pb-1">Section 3 – Contact Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Contact Person Name</label>
                  <input className={inp} value={editForm.contactPersonName} onChange={e => setEditForm(f => ({ ...f, contactPersonName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Contact Person Phone</label>
                  <input className={inp} value={editForm.contactPersonPhone} onChange={e => setEditForm(f => ({ ...f, contactPersonPhone: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Section 4: Banking Info */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs text-sb-orange uppercase tracking-wider border-b border-sb-ink/10 pb-1">Section 4 – Banking Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Account Holder Name</label>
                  <input className={inp} value={editForm.accountHolderName} onChange={e => setEditForm(f => ({ ...f, accountHolderName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Bank Name</label>
                  <input className={inp} value={editForm.bankName} onChange={e => setEditForm(f => ({ ...f, bankName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">Account Number</label>
                  <input className={inp} value={editForm.accountNumber} onChange={e => setEditForm(f => ({ ...f, accountNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-sb-ink/55 mb-1 block">IFSC Code</label>
                  <input className={inp} value={editForm.ifscCode} onChange={e => setEditForm(f => ({ ...f, ifscCode: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-sb-ink/55 mb-1 block">Branch Name</label>
                  <input className={inp} value={editForm.branchName} onChange={e => setEditForm(f => ({ ...f, branchName: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-sb-ink/55 mb-1 block">Update Cancelled Cheque</label>
                  <input type="file" accept="image/*,application/pdf" onChange={e => setEditFile(e.target.files?.[0] || null)} className="w-full text-xs text-sb-ink/60" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-sb-ink/10">
              <button type="submit" disabled={editSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sb-orange hover:bg-sb-orange-hover text-white font-bold text-sm disabled:opacity-50 transition-colors">
                {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
              <button type="button" disabled={editSaving} onClick={() => setEditOpen(false)} className="px-5 py-2.5 rounded-lg border border-sb-ink/15 text-sb-ink/60 text-sm hover:bg-sb-cream-secondary transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      <AdminInputModal
        open={!!rejectTarget}
        title="Reject vendor"
        label="Rejection reason"
        required
        multiline
        confirmLabel="Reject vendor"
        busy={rejectBusy}
        onCancel={() => setRejectTarget(null)}
        onConfirm={async (reason) => {
          if (!rejectTarget) return;
          setRejectBusy(true);
          try {
            await reject(rejectTarget, reason);
            setRejectTarget(null);
          } finally {
            setRejectBusy(false);
          }
        }}
      />
    </div>
  );
}
