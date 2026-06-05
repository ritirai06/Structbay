import { useState } from "react";
import { Bell, CheckCheck, Filter } from "lucide-react";
import { Card } from "../components/Card";
import { mockNotifications } from "../data/mockData";

export function Notifications() {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const filteredNotifications = mockNotifications.filter((notif) => {
    if (filter === "unread") return !notif.read;
    if (filter === "read") return notif.read;
    return true;
  });

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Notifications
          </h1>
          <p className="text-gray-600 mt-1">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <CheckCheck className="w-5 h-5" />
          Mark All as Read
        </button>
      </div>

      <Card>
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === "all"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === "unread"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === "read"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Read
          </button>
        </div>

        <div className="space-y-3">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 border rounded-lg transition-colors ${
                notif.read
                  ? "bg-white border-gray-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`p-2 rounded-lg ${
                      notif.priority === "high"
                        ? "bg-red-100"
                        : "bg-blue-100"
                    }`}
                  >
                    <Bell
                      className={`w-5 h-5 ${
                        notif.priority === "high"
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">
                        {notif.title}
                      </h3>
                      {notif.priority === "high" && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">
                          High Priority
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">{notif.date}</p>
                  </div>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                )}
              </div>
            </div>
          ))}

          {filteredNotifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No notifications</p>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Notification Types">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Order Assigned</span>
              <span className="font-medium text-gray-900">
                {mockNotifications.filter((n) => n.type === "order_assigned").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Invoice Updates</span>
              <span className="font-medium text-gray-900">
                {mockNotifications.filter((n) => n.type === "invoice_approved").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Document Updates</span>
              <span className="font-medium text-gray-900">
                {mockNotifications.filter((n) => n.type === "document_uploaded").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Dispatch Updates</span>
              <span className="font-medium text-gray-900">
                {mockNotifications.filter((n) => n.type === "dispatch_confirmation").length}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Priority Breakdown">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">High Priority</span>
              <span className="font-medium text-red-600">
                {mockNotifications.filter((n) => n.priority === "high").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Medium Priority</span>
              <span className="font-medium text-orange-600">
                {mockNotifications.filter((n) => n.priority === "medium").length}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Settings">
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Email Notifications</span>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">SMS Alerts</span>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Push Notifications</span>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
}
