import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-sb-cream">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-sb-cream">
        <Header />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-sb-cream text-sb-ink">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
