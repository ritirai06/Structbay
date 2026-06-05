import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@shared/components/ui/button";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const getToken = () => localStorage.getItem("adminToken") || "";

async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "API Error");
  return data;
}

const actionColors: Record<string, string> = {
  CREATE: "bg-green-500/15 text-green-400 border-green-500/25",
  UPDATE: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/25",
  APPROVE: "bg-[#FE5E00]/15 text-[#FE5E00] border-[#FE5E00]/25",
  REJECT: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  PUBLISH: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  TOGGLE: "bg-white/10 text-[#D4C4A8] border-white/15",
};

export function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({ module: "", action: "", page: 1 });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(filters.page), limit: "20" });
    if (filters.module) params.set("module", filters.module);
    if (filters.action) params.set("action", filters.action);
    apiFetch(`/admin/audit-logs?${params}`)
      .then(d => { setLogs(d.data || []); setPagination(d.pagination || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const MODULES = ["Banner", "Category", "Blog", "Testimonial", "Announcement", "Advertisement", "SEO", "Contact", "Footer", "Vendor", "User", "Homepage"];
  const ACTIONS = ["CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "PUBLISH", "TOGGLE"];

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#F4E9D8]">Audit Logs</h1>
        <p className="text-[#D4C4A8]/60 text-sm mt-1">Complete history of every admin action on the platform.</p>
      </div>

      <Card className="border-white/10 bg-[#1A1A1A]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-[#F4E9D8] mr-auto">Activity Log</CardTitle>
            <select value={filters.module} onChange={e => setFilters(f => ({ ...f, module: e.target.value, page: 1 }))}
              className="bg-[#0D0D0D] border border-white/15 rounded-md px-3 py-2 text-sm text-[#F4E9D8]">
              <option value="">All Modules</option>
              {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value, page: 1 }))}
              className="bg-[#0D0D0D] border border-white/15 rounded-md px-3 py-2 text-sm text-[#F4E9D8]">
              <option value="">All Actions</option>
              {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#FE5E00]" /></div>
          ) : logs.length === 0 ? (
            <p className="text-center py-10 text-[#D4C4A8]/40 text-sm">No audit logs found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-[#D4C4A8]/60">Admin</TableHead>
                    <TableHead className="text-[#D4C4A8]/60">Action</TableHead>
                    <TableHead className="text-[#D4C4A8]/60">Module</TableHead>
                    <TableHead className="text-[#D4C4A8]/60">Description</TableHead>
                    <TableHead className="text-[#D4C4A8]/60">IP</TableHead>
                    <TableHead className="text-[#D4C4A8]/60">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log._id} className="border-white/6 hover:bg-white/4">
                      <TableCell className="font-medium text-[#F4E9D8] text-sm">
                        {log.adminId?.name || "Admin"}
                        <p className="text-xs text-[#D4C4A8]/50">{log.adminId?.email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={actionColors[log.action] || "bg-white/10 text-[#D4C4A8]"}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[#D4C4A8]/70">{log.module}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-[#D4C4A8]/70 truncate">
                        {log.description}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-[#D4C4A8]/50">
                        {log.ipAddress || "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-[#D4C4A8]/50">
                        {new Date(log.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
              <span className="text-sm text-[#D4C4A8]/50">{pagination.total} total entries</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>Prev</Button>
                <span className="px-3 py-1 text-sm text-[#D4C4A8]">{filters.page} / {pagination.pages}</span>
                <Button variant="outline" size="sm" disabled={filters.page >= pagination.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
