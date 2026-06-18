import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Eye } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import { AdminDeleteConfirmModal } from "../components/AdminDeleteConfirmModal";
import { adminToast } from "../lib/adminToast";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  UNDER_REVIEW: "bg-blue-100 text-blue-800 border-blue-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  COMPLETED: "bg-gray-100 text-gray-600 border-gray-200",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10 sticky top-0 bg-sb-cream-secondary">
          <h3 className="font-bold text-sb-ink">{title}</h3>
          <button type="button" onClick={onClose} className="text-sb-ink/55 hover:text-sb-ink text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ReplacementManagement() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingReview, setPendingReview] = useState<null | "approve" | "reject">(null);

  const load = useCallback(() => {
    setLoading(true);
    const q = statusFilter ? `?status=${encodeURIComponent(statusFilter)}&limit=50` : "?limit=50";
    apiFetch(`/replacements${q}`)
      .then((d) => setItems(Array.isArray(d.data) ? d.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const review = async (decision: "approve" | "reject") => {
    if (!selected?._id) return;
    setSaving(true);
    try {
      await apiFetch(`/replacements/${selected._id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ decision, notes: reviewNotes.trim() || undefined }),
      });
      adminToast.success(
        decision === "approve" ? "Replacement approved" : "Replacement rejected",
        selected.masterOrder?.orderNumber || undefined
      );
      setPendingReview(null);
      setSelected(null);
      setReviewNotes("");
      load();
    } catch (e: any) {
      adminToast.error("Review failed", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 min-h-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="admin-page-title text-sb-ink">Replacement Requests</h1>
          <p className="text-sb-ink/55 text-sm mt-1">Customer replacement workflow — review wrong or damaged product claims.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-3 mb-5">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-sb-cream-secondary border border-sb-ink/15 rounded-md px-3 py-2 text-sm text-sb-ink"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sb-orange" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-sb-ink/45 py-16">No replacement requests yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sb-ink/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sb-ink/10 text-left text-xs uppercase tracking-wider text-sb-ink/50">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r._id} className="border-b border-sb-ink/8 hover:bg-sb-cream/50">
                  <td className="py-3 px-4 font-mono text-sb-orange">{r.masterOrder?.orderNumber || "—"}</td>
                  <td className="py-3 px-4">{r.customer?.name || r.customer?.email || "—"}</td>
                  <td className="py-3 px-4 text-sb-ink/70">{String(r.reason || "").replace(/_/g, " ")}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sb-ink/55 text-xs">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="outline" size="sm" onClick={() => { setSelected(r); setReviewNotes(""); }}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal title={`Replacement — ${selected.masterOrder?.orderNumber || selected._id}`} onClose={() => setSelected(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-sb-ink/50 uppercase">Customer</p>
                <p className="font-medium">{selected.customer?.name}</p>
                <p className="text-sb-ink/55">{selected.customer?.email}</p>
              </div>
              <div>
                <p className="text-xs text-sb-ink/50 uppercase">Status</p>
                <p className="font-medium">{selected.status}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-sb-ink/50 uppercase mb-1">Reason</p>
              <p>{String(selected.reason || "").replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs text-sb-ink/50 uppercase mb-1">Description</p>
              <p className="whitespace-pre-wrap bg-sb-cream border border-sb-ink/10 rounded-lg p-3">{selected.description || "—"}</p>
            </div>
            {["PENDING", "UNDER_REVIEW"].includes(selected.status) && (
              <>
                <div>
                  <label className="text-xs text-sb-ink/55 block mb-1">Review notes (optional)</label>
                  <textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full border border-sb-ink/15 rounded-lg px-3 py-2 text-sm"
                    placeholder="Notes sent to customer notification…"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    disabled={saving}
                    onClick={() => setPendingReview("approve")}
                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  >
                    Approve
                  </Button>
                  <Button
                    disabled={saving}
                    variant="outline"
                    onClick={() => setPendingReview("reject")}
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Reject
                  </Button>
                </div>
              </>
            )}
            {selected.reviewNotes && (
              <div>
                <p className="text-xs text-sb-ink/50 uppercase mb-1">Admin notes</p>
                <p className="text-sb-ink/70">{selected.reviewNotes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      <AdminDeleteConfirmModal
        open={!!pendingReview}
        title={pendingReview === "approve" ? "Approve replacement?" : "Reject replacement?"}
        description={
          pendingReview === "approve"
            ? "The customer will be notified that this replacement request was approved."
            : "The customer will be notified that this replacement request was rejected."
        }
        confirmLabel={pendingReview === "approve" ? "Approve" : "Reject"}
        tone={pendingReview === "approve" ? "primary" : "danger"}
        busy={saving}
        onCancel={() => {
          if (!saving) setPendingReview(null);
        }}
        onConfirm={() => {
          if (pendingReview) void review(pendingReview);
        }}
      />
    </div>
  );
}
