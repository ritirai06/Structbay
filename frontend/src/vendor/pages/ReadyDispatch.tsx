import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Card } from "../components/Card";
import { mockOrders } from "../data/mockData";

export function ReadyDispatch() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const order = mockOrders.find((o) => o.id === orderId);

  const [readyDate, setReadyDate] = useState("");
  const [quantityReady, setQuantityReady] = useState("");
  const [comments, setComments] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/orders/${orderId}`);
  };

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to={`/orders/${orderId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Mark Ready for Dispatch
          </h1>
          <p className="text-gray-600 mt-1">Order: {order.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Number
                </label>
                <input
                  type="text"
                  value={order.id}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Material Ready Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={readyDate}
                    onChange={(e) => setReadyDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity Ready <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={quantityReady}
                    onChange={(e) => setQuantityReady(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={order.quantity}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments / Notes
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional information about the material or special handling requirements..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Next Steps:</strong> After marking ready for dispatch,
                  StructBay logistics team will be notified and will schedule
                  pickup from your warehouse within 24-48 hours.
                </p>
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Mark Ready for Dispatch
              </button>
            </form>
          </Card>
        </div>

        <div>
          <Card title="Order Summary">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Order Number</p>
                <p className="font-medium text-gray-900">{order.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Product</p>
                <p className="font-medium text-gray-900">{order.productName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ordered Quantity</p>
                <p className="font-medium text-gray-900">{order.quantity}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Expected Dispatch</p>
                <p className="font-medium text-gray-900">
                  {new Date(order.expectedDispatchDate).toLocaleDateString(
                    "en-IN"
                  )}
                </p>
              </div>
            </div>
          </Card>

          {order.invoiceNumber && (
            <Card title="Invoice Status" className="mt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">
                    Invoice Uploaded
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Invoice: {order.invoiceNumber}
                </p>
              </div>
            </Card>
          )}

          {order.warehouseDetails && (
            <Card title="Warehouse Details" className="mt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">Details Provided</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {order.warehouseDetails.address}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
