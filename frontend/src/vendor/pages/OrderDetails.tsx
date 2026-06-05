import { useParams, Link } from "react-router";
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  FileText,
  Upload,
  Truck,
  Download,
  CheckCircle,
} from "lucide-react";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { mockOrders } from "../data/mockData";

export function OrderDetails() {
  const { orderId } = useParams();
  const order = mockOrders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Order not found</p>
        <Link to="/orders" className="text-blue-600 hover:text-blue-700 mt-4">
          Back to Orders
        </Link>
      </div>
    );
  }

  const statusSteps = [
    { status: "assigned", label: "Assigned" },
    { status: "invoice_uploaded", label: "Invoice Uploaded" },
    { status: "ready_dispatch", label: "Ready for Dispatch" },
    { status: "dispatch_pending", label: "Dispatch Pending" },
    { status: "dispatched", label: "Dispatched" },
    { status: "delivered", label: "Delivered" },
  ];

  const currentStepIndex = statusSteps.findIndex(
    (step) => step.status === order.status
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/orders"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">{order.id}</h1>
          <p className="text-gray-600 mt-1">{order.productName}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <Card title="Order Status Tracker">
        <div className="relative">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step.status} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      isCompleted
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <div className="w-2 h-2 bg-current rounded-full" />
                    )}
                  </div>
                  <p
                    className={`text-xs text-center max-w-[80px] ${
                      isCurrent ? "font-medium text-gray-900" : "text-gray-600"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{
                width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Order Information">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Order Number</p>
              <p className="font-medium text-gray-900">{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Product Name</p>
              <p className="font-medium text-gray-900">{order.productName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Quantity</p>
              <p className="font-medium text-gray-900">{order.quantity}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Assigned Date</p>
              <p className="font-medium text-gray-900">
                {new Date(order.assignedDate).toLocaleDateString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Expected Dispatch Date</p>
              <p className="font-medium text-gray-900">
                {new Date(order.expectedDispatchDate).toLocaleDateString(
                  "en-IN"
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Customer Information">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Customer Name</p>
              <p className="font-medium text-gray-900">{order.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contact Person</p>
              <p className="font-medium text-gray-900">
                {order.contactPerson}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contact Phone</p>
              <p className="font-medium text-gray-900">{order.contactPhone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Delivery Address</p>
              <p className="font-medium text-gray-900">
                {order.deliveryAddress}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {order.warehouseDetails && (
        <Card title="Warehouse Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Warehouse Address</p>
              <p className="font-medium text-gray-900">
                {order.warehouseDetails.address}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contact Person</p>
              <p className="font-medium text-gray-900">
                {order.warehouseDetails.contactPerson}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Mobile Number</p>
              <p className="font-medium text-gray-900">
                {order.warehouseDetails.mobile}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pickup Availability</p>
              <p className="font-medium text-gray-900">
                {order.warehouseDetails.pickupTime}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card title="Quick Actions">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {!order.invoiceNumber && (
            <Link
              to={`/orders/${order.id}/invoice`}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Upload className="w-6 h-6 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">
                Upload Invoice
              </span>
            </Link>
          )}

          {!order.warehouseDetails && (
            <Link
              to={`/orders/${order.id}/warehouse`}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <MapPin className="w-6 h-6 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">
                Warehouse Details
              </span>
            </Link>
          )}

          {order.invoiceNumber && order.warehouseDetails && (
            <Link
              to={`/orders/${order.id}/ready-dispatch`}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Truck className="w-6 h-6 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">
                Mark Ready
              </span>
            </Link>
          )}

          <Link
            to="/documents"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Download className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">
              Download Docs
            </span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
