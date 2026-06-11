import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { Download, Eye, Loader2, RefreshCw, FileText, ExternalLink } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";

function formatInr(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function statusClass(label: string) {
  if (label === "Issued" || label === "Paid") return "bg-green-500/15 text-green-400 border-green-500/25";
  if (label.includes("pending")) return "bg-[#FE5E00]/15 text-[#FE5E00] border-[#FE5E00]/25";
  return "bg-white/8 text-[#D4C4A8]/70 border-white/12";
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
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-bold text-[#F4E9D8]">{title}</h3>
          <button type="button" onClick={onClose} className="text-[#D4C4A8]/60 hover:text-[#F4E9D8] text-xl">
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

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F4E9D8]">Invoice Management</h1>
          <p className="text-[#D4C4A8]/60 text-sm mt-1">Orders with payment or invoice documents — amounts from live orders.</p>
        </div>
        <button
          type="button"
          onClick={() => void load(listPage)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-[#1A1A1A] text-sm text-[#D4C4A8] hover:text-[#F4E9D8] self-start"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4">
          <p className="text-xs text-[#D4C4A8]/50 uppercase font-semibold">Records</p>
          <p className="text-3xl font-black text-[#F4E9D8] mt-1 tabular-nums">{totalRows}</p>
          <p className="text-[10px] text-[#D4C4A8]/40 mt-2">Paid or invoice-linked orders (excl. cancelled)</p>
        </div>
        <div className="bg-[#1A1A1A] border border-[#FE5E00]/20 rounded-xl p-4">
          <p className="text-xs text-[#D4C4A8]/50 uppercase font-semibold">Pending payment</p>
          <p className="text-3xl font-black text-[#FE5E00] mt-1 tabular-nums">{formatInr(pending)}</p>
          <p className="text-[10px] text-[#D4C4A8]/40 mt-2">Sum of grand total where payment is still pending</p>
        </div>
        <div className="bg-[#1A1A1A] border border-green-500/20 rounded-xl p-4">
          <p className="text-xs text-[#D4C4A8]/50 uppercase font-semibold">Collected (paid)</p>
          <p className="text-3xl font-black text-green-400 mt-1 tabular-nums">{formatInr(collected)}</p>
          <p className="text-[10px] text-[#D4C4A8]/40 mt-2">
            Sum of grand total for orders marked paid. Upload PDFs on the order record where applicable.
          </p>
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#FE5E00]" />
            <h2 className="font-bold text-[#F4E9D8] text-sm">Recent billing activity</h2>
          </div>
          <span className="text-xs text-[#D4C4A8]/50">
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
            <Loader2 className="h-6 w-6 animate-spin text-[#FE5E00]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead>
                <tr className="border-b border-white/8 text-left text-xs uppercase tracking-wider text-[#D4C4A8]/50">
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
                {rows.map((r) => (
                  <tr key={r._id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono text-[#F4E9D8]">{r.invoiceLabel}</td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/orders?search=${encodeURIComponent(r.orderNumber)}`}
                        className="font-mono text-[#FE5E00] hover:underline inline-flex items-center gap-1"
                      >
                        {r.orderNumber}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-[#D4C4A8]/80">{r.customerName}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#D4C4A8]/80">₹{Number(r.subtotal || 0).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#D4C4A8]/80">₹{Number(r.gstTotal || 0).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4 text-right font-semibold text-[#F4E9D8] tabular-nums">
                      ₹{Number(r.grandTotal || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusClass(r.displayStatus)}`}>
                        {r.displayStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#D4C4A8]/50 whitespace-nowrap">
                      {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelected(r)}
                          className="p-1.5 border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8]"
                          title="Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {r.pdfUrl ? (
                          <a
                            href={r.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] inline-flex"
                            title="Download / open PDF"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="p-1.5 text-[#D4C4A8]/25 inline-flex" title="No PDF on file">
                            <Download className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="py-16 text-center text-[#D4C4A8]/45 text-sm">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                No invoice rows yet. When customers pay or you attach invoice URLs on orders, they appear here.
              </div>
            )}
          </div>
        )}
        {!loading && pagination.pages > 1 && (
          <div className="flex justify-center flex-wrap gap-2 px-4 py-3 border-t border-white/8">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setListPage(p)}
                className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium transition-colors ${
                  p === listPage
                    ? "bg-[#FE5E00] text-black"
                    : "bg-[#0D0D0D] border border-white/10 text-[#D4C4A8] hover:border-[#FE5E00]/50"
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
          <div className="space-y-3 text-sm text-[#D4C4A8]/80">
            <p>
              <span className="text-[#D4C4A8]/50">Order:</span>{" "}
              <span className="font-mono text-[#F4E9D8]">{selected.orderNumber}</span>
            </p>
            <p>
              <span className="text-[#D4C4A8]/50">Customer:</span> {selected.customerName}
            </p>
            <p>
              <span className="text-[#D4C4A8]/50">Payment:</span> {selected.paymentStatus}
            </p>
            <p>
              <span className="text-[#D4C4A8]/50">Display status:</span> {selected.displayStatus}
            </p>
            <p className="text-[#F4E9D8] font-semibold pt-2">
              Grand total: ₹{Number(selected.grandTotal || 0).toLocaleString("en-IN")}
            </p>
            <div className="flex flex-wrap gap-2 pt-3">
              {selected.pdfUrl && (
                <a
                  href={selected.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FE5E00] text-[#0D0D0D] font-bold text-sm"
                >
                  <Download className="h-4 w-4" />
                  Open invoice PDF
                </a>
              )}
              <Link
                to={`/orders?search=${encodeURIComponent(selected.orderNumber)}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-[#F4E9D8] text-sm"
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
