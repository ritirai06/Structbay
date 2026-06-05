import { NavLink } from "react-router";
import {
  LayoutDashboard, Package, FileText, Truck,
  Bell, User, HelpCircle, LogOut,
} from "lucide-react";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";

const navItems = [
  { to: "/",           icon: LayoutDashboard, label: "Dashboard",          exact: true },
  { to: "/orders",     icon: Package,         label: "Assigned Orders" },
  { to: "/documents",  icon: FileText,        label: "Documents" },
  { to: "/dispatch",   icon: Truck,           label: "Dispatch Management" },
  { to: "/notifications", icon: Bell,         label: "Notifications" },
  { to: "/profile",    icon: User,            label: "Profile" },
  { to: "/support",    icon: HelpCircle,      label: "Support" },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-[#0D0D0D] border-r border-white/8 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-white/8">
        <img src={logoImg} alt="StructBay" className="h-12 w-auto object-contain mb-1" />
        <p className="text-xs text-[#D4C4A8]/50 font-semibold uppercase tracking-widest">Vendor Portal</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "bg-[#FE5E00]/15 text-[#FE5E00] font-semibold border-l-2 border-[#FE5E00] pl-[10px]"
                  : "text-[#D4C4A8]/70 hover:text-[#F4E9D8] hover:bg-[#222222]"
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/8">
        <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-[#D4C4A8]/60 hover:text-red-400 hover:bg-red-500/8 transition-all text-sm">
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
