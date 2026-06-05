import { Bell, Search } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/8 bg-[#0D0D0D] px-6 shrink-0">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D4C4A8]/40" />
          <input
            placeholder="Search products, orders, vendors..."
            className="w-full pl-10 pr-4 py-2 bg-[#222222] border border-white/10 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/40 focus:outline-none focus:border-[#FE5E00] focus:ring-2 focus:ring-[#FE5E00]/20 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 rounded-lg text-[#D4C4A8]/70 hover:text-[#F4E9D8] hover:bg-[#222222] transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FE5E00]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-[#222222] border border-white/15 text-[#F4E9D8]">
            <DropdownMenuLabel className="text-[#D4C4A8]/60 text-xs uppercase tracking-wider">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/8" />
            {[
              { title: "New order received",   sub: "Order #12345 from ABC Builders" },
              { title: "Low stock alert",       sub: "Cement PPC 53 grade running low" },
              { title: "New RFQ received",      sub: "Ready mix concrete - M30 grade" },
            ].map(n => (
              <DropdownMenuItem key={n.title} className="flex flex-col items-start gap-0.5 hover:bg-[#2A2A2A] cursor-pointer py-2.5">
                <p className="text-sm font-medium text-[#F4E9D8]">{n.title}</p>
                <p className="text-xs text-[#D4C4A8]/50">{n.sub}</p>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-[#222222] transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#FE5E00] flex items-center justify-center text-[#0D0D0D] font-black text-sm">A</div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold text-[#F4E9D8]">Admin User</span>
                <span className="text-xs text-[#D4C4A8]/50">Super Admin</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#222222] border border-white/15 text-[#F4E9D8]">
            <DropdownMenuLabel className="text-[#D4C4A8]/60 text-xs uppercase tracking-wider">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/8" />
            <DropdownMenuItem className="hover:bg-[#2A2A2A] cursor-pointer text-[#F4E9D8]">Profile</DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-[#2A2A2A] cursor-pointer text-[#F4E9D8]">Settings</DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/8" />
            <DropdownMenuItem className="text-red-400 hover:bg-red-500/10 cursor-pointer">Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
