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
  { path: "/admin",              label: "Dashboard",         icon: LayoutDashboard },
  { path: "/admin/products",     label: "Products",          icon: Package },
  { path: "/admin/categories",   label: "Categories",        icon: FolderTree },
  { path: "/admin/brands",       label: "Brands",            icon: Award },
  { path: "/admin/cities",       label: "Cities",            icon: MapPin },
  { path: "/admin/pricing",      label: "Pricing",           icon: DollarSign },
  { path: "/admin/inventory",    label: "Inventory",         icon: Warehouse },
  { path: "/admin/vendors",      label: "Vendors",           icon: Users },
  { path: "/admin/orders",       label: "Orders",            icon: ShoppingCart },
  { path: "/admin/dispatch",     label: "Dispatch",          icon: Truck },
  { path: "/admin/invoices",     label: "Invoices",          icon: FileText },
  { path: "/admin/rfqs",         label: "RFQs",              icon: ClipboardList },
  { path: "/admin/bulk-enquiries", label: "Bulk Enquiries",  icon: Briefcase },
  { path: "/admin/finance-leads", label: "Finance Leads",   icon: CreditCard },
  { path: "/admin/customers",    label: "Customers",         icon: UserCircle },
  { path: "/admin/cms",          label: "CMS Control",       icon: Layout },
  { path: "/admin/reports",      label: "Reports",           icon: BarChart3 },
  { path: "/admin/audit-logs",   label: "Audit Logs",        icon: History },
  { path: "/admin/settings",     label: "Settings",          icon: Settings },
  { path: "/admin/admin-users",  label: "Admin Users",       icon: UserCog },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-64 shrink-0 flex-col border-r border-sb-border-dark bg-sb-ink">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sb-border-dark px-5">
        <img src={logoImg} alt="StructBay" className="h-12 w-auto object-contain" />
        <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-widest text-[var(--sb-chrome-fg-muted)]">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === "/admin"
              ? location.pathname === "/admin" || location.pathname === "/admin/"
              : location.pathname === item.path || location.pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              to={item.path}
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
        <div className="flex items-center gap-3 rounded-lg border border-sb-border-dark bg-sb-ink px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sb-orange text-xs font-semibold text-white">
            A
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[var(--sb-chrome-fg)]">Admin User</p>
            <p className="truncate text-[10px] text-[var(--sb-chrome-fg-muted)]">Super Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
