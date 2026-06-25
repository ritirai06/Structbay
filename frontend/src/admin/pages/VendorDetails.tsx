import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Loader2, Edit, CheckCircle, XCircle, ToggleLeft, ToggleRight, FileText, Download, Upload } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import { adminToast } from "../lib/adminToast";
import { AdminInputModal } from "../components/AdminInputModal";

export function VendorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "banking" | "activity">("overview");

  // Rejection state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectBusy, setRejectBusy] = useState(false);

  // File upload state
  const [chequeFile, setChequeFile] = useState<File | null>(null);
  const [uploadingCheque, setUploadingCheque] = useState(false);

  // Load Vendor function
  const loadVendor = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiFetch<any>(`/admin/vendors/${id}`);
      setVendor(res.data);
    } catch (err) {
      adminToast.error(err instanceof Error ? err.message : "Failed to load vendor details");
      navigate("/vendors");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadVendor();
  }, [loadVendor]);

  // Actions
  const handleApprove = async () => {
    if (!vendor) return;
    try {
      await apiFetch(`/admin/vendors/${vendor._id}/approve`, { method: "PUT" });
      adminToast.success("Vendor approved successfully");
      loadVendor();
    } catch (err) {
      adminToast.error(err instanceof Error ? err.message : "Approve failed");
    }
  };

  const handleReject = async (reason: string) => {
    if (!vendor) return;
    setRejectBusy(true);
    try {
      await apiFetch(`/admin/vendors/${vendor._id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      });
      adminToast.success("Vendor rejected");
      setRejectOpen(false);
      loadVendor();
    } catch (err) {
      adminToast.error(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setRejectBusy(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!vendor) return;
    const newStatus = vendor.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await apiFetch(`/admin/vendors/${vendor._id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      adminToast.success(`Vendor status set to ${newStatus}`);
      loadVendor();
    } catch (err) {
      adminToast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleChequeUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !chequeFile) return;
    setUploadingCheque(true);
    try {
      const fd = new FormData();
      fd.append("document", chequeFile);
      const res = await apiFetch<any>(`/admin/vendors/${vendor._id}/documents`, {
        method: "POST",
        body: fd,
      });
      adminToast.success("Cancelled cheque uploaded successfully");
      setChequeFile(null);
      loadVendor();
    } catch (err) {
      adminToast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingCheque(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-sb-orange" />
        <p className="text-sm text-sb-ink/50">Loading vendor details...</p>
      </div>
    );
  }

  if (!vendor) return null;

  return (
    <div className="admin-page admin-shell">
      {/* Back & Breadcrumb */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate("/vendors")}
          className="p-2 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink hover:border-sb-ink/20 transition-colors bg-sb-cream-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-xs text-sb-ink/40">Vendor Management / Profile</span>
          <h1 className="admin-page-title text-sb-ink flex items-center gap-2 mt-0.5">
            {vendor.companyName}
            {vendor.referenceNumber && (
              <span className="font-mono text-xs bg-sb-orange/10 text-sb-orange border border-sb-orange/20 rounded px-2 py-0.5 ml-2">
                {vendor.referenceNumber}
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Header Actions Panel */}
      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-sb-orange/15 flex items-center justify-center text-sb-orange font-bold text-lg shrink-0">
            {vendor.name[0]}
          </div>
          <div>
            <p className="font-semibold text-base text-sb-ink">{vendor.name}</p>
            <p className="text-xs text-sb-ink/50">{vendor.email} • {vendor.phone}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2.5">
          {vendor.vendorStatus === "PENDING_APPROVAL" && (
            <>
              <button
                onClick={handleApprove}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sb-orange hover:bg-sb-orange-hover text-white text-sm font-semibold transition-colors"
              >
                <CheckCircle className="w-4 h-4" /> Approve Vendor
              </button>
              <button
                onClick={() => setRejectOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-sb-ink/15 text-sb-ink/65 hover:bg-sb-cream hover:text-sb-ink text-sm font-semibold transition-colors"
              >
                <XCircle className="w-4 h-4" /> Reject Vendor
              </button>
            </>
          )}
          <button
            onClick={handleToggleStatus}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-sb-ink/10 text-sb-ink/75 hover:bg-sb-cream hover:text-sb-ink text-sm font-semibold transition-colors"
          >
            {vendor.status === "ACTIVE" ? (
              <>
                <ToggleRight className="w-4 h-4 text-sb-orange" /> Active Status
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-sb-ink/40" /> Suspended Status
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-sb-ink/10 mb-6 gap-6">
        {[
          { key: "overview", label: "Overview" },
          { key: "banking", label: "Banking Details" },
          { key: "activity", label: "Activity Log" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`pb-3 font-semibold text-sm transition-colors relative ${
              activeTab === t.key ? "text-sb-orange" : "text-sb-ink/50 hover:text-sb-ink"
            }`}
          >
            {t.label}
            {activeTab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sb-orange rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-6 min-h-[300px]">
        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-sb-orange uppercase tracking-wider mb-3">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Company Name</p>
                  <p className="font-semibold text-sm text-sb-ink">{vendor.companyName || "—"}</p>
                </div>
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">GST Number</p>
                  <p className="font-mono font-semibold text-sm text-sb-ink">{vendor.gstNumber || "—"}</p>
                </div>
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream md:col-span-2">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Company Address</p>
                  <p className="text-sm text-sb-ink leading-relaxed whitespace-pre-wrap">{vendor.companyAddress || "—"}</p>
                </div>
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream md:col-span-2">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Warehouse Address</p>
                  <p className="text-sm text-sb-ink leading-relaxed whitespace-pre-wrap">{vendor.warehouseAddress || "—"}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-sb-orange uppercase tracking-wider mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Contact Person Name</p>
                  <p className="font-semibold text-sm text-sb-ink">{vendor.contactPersonName || vendor.contactPerson || "—"}</p>
                </div>
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Contact Person Phone</p>
                  <p className="font-semibold text-sm text-sb-ink">{vendor.contactPersonPhone || vendor.phone || "—"}</p>
                </div>
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Email</p>
                  <p className="text-sm text-sb-ink">{vendor.email}</p>
                </div>
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Mobile</p>
                  <p className="text-sm text-sb-ink">{vendor.phone}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-sb-orange uppercase tracking-wider mb-3">Status Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Approval Status</p>
                  <p className="font-semibold text-sm text-sb-ink">{vendor.vendorStatus}</p>
                </div>
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Account status</p>
                  <p className="font-semibold text-sm text-sb-ink">{vendor.status}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Banking Details */}
        {activeTab === "banking" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-sb-orange uppercase tracking-wider mb-3">Bank Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Account Holder Name</p>
                  <p className="font-semibold text-sm text-sb-ink">{vendor.bankDetails?.accountHolderName || "—"}</p>
                </div>
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Bank Name</p>
                  <p className="font-semibold text-sm text-sb-ink">{vendor.bankDetails?.bankName || "—"}</p>
                </div>
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Account Number</p>
                  <p className="font-semibold text-sm text-sb-ink font-mono">{vendor.bankDetails?.accountNumber || "—"}</p>
                </div>
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">IFSC Code</p>
                  <p className="font-semibold text-sm text-sb-ink font-mono">{vendor.bankDetails?.ifscCode || "—"}</p>
                </div>
                <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream md:col-span-2">
                  <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Branch Name</p>
                  <p className="font-semibold text-sm text-sb-ink">{vendor.bankDetails?.branchName || vendor.bankDetails?.branch || "—"}</p>
                </div>
              </div>
            </div>

            {/* Cancelled Cheque Display */}
            <div>
              <h3 className="text-sm font-semibold text-sb-orange uppercase tracking-wider mb-3">Cancelled Cheque</h3>
              <div className="p-5 border border-sb-ink/8 rounded-lg bg-sb-cream flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-sb-orange shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-sb-ink">Cancelled Cheque File</p>
                    <p className="text-xs text-sb-ink/40">
                      {vendor.cancelledChequeFile || vendor.bankDetails?.cancelledChequeFile
                        ? "Cheque file is uploaded and verified."
                        : "No cheque file uploaded yet."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(vendor.cancelledChequeFile || vendor.bankDetails?.cancelledChequeFile) && (
                    <a
                      href={vendor.cancelledChequeFile || vendor.bankDetails?.cancelledChequeFile}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-sb-ink/15 hover:bg-sb-cream-secondary hover:text-sb-orange text-sb-ink/65 text-xs font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download / View
                    </a>
                  )}

                  {/* Inline Cheque Upload Form */}
                  <form onSubmit={handleChequeUpload} className="flex items-center gap-2">
                    <input
                      type="file"
                      id="cheque-upload-btn"
                      accept="image/*,application/pdf"
                      onChange={e => setChequeFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="cheque-upload-btn"
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-sb-ink/15 bg-white hover:bg-sb-cream-secondary text-sb-ink/65 text-xs font-semibold transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" /> {chequeFile ? chequeFile.name : "Select File"}
                    </label>
                    {chequeFile && (
                      <button
                        type="submit"
                        disabled={uploadingCheque}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sb-orange hover:bg-sb-orange-hover text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {uploadingCheque ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Upload"}
                      </button>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Activity */}
        {activeTab === "activity" && (
          <div>
            <h3 className="text-sm font-semibold text-sb-orange uppercase tracking-wider mb-3">System Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Created At</p>
                <p className="font-semibold text-sm text-sb-ink">{new Date(vendor.createdAt).toLocaleString()}</p>
              </div>
              <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Updated At</p>
                <p className="font-semibold text-sm text-sb-ink">{new Date(vendor.updatedAt).toLocaleString()}</p>
              </div>
              <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Last Login</p>
                <p className="font-semibold text-sm text-sb-ink">
                  {vendor.lastLogin ? new Date(vendor.lastLogin).toLocaleString() : "Never logged in"}
                </p>
              </div>
              <div className="p-4 border border-sb-ink/8 rounded-lg bg-sb-cream">
                <p className="text-xs text-sb-ink/45 uppercase tracking-wider font-semibold mb-1">Last Profile Update</p>
                <p className="font-semibold text-sm text-sb-ink">{new Date(vendor.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reject Reason input modal */}
      <AdminInputModal
        open={rejectOpen}
        title="Reject vendor application"
        label="Reason for rejection"
        required
        multiline
        confirmLabel="Confirm Reject"
        busy={rejectBusy}
        onCancel={() => setRejectOpen(false)}
        onConfirm={handleReject}
      />
    </div>
  );
}
