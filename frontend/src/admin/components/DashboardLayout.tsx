import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0D0D0D]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[#0D0D0D]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
