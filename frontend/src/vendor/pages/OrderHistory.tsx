import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { History, Download, FileText, Truck, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { vendorPath } from '../../lib/portalRoutes';

const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };

export function OrderHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getOrderHistory(page);
      setOrders(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / limit);

  async function handleDownloadInvoice(orderId: string) {
    try {
      const res = await api.getInvoiceByOrder(orderId);
      if (res.data?.invoiceUrl) window.open(res.data.invoiceUrl, '_blank');
    } catch { alert('No invoice found for this order.'); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--sb-orange-subtle)', border: '1px solid var(--sb-orange-border)' }}>
          <History className="w-5 h-5" style={{ color: SB.orange }} />
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: SB.color }}>Order History</h1>
          <p className="text-sm mt-0.5" style={{ color: SB.muted }}>Completed and confirmed delivery orders.</p>
        </div>
        <span className="ml-auto text-sm font-semibold px-3 py-1.5 rounded-xl" style={{ background: SB.card, color: SB.muted, border: `1px solid ${SB.border}` }}>
          {total} orders
        </span>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: SB.orange, borderTopColor: 'transparent' }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Package className="w-12 h-12 mb-3" style={{ color: SB.faint }} />
            <p className="font-semibold" style={{ color: SB.muted }}>No completed orders yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${SB.border}` }}>
                    {['Order #', 'Product', 'Customer', 'City', 'Delivered', 'Total', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: SB.faint }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o._id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(55,65,81,0.3)' }}>
                      <td className="py-3.5 px-4 font-bold whitespace-nowrap" style={{ color: SB.orange }}>
                        <Link to={vendorPath('orders', String(o._id))} className="hover:underline">{o.orderNumber}</Link>
                      </td>
                      <td className="py-3.5 px-4 max-w-[160px]">
                        <p className="font-medium truncate" style={{ color: SB.color }}>{o.assignedProducts?.[0]?.productName ?? '—'}</p>
                        <p className="text-xs mt-0.5" style={{ color: SB.faint }}>{o.assignedProducts?.[0]?.quantity} {o.assignedProducts?.[0]?.unit}</p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: SB.muted }}>{o.customer?.name ?? '—'}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: SB.muted }}>{o.deliveryAddress?.city ?? '—'}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: SB.muted }}>
                        {o.actualDeliveryDate ? new Date(o.actualDeliveryDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold" style={{ color: SB.color }}>
                        ₹{o.totalAmount?.toLocaleString('en-IN') ?? '—'}
                      </td>
                      <td className="py-3.5 px-4"><StatusBadge status={o.status} /></td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Link to={vendorPath('orders', String(o._id))} className="p-1.5 rounded-lg" title="View Order" style={{ color: SB.orange, background: 'var(--sb-orange-subtle)' }}>
                            <FileText className="w-4 h-4" />
                          </Link>
                          <button onClick={() => handleDownloadInvoice(o._id)} className="p-1.5 rounded-lg" title="Download Invoice"
                            style={{ color: SB.muted, background: SB.bg, border: `1px solid ${SB.border}` }}>
                            <Download className="w-4 h-4" />
                          </button>
                          <Link to={vendorPath('dispatch')} className="p-1.5 rounded-lg" title="Dispatch Record"
                            style={{ color: SB.muted, background: SB.bg, border: `1px solid ${SB.border}` }}>
                            <Truck className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${SB.border}` }}>
              <p className="text-xs" style={{ color: SB.faint }}>Showing {orders.length} of {total} completed orders</p>
              {pages > 1 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg disabled:opacity-40" style={{ color: SB.muted, border: `1px solid ${SB.border}` }}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs" style={{ color: SB.muted }}>Page {page} of {pages}</span>
                  <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                    className="p-1.5 rounded-lg disabled:opacity-40" style={{ color: SB.muted, border: `1px solid ${SB.border}` }}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
