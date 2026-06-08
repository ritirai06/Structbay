import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Archive, ChevronLeft, ChevronRight, Package, FileText, Truck, AlertCircle, Megaphone, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };

const TYPE_ICONS: Record<string, typeof Bell> = {
  order_assigned: Package,
  invoice_requested: FileText,
  dispatch_requested: Truck,
  delivery_update: Truck,
  order_status_change: Package,
  admin_announcement: Megaphone,
  system_alert: AlertCircle,
  document_verified: FileText,
  document_rejected: FileText,
  performance_alert: AlertCircle,
};

const PRIORITY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  urgent: { bg: 'rgba(239,68,68,0.1)',  color: '#EF4444', border: 'rgba(239,68,68,0.25)' },
  high:   { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
  normal: { bg: 'rgba(99,102,241,0.1)', color: '#818CF8', border: 'rgba(99,102,241,0.25)' },
  low:    { bg: 'rgba(156,163,175,0.1)',color: 'var(--sb-text-muted)', border: 'rgba(156,163,175,0.2)' },
};

export function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'archived'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications(filter, page);
      setNotifications(res.data?.notifications ?? []);
      setUnreadCount(res.data?.unreadCount ?? 0);
      setTotal(res.pagination?.total ?? 0);
    } catch { setNotifications([]); }
    finally { setLoading(false); }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  async function handleMarkRead(id: string) {
    try {
      await api.markRead(id);
      setNotifications(n => n.map(x => x._id === id ? { ...x, isRead: true, readAt: new Date() } : x));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  }

  async function handleMarkAllRead() {
    setMarking(true);
    try {
      await api.markAllRead();
      setNotifications(n => n.map(x => ({ ...x, isRead: true })));
      setUnreadCount(0);
    } catch {}
    finally { setMarking(false); }
  }

  async function handleArchive(id: string) {
    try {
      await api.archiveNotification(id);
      setNotifications(n => n.filter(x => x._id !== id));
      setTotal(t => t - 1);
    } catch {}
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: SB.color }}>Notifications</h1>
          <p className="text-sm mt-0.5" style={{ color: SB.muted }}>
            {unreadCount > 0 ? <><span className="font-bold" style={{ color: SB.orange }}>{unreadCount}</span> unread notifications</> : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl" style={{ background: SB.card, border: `1px solid ${SB.border}`, color: SB.muted }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} disabled={marking}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: SB.card, color: SB.muted, border: `1px solid ${SB.border}` }}>
              <CheckCheck className="w-4 h-4" />
              {marking ? 'Marking...' : 'Mark All Read'}
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'unread', 'read', 'archived'] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className="px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
            style={filter === f
              ? { background: 'var(--sb-orange)', color: '#fff' }
              : { background: SB.card, color: SB.muted, border: `1px solid ${SB.border}` }}>
            {f}{f === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="rounded-2xl overflow-hidden" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: SB.orange, borderTopColor: 'transparent' }} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Bell className="w-12 h-12 mb-3" style={{ color: SB.faint }} />
            <p className="font-semibold" style={{ color: SB.muted }}>No notifications</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: SB.border }}>
            {notifications.map(n => {
              const Icon = TYPE_ICONS[n.type] ?? Bell;
              const ps = PRIORITY_STYLE[n.priority] ?? PRIORITY_STYLE.normal;
              return (
                <div key={n._id}
                  className="flex items-start gap-3 p-4 transition-colors"
                  style={{ background: n.isRead ? 'transparent' : 'rgba(249,115,22,0.03)', cursor: n.isRead ? 'default' : 'pointer' }}
                  onClick={() => !n.isRead && handleMarkRead(n._id)}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: ps.bg, border: `1px solid ${ps.border}` }}>
                    <Icon className="w-4 h-4" style={{ color: ps.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold" style={{ color: SB.color }}>{n.title}</p>
                      {n.priority !== 'normal' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                          style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.border}` }}>
                          {n.priority}
                        </span>
                      )}
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SB.orange }} />
                      )}
                    </div>
                    <p className="text-xs" style={{ color: SB.muted }}>{n.message}</p>
                    <p className="text-[11px] mt-1" style={{ color: SB.faint }}>
                      {new Date(n.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {filter !== 'archived' && (
                    <button
                      onClick={e => { e.stopPropagation(); handleArchive(n._id); }}
                      className="p-1.5 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Archive"
                      style={{ color: SB.faint }}
                      onMouseEnter={e => e.currentTarget.style.color = SB.muted}
                      onMouseLeave={e => e.currentTarget.style.color = SB.faint}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${SB.border}` }}>
            <p className="text-xs" style={{ color: SB.faint }}>Showing {notifications.length} of {total}</p>
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
          </div>
        )}
      </div>
    </div>
  );
}
