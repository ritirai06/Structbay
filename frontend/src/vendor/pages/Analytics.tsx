import { useState, useEffect } from 'react';
import { TrendingUp, Package, CheckCircle, Clock, FileText, Truck, RefreshCw, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { api } from '../lib/api';

const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };

const STATUS_LABELS: Record<string, string> = {
  new_order_alert: 'New', ready_for_dispatch: 'Ready', vendor_invoice_sent: 'Invoice Sent',
  dispatched: 'Dispatched', pickup_scheduled: 'Pickup', material_handed_over: 'Handed Over',
  in_transit: 'In Transit', material_delivered: 'Delivered', delivery_confirmed: 'Confirmed',
  completed: 'Completed', cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  new_order_alert: '#E85A00', ready_for_dispatch: '#A855F7', vendor_invoice_sent: '#F59E0B',
  dispatched: '#818CF8', pickup_scheduled: '#22D3EE', material_handed_over: '#818CF8',
  in_transit: '#6366F1', material_delivered: '#22C55E', delivery_confirmed: '#22C55E',
  completed: '#22C55E', cancelled: '#EF4444',
};

const PERIOD_OPTIONS = [
  { value: '7',  label: '7 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
];

function StatBlock({ label, value, icon: Icon, color = SB.orange }: { label: string; value: string | number; icon: typeof Package; color?: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
      <div className="flex items-start justify-between mb-3">
        <p className="vendor-section-title" style={{ color: SB.muted }}>{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="vendor-metric" style={{ color: SB.color }}>{value}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs shadow-xl" style={{ background: 'var(--sb-card-raised)', border: '1px solid var(--sb-border)' }}>
      <p className="font-bold mb-1" style={{ color: SB.color }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-semibold">{p.value}</span></p>
      ))}
    </div>
  );
};

export function Analytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  async function load() {
    setLoading(true);
    try {
      const res = await api.analytics(period);
      setData(res.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [period]);

  const statusData = (data?.ordersByStatus ?? []).map((s: any) => ({
    name: STATUS_LABELS[s._id] ?? s._id,
    value: s.count,
    fill: STATUS_COLORS[s._id] ?? '#888',
  }));

  const dateData = (data?.ordersByDate ?? []).map((d: any) => ({
    date: d._id,
    Orders: d.count,
    Amount: Math.round(d.amount / 1000),
  }));

  const invoiceData = (data?.invoiceStats ?? []).map((s: any) => ({
    name: s._id.charAt(0).toUpperCase() + s._id.slice(1),
    value: s.count,
  }));

  const dispatchData = (data?.dispatchStats ?? []).map((s: any) => ({
    name: s._id.charAt(0).toUpperCase() + s._id.slice(1),
    value: s.count,
  }));

  const avgHrs = data?.avgFulfillmentTime ? Math.round(data.avgFulfillmentTime) : 0;
  const totalOrders = statusData.reduce((a: number, b: any) => a + b.value, 0);
  const completedOrders = statusData.filter((s: any) => ['Completed', 'Confirmed', 'Delivered'].includes(s.name)).reduce((a: number, b: any) => a + b.value, 0);
  const invoiceCompliance = invoiceData.length
    ? Math.round(((invoiceData.find((x: any) => x.name !== 'Pending')?.value ?? 0) / (invoiceData.reduce((a: number, b: any) => a + b.value, 0) || 1)) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="vendor-page-title" style={{ color: SB.color }}>Performance Analytics</h1>
          <p className="text-sm mt-0.5" style={{ color: SB.muted }}>Fulfillment and dispatch performance metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${SB.border}` }}>
            {PERIOD_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setPeriod(opt.value)}
                className="px-3 py-2 text-xs font-semibold transition-colors"
                style={period === opt.value
                  ? { background: 'var(--sb-orange)', color: '#fff' }
                  : { background: SB.card, color: SB.muted }}>
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2 rounded-xl" style={{ background: SB.card, border: `1px solid ${SB.border}`, color: SB.muted }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatBlock label="Total Orders" value={loading ? '—' : totalOrders} icon={Package} />
        <StatBlock label="Completed" value={loading ? '—' : completedOrders} icon={CheckCircle} color="#22C55E" />
        <StatBlock label="Pending" value={loading ? '—' : (statusData.find((s: any) => s.name === 'New')?.value ?? 0)} icon={Clock} color="#F59E0B" />
        <StatBlock label="Invoice Compliance" value={loading ? '—' : `${invoiceCompliance}%`} icon={FileText} color="#818CF8" />
        <StatBlock label="Avg Fulfillment" value={loading ? '—' : `${avgHrs}h`} icon={TrendingUp} color="#22D3EE" />
        <StatBlock label="Dispatched" value={loading ? '—' : (statusData.find((s: any) => s.name === 'Dispatched')?.value ?? 0)} icon={Truck} color="#A855F7" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: SB.orange, borderTopColor: 'transparent' }} />
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center py-20">
          <BarChart2 className="w-12 h-12 mb-3" style={{ color: SB.faint }} />
          <p style={{ color: SB.muted }}>No analytics data available</p>
        </div>
      ) : (
        <>
          {/* Orders Over Time */}
          {dateData.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
              <h2 className="vendor-section-title mb-5" style={{ color: SB.muted }}>Orders Over Time</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={SB.border} />
                  <XAxis dataKey="date" tick={{ fill: SB.faint, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: SB.faint, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: SB.muted, fontSize: 12 }} />
                  <Line type="monotone" dataKey="Orders" stroke="var(--sb-orange)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--sb-orange)' }} />
                  <Line type="monotone" dataKey="Amount" stroke="#818CF8" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#818CF8' }} name="Amount (₹K)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Order Status Breakdown */}
            {statusData.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
                <h2 className="vendor-section-title mb-5" style={{ color: SB.muted }}>Order Status Breakdown</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                      {statusData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {statusData.slice(0, 5).map((s: any) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: s.fill }} />
                        <span style={{ color: SB.muted }}>{s.name}</span>
                      </div>
                      <span className="font-bold" style={{ color: SB.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invoice Status */}
            {invoiceData.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
                <h2 className="vendor-section-title mb-5" style={{ color: SB.muted }}>Invoice Compliance</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={invoiceData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke={SB.border} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: SB.faint, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: SB.faint, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Orders" radius={[6, 6, 0, 0]}>
                      {invoiceData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.name === 'Pending' ? '#EF4444' : entry.name === 'Verified' ? '#22C55E' : '#F59E0B'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 text-center">
                  <p className="vendor-page-title" style={{ color: invoiceCompliance >= 80 ? '#22C55E' : '#F59E0B' }}>{invoiceCompliance}%</p>
                  <p className="text-xs mt-0.5" style={{ color: SB.faint }}>Invoice Upload Compliance</p>
                </div>
              </div>
            )}

            {/* Dispatch Status */}
            {dispatchData.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
                <h2 className="vendor-section-title mb-5" style={{ color: SB.muted }}>Dispatch Performance</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dispatchData} layout="vertical" barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke={SB.border} horizontal={false} />
                    <XAxis type="number" tick={{ fill: SB.faint, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: SB.faint, fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Orders" fill="var(--sb-orange)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 text-center">
                  <p className="text-xs" style={{ color: SB.faint }}>Avg Fulfillment Time</p>
                  <p className="vendor-metric mt-0.5" style={{ color: avgHrs > 0 && avgHrs <= 48 ? '#22C55E' : SB.color }}>{avgHrs}h</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
