import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Landmark, Download, Eye, X, Copy, FileText, Calendar, User, Phone, Mail, MapPin, DollarSign, Briefcase, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { adminFetch as apiFetch, getAdminToken } from "../../lib/adminApi";
import { getApiV1Base } from "../../lib/apiBase";
import { adminToast } from "../lib/adminToast";

type Lead = {
  _id: string;
  financeNumber?: string;
  name?: string;
  mobile?: string;
  email?: string;
  companyName?: string;
  projectLocation?: string;
  businessType?: string;
  loanAmountRequired?: number;
  status?: string;
  assignedTo?: { _id: string; name: string; email: string } | null;
  createdAt?: string;
};

type LeadDetail = Lead & {
  gstNumber?: string;
  projectType?: string;
  purposeOfLoan?: string;
  monthlyTurnover?: number;
  internalNotes?: string;
  documents?: any[];
  statusHistory?: any[];
  activityLog?: any[];
  disbursedAmount?: number;
  disbursedAt?: string;
};

type AdminMini = { _id: string; name?: string; email?: string };

const STATUSES = ["NEW", "UNDER_REVIEW", "DOCUMENTS_REQUESTED", "APPROVED", "REJECTED", "DISBURSED", "CLOSED"];

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200",
  UNDER_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  DOCUMENTS_REQUESTED: "bg-purple-50 text-purple-700 border-purple-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  DISBURSED: "bg-green-50 text-green-700 border-green-200",
  CLOSED: "bg-gray-50 text-gray-700 border-gray-200",
};

const STATUS_ICONS: Record<string, any> = {
  NEW: AlertCircle,
  UNDER_REVIEW: Clock,
  DOCUMENTS_REQUESTED: FileText,
  APPROVED: CheckCircle,
  REJECTED: AlertCircle,
  DISBURSED: CheckCircle,
  CLOSED: CheckCircle,
};

function DetailModal({ lead, onClose, onRefresh, admins }: { lead: LeadDetail; onClose: () => void; onRefresh: () => void; admins: AdminMini[] }) {
  const [saving, setSaving] = useState(false);
  const [statusDraft, setStatusDraft] = useState(lead.status || "NEW");
  const [assignDraft, setAssignDraft] = useState(lead.assignedTo?._id || "");
  const [noteDraft, setNoteDraft] = useState(lead.internalNotes || "");

  const updateStatus = async () => {
    setSaving(true);
    try {
      await apiFetch(`/finance/leads/${lead._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: statusDraft, note: "" }),
      });
      adminToast.success("Status updated");
      onRefresh();
      onClose();
    } catch (e) {
      adminToast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const updateAssign = async () => {
    setSaving(true);
    try {
      await apiFetch(`/finance/leads/${lead._id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assignedTo: assignDraft === "" ? null : assignDraft }),
      });
      adminToast.success("Lead assigned");
      onRefresh();
    } catch (e) {
      adminToast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const updateNote = async () => {
    setSaving(true);
    try {
      await apiFetch(`/finance/leads/${lead._id}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ note: noteDraft }),
      });
      adminToast.success("Note saved");
      onRefresh();
    } catch (e) {
      adminToast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const copyDetails = () => {
    const text = `${lead.name}\n${lead.mobile}\n${lead.email || "N/A"}`;
    navigator.clipboard.writeText(text);
    adminToast.success("Details copied");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-4xl my-auto shadow-xl flex flex-col max-h-[90vh]">
        {/* Header - sticky inside the flex column */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 rounded-t-xl z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Application #{lead.financeNumber}</h2>
            <p className="text-sm text-gray-500 mt-1">Submitted on {new Date(lead.createdAt || "").toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Current Status</p>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border mt-2 ${STATUS_COLORS[lead.status || "NEW"]}`}>
                {(() => {
                  const Icon = STATUS_ICONS[lead.status || "NEW"];
                  return <Icon className="w-4 h-4" />;
                })()}
                {lead.status}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-500 uppercase">Loan Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹{(lead.loanAmountRequired || 0).toLocaleString("en-IN")}</p>
            </div>
          </div>

          {/* Personal Information */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 pb-2 border-b border-gray-200">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Name</p>
                  <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Mobile</p>
                  <p className="text-sm font-medium text-gray-900">{lead.mobile}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Email</p>
                  <p className="text-sm font-medium text-gray-900">{lead.email || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">City</p>
                  <p className="text-sm font-medium text-gray-900">{lead.projectLocation || "—"}</p>
                </div>
              </div>
            </div>
            <button onClick={copyDetails} className="mt-4 flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <Copy className="w-4 h-4" /> Copy Details
            </button>
          </section>

          {/* Employment Details */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 pb-2 border-b border-gray-200">Employment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Briefcase className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Business Type</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{lead.businessType || "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Company Name</p>
                <p className="text-sm font-medium text-gray-900">{lead.companyName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">GST Number</p>
                <p className="text-sm font-medium text-gray-900">{lead.gstNumber || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Annual Turnover</p>
                <p className="text-sm font-medium text-gray-900">₹{(lead.monthlyTurnover || 0).toLocaleString("en-IN")}</p>
              </div>
            </div>
          </section>

          {/* Loan Details */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 pb-2 border-b border-gray-200">Loan Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <DollarSign className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Loan Amount Required</p>
                  <p className="text-sm font-medium text-gray-900">₹{(lead.loanAmountRequired || 0).toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Purpose of Loan</p>
                <p className="text-sm font-medium text-gray-900">{lead.purposeOfLoan || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase">Project Type</p>
                <p className="text-sm font-medium text-gray-900">{lead.projectType || "—"}</p>
              </div>
            </div>
          </section>

          {/* Documents */}
          {lead.documents && lead.documents.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 pb-2 border-b border-gray-200">Documents ({lead.documents.length})</h3>
              <div className="space-y-2">
                {lead.documents.map((doc: any) => (
                  <a key={doc._id} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.label}</p>
                      <p className="text-xs text-gray-500">{doc.documentType}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${doc.isVerified ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                      {doc.isVerified ? "Verified" : "Pending"}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Lead Management */}
          <section className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide pb-2 border-b border-gray-200">Lead Management</h3>

            {/* Status Update */}
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase">Change Status</label>
              <div className="flex gap-2 mt-2">
                <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)} disabled={saving} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <button onClick={updateStatus} disabled={saving || statusDraft === lead.status} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {saving ? "..." : "Update"}
                </button>
              </div>
            </div>

            {/* Assign Lead */}
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase">Assign to Staff</label>
              <div className="flex gap-2 mt-2">
                <select value={assignDraft} onChange={(e) => setAssignDraft(e.target.value)} disabled={saving} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                  <option value="">Unassigned</option>
                  {admins.map((a) => (
                    <option key={a._id} value={a._id}>{a.name || "Admin"}</option>
                  ))}
                </select>
                <button onClick={updateAssign} disabled={saving || assignDraft === (lead.assignedTo?._id || "")} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {saving ? "..." : "Assign"}
                </button>
              </div>
              {lead.assignedTo && <p className="text-xs text-gray-600 mt-2">Currently assigned to <span className="font-medium">{lead.assignedTo.name}</span></p>}
            </div>
          </section>

          {/* Internal Notes */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 pb-2 border-b border-gray-200">Internal Notes</h3>
            <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Add internal notes..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none" rows={3} />
            <button onClick={updateNote} disabled={saving} className="mt-2 px-4 py-2 bg-gray-200 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {saving ? "Saving..." : "Save Notes"}
            </button>
          </section>

          {/* Activity Timeline */}
          {lead.activityLog && lead.activityLog.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 pb-2 border-b border-gray-200">Activity Timeline</h3>
              <div className="space-y-3">
                {[...lead.activityLog].reverse().map((log: any, idx: number) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      {idx < lead.activityLog.length - 1 && <div className="w-0.5 h-8 bg-gray-200 mt-1"></div>}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-medium text-gray-900">{log.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {log.performedBy?.name || "System"} • {new Date(log.performedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function FinanceLeadsManagement() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);
  const [admins, setAdmins] = useState<AdminMini[]>([]);
  const [stats, setStats] = useState({ total: 0, new: 0, underReview: 0, approved: 0 });

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch("/finance/leads?limit=50"),
      apiFetch("/finance/dashboard"),
      apiFetch("/admin/users?role=ADMIN&limit=100"),
    ])
      .then(([leadsRes, dashRes, adminsRes]) => {
        setLeads(leadsRes.data || []);
        const sm = dashRes.data?.statusMap || {};
        setStats({
          total: dashRes.data?.total || 0,
          new: sm.NEW || 0,
          underReview: (sm.UNDER_REVIEW || 0) + (sm.DOCUMENTS_REQUESTED || 0),
          approved: sm.APPROVED || 0,
        });
        setAdmins(Array.isArray(adminsRes.data) ? adminsRes.data : []);
      })
      .catch((e: Error) => {
        setError(e.message || "Failed to load leads");
        setLeads([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (leadId: string) => {
    try {
      const res = await apiFetch(`/finance/leads/${leadId}`);
      setSelectedLead(res.data);
    } catch (e) {
      adminToast.error(e instanceof Error ? e.message : "Failed to load lead");
    }
  };

  const exportCsv = async () => {
    const base = getApiV1Base().replace(/\/$/, "");
    const token = getAdminToken();
    if (!token) {
      setError("Sign in as admin to export.");
      return;
    }
    try {
      const res = await fetch(`${base}/finance/leads/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "finance-leads.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
  };

  const filtered = leads.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (l.financeNumber || "").toLowerCase().includes(q) ||
        (l.name || "").toLowerCase().includes(q) ||
        (l.mobile || "").includes(q) ||
        (l.email || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="admin-page">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="admin-page-title text-gray-900">Finance Leads</h1>
          <p className="admin-page-desc">Professional lead management for builder finance applications</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Leads", value: stats.total },
          { label: "New", value: stats.new },
          { label: "In Progress", value: stats.underReview },
          { label: "Approved", value: stats.approved },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{loading ? "—" : value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, name, mobile..." className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500">
          <option value="">All Status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button onClick={load} className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {["Application ID", "Applicant Name", "Mobile", "Email", "City", "Loan Amount", "Status", "Assigned To", "Submitted", ""].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openDetail(lead._id)}>
                  <td className="py-3 px-4 font-mono text-xs font-bold text-blue-600">{lead.financeNumber}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">{lead.name}</td>
                  <td className="py-3 px-4 text-gray-600">{lead.mobile}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{lead.email || "—"}</td>
                  <td className="py-3 px-4 text-gray-600">{lead.projectLocation || "—"}</td>
                  <td className="py-3 px-4 font-semibold text-gray-900">₹{(lead.loanAmountRequired || 0).toLocaleString("en-IN")}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[lead.status || "NEW"]}`}>
                      {(() => {
                        const Icon = STATUS_ICONS[lead.status || "NEW"];
                        return <Icon className="w-3 h-3" />;
                      })()}
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{lead.assignedTo?.name || "—"}</td>
                  <td className="py-3 px-4 text-xs text-gray-500">{new Date(lead.createdAt || "").toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <Eye className="w-4 h-4 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-500">
              <Landmark className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No finance leads found</p>
            </div>
          )}
        </div>
      )}

      {selectedLead && (
        <DetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} onRefresh={load} admins={admins} />
      )}
    </div>
  );
}
