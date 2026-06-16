import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { Search, RefreshCw, Eye, Pencil, Trash2, Loader2, ClipboardList, Check, Download } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import { AdminDeleteConfirmModal } from "../components/AdminDeleteConfirmModal";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-sb-orange/15 text-sb-orange border-sb-orange/25",
  IN_PROGRESS: "bg-sb-orange/12 text-sb-orange border-sb-orange/25",
  QUOTED: "bg-sb-cream-secondary text-sb-ink border-sb-ink/12",
  CONVERTED: "bg-sb-orange/12 text-sb-orange border-sb-orange/22",
  CANCELLED: "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/15",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10 sticky top-0 bg-sb-cream-secondary">
          <h3 className="font-bold text-sb-ink">{title}</h3>
          <button type="button" onClick={onClose} className="text-sb-ink/55 hover:text-sb-ink text-xl">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inp =
  "w-full bg-sb-cream border border-sb-ink/15 rounded-lg px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink/45 focus:outline-none focus:border-sb-orange transition-colors";

type AdminMini = { _id: string; name?: string; email?: string };

function assignedId(row: { assignedTo?: { _id?: string } | string | null }) {
  const a = row.assignedTo;
  if (!a) return "";
  if (typeof a === "object" && a._id) return String(a._id);
  return String(a);
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadConcreteRfqCsv(rows: Record<string, unknown>[]) {
  const cols = [
    "rfqNumber",
    "customerName",
    "customerPhone",
    "customerEmail",
    "grade",
    "quantity",
    "city",
    "location",
    "status",
    "pumpRequired",
    "createdAt",
  ] as const;
  const lines = [cols.join(",")];
  for (const r of rows) {
    lines.push(cols.map((c) => csvEscape(r[c])).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `concrete-rfqs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type PendingDelete = { kind: "one" | "bulk"; ids: string[]; summary: string };

export function RFQManagement() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, quoted: 0, converted: 0 });
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState<AdminMini[]>([]);
  const [assignDraft, setAssignDraft] = useState("");
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback((opts?: { soft?: boolean }) => {
    const soft = opts?.soft === true;
    if (!soft) {
      setLoading(true);
      setLoadError(null);
    }
    const params = new URLSearchParams({ limit: "20" });
    if (statusFilter) params.set("status", statusFilter);
    const listP = apiFetch(`/concrete-rfqs?${params}`)
      .then((d) => {
        const raw = d.data;
        if (!Array.isArray(raw)) {
          setItems([]);
          if (!soft) setLoadError("Unexpected response from server (expected a list of RFQs).");
          return;
        }
        setItems(raw);
      })
      .catch((e) => {
        setItems([]);
        if (!soft) setLoadError(e instanceof Error ? e.message : "Failed to load RFQs.");
      });
    const statsP = apiFetch("/concrete-rfqs/stats")
      .then((d) => {
        if (d.data && typeof d.data === "object") setStats(d.data as typeof stats);
      })
      .catch(() => {});
    return Promise.all([listP, statsP]).finally(() => {
      if (!soft) setLoading(false);
    });
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void apiFetch("/admin/users?role=ADMIN&limit=100")
      .then((d) => {
        const raw = d.data;
        setAdmins(Array.isArray(raw) ? (raw as AdminMini[]) : []);
      })
      .catch(() => setAdmins([]));
  }, []);

  useEffect(() => {
    if (selected) setAssignDraft(assignedId(selected));
  }, [selected]);

  /** Drop row selections that disappeared after reload. */
  useEffect(() => {
    const ids = new Set(items.map((i) => String(i._id)));
    setSelectedIds((prev) => prev.filter((id) => ids.has(id)));
  }, [items]);

  const update = async (id: string, patch: Record<string, unknown>, opts?: { closeModal?: boolean }) => {
    setSaving(true);
    setUpdateMsg(null);
    try {
      const env = await apiFetch(`/concrete-rfqs/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      const next = env.data as Record<string, unknown> | undefined;
      if (next && typeof next === "object" && selected?._id === id) {
        setSelected(next);
        setAssignDraft(assignedId(next as { assignedTo?: { _id?: string } | string | null }));
      }
      if (patch.status !== undefined || patch.assignedTo !== undefined) {
        setUpdateMsg(
          "Update saved. Customer receives an email when status or assignment changes (if their RFQ has an email and SMTP is configured)."
        );
      } else if (patch.adminNotes !== undefined) {
        setUpdateMsg("Notes saved.");
      }
      await load({ soft: true });
      if (opts?.closeModal) setSelected(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (!q) return true;
      const num = String(i.rfqNumber ?? "");
      const name = String(i.customerName ?? "").toLowerCase();
      const city = String(i.city ?? "").toLowerCase();
      return num.includes(search) || name.includes(q) || city.includes(q);
    });
  }, [items, q, search]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredIds = useMemo(() => filtered.map((i) => String(i._id)), [filtered]);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedSet.has(id));
  const someFilteredSelected = filteredIds.some((id) => selectedSet.has(id)) && !allFilteredSelected;

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const runConfirmedDelete = async () => {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    try {
      if (pendingDelete.kind === "one") {
        await apiFetch(`/concrete-rfqs/${pendingDelete.ids[0]}`, { method: "DELETE" });
      } else {
        await apiFetch("/concrete-rfqs/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ ids: pendingDelete.ids }),
        });
      }
      const removed = new Set(pendingDelete.ids);
      if (selected && removed.has(String(selected._id))) {
        setSelected(null);
        setUpdateMsg(null);
      }
      setPendingDelete(null);
      setSelectedIds((prev) => prev.filter((id) => !removed.has(id)));
      await load({ soft: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteBusy(false);
    }
  };

  const exportRows = (rows: Record<string, unknown>[]) => {
    if (!rows.length) return;
    downloadConcreteRfqCsv(rows);
  };

  return (
    <div className="p-6 bg-sb-cream min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-sb-ink">Concrete RFQ Management</h1>
        <p className="text-sb-ink/55 text-sm mt-1">Ready-Mix Concrete quotation requests — RFQCON format</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total RFQs", value: stats.total, color: "text-sb-ink" },
          { label: "Pending", value: stats.pending, color: "text-sb-orange" },
          { label: "In Progress", value: stats.inProgress, color: "text-sb-orange" },
          { label: "Quoted", value: stats.quoted, color: "text-sb-ink" },
          { label: "Converted", value: stats.converted, color: "text-sb-orange" },
        ].map((s) => (
          <div key={s.label} className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-sb-ink/50 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {loadError && (
        <div className="mb-5 rounded-xl border border-sb-ink/18 bg-sb-cream-secondary px-4 py-3 text-sm text-sb-ink">
          <p className="font-semibold text-sb-ink">Could not load concrete RFQs</p>
          <p className="mt-1 text-sb-ink/85 whitespace-pre-wrap">{loadError}</p>
          <p className="mt-2 text-xs text-sb-ink/65">
            Common causes: <strong className="font-semibold text-sb-ink/80">API not running</strong> (Vite proxy
            ECONNREFUSED to port 5000), admin session expired, or account is not role ADMIN.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sb-ink/45" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RFQ number, customer, city..."
            className="w-full pl-9 pr-4 py-2 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sm text-sb-ink px-3 py-2 focus:outline-none focus:border-sb-orange transition-colors"
        >
          <option value="">All Status</option>
          {["PENDING", "IN_PROGRESS", "QUOTED", "CONVERTED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void load()}
          className="p-2 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-sb-orange/25 bg-sb-orange/10 px-4 py-3 text-sm text-sb-ink">
          <span className="font-semibold">{selectedIds.length} selected</span>
          <button
            type="button"
            onClick={() =>
              setPendingDelete({
                kind: "bulk",
                ids: selectedIds,
                summary: `${selectedIds.length} concrete RFQ(s)`,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-600/40 bg-red-600/10 px-3 py-1.5 text-xs font-bold text-red-800 hover:bg-red-600/15"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Delete selected
          </button>
          <button
            type="button"
            onClick={() => exportRows(filtered.filter((i) => selectedSet.has(String(i._id))))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sb-ink/15 bg-sb-cream-secondary px-3 py-1.5 text-xs font-bold text-sb-ink hover:border-sb-orange/40"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export selected
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="ml-auto text-xs font-medium text-sb-ink/55 hover:text-sb-ink underline-offset-2 hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-sb-orange" />
        </div>
      ) : (
        <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[880px]">
            <thead>
              <tr className="border-b border-sb-ink/10">
                <th className="w-10 py-3 px-2">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someFilteredSelected;
                    }}
                    onChange={toggleSelectAllFiltered}
                    aria-label="Select all on page"
                    className="rounded border-sb-ink/25"
                  />
                </th>
                {["RFQ No.", "Customer", "Grade", "Qty", "Location / City", "Pump", "Assigned", "Status", "Date", "Actions"].map(
                  (h) => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-sb-ink/50">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item._id} className="border-b border-sb-ink/8 hover:bg-sb-cream-secondary/90 transition-colors">
                  <td className="py-3 px-2">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(String(item._id))}
                      onChange={() => toggleRow(String(item._id))}
                      aria-label={`Select ${item.rfqNumber}`}
                      className="rounded border-sb-ink/25"
                    />
                  </td>
                  <td className="py-3.5 px-3 font-mono text-xs font-bold text-sb-orange">{item.rfqNumber}</td>
                  <td className="py-3.5 px-3">
                    <p className="font-medium text-sb-ink">{item.customerName}</p>
                    <p className="text-xs text-sb-ink/50">{item.customerPhone}</p>
                  </td>
                  <td className="py-3.5 px-3 font-bold text-sb-orange">{item.grade}</td>
                  <td className="py-3.5 px-3 text-sb-ink/65">{item.quantity} m³</td>
                  <td className="py-3.5 px-3">
                    <p className="text-sb-ink/65">{item.location}</p>
                    <p className="text-xs text-sb-ink/50">{item.city}</p>
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        item.pumpRequired ? "text-sb-orange" : "text-sb-ink/45"
                      }`}
                    >
                      {item.pumpRequired ? (
                        <>
                          <Check className="w-3.5 h-3.5 shrink-0" aria-hidden /> Yes
                        </>
                      ) : (
                        "No"
                      )}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    {item.assignedTo ? (
                      <span className="text-xs text-sb-ink/65">{item.assignedTo.name}</span>
                    ) : (
                      <span className="text-xs text-sb-ink/45 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        STATUS_COLORS[item.status] || "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/12"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-xs text-sb-ink/50">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="View"
                        onClick={() => setSelected(item)}
                        className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink hover:border-sb-ink/20 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => setSelected(item)}
                        className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-orange hover:border-sb-orange/30 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() =>
                          setPendingDelete({
                            kind: "one",
                            ids: [String(item._id)],
                            summary: String(item.rfqNumber ?? item._id),
                          })
                        }
                        className="p-1.5 border border-red-600/20 rounded-lg text-red-700/80 hover:bg-red-600/10 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-sb-ink/20" />
              <p className="text-sb-ink/45">No RFQs found.</p>
            </div>
          )}
        </div>
      )}

      <AdminDeleteConfirmModal
        open={!!pendingDelete}
        title={pendingDelete?.kind === "bulk" ? "Delete selected RFQs?" : "Delete this RFQ?"}
        description={
          pendingDelete ? (
            <p>
              {pendingDelete.kind === "bulk" ? (
                <>
                  You are about to remove <strong>{pendingDelete.summary}</strong> from the active list (soft delete).
                  Customers will no longer see them in history if your product hides deleted RFQs.
                </>
              ) : (
                <>
                  RFQ <strong className="font-mono">{pendingDelete.summary}</strong> will be soft-deleted and hidden
                  from admin lists. This can be reversed only via database support.
                </>
              )}
            </p>
          ) : null
        }
        busy={deleteBusy}
        onCancel={() => !deleteBusy && setPendingDelete(null)}
        onConfirm={() => void runConfirmedDelete()}
      />

      {selected && (
        <Modal
          title={`RFQ — ${selected.rfqNumber}`}
          onClose={() => {
            setUpdateMsg(null);
            setSelected(null);
          }}
        >
          <div className="space-y-4">
            {updateMsg && (
              <p className="text-xs text-sb-ink/80 rounded-lg border border-sb-orange/30 bg-sb-orange/10 px-3 py-2 leading-relaxed">
                {updateMsg}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                ["Customer", selected.customerName],
                ["Phone", selected.customerPhone],
                ["Email", selected.customerEmail || selected.customer?.email || "—"],
                ["Grade", selected.grade],
                ["Quantity", `${selected.quantity} m³`],
                ["Location", selected.location],
                ["City", selected.city],
                ["Pump Required", selected.pumpRequired ? "Yes" : "No"],
                ["Status", selected.status],
              ].map(([k, v]) => (
                <div key={String(k)} className="p-3 bg-sb-cream border border-sb-ink/10 rounded-lg">
                  <p className="text-[10px] text-sb-ink/50 uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="text-sm font-medium text-sb-ink break-all">{v}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-1">Assign internally</p>
              <p className="text-[11px] text-sb-ink/50 mb-2 leading-relaxed">
                Pick an <strong>admin</strong> owner for this RFQ. Click <strong>Apply assignment</strong> to save.
                Changing assignment or status sends the customer an email (when their email exists and mail is configured).
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  className={`${inp} cursor-pointer`}
                  value={assignDraft}
                  onChange={(e) => setAssignDraft(e.target.value)}
                  disabled={saving}
                >
                  <option value="">Unassigned</option>
                  {admins.map((a) => (
                    <option key={a._id} value={a._id}>
                      {(a.name || "Admin").trim()} {a.email ? `— ${a.email}` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={saving || assignDraft === assignedId(selected)}
                  onClick={() => void update(selected._id, { assignedTo: assignDraft === "" ? null : assignDraft })}
                  className="shrink-0 px-4 py-2 rounded-lg text-sm font-bold bg-sb-orange text-white hover:bg-sb-orange-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Apply assignment
                </button>
              </div>
              {admins.length === 0 && (
                <p className="text-[10px] text-sb-ink/45 mt-1">No admin users loaded — check Admin users or your session.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-2">Update Status</p>
              <div className="grid grid-cols-3 gap-2">
                {["PENDING", "IN_PROGRESS", "QUOTED", "CONVERTED", "CANCELLED"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={saving}
                    onClick={() => void update(selected._id, { status: s })}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50 ${
                      selected.status === s
                        ? "bg-sb-orange text-white border-sb-orange"
                        : "border-sb-ink/10 text-sb-ink/65 hover:border-sb-orange/40 hover:text-sb-orange"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-2">Admin Notes</p>
              <textarea
                className={`${inp} resize-none`}
                rows={3}
                defaultValue={selected.adminNotes || ""}
                id={`note-${selected._id}`}
                placeholder="Add notes for this RFQ..."
              />
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void update(selected._id, {
                    adminNotes: (document.getElementById(`note-${selected._id}`) as HTMLTextAreaElement)?.value,
                  })
                }
                className="mt-2 px-4 py-2 bg-sb-orange/15 hover:bg-sb-orange/25 text-sb-orange font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                Save Notes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
