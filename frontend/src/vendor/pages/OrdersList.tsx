import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { vendorPath } from '../../lib/portalRoutes';
import { Search, Filter, FileText, Upload, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';

const STATUS_OPTIONS = [
  { value: '',                  label: 'All Status' },
  { value: 'new_order_alert',   label: 'New Order' },
  { value: 'ready_for_dispatch',label: 'Ready for Dispatch' },
  { value: 'vendor_invoice_sent',label: 'Invoice Sent' },
  { value: 'dispatched',        label: 'Dispatched' },
  { value: 'in_transit',        label: 'In Transit' },
  { value: 'material_delivered',label: 'Delivered' },
  { value: 'delivery_confirmed',label: 'Confirmed' },
  { value: 'completed',         label: 'Completed' },
];

const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };

export function OrdersList() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (search)       params.search        = search;
      if (status)       params.status        = status;
      if (invoiceStatus)params.invoiceStatus = invoiceStatus;
      const res = await api.getOrders(params);
      setOrders(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, [search, status, invoiceStatus, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black" style={{ color: SB.color }}>Assigned Orders</h1>
        <p className="text-sm mt-0.5" style={{ color: SB.muted }}>Only orders assigned to you by StructBay are shown here.</p>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map(s => {
          const active = status === s.value;
          return (
            <button key={s.value} onClick={() => { setStatus(s.value); setPage(1); }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={active
                ? { background: 'var(--sb-orange)', color: '#fff', boxShadow: '0 4px 12px var(--sb-orange-glow)' }
                : { background: SB.card, color: SB.muted, border: `1px solid ${SB.border}` }
              }
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
        {/* Search + filter bar */}
        <div className="flex flex-col md:flex-row gap-3 p-4" style={{ borderBottom: `1px solid ${SB.border}` }}>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: SB.faint }} />
            <input type="text" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by order number, product or customer..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
              style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.color }}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: SB.faint }} />
            <select value={invoiceStatus} onChange={e => { setInvoiceStatus(e.target.value); setPage(1); }}
              className="pl-9 pr-8 py-2.5 rounded-xl text-sm appearance-none"
              style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.color, minWidth: 180 }}
            >
              <option value="">All Invoices</option>
              <option value="pending">Invoice Pending</option>
              <option value="uploaded">Invoice Uploaded</option>
              <option value="verified">Invoice Verified</option>
              <option value="rejected">Invoice Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${SB.border}` }}>
                {['Order #', 'Product', 'Qty', 'Customer', 'City', 'Assigned', 'Invoice', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: SB.faint }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-12 text-center">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: 'var(--sb-orange)', borderTopColor: 'transparent' }} />
                </td></tr>
              ) : orders.map(o => (
                <tr key={o._id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(55,65,81,0.3)' }}>
                  <td className="py-3.5 px-4 font-bold whitespace-nowrap" style={{ color: SB.orange }}>{o.orderNumber}</td>
                  <td className="py-3.5 px-4 max-w-[160px]">
                    <p className="font-medium truncate" style={{ color: SB.color }}>{o.assignedProducts?.[0]?.productName ?? '—'}</p>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: SB.muted }}>
                    {o.assignedProducts?.[0]?.quantity ?? '—'} {o.assignedProducts?.[0]?.unit ?? ''}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: SB.color }}>{o.customer?.name ?? '—'}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: SB.muted }}>{o.deliveryAddress?.city ?? '—'}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: SB.muted }}>
                    {new Date(o.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4">
                    {o.invoiceStatus === 'pending'
                      ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>Pending</span>
                      : <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>✓ {o.invoiceStatus}</span>
                    }
                  </td>
                  <td className="py-3.5 px-4"><StatusBadge status={o.status} /></td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <Link to={vendorPath('orders', String(o._id))} className="p-1.5 rounded-lg" title="View Details" style={{ color: SB.orange }}>
                        <FileText className="w-4 h-4" />
                      </Link>
                      {o.invoiceStatus === 'pending' && (
                        <Link to={vendorPath('orders', String(o._id), 'invoice')} className="p-1.5 rounded-lg" title="Upload Invoice" style={{ color: SB.muted }}>
                          <Upload className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && orders.length === 0 && (
                <tr><td colSpan={9}>
                  <div className="flex flex-col items-center py-16">
                    <Package className="w-12 h-12 mb-3" style={{ color: SB.faint }} />
                    <p className="font-semibold" style={{ color: SB.muted }}>No orders found</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${SB.border}` }}>
          <p className="text-xs" style={{ color: SB.faint }}>Showing {orders.length} of {total} orders</p>
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
      </div>
    </div>
  );
}
