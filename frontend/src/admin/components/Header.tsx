import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Bell, Search } from "lucide-react";
import { adminFetch, clearAdminSession, getAdminToken } from "../../lib/adminApi";
import { adminPath } from "../../lib/portalRoutes";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";

type StaffNotification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedVendorOrder?: string;
  relatedMasterOrder?: string;
  metadata?: { orderNumber?: string };
};

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function notificationPath(n: StaffNotification): string {
  if (n.relatedMasterOrder || n.type === "NEW_ORDER") return adminPath("orders");
  if (n.relatedVendorOrder) return adminPath("dispatch");
  if (n.type === "NEW_RFQ") return adminPath("rfqs");
  if (n.type === "LOW_STOCK") return adminPath("inventory");
  return adminPath("orders");
}

export function Header() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!getAdminToken()) return;
    setLoadingNotifs(true);
    try {
      const res = await adminFetch<StaffNotification[]>("/admin/inbox/notifications?limit=8");
      setNotifications(Array.isArray(res.data) ? res.data : []);
      const unread = res.pagination?.unreadCount;
      setUnreadCount(typeof unread === "number" ? unread : (res.data as StaffNotification[] | undefined)?.filter((n) => !n.isRead).length ?? 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const id = window.setInterval(() => void loadNotifications(), 60_000);
    return () => window.clearInterval(id);
  }, [loadNotifications]);

  const markRead = async (id: string) => {
    try {
      await adminFetch(`/admin/inbox/notifications/${id}/read`, { method: "PUT" });
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    try {
      await adminFetch("/admin/inbox/notifications/read-all", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  const openNotification = (n: StaffNotification) => {
    if (!n.isRead) void markRead(n._id);
    setNotifOpen(false);
    navigate(notificationPath(n));
  };

  return (
    <header className="sb-header z-20 flex shrink-0 items-center justify-between border-b border-black/10 bg-black px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-96 max-w-full">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sb-text-secondary" />
          <input
            placeholder="Search products, orders, vendors..."
            className="w-full h-11 rounded-lg border border-white/12 bg-white py-2 pl-11 pr-4 text-sm text-black placeholder:text-gray-400 transition-colors focus:border-sb-orange focus:outline-none focus:ring-2 focus:ring-[var(--sb-orange-ring)]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu open={notifOpen} onOpenChange={(open) => {
          setNotifOpen(open);
          if (open) void loadNotifications();
        }}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative rounded-lg p-2 text-[var(--sb-chrome-fg-muted)] transition-colors hover:bg-[var(--sb-chrome-hover)] hover:text-[var(--sb-chrome-fg)]"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sb-orange px-1 text-[10px] font-medium text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 border-gray-200 bg-white p-0 text-black shadow-lg">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
              <DropdownMenuLabel className="p-0 text-xs font-medium text-gray-500">
                Notifications
              </DropdownMenuLabel>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void markAllRead();
                  }}
                  className="text-[11px] font-medium text-[#E85A00] hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loadingNotifs && !notifications.length ? (
                <p className="px-3 py-6 text-center text-xs text-gray-400">Loading…</p>
              ) : notifications.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-gray-400">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem
                    key={n._id}
                    className={`flex cursor-pointer flex-col items-start gap-0.5 rounded-none border-b border-gray-50 px-3 py-2.5 hover:bg-gray-50 ${!n.isRead ? "bg-orange-50/40" : ""}`}
                    onSelect={() => openNotification(n)}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <p className={`text-sm ${n.isRead ? "font-normal text-gray-800" : "font-medium text-black"}`}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{n.message}</p>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <>
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem
                  className="cursor-pointer justify-center py-2 text-xs font-medium text-[#E85A00] hover:bg-gray-50"
                  onSelect={() => {
                    setNotifOpen(false);
                    navigate(adminPath("orders"));
                  }}
                >
                  View orders
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-[var(--sb-chrome-hover)]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sb-orange text-sm font-semibold text-white">
                A
              </div>
              <div className="hidden flex-col items-start sm:flex">
                <span className="text-sm font-semibold text-[var(--sb-chrome-fg)]">Admin User</span>
                <span className="text-xs text-[var(--sb-chrome-fg-muted)]">Super Admin</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-gray-200 bg-white text-black shadow-lg">
            <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-gray-500">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem className="cursor-pointer hover:bg-gray-50">Profile</DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer hover:bg-gray-50"
              onSelect={() => navigate(adminPath("settings"))}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem
              className="cursor-pointer font-medium text-black hover:bg-gray-50"
              onSelect={() => {
                clearAdminSession();
                navigate("/admin/login");
              }}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
