import { Navigate, Outlet, useLocation } from "react-router";
import { getAdminToken } from "../../lib/adminApi";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function DashboardLayout() {
  const location = useLocation();
  if (!getAdminToken()) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="admin-shell flex h-screen overflow-hidden bg-[#f5f5f5]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f5f5]">
        <Header />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden text-sb-ink">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
