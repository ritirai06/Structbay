import { useState, useEffect } from "react";
import { format } from "date-fns";
import { adminFetch } from "../../lib/adminApi";
import { Loader2, Search, X, CheckCircle, Clock } from "lucide-react";
import { Button } from "@shared/components/ui/button";

interface Response {
  _id: string;
  message: string;
  sender: { _id: string; name: string; companyName?: string };
  senderRole: "ADMIN" | "VENDOR";
  createdAt: string;
}

interface Ticket {
  _id: string;
  ticketId: string;
  vendor: { _id: string; name: string; email: string; phone: string; companyName: string };
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
  responses: Response[];
}

export function VendorSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const url = statusFilter !== "all" ? `/support?status=${statusFilter}` : `/support`;
      const res = await adminFetch(url);
      setTickets(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openTicket = async (id: string) => {
    try {
      const res = await adminFetch(`/support/${id}`);
      setSelectedTicket(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    try {
      setStatusLoading(true);
      const res = await adminFetch(`/support/${selectedTicket._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });
      setSelectedTicket(res.data);
      loadTickets();
    } catch (e) {
      console.error(e);
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="admin-page-title text-sb-ink">Vendor Support Tickets</h1>
          <p className="mt-1 text-sm text-sb-ink/55">Manage and resolve vendor support requests.</p>
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-sb-ink/10 bg-sb-cream px-3 py-2 text-sm focus:border-sb-orange focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="rounded-xl border border-sb-ink/10 bg-sb-cream-secondary overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-sb-orange" /></div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-sm text-sb-ink/50">No tickets found.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-sb-cream text-xs uppercase text-sb-ink/50 border-b border-sb-ink/10">
              <tr>
                <th className="px-4 py-3 font-medium">Ticket ID</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sb-ink/10">
              {tickets.map(t => (
                <tr key={t._id} className="hover:bg-sb-cream/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{t.ticketId}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-sb-ink">{t.vendor.companyName}</div>
                    <div className="text-xs text-sb-ink/50">{t.vendor.name}</div>
                  </td>
                  <td className="px-4 py-3 truncate max-w-[200px]">{t.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      t.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                      t.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sb-ink/50 text-xs">
                    {format(new Date(t.createdAt), "dd MMM yyyy, HH:mm")}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="outline" size="sm" onClick={() => openTicket(t._id)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-[600px] max-w-[95vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-sb-ink flex items-center gap-2">
                  {selectedTicket.ticketId}
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      selectedTicket.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                      selectedTicket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {selectedTicket.status.replace("_", " ")}
                  </span>
                </h2>
                <p className="text-sm text-sb-ink/50 mt-1">Vendor: {selectedTicket.vendor.companyName} ({selectedTicket.vendor.name})</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="rounded-full p-2 hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
              <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="font-semibold text-sb-ink mb-2">{selectedTicket.subject}</h3>
                <p className="text-sm text-sb-ink/80 whitespace-pre-wrap">{selectedTicket.description}</p>
                <div className="mt-3 text-xs text-gray-400">
                  Created {format(new Date(selectedTicket.createdAt), "dd MMM yyyy, HH:mm")}
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedTicket(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
