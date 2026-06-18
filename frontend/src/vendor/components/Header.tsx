import { Bell, Search } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .getNotifications("unread", 1)
      .then((r) => setUnread(r.data?.unreadCount ?? 0))
      .catch(() => {});
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) navigate(`/vendor/orders?search=${encodeURIComponent(search.trim())}`);
  }

  async function handleLogout() {
    await logout();
    navigate("/vendor/login");
  }

  const initials = (user?.name ?? user?.companyName ?? "V").charAt(0).toUpperCase();

  return (
    <header className="sb-header sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 border-b border-sb-border-dark bg-sb-ink px-6">
      <form onSubmit={handleSearch} className="relative max-w-md flex-1">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sb-text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search orders..."
          className="w-full h-11 rounded-input border border-sb-border bg-sb-card py-2 pl-11 pr-4 text-sm text-sb-ink placeholder:text-sb-text-secondary transition-colors focus:border-sb-orange focus:outline-none focus:ring-2 focus:ring-[var(--sb-orange-ring)]"
        />
      </form>

      <div className="flex items-center gap-2">
        <Link
          to="/vendor/notifications"
          className="relative rounded-xl p-2 text-[var(--sb-chrome-fg-muted)] transition-colors hover:bg-[var(--sb-chrome-hover)] hover:text-[var(--sb-chrome-fg)]"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sb-orange text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2.5 border-l border-sb-border-dark pl-3">
          {user?.profileImage?.url ? (
            <img src={user.profileImage.url} className="h-8 w-8 rounded-full object-cover" alt="" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sb-orange text-sm font-semibold text-white">
              {initials}
            </div>
          )}
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-[var(--sb-chrome-fg)]">{user?.companyName ?? user?.name ?? "Vendor"}</p>
            <p className="text-xs text-[var(--sb-chrome-fg-muted)]">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="ml-1 hidden rounded-lg border border-sb-border-dark px-2 py-1 text-xs text-[var(--sb-chrome-fg-muted)] transition-colors hover:border-sb-orange hover:text-sb-orange md:block"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
