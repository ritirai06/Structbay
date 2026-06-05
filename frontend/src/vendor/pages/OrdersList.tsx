import { useState } from "react";
import { Link } from "react-router";
import { Search, Filter, FileText, Upload } from "lucide-react";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { mockOrders } from "../data/mockData";

export function OrdersList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredOrders = mockOrders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Assigned Orders
        </h1>
        <p className="text-gray-600 mt-1">
          Manage all orders assigned to your facility
        </p>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order number, product, or customer..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="assigned">Assigned</option>
                <option value="invoice_uploaded">Invoice Uploaded</option>
                <option value="ready_dispatch">Ready for Dispatch</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Order Number
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Product Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Quantity
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Customer Location
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Assigned Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Expected Dispatch
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {order.id}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {order.productName}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {order.quantity}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {order.customerLocation}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(order.assignedDate).toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(order.expectedDispatchDate).toLocaleDateString(
                      "en-IN"
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/orders/${order.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        <FileText className="w-4 h-4" />
                      </Link>
                      {!order.invoiceNumber && (
                        <Link
                          to={`/orders/${order.id}/invoice`}
                          className="text-sm text-orange-600 hover:text-orange-700"
                        >
                          <Upload className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No orders found</p>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredOrders.length} of {mockOrders.length} orders
        </div>
      </Card>
    </div>
  );
}
