import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { CheckCircle2, XCircle, Shield, AlertCircle, ArrowLeft } from "lucide-react";
import { api } from "../lib/api";

export function MockPaymentGateway() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("orderId");

  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "FAILED" | "SUCCESS">("PENDING");

  useEffect(() => {
    if (!orderId) {
      navigate("/");
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await api.getOrderDetails(orderId);
        setOrderData(res.data);
      } catch (err) {
        console.error("Could not fetch order details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, navigate]);

  const simulatePayment = async (status: "SUCCESS" | "FAILED") => {
    setProcessing(true);
    try {
      await api.fetchWithAuth("/api/v1/payments/mock/simulate", {
        method: "POST",
        body: JSON.stringify({ orderId, status }),
      });

      setPaymentStatus(status);
      
      if (status === "SUCCESS") {
        setTimeout(() => {
          navigate(`/order-success?orderId=${encodeURIComponent(orderId as string)}`);
        }, 1500);
      }
    } catch (err) {
      alert("Error communicating with mock payment API");
      setPaymentStatus("FAILED");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Order Not Found</h1>
        <p className="text-gray-500">We could not load the payment details for this order.</p>
        <button onClick={() => navigate("/")} className="mt-6 text-blue-600 hover:underline">
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 text-center relative overflow-hidden">
          <Shield className="w-12 h-12 text-blue-400 mx-auto mb-3 opacity-90" />
          <h1 className="text-xl font-bold tracking-wide">Mock Payment Gateway</h1>
          <p className="text-sm text-slate-400 mt-1">Simulated transaction environment</p>
          
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
        </div>

        <div className="p-6">
          {paymentStatus === "PENDING" && (
            <>
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6">
                <div className="text-center mb-4">
                  <span className="block text-sm text-gray-500 font-medium mb-1">Amount to Pay</span>
                  <span className="text-3xl font-extrabold text-gray-900">
                    ₹{orderData.grandTotal?.toLocaleString("en-IN")}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Order ID</span>
                    <span className="font-medium">{orderData.orderNumber || orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">₹{orderData.subtotal?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">GST</span>
                    <span className="font-medium">₹{orderData.gstTotal?.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => simulatePayment("SUCCESS")}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-70 disabled:cursor-wait"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {processing ? "Processing..." : "Simulate Payment Success"}
                </button>
                
                <button
                  onClick={() => simulatePayment("FAILED")}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3.5 rounded-xl font-bold transition-all disabled:opacity-70 disabled:cursor-wait"
                >
                  <XCircle className="w-5 h-5" />
                  {processing ? "Processing..." : "Simulate Payment Failure"}
                </button>
              </div>
            </>
          )}

          {paymentStatus === "FAILED" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Failed</h2>
              <p className="text-gray-500 text-sm mb-6">
                Your payment could not be completed. Please try again.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => setPaymentStatus("PENDING")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold"
                >
                  Retry Payment
                </button>
                <button
                  onClick={() => navigate("/account/orders")}
                  className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Orders
                </button>
              </div>
            </div>
          )}

          {paymentStatus === "SUCCESS" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
              <p className="text-gray-500 text-sm">
                Redirecting you to the confirmation page...
              </p>
              <div className="mt-6 flex justify-center">
                <div className="animate-pulse flex space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">
            For development purposes only. This simulates a real payment gateway.
          </p>
        </div>
      </div>
    </div>
  );
}
