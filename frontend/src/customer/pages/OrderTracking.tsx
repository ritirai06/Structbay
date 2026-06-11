import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Home,
  Loader2,
  MessageCircle,
  Package,
  Truck,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import {
  CUSTOMER_MILESTONE_LABELS,
  STRUCTBAY_ASSURED_BLURB,
  STRUCTBAY_EXPRESS_BLURB,
} from "../../lib/deliveryWorkflowReference";

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
  const { orderId } = useParams<{ orderId: string }>();
  const id = orderId?.trim() || "";
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

  const loadCore = useCallback(async () => {
    if (!id) return;
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
  }, [id]);

  const loadChat = useCallback(async () => {
    if (!id || !isLoggedIn) return;
    setChatLoading(true);
    try {
      const res = await api.getOrderChat(id);
      setChat(res?.data ?? null);
    } catch {
      setChat(null);
    } finally {
      setChatLoading(false);
    }
  }, [id, isLoggedIn]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (!isLoggedIn || !id) return;
    void loadChat();
  }, [id, isLoggedIn, loadChat]);

  useEffect(() => {
    if (typeof window === "undefined" || !id) return;
    const onHash = () => {
      if (window.location.hash === "#chat") {
        document.getElementById("order-chat-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [id, loading]);

  const progress = tracking?.order?.customerProgress;
  const currentStep = (progress?.customerStep || "order_placed") as StepKey;
  const currentLabel = progress?.customerStatusLabel || "Order placed";

  const deliveryLines = tracking?.deliveryLines as
    | {
        orderNumber: string;
        deliveryTypeLabel: string;
        vendorLabel: string;
        structbayLogistics?: { pickupScheduledText?: string; companyName?: string; driverContactDetails?: string } | null;
      }[]
    | undefined;

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

  if (!id) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-sb-ink-muted">
        <p>Missing order id.</p>
        <Link to="/dashboard/orders" className="text-[#FE5E00] font-medium mt-2 inline-block">
          Back to orders
        </Link>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-sb-ink">Sign in to track this order and message StructBay.</p>
        <button
          type="button"
          onClick={() => navigate(`/login?next=${encodeURIComponent(`/orders/${id}`)}`)}
          className="px-6 py-3 rounded-xl bg-[#FE5E00] text-sb-on-orange font-bold text-sm"
        >
          Sign in
        </button>
        <div>
          <Link to="/" className="text-sm text-sb-ink-muted hover:text-[#FE5E00]">
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-sb-ink-muted mb-6">
        <Link to="/" className="hover:text-[#FE5E00]">
          Home
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/dashboard/orders" className="hover:text-[#FE5E00]">
          My orders
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-sb-ink font-medium">Track order</span>
      </nav>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[#FE5E00]" />
        </div>
      ) : err ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-200">{err}</div>
      ) : (
        <>
          <div
            style={{ background: "linear-gradient(135deg, var(--sb-blue) 0%, #2d5fa3 100%)" }}
            className="rounded-2xl p-5 text-sb-cream mb-6"
          >
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <p className="text-sb-cream/70 text-sm">Order</p>
                <p className="font-bold text-lg font-mono">{tracking?.order?.orderNumber ?? order?.orderNumber}</p>
                <p className="text-sb-cream/70 text-sm mt-1">
                  {tracking?.order?.createdAt
                    ? `Placed ${new Date(tracking.order.createdAt).toLocaleString()}`
                    : null}
                </p>
                {tracking?.order?.city?.name && (
                  <p className="text-sb-cream/60 text-xs mt-1">
                    {tracking.order.city.name}
                    {tracking.order.city.state ? `, ${tracking.order.city.state}` : ""}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div
                  style={{ backgroundColor: "var(--sb-yellow, #F5A623)" }}
                  className="text-black text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1"
                >
                  <Truck className="w-3 h-3" /> {currentLabel}
                </div>
                {order?.grandTotal != null && (
                  <p className="text-sb-cream/80 text-sm mt-2">
                    Grand total: ₹{Number(order.grandTotal).toLocaleString("en-IN")}
                  </p>
                )}
                <p className="text-sb-cream/50 text-xs mt-0.5">Payment: {order?.paymentStatus ?? "—"}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-900">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Note:</strong> Additional delivery charges may apply on site where applicable.
            </span>
          </div>

          {deliveryLines && deliveryLines.length > 0 && (
            <div className="mb-6 rounded-2xl border border-sb-ink/12 bg-sb-surface p-4">
              <h3 className="font-semibold text-sb-ink text-sm mb-3">How your materials ship</h3>
              <div className="space-y-2">
                {deliveryLines.map((line) => (
                  <div
                    key={line.orderNumber}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm border border-sb-ink/10 rounded-xl px-3 py-2 bg-sb-page"
                  >
                    <span className="font-mono text-[#FE5E00]">{line.orderNumber}</span>
                    <span className="text-sb-ink-muted">{line.deliveryTypeLabel}</span>
                    <span className="text-xs text-sb-ink-muted">{line.vendorLabel}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-sb-ink-muted/70 mt-3 leading-relaxed">
                <strong>Type A</strong>: vendor delivers to you. <strong>Type B</strong>: StructBay arranges pickup and last-mile; vendor provides invoice and pickup contact; admin enters Porter/Delhivery details you see below when available.
              </p>
              {deliveryLines.some((l) => l.structbayLogistics?.pickupScheduledText || l.structbayLogistics?.companyName) && (
                <div className="mt-3 space-y-2 text-xs text-sb-ink">
                  {deliveryLines.map((line) =>
                    line.structbayLogistics ? (
                      <div key={`log-${line.orderNumber}`} className="rounded-lg bg-sb-surface-2 border border-sb-ink/10 p-3 space-y-1">
                        <p className="font-mono text-[#FE5E00] text-[11px]">{line.orderNumber} · logistics</p>
                        {line.structbayLogistics.pickupScheduledText && (
                          <p>
                            <span className="text-sb-ink-muted">Pickup: </span>
                            {line.structbayLogistics.pickupScheduledText}
                          </p>
                        )}
                        {line.structbayLogistics.companyName && (
                          <p>
                            <span className="text-sb-ink-muted">Company: </span>
                            {line.structbayLogistics.companyName}
                          </p>
                        )}
                        {line.structbayLogistics.driverContactDetails && (
                          <p>
                            <span className="text-sb-ink-muted">Driver / coordinator: </span>
                            {line.structbayLogistics.driverContactDetails}
                          </p>
                        )}
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-sb-surface rounded-2xl border border-sb-ink/12 p-5">
              <h3 className="font-semibold text-sb-ink mb-4">Your progress</h3>
              <p className="text-xs text-sb-ink-muted mb-4">
                Updates from StructBay to you at each stage.{" "}
                <span className="block mt-2 text-[11px] leading-relaxed">{STRUCTBAY_ASSURED_BLURB}</span>
                <span className="block mt-1 text-[11px] leading-relaxed">{STRUCTBAY_EXPRESS_BLURB}</span>
              </p>
              <div className="relative">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-sb-ink/15" />
                <div className="space-y-4 relative">
                  {CUSTOMER_MILESTONE_LABELS.map((label, i) => {
                    const st = stepRowState(currentStep, i);
                    return (
                      <div key={label} className="flex gap-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                            st.done ? "bg-green-500" : st.active ? "border-2 border-[#FE5E00] bg-white" : "border-2 border-sb-ink/20 bg-white"
                          }`}
                        >
                          {st.done ? (
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          ) : st.active ? (
                            <div className="w-3 h-3 bg-[#FE5E00] rounded-full animate-pulse" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-sb-ink-muted/40" />
                          )}
                        </div>
                        <div className="pt-1 min-w-0">
                          <p
                            className={`font-semibold text-sm ${
                              st.done || st.active ? "text-sb-ink" : "text-sb-ink-muted/50"
                            }`}
                          >
                            {label}
                            {st.active && currentStep !== "full_delivery" && (
                              <span className="text-[#FE5E00] text-xs ml-2 font-bold">Current</span>
                            )}
                          </p>
                          {STEP_KEYS[i] === currentStep && (
                            <p className="text-xs text-sb-ink-muted mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Status synced from your order
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {(currentStep === "cancelled" || currentStep === "returned") && (
                <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  This order is <strong>{currentLabel}</strong>. Timeline steps above are for reference only.
                </p>
              )}
            </div>

            <div className="space-y-5">
              <div className="bg-sb-surface rounded-2xl border border-sb-ink/12 p-5">
                <h3 className="font-semibold text-sb-ink mb-2 flex items-center gap-2">
                  <Home className="w-4 h-4 text-[#FE5E00]" />
                  Delivery details from StructBay
                </h3>
                <p className="text-xs text-sb-ink-muted mb-2">
                  Admin updates this as dispatch progresses (Porter window, driver phone, partial drops, etc.).
                </p>
                <div className="text-sm text-sb-ink whitespace-pre-wrap min-h-[4rem] rounded-lg bg-sb-page border border-sb-ink/10 px-3 py-2">
                  {tracking?.order?.deliveryDetails?.trim()
                    ? tracking.order.deliveryDetails
                    : "No detailed delivery notes yet. Check back after dispatch is confirmed."}
                </div>
              </div>

              {Array.isArray(order?.items) && order.items.length > 0 && (
                <div className="bg-sb-surface rounded-2xl border border-sb-ink/12 p-5">
                  <h3 className="font-semibold text-sb-ink mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#FE5E00]" />
                    Items
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {order.items.map((it: any, ix: number) => (
                      <li key={ix} className="flex justify-between gap-2 border-b border-sb-ink/8 pb-2 last:border-0">
                        <span className="text-sb-ink">{it.name}</span>
                        <span className="text-sb-ink-muted shrink-0">×{it.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div id="order-chat-panel" className="rounded-2xl border border-sb-ink/12 bg-sb-surface p-5 mb-10 scroll-mt-24">
            <h3 className="font-semibold text-sb-ink mb-1 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#FE5E00]" />
              Order chat — you & StructBay admin
            </h3>
            <p className="text-xs text-sb-ink-muted mb-4">One thread per order. Replies when your order is open for support.</p>
            <div className="max-h-72 overflow-y-auto space-y-2 mb-4 pr-1 border border-sb-ink/10 rounded-xl p-3 bg-sb-page">
              {chatLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#FE5E00]" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-sb-ink-muted text-center py-6">No messages yet — say hello if you need an update.</p>
              ) : (
                messages.map((m: any, i: number) => {
                  const mine = m.senderType === "CUSTOMER";
                  return (
                    <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          mine ? "bg-[#FE5E00] text-sb-on-orange" : "bg-sb-surface-2 border border-sb-ink/12 text-sb-ink"
                        }`}
                      >
                        <p className="text-[10px] font-bold opacity-80 mb-0.5">{mine ? "You" : "StructBay"}</p>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                        <p className="text-[10px] opacity-60 mt-1">
                          {m.sentAt ? new Date(m.sentAt).toLocaleString() : ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex gap-2">
              <textarea
                value={msgDraft}
                onChange={(e) => setMsgDraft(e.target.value)}
                placeholder="Ask about delivery, documents, or changes…"
                rows={2}
                className="flex-1 rounded-xl border border-sb-ink/12 bg-sb-page px-3 py-2 text-sm text-sb-ink focus:outline-none focus:border-[#FE5E00]/50"
              />
              <button
                type="button"
                disabled={sending || !msgDraft.trim()}
                onClick={() => void sendChat()}
                className="self-end px-4 py-2 rounded-xl bg-[#FE5E00] text-sb-on-orange font-bold text-sm disabled:opacity-50"
              >
                {sending ? "…" : "Send"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
