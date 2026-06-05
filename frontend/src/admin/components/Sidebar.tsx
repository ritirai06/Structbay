import { Link, useLocation } from "react-router";
import {
  LayoutDashboard, Package, FolderTree, Award, MapPin,
  DollarSign, Warehouse, Users, ShoppingCart, Truck,
  FileText, ClipboardList, Briefcase, CreditCard,
  UserCircle, Layout, BarChart3, History, Settings, UserCog,
} from "lucide-react";
import { cn } from "@shared/components/ui/utils";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";

const navItems = [
  { path: "/",              label: "Dashboard",         icon: LayoutDashboard },
  { path: "/products",      label: "Products",          icon: Package },
  { path: "/categories",    label: "Categories",        icon: FolderTree },
  { path: "/brands",        label: "Brands",            icon: Award },
  { path: "/cities",        label: "Cities",            icon: MapPin },
  { path: "/pricing",       label: "Pricing",           icon: DollarSign },
  { path: "/inventory",     label: "Inventory",         icon: Warehouse },
  { path: "/vendors",       label: "Vendors",           icon: Users },
  { path: "/orders",        label: "Orders",            icon: ShoppingCart },
  { path: "/dispatch",      label: "Dispatch",          icon: Truck },
  { path: "/invoices",      label: "Invoices",          icon: FileText },
  { path: "/rfqs",          label: "RFQs",              icon: ClipboardList },
  { path: "/bulk-enquiries",label: "Bulk Enquiries",    icon: Briefcase },
  { path: "/finance-leads", label: "Finance Leads",     icon: CreditCard },
  { path: "/customers",     label: "Customers",         icon: UserCircle },
  { path: "/cms",           label: "CMS Control",       icon: Layout },
  { path: "/reports",       label: "Reports",           icon: BarChart3 },
  { path: "/audit-logs",    label: "Audit Logs",        icon: History },
  { path: "/settings",      label: "Settings",          icon: Settings },
  { path: "/admin-users",   label: "Admin Users",       icon: UserCog },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col bg-[#0D0D0D] border-r border-white/8 shrink-0">
      {/* Logo */}
      <div className="flex h-16 items-center px-5 border-b border-white/8 shrink-0 gap-3">
        <img src={logoImg} alt="StructBay" className="h-12 w-auto object-contain" />
        <span className="ml-auto text-[10px] font-semibold text-[#D4C4A8]/40 uppercase tracking-widest shrink-0">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                isActive
                  ? "bg-[#FE5E00]/15 text-[#FE5E00] font-semibold border-l-2 border-[#FE5E00] pl-[10px]"
                  : "text-[#D4C4A8]/70 hover:text-[#F4E9D8] hover:bg-[#222222]"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#FE5E00]" : "text-[#D4C4A8]/50")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#222222] border border-white/8">
          <div className="w-7 h-7 rounded-full bg-[#FE5E00] flex items-center justify-center text-[#0D0D0D] font-black text-xs shrink-0">A</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#F4E9D8] truncate">Admin User</p>
            <p className="text-[10px] text-[#D4C4A8]/50 truncate">Super Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
