import { Landmark } from "lucide-react";

/**
 * Finance / builder loan leads — placeholder until a backend module exists.
 * Previously showed static demo rows; that hid the fact that no API is wired yet.
 */
export function FinanceLeadsManagement() {
  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#F4E9D8]">Finance Leads</h1>
        <p className="text-[#D4C4A8]/60 text-sm mt-1">
          Builder finance and loan requests — not connected to the API yet.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {["Total leads", "New", "In progress", "Approved"].map((label) => (
          <div
            key={label}
            className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 text-center"
          >
            <div className="text-2xl font-black text-[#D4C4A8]/30">—</div>
            <div className="text-xs text-[#D4C4A8]/50 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-12 text-center">
        <Landmark className="w-12 h-12 mx-auto mb-4 text-[#D4C4A8]/25" />
        <p className="text-[#F4E9D8] font-medium mb-2">No finance leads module</p>
        <p className="text-[#D4C4A8]/60 text-sm max-w-lg mx-auto leading-relaxed">
          There is no <code className="text-[#FE5E00]/90">/finance-leads</code> (or similar) endpoint in
          this codebase yet. The old screen used sample data only. When you add a model and admin routes,
          wire this page to <code className="text-[#FE5E00]/90">adminFetch</code> the same way as Orders
          or RFQs.
        </p>
      </div>
    </div>
  );
}
