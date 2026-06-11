import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, Shield } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";

type AdminRow = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  lastLogin?: string;
};

export function AdminUsers() {
  const [users, setUsers] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch("/admin/users?role=ADMIN&limit=100")
      .then((res) => {
        const list = (res.data || []) as AdminRow[];
        setUsers(list);
      })
      .catch((e: Error) => {
        setUsers([]);
        setError(e.message || "Could not load admin users");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F4E9D8]">Admin users</h1>
          <p className="text-[#D4C4A8]/60 text-sm mt-1">
            Accounts with role <span className="text-[#FE5E00]">ADMIN</span> from the database (not
            demo data).
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 border border-white/10 rounded-lg text-sm text-[#D4C4A8]/70 hover:border-white/20 hover:text-[#F4E9D8] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
          <span className="block text-xs text-amber-200/70 mt-1">
            If you are not logged in as admin, open <strong>Settings → log out</strong> and sign in again.
          </span>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-[#1A1A1A] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#FE5E00]" />
          <h2 className="font-semibold text-[#F4E9D8] text-sm">ADMIN accounts</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#FE5E00]" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-14 text-center text-[#D4C4A8]/50 text-sm px-4">
            No active ADMIN users found. Run <code className="text-[#FE5E00]/90">npm run seed:admin</code>{" "}
            once if you have not created an admin yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  {["Name", "Email", "Status", "Last login"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/50"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-medium text-[#F4E9D8]">{u.name || "—"}</td>
                    <td className="py-3 px-4 text-[#D4C4A8]/80">{u.email || "—"}</td>
                    <td className="py-3 px-4 text-[#D4C4A8]/70">{u.status || "—"}</td>
                    <td className="py-3 px-4 text-[#D4C4A8]/50 text-xs">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-[#D4C4A8]/40 mt-4 max-w-2xl leading-relaxed">
        Fine-grained roles (Operations / Sales) are not stored separately yet — only the{" "}
        <code className="text-[#FE5E00]/80">ADMIN</code> role is enforced in the API.
      </p>
    </div>
  );
}
