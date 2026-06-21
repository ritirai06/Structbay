import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { getAdminToken } from "../../lib/adminApi";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Menu, X } from "lucide-react";

export function DashboardLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!getAdminToken()) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="admin-shell flex h-screen overflow-hidden bg-[#f5f5f5]">
      {/* Mobile sidebar overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar — normal flex child, always visible on lg+ */}
      <div className="hidden lg:flex lg:flex-col lg:shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Mobile sidebar — fixed slide-in overlay, only on small screens */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 ease-in-out lg:hidden
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f5f5] min-w-0">
        {/* Mobile hamburger bar */}
        <div className="flex items-center lg:hidden bg-black border-b border-white/10 px-4 h-[72px] shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 mr-3"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-white font-semibold text-sm">Admin Panel</span>
        </div>

        {/* Desktop header — only visible on lg+ */}
        <div className="hidden lg:block">
          <Header />
        </div>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden text-sb-ink">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
