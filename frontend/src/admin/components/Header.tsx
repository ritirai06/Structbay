import { useNavigate } from "react-router";
import { Bell, Search } from "lucide-react";
import { clearAdminSession } from "../../lib/adminApi";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";

export function Header() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-sb-border-dark bg-sb-ink px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-80 max-w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sb-ink/40" />
          <input
            placeholder="Search products, orders, vendors..."
            className="w-full rounded-lg border border-sb-border-light bg-sb-cream py-2 pl-10 pr-4 text-sm text-sb-ink placeholder:text-sb-ink/45 transition-colors focus:border-sb-orange focus:outline-none focus:ring-2 focus:ring-sb-orange/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative rounded-lg p-2 text-[var(--sb-chrome-fg-muted)] transition-colors hover:bg-[var(--sb-chrome-hover)] hover:text-[var(--sb-chrome-fg)]"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-sb-orange" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 border-sb-border-light bg-sb-cream text-sb-ink">
            <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-sb-ink/55">
              Notifications
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-sb-ink/10" />
            {[
              { title: "New order received", sub: "Order #12345 from ABC Builders" },
              { title: "Low stock alert", sub: "Cement PPC 53 grade running low" },
              { title: "New RFQ received", sub: "Ready mix concrete - M30 grade" },
            ].map((n) => (
              <DropdownMenuItem
                key={n.title}
                className="flex cursor-pointer flex-col items-start gap-0.5 py-2.5 hover:bg-sb-cream-secondary"
              >
                <p className="text-sm font-medium text-sb-ink">{n.title}</p>
                <p className="text-xs text-sb-ink/50">{n.sub}</p>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-[var(--sb-chrome-hover)]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sb-orange text-sm font-semibold text-white">
                A
              </div>
              <div className="hidden flex-col items-start sm:flex">
                <span className="text-sm font-semibold text-[var(--sb-chrome-fg)]">Admin User</span>
                <span className="text-xs text-[var(--sb-chrome-fg-muted)]">Super Admin</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-sb-border-light bg-sb-cream text-sb-ink">
            <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-sb-ink/55">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-sb-ink/10" />
            <DropdownMenuItem className="cursor-pointer hover:bg-sb-cream-secondary">Profile</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-sb-cream-secondary">Settings</DropdownMenuItem>
            <DropdownMenuSeparator className="bg-sb-ink/10" />
            <DropdownMenuItem
              className="cursor-pointer font-medium text-sb-ink hover:bg-sb-cream-secondary"
              onSelect={() => {
                clearAdminSession();
                navigate("/admin/login");
              }}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
