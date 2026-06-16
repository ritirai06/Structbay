import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { adminFetch as apiFetch } from "../../lib/adminApi";

const actionColors: Record<string, string> = {
  CREATE: "bg-sb-orange/12 text-sb-orange border-sb-orange/22",
  UPDATE: "bg-sb-cream-secondary text-sb-ink border-sb-ink/12",
  DELETE: "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/15",
  UPLOAD: "bg-sb-cream-secondary text-sb-ink border-sb-ink/12",
  APPROVE: "bg-sb-orange/15 text-sb-orange border-sb-orange/25",
  REJECT: "bg-sb-orange/10 text-sb-orange border-sb-orange/25",
  PUBLISH: "bg-sb-orange/10 text-sb-ink border-sb-orange/22",
  TOGGLE: "bg-sb-cream-secondary text-sb-ink/60 border-sb-ink/15",
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

  const MODULES = ["Banner", "Category", "Blog", "Testimonial", "Announcement", "Advertisement", "SEO", "Contact", "Footer", "Vendor", "User", "Homepage", "Order", "MasterOrder", "VendorOrder", "VendorInvoice", "OrderDocument", "Shipment"];
  const ACTIONS = ["CREATE", "UPDATE", "DELETE", "UPLOAD", "APPROVE", "REJECT", "PUBLISH", "TOGGLE"];

  return (
    <div className="p-6 bg-sb-cream min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-sb-ink">Audit Logs</h1>
        <p className="text-sb-ink/55 text-sm mt-1">Complete history of every admin action on the platform.</p>
      </div>

      <Card className="border-sb-ink/10 bg-sb-cream-secondary">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-sb-ink mr-auto">Activity Log</CardTitle>
            <select value={filters.module} onChange={e => setFilters(f => ({ ...f, module: e.target.value, page: 1 }))}
              className="bg-sb-cream border border-sb-ink/15 rounded-md px-3 py-2 text-sm text-sb-ink">
              <option value="">All Modules</option>
              {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value, page: 1 }))}
              className="bg-sb-cream border border-sb-ink/15 rounded-md px-3 py-2 text-sm text-sb-ink">
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
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-sb-orange" /></div>
          ) : logs.length === 0 ? (
            <p className="text-center py-10 text-sb-ink/45 text-sm">No audit logs found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-sb-ink/10">
                    <TableHead className="text-sb-ink/55">Admin</TableHead>
                    <TableHead className="text-sb-ink/55">Action</TableHead>
                    <TableHead className="text-sb-ink/55">Module</TableHead>
                    <TableHead className="text-sb-ink/55">Description</TableHead>
                    <TableHead className="text-sb-ink/55">IP</TableHead>
                    <TableHead className="text-sb-ink/55">Platform</TableHead>
                    <TableHead className="text-sb-ink/55">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log._id} className="border-sb-ink/8 hover:bg-sb-cream-secondary/80">
                      <TableCell className="font-medium text-sb-ink text-sm">
                        {log.adminId?.name || "Admin"}
                        <p className="text-xs text-sb-ink/50">{log.adminId?.email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={actionColors[log.action] || "bg-sb-cream-secondary text-sb-ink/60"}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-sb-ink/65">{log.module}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-sb-ink/65 truncate">
                        {log.description}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-sb-ink/50">
                        {log.ipAddress || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-sb-ink/55 max-w-[140px] truncate" title={log.platform || ""}>
                        {log.platform || "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-sb-ink/50">
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
            <div className="flex items-center justify-between pt-4 border-t border-sb-ink/10 mt-4">
              <span className="text-sm text-sb-ink/50">{pagination.total} total entries</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>Prev</Button>
                <span className="px-3 py-1 text-sm text-sb-ink/60">{filters.page} / {pagination.pages}</span>
                <Button variant="outline" size="sm" disabled={filters.page >= pagination.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
