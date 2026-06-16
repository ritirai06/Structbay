import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard, Package, Truck,
  Bell, User, HelpCircle, LogOut, FolderOpen,
  TrendingUp, History,
} from "lucide-react";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";
import { useAuth } from "../context/AuthContext";
import { cn } from "@shared/components/ui/utils";

const navItems = [
  { to: "/vendor",               icon: LayoutDashboard, label: "Dashboard",       exact: true },
  { to: "/vendor/orders",        icon: Package,         label: "Assigned Orders" },
  { to: "/vendor/dispatch",      icon: Truck,           label: "Dispatch" },
  { to: "/vendor/documents",     icon: FolderOpen,      label: "Documents" },
  { to: "/vendor/notifications", icon: Bell,            label: "Notifications" },
  { to: "/vendor/history",       icon: History,         label: "Order History" },
  { to: "/vendor/analytics",     icon: TrendingUp,      label: "Analytics" },
  { to: "/vendor/profile",       icon: User,            label: "Profile" },
  { to: "/vendor/support",       icon: HelpCircle,      label: "Support" },
];

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await logout();
    navigate("/vendor/login");
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sb-border-dark bg-sb-ink">
      <div className="border-b border-sb-border-dark p-5">
        <img src={logoImg} alt="StructBay" className="mb-2 h-11 w-auto object-contain" />
        <span className="inline-block rounded-full border border-sb-orange/25 bg-sb-orange/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sb-orange">
          Vendor Portal
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.exact
              ? location.pathname === item.to || location.pathname === `${item.to}/`
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                isActive
                  ? "border-l-2 border-sb-orange bg-sb-cream pl-[10px] font-semibold text-sb-ink"
                  : "border-l-2 border-transparent pl-[10px] text-[var(--sb-chrome-fg-muted)] hover:bg-[var(--sb-chrome-hover)] hover:text-[var(--sb-chrome-fg)]"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-sb-orange" : "text-[var(--sb-chrome-fg-muted)]")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sb-border-dark p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--sb-chrome-fg-muted)] transition-colors hover:bg-[var(--sb-chrome-hover)] hover:text-[var(--sb-chrome-fg)]"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
