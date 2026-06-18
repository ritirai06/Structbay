import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router";
import { Download, Eye, Loader2, RefreshCw, FileText, ExternalLink } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import { useAdminListDelete } from "../hooks/useAdminListDelete";
import {
  AdminListDeleteControls,
  AdminRowDeleteButton,
  AdminTableSelectCell,
  AdminTableSelectHeader,
} from "../components/AdminListDeleteControls";

function formatInr(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function statusClass(label: string) {
  if (label === "Issued" || label === "Paid") return "bg-sb-orange/12 text-sb-orange border-sb-orange/22";
  if (label.includes("pending")) return "bg-sb-orange/15 text-sb-orange border-sb-orange/25";
  return "bg-sb-cream-secondary text-sb-ink/65 border-sb-ink/12";
}

type InvoiceRow = {
  _id: string;
  invoiceLabel: string;
  orderNumber: string;
  customerName: string;
  subtotal: number;
  gstTotal: number;
  grandTotal: number;
  paymentStatus: string;
  displayStatus: string;
  pdfUrl: string | null;
  updatedAt: string;
};

type Summary = {
  totalRows: number;
  ordersWithPdf: number;
  pendingPaymentAmount: number;
  totalCollectedAmount: number;
  pendingOrderCount?: number;
  paidOrderCount?: number;
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10">
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

export function InvoiceManagement() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1, limit: 50 });
  const [listPage, setListPage] = useState(1);
  const [selected, setSelected] = useState<InvoiceRow | null>(null);

  const load = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const [invRes, sumRes] = await Promise.all([
        apiFetch<InvoiceRow[]>(`/orders/invoices?page=${page}&limit=50`),
        apiFetch<Summary>("/orders/invoices/summary"),
      ]);
      setRows((invRes.data as InvoiceRow[]) || []);
      const pg = (invRes.pagination as typeof pagination) || { total: 0, pages: 1, page: 1, limit: 50 };
      setPagination({
        total: pg.total ?? 0,
        pages: pg.pages ?? 1,
        page: pg.page ?? page,
        limit: (pg as { limit?: number }).limit ?? 50,
      });
      setSummary((sumRes.data as Summary) || null);
    } catch {
      setRows([]);
      setSummary(null);
      setPagination({ total: 0, pages: 1, page: 1, limit: 50 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(listPage);
  }, [listPage, load]);

  const totalRows = summary?.totalRows ?? pagination.total ?? 0;
  const pending = summary?.pendingPaymentAmount ?? 0;
  const collected = summary?.totalCollectedAmount ?? 0;
  const pendingCount = summary?.pendingOrderCount ?? 0;
  const paidCount = summary?.paidOrderCount ?? 0;

  const visibleIds = useMemo(() => rows.map((r) => String(r._id)), [rows]);
  const deleteHook = useAdminListDelete({
    singleDeleteUrl: (id) => `/orders/${id}`,
    bulkDeleteUrl: "/orders/bulk-delete",
    onSuccess: () => void load(listPage),
    itemLabel: "invoice records",
  });

  return (
    <div className="admin-page">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="admin-page-title text-sb-ink">Invoice Management</h1>
          <p className="admin-page-desc">Orders with payment or invoice documents — amounts from live orders.</p>
        </div>
        <button
          type="button"
          onClick={() => void load(listPage)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-sb-ink/10 bg-sb-cream-secondary text-sm text-sb-ink/60 hover:text-sb-ink self-start"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4">
          <p className="text-xs text-sb-ink/50 uppercase font-semibold">Records</p>
          <p className="admin-stat-value text-sb-ink mt-1 tabular-nums">{totalRows}</p>
          <p className="text-[10px] text-sb-ink/45 mt-2">Active billable orders (excl. cancelled & refunded)</p>
        </div>
        <div className="bg-sb-cream-secondary border border-sb-orange/20 rounded-xl p-4">
          <p className="text-xs text-sb-ink/50 uppercase font-semibold">Pending payment</p>
          <p className="admin-stat-value text-sb-orange mt-1 tabular-nums">{formatInr(pending)}</p>
          <p className="text-[10px] text-sb-ink/45 mt-2">
            {pendingCount > 0 ? `${pendingCount} order${pendingCount === 1 ? "" : "s"} · ` : ""}
            Sum of grand total where payment is still pending
          </p>
        </div>
        <div className="bg-sb-cream-secondary border border-sb-orange/22 rounded-xl p-4">
          <p className="text-xs text-sb-ink/50 uppercase font-semibold">Collected (paid)</p>
          <p className="admin-stat-value text-sb-orange mt-1 tabular-nums">{formatInr(collected)}</p>
          <p className="text-[10px] text-sb-ink/45 mt-2">
            {paidCount > 0 ? `${paidCount} order${paidCount === 1 ? "" : "s"} · ` : ""}
            Sum of grand total for orders marked paid. Upload PDFs on the order record where applicable.
          </p>
        </div>
      </div>

      <AdminListDeleteControls
        deleteHook={deleteHook}
        visibleIds={visibleIds}
        disabled={loading}
        itemLabel="records"
      />

      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-sb-ink/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-sb-orange" />
            <h2 className="font-bold text-sb-ink text-sm">Recent billing activity</h2>
          </div>
          <span className="text-xs text-sb-ink/50">
            {pagination.total
              ? `${(pagination.page - 1) * (pagination.limit || 50) + 1}–${Math.min(
                  pagination.page * (pagination.limit || 50),
                  pagination.total
                )} of ${pagination.total}`
              : "0 rows"}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-sb-orange" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead>
                <tr className="border-b border-sb-ink/10 text-left text-xs uppercase tracking-wider text-sb-ink/50">
                  <AdminTableSelectHeader
                    checked={deleteHook.allVisibleSelected(visibleIds)}
                    onChange={() => deleteHook.toggleAllVisible(visibleIds)}
                  />
                  <th className="py-3 px-4">Invoice / ref</th>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">GST</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const rowId = String(r._id);
                  return (
                  <tr key={r._id} className="border-b border-sb-ink/8 hover:bg-sb-cream-secondary/90">
                    <AdminTableSelectCell
                      checked={deleteHook.isSelected(rowId)}
                      onChange={() => deleteHook.toggleRow(rowId)}
                      ariaLabel={`Select invoice ${r.invoiceLabel}`}
                    />
                    <td className="py-3 px-4 font-mono text-sb-ink">{r.invoiceLabel}</td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/orders?search=${encodeURIComponent(r.orderNumber)}`}
                        className="font-mono text-sb-orange hover:underline inline-flex items-center gap-1"
                      >
                        {r.orderNumber}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sb-ink/70">{r.customerName}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-sb-ink/70">₹{Number(r.subtotal || 0).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-sb-ink/70">₹{Number(r.gstTotal || 0).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4 text-right font-semibold text-sb-ink tabular-nums">
                      ₹{Number(r.grandTotal || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusClass(r.displayStatus)}`}>
                        {r.displayStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-sb-ink/50 whitespace-nowrap">
                      {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelected(r)}
                          className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink"
                          title="Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {r.pdfUrl ? (
                          <a
                            href={r.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink inline-flex"
                            title="Download / open PDF"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="p-1.5 text-sb-ink/60/25 inline-flex" title="No PDF on file">
                            <Download className="h-4 w-4" />
                          </span>
                        )}
                        <AdminRowDeleteButton
                          onClick={() =>
                            deleteHook.requestDelete([rowId], `invoice ${r.invoiceLabel}`)
                          }
                          disabled={deleteHook.busy}
                        />
                      </div>
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="py-16 text-center text-sb-ink/45 text-sm">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                No invoice rows yet. When customers pay or you attach invoice URLs on orders, they appear here.
              </div>
            )}
          </div>
        )}
        {!loading && pagination.pages > 1 && (
          <div className="flex justify-center flex-wrap gap-2 px-4 py-3 border-t border-sb-ink/10">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setListPage(p)}
                className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium transition-colors ${
                  p === listPage
                    ? "bg-sb-orange text-black"
                    : "bg-sb-cream border border-sb-ink/10 text-sb-ink/60 hover:border-sb-orange/50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <Modal title={`${selected.invoiceLabel}`} onClose={() => setSelected(null)}>
          <div className="space-y-3 text-sm text-sb-ink/70">
            <p>
              <span className="text-sb-ink/50">Order:</span>{" "}
              <span className="font-mono text-sb-ink">{selected.orderNumber}</span>
            </p>
            <p>
              <span className="text-sb-ink/50">Customer:</span> {selected.customerName}
            </p>
            <p>
              <span className="text-sb-ink/50">Payment:</span> {selected.paymentStatus}
            </p>
            <p>
              <span className="text-sb-ink/50">Display status:</span> {selected.displayStatus}
            </p>
            <p className="text-sb-ink font-semibold pt-2">
              Grand total: ₹{Number(selected.grandTotal || 0).toLocaleString("en-IN")}
            </p>
            <div className="flex flex-wrap gap-2 pt-3">
              {selected.pdfUrl && (
                <a
                  href={selected.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sb-orange text-white font-bold text-sm"
                >
                  <Download className="h-4 w-4" />
                  Open invoice PDF
                </a>
              )}
              <Link
                to={`/orders?search=${encodeURIComponent(selected.orderNumber)}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-sb-ink/15 text-sb-ink text-sm"
              >
                View in orders
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
