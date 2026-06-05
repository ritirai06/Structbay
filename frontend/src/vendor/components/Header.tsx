import { Bell, Search } from "lucide-react";
import { Link } from "react-router";

export function Header() {
  return (
    <header className="bg-[#0D0D0D] border-b border-white/8 px-6 py-3.5 shrink-0">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4C4A8]/40" />
            <input
              type="text"
              placeholder="Search orders, products..."
              className="w-full pl-10 pr-4 py-2 bg-[#222222] border border-white/10 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/40 focus:outline-none focus:border-[#FE5E00] focus:ring-2 focus:ring-[#FE5E00]/20 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative p-2 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] hover:bg-[#222222] transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FE5E00] rounded-full" />
          </Link>

          {/* User */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-white/8">
            <div className="w-8 h-8 bg-[#FE5E00] rounded-full flex items-center justify-center text-[#0D0D0D] font-black text-sm">
              V
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F4E9D8]">Vendor Name</p>
              <p className="text-xs text-[#D4C4A8]/50">vendor@company.com</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
