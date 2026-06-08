import { NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard, Package, FileText, Truck,
  Bell, User, HelpCircle, LogOut, FolderOpen,
  TrendingUp, History,
} from "lucide-react";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/",              icon: LayoutDashboard, label: "Dashboard",       exact: true },
  { to: "/orders",        icon: Package,         label: "Assigned Orders" },
  { to: "/dispatch",      icon: Truck,           label: "Dispatch" },
  { to: "/documents",     icon: FolderOpen,      label: "Documents" },
  { to: "/notifications", icon: Bell,            label: "Notifications" },
  { to: "/history",       icon: History,         label: "Order History" },
  { to: "/analytics",     icon: TrendingUp,      label: "Analytics" },
  { to: "/profile",       icon: User,            label: "Profile" },
  { to: "/support",       icon: HelpCircle,      label: "Support" },
];

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <aside
      className="w-60 flex flex-col shrink-0"
      style={{ background: "var(--sb-nav)", borderRight: "1px solid var(--sb-border)" }}
    >
      <div className="p-5" style={{ borderBottom: "1px solid var(--sb-border)" }}>
        <img src={logoImg} alt="StructBay" className="h-11 w-auto object-contain mb-2" />
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: "var(--sb-orange-subtle)", color: "var(--sb-orange)", border: "1px solid var(--sb-orange-border)" }}
        >
          Vendor Portal
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.75rem",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              fontWeight: isActive ? "600" : "400",
              background: isActive ? "var(--sb-orange-subtle)" : "transparent",
              color: isActive ? "var(--sb-orange)" : "var(--sb-text-muted)",
              borderLeft: isActive ? "2px solid var(--sb-orange)" : "2px solid transparent",
              transition: "all 0.15s ease",
              textDecoration: "none",
            })}
            onMouseEnter={e => {
              const el = e.currentTarget;
              if (!el.getAttribute("aria-current")) {
                el.style.color = "var(--sb-text-primary)";
                el.style.background = "var(--sb-card)";
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              if (!el.getAttribute("aria-current")) {
                el.style.color = "var(--sb-text-muted)";
                el.style.background = "transparent";
              }
            }}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3" style={{ borderTop: "1px solid var(--sb-border)" }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium transition-all"
          style={{ color: "var(--sb-text-muted)" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--sb-text-muted)"; e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
