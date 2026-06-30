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
    <aside className="sb-sidebar flex h-full w-60 shrink-0 flex-col border-r border-sb-border-dark">
      <div className="flex h-[72px] flex-col justify-center border-b border-sb-border-dark px-5">
        <img src={logoImg} alt="Structbay" className="h-9 w-auto object-contain" />
        <span className="vendor-portal-badge mt-1 inline-block uppercase text-sb-orange">
          Vendor Portal
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
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
                "sb-sidebar-link",
                isActive && "sb-sidebar-link--active"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sb-border-dark p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="sb-sidebar-link w-full text-white/70 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
