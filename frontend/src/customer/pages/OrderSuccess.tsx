import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { CheckCircle2, Download, Package, ArrowRight, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";

const LAST_ORDER_KEY = "sb_last_placed_order";

type OrderStateShape = {
  _id?: string;
  id?: string;
  orderNumber?: string;
};

function readPersisted(): OrderStateShape | null {
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrderStateShape;
  } catch {
    return null;
  }
}

function pickOrderId(o?: OrderStateShape | null): string | null {
  if (!o) return null;
  const v = o._id ?? o.id;
  return v != null && String(v).trim() ? String(v).trim() : null;
}

export function OrderSuccess() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as { order?: OrderStateShape; orderNumber?: string } | undefined;

  const [invError, setInvError] = useState<string | null>(null);
  const [invBusy, setInvBusy] = useState(false);
  const [fetchedNumber, setFetchedNumber] = useState<string | null>(null);

  const queryOrderId = useMemo(() => {
    const q = searchParams.get("orderId")?.trim();
    return q || null;
  }, [searchParams]);

  const stateOrder = state?.order;
  const stored = readPersisted();

  const orderId =
    queryOrderId ?? pickOrderId(stateOrder) ?? pickOrderId(stored) ?? null;

  const orderNumber =
    stateOrder?.orderNumber ??
    state?.orderNumber ??
    stored?.orderNumber ??
    fetchedNumber ??
    null;

  useEffect(() => {
    if (!orderId) return;
    try {
      sessionStorage.setItem(
        LAST_ORDER_KEY,
        JSON.stringify({
          _id: orderId,
          orderNumber: orderNumber ?? undefined,
        })
      );
    } catch {
      /* ignore */
    }
  }, [orderId, orderNumber]);

  useEffect(() => {
    if (!orderId) return;
    if (orderNumber) return;
    let cancelled = false;
    void api
      .getOrder(orderId)
      .then((r: { data?: { orderNumber?: string } }) => {
        const n = r?.data?.orderNumber;
        if (cancelled || !n) return;
        setFetchedNumber(String(n));
      })
      .catch(() => {
        /* wrong id / session */
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, orderNumber]);

  async function handleDownloadInvoice() {
    if (!orderId) {
      setInvError(
        "No order is linked to this page. Place an order from checkout (you will be redirected with your order id in the address bar), or open My Orders and use the invoice action there."
      );
      return;
    }
    setInvBusy(true);
    setInvError(null);
    try {
      const blob = await api.downloadOrderInvoiceSummaryHtml(orderId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `StructBay-order-${orderNumber ?? orderId}.html`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setInvError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setInvBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="relative mb-8">
        <div
          style={{ backgroundColor: "var(--sb-orange)" }}
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
        >
          <CheckCircle2 className="w-14 h-14 text-sb-cream" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            style={{ borderColor: "var(--sb-orange)" }}
            className="w-32 h-32 rounded-full border-4 opacity-30 animate-ping"
          />
        </div>
      </div>

      <h1 className="text-foreground mb-2">Order Placed Successfully!</h1>
      <p className="text-muted-foreground mb-6">
        Your order has been confirmed. You will receive updates on your registered email and phone number.
      </p>

      <div style={{ backgroundColor: "var(--sb-blue)" }} className="rounded-2xl p-6 text-sb-cream mb-4">
        <p className="text-sb-cream/70 text-sm mb-1">Order Number</p>
        <p className="font-bold text-2xl tracking-wide">{orderNumber ?? "—"}</p>
        {!orderNumber && (
          <p className="text-sb-cream/80 text-sm mt-1">
            Your StructBay order reference was sent to your registered email and phone.
          </p>
        )}
        <p className="text-sb-cream/70 text-sm mt-2">Expected Delivery: 2–4 Business Days</p>
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-800 text-left">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" aria-hidden />
        <span>
          <strong>Delivery Charges Notice:</strong> Additional Delivery Charges Applicable. Charges To Be Paid At Site.
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 mb-6 text-left">
        <h3 className="font-semibold mb-4 text-foreground">What&apos;s Next?</h3>
        <div className="space-y-3">
          {[
            { step: "1", title: "Order Confirmed", desc: "Your order is being processed by our team.", done: true },
            { step: "2", title: "Quality Check", desc: "Products are inspected at our warehouse.", done: false },
            { step: "3", title: "Dispatch", desc: "Your order will be dispatched within 24 hours.", done: false },
            { step: "4", title: "Delivery", desc: "Delivered to your site address.", done: false },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div
                style={{
                  backgroundColor: item.done ? "var(--sb-orange)" : "var(--sb-blue)",
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-sb-cream text-xs font-bold shrink-0 mt-0.5"
              >
                {item.step}
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {invError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-left">
          <span>{invError}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          disabled={invBusy}
          onClick={() => void handleDownloadInvoice()}
          className="flex-1 flex items-center justify-center gap-2 border-2 border-[#FE5E00] text-[#FE5E00] bg-white rounded-2xl py-3 text-sm font-semibold hover:bg-[#FE5E00]/5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <Download className="w-4 h-4" /> {invBusy ? "Preparing…" : "Download Invoice"}
        </button>
        <Link
          to="/track"
          style={{ backgroundColor: "var(--sb-blue)" }}
          className="flex-1 flex items-center justify-center gap-2 text-sb-cream rounded-2xl py-3 text-sm font-semibold hover:opacity-90"
        >
          <Package className="w-4 h-4" /> Track Order
        </Link>
        <Link
          to="/"
          style={{ backgroundColor: "var(--sb-orange)" }}
          className="flex-1 flex items-center justify-center gap-2 text-sb-cream rounded-2xl py-3 text-sm font-semibold hover:opacity-90"
        >
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
