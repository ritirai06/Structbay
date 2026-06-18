import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Package, Clock, Truck, CheckCircle, Upload, Download, Send, AlertCircle, TrendingUp, ArrowRight, Activity, RefreshCw, CheckCircle2 } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { vendorPath } from '../../lib/portalRoutes';

const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };

function Spinner() {
  return <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: 'var(--sb-orange)', borderTopColor: 'transparent' }} />;
}

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.dashboard();
      setData(res.data);
    } catch { /* keep showing stale */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const stats = data?.orderStats ?? {};
  const monthly = data?.monthlyFulfillment ?? {};
  const recentOrders: any[] = data?.recentOrders ?? [];
  const recentActivities: any[] = data?.recentActivities ?? [];
  const notifications: any[] = data?.recentNotifications ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="vendor-page-title" style={{ color: SB.color }}>Dashboard</h1>
          <p className="text-sm mt-0.5 font-normal" style={{ color: SB.muted }}>
            Welcome back, {user?.companyName ?? user?.name ?? 'Vendor'}!
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-2 rounded-xl transition-colors" style={{ background: SB.card, border: `1px solid ${SB.border}`, color: SB.muted }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Active Vendor
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="col-span-2 md:col-span-1 lg:col-span-2">
          <StatCard title="Total Assigned Orders" value={loading ? '—' : stats.total ?? 0} icon={Package} accent trend="All time" />
        </div>
        <StatCard title="Pending" value={loading ? '—' : stats.pending ?? 0} icon={Clock} trend="Need action" />
        <StatCard title="Ready Dispatch" value={loading ? '—' : stats.readyForDispatch ?? 0} icon={Send} trend="Awaiting pickup" />
        <StatCard title="In Transit" value={loading ? '—' : stats.inTransit ?? 0} icon={Truck} trend="On the way" />
        <StatCard title="Invoice Pending" value={loading ? '—' : stats.pendingInvoices ?? 0} icon={AlertCircle} trend="Upload required" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick Actions */}
        <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
          <h2 className="vendor-section-title mb-4" style={{ color: SB.muted }}>Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: vendorPath('orders'),       icon: Package,  label: 'View Orders',    sub: 'Assigned to you' },
              { to: vendorPath('orders'),       icon: Upload,   label: 'Upload Invoice', sub: 'Pending uploads' },
              { to: vendorPath('dispatch'),     icon: Truck,    label: 'Dispatch',       sub: 'Ready orders' },
              { to: vendorPath('documents'),    icon: Download, label: 'Documents',      sub: 'Download files' },
            ].map(({ to, icon: Icon, label, sub }) => (
              <Link
                key={label} to={to}
                className="flex flex-col items-center justify-center p-4 rounded-xl text-center group transition-all duration-200 hover:-translate-y-1"
                style={{ background: SB.bg, border: `1px solid ${SB.border}` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sb-orange)'; e.currentTarget.style.boxShadow = '0 4px 16px var(--sb-orange-glow)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = SB.border; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110" style={{ background: 'var(--sb-orange-subtle)' }}>
                  <Icon className="w-5 h-5" style={{ color: 'var(--sb-orange)' }} />
                </div>
                <p className="vendor-quick-action-label" style={{ color: SB.color }}>{label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: SB.faint }}>{sub}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="vendor-section-title" style={{ color: SB.muted }}>Monthly Summary</h2>
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--sb-orange)' }} />
          </div>
          {loading ? <div className="py-8"><Spinner /></div> : (
            <div className="space-y-4">
              {[
                { label: 'Total Orders',     val: monthly.totalOrders ?? 0,     max: Math.max(monthly.totalOrders ?? 0, 1),     fmt: (v: number) => v.toString() },
                { label: 'Completed Orders', val: monthly.completedOrders ?? 0, max: Math.max(monthly.totalOrders ?? 1, 1),     fmt: (v: number) => v.toString() },
              ].map(({ label, val, max, fmt }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: SB.muted }}>{label}</span>
                    <span className="font-semibold" style={{ color: SB.color }}>{fmt(val)}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: SB.border }}>
                    <div className="h-full rounded-full" style={{ width: `${(val / max) * 100}%`, background: 'var(--sb-orange)' }} />
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-4 grid grid-cols-2 gap-3 text-center" style={{ borderTop: `1px solid ${SB.border}` }}>
                <div className="rounded-xl p-3" style={{ background: SB.bg }}>
                  <p className="vendor-metric" style={{ color: SB.color }}>
                    ₹{monthly.totalAmount ? (monthly.totalAmount / 100000).toFixed(1) + 'L' : '0'}
                  </p>
                  <p className="text-[11px] mt-0.5 font-normal" style={{ color: SB.faint }}>This Month</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: SB.bg }}>
                  <p className="vendor-metric" style={{ color: '#22C55E' }}>{monthly.completedOrders ?? 0}</p>
                  <p className="text-[11px] mt-0.5 font-normal" style={{ color: SB.faint }}>Completed</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="vendor-section-title" style={{ color: SB.muted }}>Recent Activity</h2>
            <Activity className="w-4 h-4" style={{ color: 'var(--sb-orange)' }} />
          </div>
          {loading ? <div className="py-8"><Spinner /></div> : (
            <div className="space-y-2.5">
              {recentActivities.slice(0, 6).map((a: any) => (
                <div key={a._id} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--sb-orange)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: SB.color }}>{a.description}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: SB.faint }}>
                      {new Date(a.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && <p className="text-xs py-4 text-center" style={{ color: SB.faint }}>No recent activity</p>}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${SB.border}` }}>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: 'var(--sb-orange)' }} />
            <h2 className="vendor-section-title" style={{ color: SB.muted }}>Recent Assigned Orders</h2>
          </div>
          <Link to={vendorPath('orders')} className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--sb-orange)' }}>
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="py-12"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${SB.border}` }}>
                  {['Order #', 'Product', 'Qty', 'City', 'Invoice', 'Status', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: SB.faint }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o: any) => (
                  <tr key={o._id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(55,65,81,0.3)' }}>
                    <td className="py-3 px-4 font-semibold" style={{ color: 'var(--sb-orange)' }}>{o.orderNumber}</td>
                    <td className="py-3.5 px-4 max-w-[160px]">
                      <p className="truncate font-medium" style={{ color: SB.color }}>
                        {o.assignedProducts?.[0]?.productName ?? '—'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: SB.muted }}>
                      {o.assignedProducts?.[0]?.quantity ?? '—'} {o.assignedProducts?.[0]?.unit ?? ''}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap" style={{ color: SB.muted }}>{o.deliveryAddress?.city ?? '—'}</td>
                    <td className="py-3.5 px-4">
                      {o.invoiceStatus === 'pending'
                        ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-sb-ink/15 bg-sb-cream-secondary text-sb-ink/70">Pending</span>
                        : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border border-sb-orange/22 bg-sb-orange/10 text-sb-orange">
                            <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden />
                            <span className="capitalize">{o.invoiceStatus}</span>
                          </span>
                        )
                      }
                    </td>
                    <td className="py-3.5 px-4"><StatusBadge status={o.status as any} /></td>
                    <td className="py-3.5 px-4">
                      <Link to={vendorPath('orders', String(o._id))} className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--sb-orange)' }}>
                        View
                        <ArrowRight className="w-3 h-3" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-sm" style={{ color: SB.faint }}>No orders assigned yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
