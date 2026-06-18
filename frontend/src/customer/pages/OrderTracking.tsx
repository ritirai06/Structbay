import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Download,
  Loader2,
  MessageCircle,
  Package,
  Truck,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { openOrderInvoices } from "../lib/orderInvoices";
import { api } from "../lib/api";
import { formatPaymentMethod, formatPaymentStatus } from "../../lib/paymentLabels";
import { getCustomerAccessToken, getCustomerRefreshToken, refreshCustomerAccessToken } from "../lib/authStorage";
import { CUSTOMER_MILESTONE_LABELS } from "../../lib/deliveryWorkflowReference";
import {
  canCustomerCancelOrder,
  canCustomerRequestReplacement,
} from "../lib/orderEligibility";

const STEP_KEYS = ["order_placed", "order_processing", "out_for_delivery", "partial_delivered", "full_delivery"] as const;

type StepKey = (typeof STEP_KEYS)[number] | "cancelled" | "returned";

function stepRowState(current: StepKey, index: number): { done: boolean; active: boolean; pending: boolean } {
  if (current === "cancelled" || current === "returned") {
    return { done: false, active: false, pending: true };
  }
  if (current === "full_delivery") {
    return { done: true, active: false, pending: false };
  }
  const cur = STEP_KEYS.indexOf(current as (typeof STEP_KEYS)[number]);
  if (cur < 0) {
    return { done: false, active: index === 0, pending: index > 0 };
  }
  return {
    done: index < cur,
    active: index === cur,
    pending: index > cur,
  };
}

export function OrderTracking() {
  const params = useParams<{ orderId?: string; id?: string }>();
  const id = (params.orderId || params.id || "").trim();
  const navigate = useNavigate();
  const { isLoggedIn } = useApp();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [chat, setChat] = useState<any>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [msgDraft, setMsgDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [replaceBusy, setReplaceBusy] = useState(false);
  const [replaceReason, setReplaceReason] = useState<"WRONG_PRODUCT" | "DAMAGED_PRODUCT">("DAMAGED_PRODUCT");
  const [replaceDesc, setReplaceDesc] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showReplace, setShowReplace] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (getCustomerAccessToken()) {
        if (!cancelled) setAuthReady(true);
        return;
      }
      if (getCustomerRefreshToken()) {
        await refreshCustomerAccessToken();
      }
      if (!cancelled) setAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasSession = isLoggedIn || !!getCustomerAccessToken();

  const loadCore = useCallback(async () => {
    if (!id || !hasSession) return;
    setLoading(true);
    setErr(null);
    try {
      const [oRes, tRes] = await Promise.all([api.getOrder(id), api.getOrderTracking(id)]);
      setOrder(oRes?.data ?? null);
      setTracking(tRes?.data ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load order");
      setOrder(null);
      setTracking(null);
    } finally {
      setLoading(false);
    }
  }, [id, hasSession]);

  const loadChat = useCallback(async () => {
    if (!id || !hasSession) return;
    setChatLoading(true);
    try {
      const res = await api.getOrderChat(id);
      setChat(res?.data ?? null);
    } catch {
      setChat(null);
    } finally {
      setChatLoading(false);
    }
  }, [id, hasSession]);

  useEffect(() => {
    if (!authReady) return;
    void loadCore();
  }, [authReady, loadCore]);

  useEffect(() => {
    if (!isLoggedIn || !id || !showChat) return;
    void loadChat();
  }, [id, isLoggedIn, loadChat, showChat]);

  const progress = tracking?.order?.customerProgress;
  const currentStep = (progress?.customerStep || "order_placed") as StepKey;
  const currentLabel = progress?.customerStatusLabel || "Order placed";

  const deliveryNote = tracking?.order?.deliveryDetails?.trim() || "";
  const logisticsSnippets = useMemo(() => {
    const lines = tracking?.deliveryLines as
      | {
          orderNumber: string;
          structbayLogistics?: {
            pickupScheduledText?: string;
            companyName?: string;
            driverContactDetails?: string;
          } | null;
        }[]
      | undefined;
    if (!Array.isArray(lines)) return [];
    const out: string[] = [];
    for (const line of lines) {
      const l = line.structbayLogistics;
      if (!l) continue;
      if (l.pickupScheduledText) out.push(l.pickupScheduledText);
      if (l.companyName) out.push(`Carrier: ${l.companyName}`);
      if (l.driverContactDetails) out.push(`Contact: ${l.driverContactDetails}`);
    }
    return out;
  }, [tracking?.deliveryLines]);

  const messages = useMemo(() => {
    const raw = chat?.messages;
    if (!Array.isArray(raw)) return [];
    return [...raw].sort(
      (a: { sentAt?: string }, b: { sentAt?: string }) =>
        new Date(a.sentAt || 0).getTime() - new Date(b.sentAt || 0).getTime()
    );
  }, [chat]);

  const sendChat = async () => {
    const t = msgDraft.trim();
    if (!t || !id) return;
    setSending(true);
    try {
      await api.postOrderChatMessage(id, t);
      setMsgDraft("");
      await loadChat();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  const orderStatus = String(order?.status || tracking?.order?.status || "");
  const orderDbId = order?._id || tracking?.order?._id || id;
  const canCancel = canCustomerCancelOrder(orderStatus);
  const canReplace = canCustomerRequestReplacement(orderStatus);

  const handleCancel = async () => {
    if (!orderDbId || !canCancel) return;
    if (!window.confirm("Cancel this order?")) return;
    setCancelBusy(true);
    setActionMsg(null);
    try {
      await api.cancelOrder(String(orderDbId));
      setActionMsg("Order cancelled.");
      await loadCore();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Could not cancel order");
    } finally {
      setCancelBusy(false);
    }
  };

  const handleReplacement = async () => {
    if (!orderDbId || !canReplace || !replaceDesc.trim()) return;
    setReplaceBusy(true);
    setActionMsg(null);
    try {
      await api.createReplacementRequest({
        masterOrderId: String(orderDbId),
        reason: replaceReason,
        description: replaceDesc.trim(),
      });
      setActionMsg("Replacement request submitted.");
      setReplaceDesc("");
      setShowReplace(false);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Could not submit request");
    } finally {
      setReplaceBusy(false);
    }
  };

  if (!id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">
        <p>Missing order id.</p>
        <Link to="/account/orders" className="text-[#E85A00] font-medium mt-2 inline-block">
          My orders
        </Link>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#E85A00]" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-black">Sign in to track this order.</p>
        <button
          type="button"
          onClick={() => navigate(`/login?next=${encodeURIComponent(`/orders/${id}`)}`)}
          className="px-6 py-3 bg-[#E85A00] text-white font-bold text-sm"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/account/orders" className="hover:text-[#E85A00]">
          My orders
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-black font-medium">{tracking?.order?.orderNumber ?? order?.orderNumber ?? "Track"}</span>
      </nav>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[#E85A00]" />
        </div>
      ) : err ? (
        <div className="border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-700">{err}</div>
      ) : (
        <div className="space-y-4">
          {/* Order summary */}
          <div className="border border-gray-200 bg-black text-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Order</p>
                <p className="font-bold text-xl font-mono mt-0.5">
                  {tracking?.order?.orderNumber ?? order?.orderNumber}
                </p>
                {tracking?.order?.createdAt && (
                  <p className="text-white/60 text-sm mt-1">
                    {new Date(tracking.order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 bg-[#E85A00] text-white text-xs font-bold px-3 py-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  {currentLabel}
                </span>
                {order?.grandTotal != null && (
                  <p className="text-white/80 text-sm mt-2">
                    ₹{Number(order.grandTotal).toLocaleString("en-IN")}
                  </p>
                )}
                <p className="text-white/50 text-xs mt-1">
                  {formatPaymentMethod(order?.paymentMethod)} · {formatPaymentStatus(order?.paymentStatus)}
                </p>
              </div>
            </div>
            {id && (
              <button
                type="button"
                onClick={() =>
                  openOrderInvoices(id, order?.orderNumber).catch(() => alert("Could not load invoices."))
                }
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold border border-white/30 hover:border-[#E85A00] hover:text-[#E85A00] px-3 py-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Invoice
              </button>
            )}
          </div>

          {actionMsg && (
            <p
              className={`text-sm px-3 py-2 border ${
                actionMsg.includes("cancelled") || actionMsg.includes("submitted")
                  ? "bg-green-50 text-green-800 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {actionMsg}
            </p>
          )}

          {/* Progress */}
          <div className="border border-gray-200 bg-white p-5">
            <div className="relative pl-1">
              <div className="absolute left-4 top-3 bottom-3 w-px bg-gray-200" />
              <div className="space-y-5">
                {CUSTOMER_MILESTONE_LABELS.map((label, i) => {
                  const st = stepRowState(currentStep, i);
                  return (
                    <div key={label} className="flex gap-4 items-start">
                      <div
                        className={`w-7 h-7 flex items-center justify-center shrink-0 z-10 ${
                          st.done
                            ? "bg-green-500 text-white"
                            : st.active
                              ? "border-2 border-[#E85A00] bg-white"
                              : "border border-gray-200 bg-white"
                        }`}
                      >
                        {st.done ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : st.active ? (
                          <div className="w-2.5 h-2.5 bg-[#E85A00]" />
                        ) : (
                          <Circle className="w-3 h-3 text-gray-300" />
                        )}
                      </div>
                      <p
                        className={`text-sm pt-1 ${
                          st.done || st.active ? "font-semibold text-black" : "text-gray-400"
                        }`}
                      >
                        {label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            {(currentStep === "cancelled" || currentStep === "returned") && (
              <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2">
                Order status: {currentLabel}
              </p>
            )}
          </div>

          {/* Delivery update — only when there is something to show */}
          {(deliveryNote || logisticsSnippets.length > 0) && (
            <div className="border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-black mb-2">Delivery update</h3>
              {deliveryNote && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{deliveryNote}</p>
              )}
              {logisticsSnippets.length > 0 && (
                <ul className={`text-sm text-gray-600 space-y-1 ${deliveryNote ? "mt-2 pt-2 border-t border-gray-100" : ""}`}>
                  {logisticsSnippets.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Items */}
          {Array.isArray(order?.items) && order.items.length > 0 && (
            <div className="border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#E85A00]" />
                Items ({order.items.length})
              </h3>
              <ul className="space-y-2 text-sm">
                {order.items.map((it: any, ix: number) => (
                  <li key={ix} className="flex justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-black">{it.name}</span>
                    <span className="text-gray-500 shrink-0">×{it.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {(canCancel || canReplace) && (
            <div className="flex flex-wrap gap-2">
              {canCancel && (
                <button
                  type="button"
                  disabled={cancelBusy}
                  onClick={() => void handleCancel()}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
                >
                  {cancelBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Cancel order
                </button>
              )}
              {canReplace && (
                <button
                  type="button"
                  onClick={() => setShowReplace((v) => !v)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-semibold hover:border-[#E85A00] hover:text-[#E85A00]"
                >
                  <RefreshCw className="w-4 h-4" />
                  Request replacement
                </button>
              )}
            </div>
          )}

          {showReplace && canReplace && (
            <div className="border border-gray-200 bg-white p-4 space-y-3">
              <select
                value={replaceReason}
                onChange={(e) => setReplaceReason(e.target.value as "WRONG_PRODUCT" | "DAMAGED_PRODUCT")}
                className="w-full border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="DAMAGED_PRODUCT">Damaged product</option>
                <option value="WRONG_PRODUCT">Wrong product</option>
              </select>
              <textarea
                value={replaceDesc}
                onChange={(e) => setReplaceDesc(e.target.value)}
                rows={3}
                placeholder="Brief description…"
                className="w-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={replaceBusy || !replaceDesc.trim()}
                onClick={() => void handleReplacement()}
                className="px-4 py-2 bg-[#E85A00] text-white text-sm font-bold disabled:opacity-60"
              >
                {replaceBusy ? "Submitting…" : "Submit"}
              </button>
            </div>
          )}

          {/* Chat — collapsed by default */}
          <div className="border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setShowChat((v) => !v)}
              className="w-full flex items-center justify-between gap-2 p-4 text-left text-sm font-semibold text-black hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#E85A00]" />
                Message StructBay
              </span>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showChat ? "rotate-90" : ""}`} />
            </button>
            {showChat && (
              <div className="border-t border-gray-100 p-4 pt-0">
                <div className="max-h-56 overflow-y-auto space-y-2 mb-3 py-3">
                  {chatLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-[#E85A00]" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No messages yet.</p>
                  ) : (
                    messages.map((m: any, i: number) => {
                      const mine = m.senderType === "CUSTOMER";
                      return (
                        <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] px-3 py-2 text-sm ${
                              mine ? "bg-[#E85A00] text-white" : "bg-gray-100 text-black"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.text}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={msgDraft}
                    onChange={(e) => setMsgDraft(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1 border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendChat();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={sending || !msgDraft.trim()}
                    onClick={() => void sendChat()}
                    className="px-4 py-2 bg-[#E85A00] text-white font-bold text-sm disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
