import { useState } from "react";
import { Link } from "react-router";
import { Truck, Calendar, User, Phone } from "lucide-react";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { mockOrders } from "../data/mockData";

export function DispatchManagement() {
  const [selectedOrder, setSelectedOrder] = useState(mockOrders[2]);
  const [dispatchDate, setDispatchDate] = useState("");
  const [vehicleDetails, setVehicleDetails] = useState("");
  const [trackingRef, setTrackingRef] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [notes, setNotes] = useState("");

  const dispatchableOrders = mockOrders.filter(
    (o) =>
      o.status === "ready_dispatch" ||
      o.status === "dispatch_pending" ||
      o.status === "dispatched"
  );

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Dispatch Management
        </h1>
        <p className="text-gray-600 mt-1">
          Track and update dispatch information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Orders Ready for Dispatch">
          <div className="space-y-3">
            {dispatchableOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`w-full text-left p-4 border rounded-lg transition-colors ${
                  selectedOrder.id === order.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">{order.id}</p>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-sm text-gray-600">{order.productName}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {order.customerLocation}
                </p>
              </button>
            ))}

            {dispatchableOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No orders ready for dispatch
              </div>
            )}
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card title={`Dispatch Details - ${selectedOrder.id}`}>
            <form onSubmit={handleUpdateStatus} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Dispatch Date
                  </label>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Truck className="w-4 h-4 inline mr-2" />
                    Vehicle Details
                  </label>
                  <input
                    type="text"
                    value={vehicleDetails}
                    onChange={(e) => setVehicleDetails(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Vehicle number / Type"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking Reference
                </label>
                <input
                  type="text"
                  value={trackingRef}
                  onChange={(e) => setTrackingRef(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Docket / LR Number"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Driver Name
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Driver Mobile
                  </label>
                  <input
                    type="tel"
                    value={driverMobile}
                    onChange={(e) => setDriverMobile(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dispatch Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any special handling or delivery instructions..."
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Confirm Dispatch
              </button>
            </form>
          </Card>

          <Card title="Order Information">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Product</p>
                <p className="font-medium text-gray-900">
                  {selectedOrder.productName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Quantity</p>
                <p className="font-medium text-gray-900">
                  {selectedOrder.quantity}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-medium text-gray-900">
                  {selectedOrder.customerName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Delivery Location</p>
                <p className="font-medium text-gray-900">
                  {selectedOrder.customerLocation}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Delivery Address</p>
                <p className="font-medium text-gray-900">
                  {selectedOrder.deliveryAddress}
                </p>
              </div>
            </div>
            <Link
              to={`/orders/${selectedOrder.id}`}
              className="block mt-4 text-sm text-blue-600 hover:text-blue-700"
            >
              View Full Order Details →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
