import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Landmark, Download } from "lucide-react";
import { adminFetch as apiFetch, getAdminToken } from "../../lib/adminApi";
import { getApiV1Base } from "../../lib/apiBase";

type LeadRow = {
  _id: string;
  financeNumber?: string;
  name?: string;
  companyName?: string;
  mobile?: string;
  email?: string;
  status?: string;
  loanAmountRequired?: number;
  createdAt?: string;
};

type Dashboard = {
  total?: number;
  statusMap?: Record<string, number>;
  conversionRate?: string;
};

const STATUSES = ["NEW", "UNDER_REVIEW", "DOCUMENTS_REQUESTED", "APPROVED", "REJECTED", "DISBURSED", "CLOSED"];

export function FinanceLeadsManagement() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([apiFetch("/finance/dashboard"), apiFetch("/finance/leads?limit=100")])
      .then(([dash, listRes]) => {
        setDashboard((dash.data || null) as Dashboard | null);
        setLeads((listRes.data || []) as LeadRow[]);
      })
      .catch((e: Error) => {
        setDashboard(null);
        setLeads([]);
        setError(e.message || "Could not load finance leads");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = async () => {
    const base = getApiV1Base().replace(/\/$/, "");
    const token = getAdminToken();
    if (!token) {
      setError("Sign in as admin to export.");
      return;
    }
    try {
      const res = await fetch(`${base}/finance/leads/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "finance-leads.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/finance/leads/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, note: `Status set to ${status}` }),
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  };

  const sm = dashboard?.statusMap || {};
  const total = dashboard?.total ?? 0;
  const newCount = sm.NEW || 0;
  const inProgress = (sm.UNDER_REVIEW || 0) + (sm.DOCUMENTS_REQUESTED || 0);
  const approved = sm.APPROVED || 0;

  return (
    <div className="admin-page">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="admin-page-title text-sb-ink">Finance Leads</h1>
          <p className="admin-page-desc">
            Builder finance applications from <span className="text-sb-orange">POST /finance/applications</span> and
            this admin console.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-2 px-3 py-2 border border-sb-ink/10 rounded-lg text-sm text-sb-ink/65 hover:border-sb-ink/20 hover:text-sb-ink transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 border border-sb-ink/10 rounded-lg text-sm text-sb-ink/65 hover:border-sb-ink/20 hover:text-sb-ink transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-sb-orange/25 bg-sb-orange/10 px-4 py-3 text-sm text-sb-ink">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {[
          { label: "Total leads", val: total },
          { label: "New", val: newCount },
          { label: "In progress", val: inProgress },
          { label: "Approved", val: approved },
        ].map(({ label, val }) => (
          <div
            key={label}
            className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4 text-center"
          >
            <div className="admin-page-title text-sb-ink">{loading ? "—" : val}</div>
            <div className="text-xs text-sb-ink/50 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-sb-ink/10 bg-sb-cream-secondary overflow-hidden">
        <div className="px-5 py-4 border-b border-sb-ink/10 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-sb-orange" />
          <h2 className="font-semibold text-sb-ink text-sm">Applications</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-sb-orange" />
          </div>
        ) : leads.length === 0 ? (
          <div className="py-14 text-center text-sb-ink/50 text-sm px-4">
            No finance leads yet. Submissions from the customer Finance page appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sb-ink/10">
                  {["Reference", "Name", "Company", "Mobile", "Loan (₹)", "Status", "Created"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-sb-ink/50"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((row) => (
                  <tr key={row._id} className="border-b border-sb-ink/8 hover:bg-sb-cream-secondary/90">
                    <td className="py-3 px-4 font-mono text-xs text-sb-ink">{row.financeNumber || "—"}</td>
                    <td className="py-3 px-4 font-medium text-sb-ink">{row.name || "—"}</td>
                    <td className="py-3 px-4 text-sb-ink/80">{row.companyName || "—"}</td>
                    <td className="py-3 px-4 text-sb-ink/80">{row.mobile || "—"}</td>
                    <td className="py-3 px-4 text-sb-ink/80">
                      {row.loanAmountRequired != null ? row.loanAmountRequired.toLocaleString("en-IN") : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        className="w-full max-w-[200px] bg-sb-cream border border-sb-ink/15 rounded-md px-2 py-1.5 text-xs text-sb-ink"
                        value={row.status || "NEW"}
                        onChange={(e) => void updateStatus(row._id, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-sb-ink/55 text-xs">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
