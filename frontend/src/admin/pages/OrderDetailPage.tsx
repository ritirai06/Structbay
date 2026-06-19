import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import { adminPath } from "../../lib/portalRoutes";
import { formatPaymentMethod, formatPaymentStatus } from "../../lib/paymentLabels";
import { WorkflowFileUpload } from "@shared/components/workflow/WorkflowFileUpload";
import {
  ALL_ORDER_STATUSES,
  ORDER_STATUS_COLORS,
  PAY_COLORS,
  DeliveryTypeSelector,
  InfoTile,
  OrderStep,
  VendorWorkflowSubmissions,
  VendorRow,
  WorkflowCard,
  WorkflowSplit,
  buildLogisticsDraft,
  vendorUserId,
} from "../components/order/orderDetailShared";
import { ShippingLabelCard } from "../components/order/ShippingLabelCard";
import { adminToast } from "../lib/adminToast";
import { AdminInputModal } from "../components/AdminInputModal";

type InputModalState = {
  title: string;
  description?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  confirmLabel?: string;
  onConfirm: (value: string) => void | Promise<void>;
};

const STEPS = [
  { id: "step-overview", label: "Overview" },
  { id: "step-vendor", label: "Vendor" },
  { id: "step-fulfillment", label: "Fulfillment" },
  { id: "step-status", label: "Status" },
] as const;

type DeliveryType = "vendor_delivery" | "structbay_delivery";

function productDeliveryType(item: any): DeliveryType {
  return item?.product?.deliveryType === "structbay_delivery" ||
    item?.product?.isStructbayDelivery ||
    item?.product?.isExpress ||
    item?.product?.structbayDeliverySupported
    ? "structbay_delivery"
    : "vendor_delivery";
}

function lineDefaultDeliveryType(item: any): DeliveryType {
  if (item?.defaultDeliveryType === "structbay_delivery" || item?.deliveryType === "structbay_delivery") {
    return "structbay_delivery";
  }
  if (item?.defaultDeliveryType === "vendor_delivery" || item?.deliveryType === "vendor_delivery") {
    return "vendor_delivery";
  }
  return productDeliveryType(item);
}

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [logisticsDraft, setLogisticsDraft] = useState<Record<string, { pickupScheduledText: string; companyName: string; driverContactDetails: string }>>({});
  const [approvedVendors, setApprovedVendors] = useState<VendorRow[]>([]);
  const [vendorPick, setVendorPick] = useState("");
  const [deliveryTypePick, setDeliveryTypePick] = useState<DeliveryType>("vendor_delivery");
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [voDetailById, setVoDetailById] = useState<Record<string, any>>({});
  const [labelRefreshKey, setLabelRefreshKey] = useState(0);
  const [lineDrafts, setLineDrafts] = useState<Record<string, { vendorId: string; deliveryType: DeliveryType; reason: string }>>({});
  const [savingLines, setSavingLines] = useState(false);
  const [inputModal, setInputModal] = useState<InputModalState | null>(null);
  const [inputModalBusy, setInputModalBusy] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const d = await apiFetch(`/orders/${orderId}`);
      if (d.data) {
        setOrder(d.data);
        setLogisticsDraft(buildLogisticsDraft(d.data.vendorOrders));
      } else {
        setLoadError("Order not found.");
        setOrder(null);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load order.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!order?._id) {
      setApprovedVendors([]);
      setVendorPick("");
      setDeliveryTypePick("vendor_delivery");
      return;
    }
    setVendorPick(vendorUserId(order.assignedVendor));
    const firstVo = order.vendorOrders?.[0];
    if (firstVo?.deliveryType === "structbay_delivery" || firstVo?.deliveryType === "vendor_delivery") {
      setDeliveryTypePick(firstVo.deliveryType);
    } else {
      setDeliveryTypePick("vendor_delivery");
    }
  }, [order]);

  useEffect(() => {
    if (!order?._id) return;
    setVendorsLoading(true);
    const params = new URLSearchParams({ limit: "200", vendorStatus: "APPROVED" });
    void apiFetch(`/admin/vendors?${params}`)
      .then((d) => setApprovedVendors(Array.isArray(d.data) ? (d.data as VendorRow[]) : []))
      .catch(() => setApprovedVendors([]))
      .finally(() => setVendorsLoading(false));
  }, [order?._id]);

  useEffect(() => {
    if (!order?.items?.length) {
      setLineDrafts({});
      return;
    }
    const drafts: Record<string, { vendorId: string; deliveryType: DeliveryType; reason: string }> = {};
    for (const item of order.items as any[]) {
      if (!item?._id) continue;
      drafts[item._id] = {
        vendorId: vendorUserId(item.assignedVendorUser) || vendorUserId(item.assignedVendor) || "",
        deliveryType: lineDefaultDeliveryType(item),
        reason: "",
      };
    }
    setLineDrafts(drafts);
  }, [order?._id, order?.items]);

  useEffect(() => {
    if (!order?.vendorOrders?.length) {
      setVoDetailById({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const m: Record<string, any> = {};
      for (const vo of order.vendorOrders as any[]) {
        if (!vo?._id || vo.workflowVersion !== 2) continue;
        try {
          const d = await apiFetch(`/admin/vendor-orders/${vo._id}`);
          if (d.data) m[vo._id] = d.data;
        } catch {
          /* skip */
        }
      }
      if (!cancelled) setVoDetailById(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [order?._id, order?.vendorOrders]);

  const updateStatus = async (status: string, note = "") => {
    if (!order?._id) return;
    try {
      await apiFetch(`/orders/${order._id}/status`, { method: "PATCH", body: JSON.stringify({ status, note }) });
      await loadOrder();
      adminToast.success("Order status updated");
    } catch (e) {
      adminToast.error(e instanceof Error ? e.message : "Status update failed");
    }
  };

  const saveLineFulfillment = async (itemId: string) => {
    if (!order?._id) return;
    const draft = lineDrafts[itemId];
    if (!draft?.vendorId) {
      adminToast.warning("Select a vendor for this line.");
      return;
    }
    setSavingLines(true);
    try {
      await apiFetch(`/orders/${order._id}/items/${itemId}/fulfillment`, {
        method: "PATCH",
        body: JSON.stringify({
          vendorId: draft.vendorId,
          deliveryType: draft.deliveryType,
          reason: draft.reason.trim() || undefined,
        }),
      });
      await loadOrder();
      adminToast.success("Line assignment saved");
    } catch (e) {
      adminToast.error(e instanceof Error ? e.message : "Could not save line assignment");
    } finally {
      setSavingLines(false);
    }
  };

  const saveAllLineFulfillment = async () => {
    if (!order?._id) return;
    const assignments = (order.items as any[])
      .map((item: any) => {
        const draft = lineDrafts[item._id];
        if (!draft?.vendorId) return null;
        return {
          itemId: item._id,
          vendorId: draft.vendorId,
          deliveryType: draft.deliveryType,
          reason: draft.reason.trim() || undefined,
        };
      })
      .filter(Boolean);
    if (!assignments.length) {
      adminToast.warning("Select a vendor for at least one line.");
      return;
    }
    setSavingLines(true);
    try {
      await apiFetch(`/orders/${order._id}/items/fulfillment`, {
        method: "PATCH",
        body: JSON.stringify({ assignments }),
      });
      await loadOrder();
      adminToast.success("All line assignments saved");
    } catch (e) {
      adminToast.error(e instanceof Error ? e.message : "Could not save assignments");
    } finally {
      setSavingLines(false);
    }
  };

  const assignVendor = async (vendorId: string, deliveryType: "vendor_delivery" | "structbay_delivery") => {
    if (!order?._id) return;
    try {
      await apiFetch(`/orders/${order._id}/assign-vendor`, {
        method: "PATCH",
        body: JSON.stringify({ vendorId, deliveryType }),
      });
      await loadOrder();
      adminToast.success("Vendor assigned to order");
    } catch (e) {
      adminToast.error(e instanceof Error ? e.message : "Assign failed");
    }
  };

  const saveDeliveryType = async (voId: string, deliveryType: "vendor_delivery" | "structbay_delivery") => {
    try {
      await apiFetch(`/admin/vendor-orders/${voId}`, {
        method: "PUT",
        body: JSON.stringify({ deliveryType }),
      });
      await loadOrder();
      adminToast.success("Delivery type updated");
    } catch (e) {
      adminToast.error(e instanceof Error ? e.message : "Could not save delivery type");
    }
  };

  const saveStructbayLogistics = async (voId: string) => {
    const body = logisticsDraft[voId];
    if (!body) return;
    try {
      await apiFetch(`/admin/vendor-orders/${voId}`, {
        method: "PUT",
        body: JSON.stringify({ structbayLogistics: body }),
      });
      await loadOrder();
      setLabelRefreshKey((k) => k + 1);
      adminToast.success("Logistics saved");
    } catch (e) {
      adminToast.error(e instanceof Error ? e.message : "Could not save logistics");
    }
  };

  const confirmPayment = async (paymentStatus: "PAID" | "FAILED", note?: string) => {
    if (!order?._id) return;
    try {
      await apiFetch(`/orders/${order._id}/payment`, {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus, note }),
      });
      await loadOrder();
      adminToast.success(paymentStatus === "PAID" ? "Payment confirmed" : "Payment updated");
    } catch (e) {
      adminToast.error(e instanceof Error ? e.message : "Payment update failed");
    }
  };

  const openConfirmPaymentModal = () => {
    setInputModal({
      title: "Confirm payment",
      label: "Note (optional)",
      defaultValue: "Payment received and verified",
      multiline: true,
      confirmLabel: "Confirm payment",
      onConfirm: async (note) => {
        await confirmPayment("PAID", note || undefined);
      },
    });
  };

  const runInputModalAction = async (value: string) => {
    if (!inputModal) return;
    setInputModalBusy(true);
    try {
      await inputModal.onConfirm(value);
      setInputModal(null);
    } catch (e) {
      adminToast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setInputModalBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page flex justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-sb-orange" />
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="admin-page">
        <Link to={adminPath("orders")} className="inline-flex items-center gap-2 text-sm text-sb-orange hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to orders
        </Link>
        <div className="rounded-xl border border-sb-orange/30 bg-sb-orange/10 px-4 py-6 text-sm text-sb-ink">
          {loadError || "Order not found."}
        </div>
      </div>
    );
  }

  const hasFulfillment = !!order.vendorOrders?.length;

  return (
    <div className="admin-page">
      <Link to={adminPath("orders")} className="inline-flex items-center gap-2 text-sm text-sb-ink/60 hover:text-sb-orange mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to all orders
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="admin-page-title text-sb-ink">Order {order.orderNumber}</h1>
          <p className="admin-page-desc mt-1">
            {order.customer?.name} · {order.city?.name} · {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${ORDER_STATUS_COLORS[order.status] || "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/12"}`}>
          {order.status}
        </span>
      </div>

      <nav className="admin-order-steps-nav mb-6" aria-label="Order workflow steps">
        {STEPS.filter((s) => s.id !== "step-fulfillment" || hasFulfillment).map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="admin-order-steps-nav__link"
          >
            {i + 1}. {s.label}
          </a>
        ))}
      </nav>

      <div className="space-y-5">
        <OrderStep
          step={1}
          id="step-overview"
          title="Order overview"
          description="Customer, payment & line items."
        >
          <WorkflowSplit
            main={
              <>
                <div className="wf-info-grid wf-info-grid--2">
                  <InfoTile label="Customer" value={order.customer?.name ?? "—"} sub={order.customer?.phone} />
                  <InfoTile
                    label="Delivery city"
                    value={order.city?.name || order.shippingAddress?.city || "—"}
                    sub={
                      [order.shippingAddress?.state || order.city?.state, order.shippingAddress?.pincode]
                        .filter(Boolean)
                        .join(" · ") || undefined
                    }
                  />
                  <InfoTile
                    label="Order total"
                    value={order.grandTotal != null ? `₹${Number(order.grandTotal).toLocaleString("en-IN")}` : "—"}
                  />
                  <InfoTile
                    label="Payment"
                    value={formatPaymentMethod(order.paymentMethod)}
                    sub={
                      <span className={PAY_COLORS[order.paymentStatus] || "text-sb-ink/50"}>
                        {formatPaymentStatus(order.paymentStatus)}
                      </span>
                    }
                  />
                </div>

                {order.customerVendorFulfillmentMilestone && (
                  <div className="wf-milestone">
                    Milestone: <strong>{order.customerVendorFulfillmentMilestone}</strong>
                  </div>
                )}

                <WorkflowCard title="Line items">
                  <div className="overflow-x-auto rounded-lg border border-sb-ink/10">
                    <table className="wf-items-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th className="text-right w-20">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items?.map((item: any, i: number) => (
                          <tr key={i}>
                            <td>
                              <div>{item.name}</div>
                              {(item.variationLabel || item.sku) && (
                                <div className="text-xs text-sb-ink/50 mt-0.5">
                                  {item.variationLabel || item.sku}
                                </div>
                              )}
                            </td>
                            <td className="text-right text-sb-ink/55">×{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </WorkflowCard>
              </>
            }
            aside={
              <WorkflowCard title="Tracking notes" variant="accent">
                <div className="wf-field">
                  <label className="wf-field__label">Visible to customer</label>
                  <textarea
                    className="wf-field__input min-h-[100px] resize-y"
                    placeholder="Pickup window, driver contact…"
                    value={order.deliveryDetails ?? ""}
                    onChange={(e) => setOrder((p: any) => ({ ...p, deliveryDetails: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  {order.paymentStatus === "PENDING" && (
                    <button type="button" onClick={() => openConfirmPaymentModal()} className="wf-btn wf-btn--secondary w-full justify-center">
                      Confirm payment
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await apiFetch(`/orders/${order._id}/edit`, {
                          method: "PATCH",
                          body: JSON.stringify({ deliveryDetails: order.deliveryDetails ?? "" }),
                        });
                        adminToast.success("Notes saved");
                      } catch (e) {
                        adminToast.error(e instanceof Error ? e.message : "Could not save notes");
                      }
                    }}
                    className="wf-btn wf-btn--primary w-full justify-center"
                  >
                    Save notes
                  </button>
                  <Link to={adminPath("orders", order._id, "chat")} className="wf-btn wf-btn--secondary no-underline w-full justify-center">
                    <MessageCircle className="w-4 h-4" /> Chat
                  </Link>
                </div>
              </WorkflowCard>
            }
          />
        </OrderStep>

        <OrderStep
          step={2}
          id="step-vendor"
          title="Assign vendors"
          description="One vendor per product line."
        >
          <WorkflowSplit
            main={
              vendorsLoading ? (
                <div className="flex items-center gap-2 text-sm text-sb-ink/50 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-sb-orange" /> Loading vendors…
                </div>
              ) : !approvedVendors.length ? (
                <p className="text-xs text-sb-ink/45">No approved vendors. Approve vendors under Vendors first.</p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-sb-ink/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-sb-cream-secondary text-left text-xs text-sb-ink/55">
                          <th className="px-3 py-2.5 font-semibold">Product</th>
                          <th className="px-3 py-2.5 font-semibold">Default</th>
                          <th className="px-3 py-2.5 font-semibold">Type</th>
                          <th className="px-3 py-2.5 font-semibold min-w-[12rem]">Vendor</th>
                          <th className="px-3 py-2.5 font-semibold">Override reason</th>
                          <th className="px-3 py-2.5 font-semibold" />
                        </tr>
                      </thead>
                      <tbody>
                        {(order.items as any[]).map((item: any) => {
                          const lineDefaultType = lineDefaultDeliveryType(item);
                          const draft = lineDrafts[item._id] || {
                            vendorId: "",
                            deliveryType: lineDefaultType,
                            reason: "",
                          };
                          const defaultType = lineDefaultType === "structbay_delivery" ? "Type B" : "Type A";
                          const assigned = item.assignedVendorUser?.companyName || item.assignedVendorUser?.name;
                          return (
                            <tr key={item._id} className="border-t border-sb-ink/8">
                              <td className="px-3 py-2.5">
                                <div className="font-medium text-sb-ink">{item.name}</div>
                                {(item.variationLabel || item.sku) && (
                                  <div className="text-xs text-sb-ink/50">{item.variationLabel || item.sku}</div>
                                )}
                                <div className="text-xs text-sb-ink/45">Qty {item.quantity} · ₹{Number(item.lineTotal).toLocaleString("en-IN")}</div>
                                {assigned && (
                                  <div className="text-xs text-green-700 mt-0.5">Assigned: {assigned}</div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-sb-ink/70">{defaultType}</td>
                              <td className="px-3 py-2.5">
                                <select
                                  className="wf-field__input text-xs py-1.5"
                                  value={draft.deliveryType}
                                  onChange={(e) =>
                                    setLineDrafts((prev) => ({
                                      ...prev,
                                      [item._id]: {
                                        ...draft,
                                        deliveryType: e.target.value as DeliveryType,
                                      },
                                    }))
                                  }
                                >
                                  <option value="vendor_delivery">Type A</option>
                                  <option value="structbay_delivery">Type B</option>
                                </select>
                              </td>
                              <td className="px-3 py-2.5">
                                <select
                                  className="wf-field__input text-xs py-1.5 w-full"
                                  value={draft.vendorId}
                                  onChange={(e) =>
                                    setLineDrafts((prev) => ({
                                      ...prev,
                                      [item._id]: { ...draft, vendorId: e.target.value },
                                    }))
                                  }
                                >
                                  <option value="">— Select —</option>
                                  {approvedVendors.map((v) => (
                                    <option key={v._id} value={v._id}>
                                      {(v.companyName || v.name || "Vendor").trim()}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2.5">
                                {draft.deliveryType !== lineDefaultType ? (
                                  <input
                                    type="text"
                                    className="wf-field__input text-xs py-1.5 w-full"
                                    placeholder="Reason (optional)"
                                    value={draft.reason}
                                    onChange={(e) =>
                                      setLineDrafts((prev) => ({
                                        ...prev,
                                        [item._id]: { ...draft, reason: e.target.value },
                                      }))
                                    }
                                  />
                                ) : (
                                  <span className="text-xs text-sb-ink/35">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <button
                                  type="button"
                                  disabled={savingLines || !draft.vendorId}
                                  onClick={() => void saveLineFulfillment(item._id)}
                                  className="wf-btn wf-btn--secondary text-xs py-1.5 px-2.5"
                                >
                                  Save
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    disabled={savingLines}
                    onClick={() => void saveAllLineFulfillment()}
                    className="wf-btn wf-btn--primary"
                  >
                    {savingLines ? "Saving…" : "Save all lines"}
                  </button>
                </>
              )
            }
            aside={
              approvedVendors.length > 0 ? (
                <WorkflowCard title="Quick assign" variant="accent">
                  <p className="text-xs text-sb-ink/50 -mt-1 mb-1">One vendor for the whole order (legacy).</p>
                  <DeliveryTypeSelector
                    name="assign-delivery-type"
                    value={deliveryTypePick}
                    onChange={setDeliveryTypePick}
                  />
                  <select
                    value={vendorPick}
                    onChange={(e) => setVendorPick(e.target.value)}
                    className="wf-field__input"
                  >
                    <option value="">— Select vendor —</option>
                    {approvedVendors.map((v) => (
                      <option key={v._id} value={v._id}>
                        {(v.companyName || v.name || "Vendor").trim()}
                        {v.email ? ` · ${v.email}` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!vendorPick}
                    onClick={() => {
                      if (!vendorPick) return;
                      void assignVendor(vendorPick, deliveryTypePick);
                    }}
                    className="wf-btn wf-btn--primary w-full justify-center"
                  >
                    Assign all to one vendor
                  </button>
                </WorkflowCard>
              ) : undefined
            }
          />
        </OrderStep>

        {hasFulfillment && (
          <OrderStep
            step={3}
            id="step-fulfillment"
            title="Fulfillment"
            description="Labels, logistics & vendor docs."
          >
            <div className="space-y-4">
              {order.vendorOrders.map((vo: any) => {
                const workflowLocked = ["DISPATCH_APPROVED", "VENDOR_INVOICE_SUBMITTED", "SB_INVOICE_SENT", "DISPATCHED", "DELIVERED", "COMPLETED"].includes(vo.status);
                const deliveryTypeLocked = workflowLocked;
                const typeLabel = vo.deliveryType === "structbay_delivery" ? "Type B" : "Type A";
                const hasAdminActions =
                  vo.status === "READY_FOR_DISPATCH" ||
                  vo.status === "DELIVERED" ||
                  (vo.deliveryType === "structbay_delivery" &&
                    (vo.status === "SB_INVOICE_SENT" || vo.status === "DISPATCHED"));
                return (
                  <div key={vo._id} className="wf-suborder-card">
                    <div className="wf-suborder-card__head">
                      <span className="wf-suborder-card__id">{vo.orderNumber}</span>
                      <span className="wf-suborder-card__status">{typeLabel} · {vo.status}</span>
                    </div>
                    <div className="wf-suborder-card__body">
                      <div className="wf-fulfillment-grid">
                        <div className="wf-fulfillment-main">
                          <div className="wf-fulfillment-pair">
                            <WorkflowCard title="Delivery type">
                              <DeliveryTypeSelector
                                name={`dt-${vo._id}`}
                                value={vo.deliveryType === "structbay_delivery" ? "structbay_delivery" : "vendor_delivery"}
                                onChange={(v) => void saveDeliveryType(vo._id, v)}
                                disabled={deliveryTypeLocked}
                              />
                              {deliveryTypeLocked && (
                                <p className="text-[11px] text-sb-ink/45">
                                  {workflowLocked ? "Locked after dispatch approval." : "Change in step 2 if needed."}
                                </p>
                              )}
                            </WorkflowCard>

                            {vo.deliveryType === "structbay_delivery" && (
                              <WorkflowCard title="StructBay logistics">
                                {(vo.structbayLogistics?.pickupContactName || vo.structbayLogistics?.pickupContactPhone) && (
                                  <p className="text-xs text-sb-ink/65 bg-sb-cream border border-sb-ink/8 rounded-lg px-3 py-2">
                                    Pickup · <strong>{vo.structbayLogistics.pickupContactName || "—"}</strong>
                                    {vo.structbayLogistics.pickupContactPhone ? ` · ${vo.structbayLogistics.pickupContactPhone}` : ""}
                                  </p>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="wf-field">
                                    <label className="wf-field__label">Pickup window</label>
                                    <input
                                      className="wf-field__input"
                                      placeholder="e.g. 18 Jun, 10 AM–2 PM"
                                      value={logisticsDraft[vo._id]?.pickupScheduledText ?? ""}
                                      onChange={(e) => setLogisticsDraft((prev) => ({
                                        ...prev,
                                        [vo._id]: { ...prev[vo._id], pickupScheduledText: e.target.value, companyName: prev[vo._id]?.companyName ?? "", driverContactDetails: prev[vo._id]?.driverContactDetails ?? "" },
                                      }))}
                                    />
                                  </div>
                                  <div className="wf-field">
                                    <label className="wf-field__label">Logistics partner</label>
                                    <input
                                      className="wf-field__input"
                                      placeholder="Porter / Delhivery"
                                      value={logisticsDraft[vo._id]?.companyName ?? ""}
                                      onChange={(e) => setLogisticsDraft((prev) => ({
                                        ...prev,
                                        [vo._id]: { ...prev[vo._id], companyName: e.target.value, pickupScheduledText: prev[vo._id]?.pickupScheduledText ?? "", driverContactDetails: prev[vo._id]?.driverContactDetails ?? "" },
                                      }))}
                                    />
                                  </div>
                                  <div className="wf-field sm:col-span-2">
                                    <label className="wf-field__label">Driver / coordinator</label>
                                    <input
                                      className="wf-field__input"
                                      placeholder="Name & phone"
                                      value={logisticsDraft[vo._id]?.driverContactDetails ?? ""}
                                      onChange={(e) => setLogisticsDraft((prev) => ({
                                        ...prev,
                                        [vo._id]: { ...prev[vo._id], driverContactDetails: e.target.value, pickupScheduledText: prev[vo._id]?.pickupScheduledText ?? "", companyName: prev[vo._id]?.companyName ?? "" },
                                      }))}
                                    />
                                  </div>
                                </div>
                                <div className="wf-form-footer border-0 pt-2 mt-0">
                                  <button type="button" onClick={() => saveStructbayLogistics(vo._id)} className="wf-btn wf-btn--primary">
                                    Save logistics
                                  </button>
                                </div>
                              </WorkflowCard>
                            )}
                          </div>

                          <div className="wf-fulfillment-pair">
                            <ShippingLabelCard
                              orderId={order._id}
                              vendorOrderId={vo._id}
                              vendorOrderNumber={vo.orderNumber}
                              deliveryType={vo.deliveryType === "structbay_delivery" ? "structbay_delivery" : "vendor_delivery"}
                              refreshKey={labelRefreshKey}
                            />

                          {vo.workflowVersion === 2 && (
                            <VendorWorkflowSubmissions detail={voDetailById[vo._id]} />
                          )}
                          </div>

                          {vo.workflowVersion === 2 && vo.status === "VENDOR_INVOICE_SUBMITTED" && (
                            <WorkflowCard title="StructBay invoice & e-way">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <WorkflowFileUpload label="Invoice (PDF)" accept=".pdf,application/pdf" name={`sb-inv-${vo._id}`} />
                                <WorkflowFileUpload label="E-way bill (PDF)" accept=".pdf,application/pdf" name={`sb-ew-${vo._id}`} />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="wf-field">
                                  <label className="wf-field__label">Invoice no.</label>
                                  <input id={`sb-${vo._id}-inum`} className="wf-field__input" placeholder="INV-…" />
                                </div>
                                <div className="wf-field">
                                  <label className="wf-field__label">E-way no.</label>
                                  <input id={`sb-${vo._id}-enum`} className="wf-field__input" placeholder="EWB-…" />
                                </div>
                              </div>
                              <div className="wf-form-footer border-0 pt-2 mt-0">
                                <button
                                  type="button"
                                  className="wf-btn wf-btn--primary"
                                  onClick={async () => {
                                    const invEl = document.querySelector(`input[name="sb-inv-${vo._id}"]`) as HTMLInputElement | null;
                                    const ewEl = document.querySelector(`input[name="sb-ew-${vo._id}"]`) as HTMLInputElement | null;
                                    const inum = (document.getElementById(`sb-${vo._id}-inum`) as HTMLInputElement | null)?.value;
                                    const enumv = (document.getElementById(`sb-${vo._id}-enum`) as HTMLInputElement | null)?.value;
                                    if (!invEl?.files?.[0] || !ewEl?.files?.[0] || !inum || !enumv) {
                                      adminToast.warning("Both PDFs and both numbers are required.");
                                      return;
                                    }
                                    const fd = new FormData();
                                    fd.append("sbInvoice", invEl.files[0]);
                                    fd.append("ewayBill", ewEl.files[0]);
                                    fd.append("invoice_number", inum);
                                    fd.append("eway_bill_number", enumv);
                                    try {
                                      await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/sb-docs`, { method: "POST", body: fd });
                                      await loadOrder();
                                      adminToast.success("Documents sent to vendor");
                                    } catch (e) {
                                      adminToast.error(e instanceof Error ? e.message : "Upload failed");
                                    }
                                  }}
                                >
                                  Send to vendor
                                </button>
                              </div>
                            </WorkflowCard>
                          )}

                          {vo.workflowVersion === 2 && voDetailById[vo._id]?.statusAudits?.length > 0 && (
                            <details className="wf-event-history">
                              <summary>Event history ({voDetailById[vo._id].statusAudits.length})</summary>
                              <div className="max-h-36 overflow-y-auto space-y-1 pt-2 border-t border-sb-ink/8 mt-1">
                                {(voDetailById[vo._id].statusAudits as any[]).slice(0, 15).map((a: any) => (
                                  <div key={a._id}>
                                    {a.changedAt ? new Date(a.changedAt).toLocaleString() : ""} — {a.status}
                                    {a.remarks ? ` · ${a.remarks}` : ""}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>

                        {vo.workflowVersion === 2 && hasAdminActions && (
                          <aside className="wf-fulfillment-aside">
                            <WorkflowCard title="Actions" variant="accent">
                              <div className="wf-action-bar flex-col items-stretch">
                                {vo.status === "READY_FOR_DISPATCH" && (
                                    <>
                                      <button
                                        type="button"
                                        className="wf-btn wf-btn--primary w-full justify-center"
                                        onClick={async () => {
                                          const ok = await adminToast.confirm("Approve dispatch for this sub-order?", {
                                            description: vo.orderNumber,
                                            confirmLabel: "Approve",
                                          });
                                          if (!ok) return;
                                          try {
                                            await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/approve-dispatch`, { method: "POST" });
                                            await loadOrder();
                                            adminToast.success("Dispatch approved");
                                          } catch (e) {
                                            adminToast.error(e instanceof Error ? e.message : "Approve dispatch failed");
                                          }
                                        }}
                                      >
                                        Approve dispatch
                                      </button>
                                      <button
                                        type="button"
                                        className="wf-btn wf-btn--secondary w-full justify-center"
                                        onClick={() => {
                                          setInputModal({
                                            title: "Request changes",
                                            label: "Note for vendor",
                                            required: true,
                                            multiline: true,
                                            confirmLabel: "Send request",
                                            onConfirm: async (note) => {
                                              await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/request-changes`, {
                                                method: "POST",
                                                body: JSON.stringify({ note }),
                                              });
                                              await loadOrder();
                                              adminToast.success("Change request sent");
                                            },
                                          });
                                        }}
                                      >
                                        Request changes
                                      </button>
                                    </>
                                  )}
                                  {vo.status === "DELIVERED" && (
                                    <button
                                      type="button"
                                      className="wf-btn wf-btn--primary w-full justify-center"
                                      onClick={async () => {
                                        const ok = await adminToast.confirm("Confirm delivery for this sub-order?", {
                                          confirmLabel: "Confirm",
                                        });
                                        if (!ok) return;
                                        try {
                                          await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/confirm-delivery`, { method: "POST" });
                                          await loadOrder();
                                          adminToast.success("Delivery confirmed");
                                        } catch (e) {
                                          adminToast.error(e instanceof Error ? e.message : "Confirm delivery failed");
                                        }
                                      }}
                                    >
                                      Confirm delivery
                                    </button>
                                  )}
                                  {vo.deliveryType === "structbay_delivery" && vo.status === "SB_INVOICE_SENT" && (
                                    <button
                                      type="button"
                                      className="wf-btn wf-btn--primary w-full justify-center"
                                      onClick={async () => {
                                        const ok = await adminToast.confirm("Mark this order out for delivery?", {
                                          confirmLabel: "Mark dispatched",
                                        });
                                        if (!ok) return;
                                        try {
                                          await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/mark-sb-dispatched`, { method: "POST" });
                                          await loadOrder();
                                          adminToast.success("Marked out for delivery");
                                        } catch (e) {
                                          adminToast.error(e instanceof Error ? e.message : "Mark out for delivery failed");
                                        }
                                      }}
                                    >
                                      Mark out for delivery
                                    </button>
                                  )}
                                  {vo.deliveryType === "structbay_delivery" && vo.status === "DISPATCHED" && (
                                    <button
                                      type="button"
                                      className="wf-btn wf-btn--primary w-full justify-center"
                                      onClick={() => {
                                        setInputModal({
                                          title: "Mark delivered",
                                          label: "Delivery note (optional)",
                                          defaultValue: "Delivered to customer",
                                          multiline: true,
                                          confirmLabel: "Mark delivered",
                                          onConfirm: async (note) => {
                                            await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/mark-sb-delivered`, {
                                              method: "POST",
                                              body: JSON.stringify({ note: note || undefined }),
                                            });
                                            await loadOrder();
                                            adminToast.success("Marked as delivered");
                                          },
                                        });
                                      }}
                                    >
                                      Mark delivered
                                    </button>
                                  )}
                              </div>
                            </WorkflowCard>
                          </aside>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </OrderStep>
        )}

        <OrderStep
          step={hasFulfillment ? 4 : 3}
          id="step-status"
          title="Order status"
          description="Master order status."
        >
          <WorkflowSplit
            main={
              <WorkflowCard title="Status">
                <div className="wf-field max-w-md">
                  <label className="wf-field__label">Shown to customer & reports</label>
                  <select
                    value={order.status}
                    onChange={(e) => void updateStatus(e.target.value)}
                    className="wf-field__input"
                  >
                    {ALL_ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </WorkflowCard>
            }
            aside={
              <WorkflowCard title="Summary" variant="muted">
                <div className="space-y-2 text-sm">
                  <p><span className="text-sb-ink/50">Current</span><br /><strong>{order.status}</strong></p>
                  <p><span className="text-sb-ink/50">Payment</span><br /><strong>{formatPaymentStatus(order.paymentStatus)}</strong></p>
                  <p><span className="text-sb-ink/50">Total</span><br /><strong>{order.grandTotal != null ? `₹${Number(order.grandTotal).toLocaleString("en-IN")}` : "—"}</strong></p>
                </div>
              </WorkflowCard>
            }
          />
        </OrderStep>
      </div>

      <div className="mt-8 wf-form-footer border-0 pt-0">
        <button
          type="button"
          onClick={() => navigate(adminPath("orders"))}
          className="wf-btn wf-btn--secondary"
        >
          Done — back to list
        </button>
      </div>

      <AdminInputModal
        open={!!inputModal}
        title={inputModal?.title ?? ""}
        description={inputModal?.description}
        label={inputModal?.label}
        defaultValue={inputModal?.defaultValue}
        placeholder={inputModal?.placeholder}
        required={inputModal?.required}
        multiline={inputModal?.multiline}
        confirmLabel={inputModal?.confirmLabel}
        busy={inputModalBusy}
        onCancel={() => setInputModal(null)}
        onConfirm={(value) => void runInputModalAction(value)}
      />
    </div>
  );
}
