import { useState } from "react";
import {
  HelpCircle,
  MessageSquare,
  Send,
  Phone,
  Mail,
  Clock,
} from "lucide-react";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";

const mockTickets = [
  {
    id: "TKT-001",
    subject: "Invoice approval delay",
    priority: "high" as const,
    status: "assigned" as const,
    created: "2024-06-03",
    lastUpdate: "2024-06-03 2:30 PM",
  },
  {
    id: "TKT-002",
    subject: "Cannot download shipping label",
    priority: "medium" as const,
    status: "invoice_uploaded" as const,
    created: "2024-06-01",
    lastUpdate: "2024-06-02 10:15 AM",
  },
];

export function Support() {
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowNewTicket(false);
    setSubject("");
    setDescription("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Support Center
          </h1>
          <p className="text-gray-600 mt-1">
            Get help with your vendor account
          </p>
        </div>

        <button
          onClick={() => setShowNewTicket(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
          Create Ticket
        </button>
      </div>

      {showNewTicket && (
        <Card title="Create New Support Ticket">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of your issue"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Please describe your issue in detail..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachment
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  className="hidden"
                  id="ticket-attachment"
                />
                <label
                  htmlFor="ticket-attachment"
                  className="cursor-pointer text-sm text-gray-600"
                >
                  Click to upload screenshot or document (optional)
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowNewTicket(false)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Submit Ticket
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Contact Information">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Phone</p>
                <p className="text-sm text-gray-600">1800-123-4567</p>
                <p className="text-xs text-gray-500">Mon-Sat, 9 AM - 6 PM</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Email</p>
                <p className="text-sm text-gray-600">
                  vendor.support@structbay.com
                </p>
                <p className="text-xs text-gray-500">24-48 hour response</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Support Hours
                </p>
                <p className="text-sm text-gray-600">Monday - Saturday</p>
                <p className="text-xs text-gray-500">9:00 AM - 6:00 PM IST</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card title="Your Support Tickets">
            <div className="space-y-3">
              {mockTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {ticket.subject}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {ticket.id} • Created {ticket.created}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ticket.priority === "high"
                          ? "bg-red-100 text-red-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {ticket.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <StatusBadge status={ticket.status} />
                    <p className="text-xs text-gray-500">
                      Last update: {ticket.lastUpdate}
                    </p>
                  </div>
                </div>
              ))}

              {mockTickets.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No support tickets</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card title="Frequently Asked Questions">
        <div className="space-y-4">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="font-medium text-gray-900">
                How do I upload an invoice?
              </span>
              <HelpCircle className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-4 text-sm text-gray-600">
              Go to Orders, select the order, and click on "Upload Invoice".
              Fill in the invoice details and upload the PDF file. StructBay
              will review and approve within 24 hours.
            </div>
          </details>

          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="font-medium text-gray-900">
                When will StructBay pick up my material?
              </span>
              <HelpCircle className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-4 text-sm text-gray-600">
              After you mark the order as "Ready for Dispatch", StructBay
              logistics team will schedule pickup within 24-48 hours based on
              your warehouse availability.
            </div>
          </details>

          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="font-medium text-gray-900">
                How do I download shipping documents?
              </span>
              <HelpCircle className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-4 text-sm text-gray-600">
              Navigate to the Document Center from the sidebar menu. All
              StructBay-generated documents including e-way bills, shipping
              labels, and packing slips are available for download.
            </div>
          </details>

          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="font-medium text-gray-900">
                What if I cannot fulfill the complete quantity?
              </span>
              <HelpCircle className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-4 text-sm text-gray-600">
              Please contact StructBay support immediately through phone or
              email. Partial fulfillment requires approval from the operations
              team.
            </div>
          </details>
        </div>
      </Card>
    </div>
  );
}
