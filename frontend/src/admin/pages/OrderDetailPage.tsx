import { useState, useEffect, useCallback, useMemo } from "react";
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
  lineDefaultDeliveryType,
  productDeliveryType,
  DeliveryType
} from "../components/order/orderDetailShared";
import { ShippingLabelCard } from "../components/order/ShippingLabelCard";
import { adminToast } from "../lib/adminToast";
import { AdminInputModal } from "../components/AdminInputModal";
import { ProductCard } from "../components/order/ProductCard";

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

const formatStatusText = (s: string) => {
  if (!s) return '—';
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};
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
  const [statusDraft, setStatusDraft] = useState({ status: "PENDING", note: "" });
  const [statusSaving, setStatusSaving] = useState(false);

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
    
    if (order.status) {
      setStatusDraft((prev) => ({ ...prev, status: order.status }));
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
    setLineDrafts(prev => {
      const drafts = { ...prev };
      let changed = false;
      for (const item of order.items as any[]) {
        if (!item?._id) continue;
        const dbVendorId = vendorUserId(item.assignedVendorUser) || vendorUserId(item.assignedVendor) || "";
        
        // Keep row state isolated and prevent overwrite if user hasn't saved.
        // If draft doesn't exist, OR if we aren't saving lines right now and the DB differs (implying remote update or successful save), update it.
        if (!drafts[item._id] || (!savingLines && drafts[item._id].vendorId !== dbVendorId)) {
          drafts[item._id] = {
            vendorId: dbVendorId,
            deliveryType: lineDefaultDeliveryType(item),
            reason: "",
          };
          changed = true;
        }
      }
      return changed ? drafts : prev;
    });
  }, [order?._id, order?.items, savingLines]);

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

  const saveStatus = async () => {
    setStatusSaving(true);
    await updateStatus(statusDraft.status, statusDraft.note);
    setStatusDraft((prev) => ({ ...prev, note: "" }));
    setStatusSaving(false);
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

  const totalProducts = order.items?.length || 0;
  const acceptedProducts = order.items?.filter((item: any) => {
     const vo = order.vendorOrders?.find((v: any) => v._id === item.vendorOrderId);
     return vo && ["ACCEPTED", "READY_FOR_DISPATCH", "PARTIALLY_DISPATCHED", "DISPATCHED", "DELIVERED", "COMPLETED"].includes(vo.status);
  }).length || 0;
  const invoicePending = order.items?.filter((item: any) => {
     const vo = order.vendorOrders?.find((v: any) => v._id === item.vendorOrderId);
     return vo && vo.invoiceStatus === "PENDING" && vo.status !== "NEW_ASSIGNED";
  }).length || 0;
  const dispatchPending = order.items?.filter((item: any) => {
     const vo = order.vendorOrders?.find((v: any) => v._id === item.vendorOrderId);
     return vo && ["READY_FOR_DISPATCH", "PARTIALLY_DISPATCHED"].includes(vo.status);
  }).length || 0;
  const deliveredProducts = order.items?.filter((item: any) => {
     const vo = order.vendorOrders?.find((v: any) => v._id === item.vendorOrderId);
     return vo && ["DELIVERED", "COMPLETED"].includes(vo.status);
  }).length || 0;

  const combinedTimeline = useMemo(() => {
    if (!order) return [];
    
    const timeline = (order.statusHistory || []).map((sh: any) => {
      const d = sh.changedAt || sh.timestamp || new Date().toISOString();
      return {
        timestamp: new Date(d).getTime() || 0,
        dateStr: d,
        status: sh.status,
        note: sh.note,
        source: "Order",
      };
    });

    if (order.vendorOrders && Array.isArray(order.vendorOrders)) {
      order.vendorOrders.forEach((vo: any) => {
        if (vo.statusHistory && Array.isArray(vo.statusHistory)) {
          vo.statusHistory.forEach((sh: any) => {
            const d = sh.timestamp || sh.changedAt || new Date().toISOString();
            timeline.push({
              timestamp: new Date(d).getTime() || 0,
              dateStr: d,
              status: sh.status,
              note: sh.note || formatStatusText(sh.status),
              source: `Sub-order ${vo.orderNumber}`,
            });
          });
        }
      });
    }

    return timeline.sort((a: any, b: any) => b.timestamp - a.timestamp);
  }, [order]);

  return (
    <div className="admin-page">
      <Link to={adminPath("orders")} className="inline-flex items-center gap-2 text-sm text-sb-ink/60 hover:text-sb-orange mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to all orders
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="admin-page-title text-sb-ink">Order {order.orderNumber}</h1>
          <p className="admin-page-desc mt-1">
            {order.customer?.name} · {order.city?.name} · {order.createdAt && new Date(order.createdAt).getTime() ? new Date(order.createdAt).toLocaleString() : '—'}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${ORDER_STATUS_COLORS[order.status] || "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/12"}`}>
          {order.status}
        </span>
      </div>      {/* Top Header Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <InfoTile label="Customer" value={order.customer?.name ?? "—"} sub={order.customer?.phone} />
        <InfoTile
          label="Delivery city"
          value={order.city?.name || order.shippingAddress?.city || "—"}
          sub={[order.shippingAddress?.state || order.city?.state, order.shippingAddress?.pincode].filter(Boolean).join(" · ") || undefined}
        />
        <InfoTile
          label="Order total"
          value={order.grandTotal != null ? `₹${Number(order.grandTotal).toLocaleString("en-IN")}` : "—"}
        />
        <InfoTile
          label="Payment"
          value={formatPaymentMethod(order.paymentMethod)}
          sub={
            <div className="flex flex-col">
              <span className={PAY_COLORS[order.paymentStatus] || "text-sb-ink/50"}>{formatPaymentStatus(order.paymentStatus)}</span>
              {order.paymentTransactionId?.providerTxnId && <span className="text-xs text-sb-ink/60 mt-1">Txn: {order.paymentTransactionId.providerTxnId}</span>}
              {order.paymentTransactionId?.paidAt && (
                <span className="text-xs text-sb-ink/60">
                  {new Date(order.paymentTransactionId.paidAt).getTime() ? new Date(order.paymentTransactionId.paidAt).toLocaleString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                  }) : '—'}
                </span>
              )}
            </div>
          }
        />
      </div>

      {order.customerVendorFulfillmentMilestone && (
        <div className="wf-milestone mb-6">
          Milestone: <strong>{order.customerVendorFulfillmentMilestone}</strong>
        </div>
      )}

      {/* Order Summary */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-5 gap-4">
         <div className="bg-white rounded-xl p-4 border border-sb-ink/10 shadow-sm text-center">
           <div className="text-2xl font-bold text-sb-ink">{totalProducts}</div>
           <div className="text-[11px] text-sb-ink/50 uppercase tracking-wider mt-1 font-bold">Products</div>
         </div>
         <div className="bg-white rounded-xl p-4 border border-sb-ink/10 shadow-sm text-center">
           <div className="text-2xl font-bold text-sb-ink">{acceptedProducts}</div>
           <div className="text-[11px] text-sb-ink/50 uppercase tracking-wider mt-1 font-bold">Accepted</div>
         </div>
         <div className="bg-white rounded-xl p-4 border border-sb-ink/10 shadow-sm text-center">
           <div className="text-2xl font-bold text-sb-ink">{invoicePending}</div>
           <div className="text-[11px] text-sb-ink/50 uppercase tracking-wider mt-1 font-bold">Invoice Pending</div>
         </div>
         <div className="bg-white rounded-xl p-4 border border-sb-ink/10 shadow-sm text-center">
           <div className="text-2xl font-bold text-sb-ink">{dispatchPending}</div>
           <div className="text-[11px] text-sb-ink/50 uppercase tracking-wider mt-1 font-bold">Dispatch Pending</div>
         </div>
         <div className="bg-white rounded-xl p-4 border border-sb-ink/10 shadow-sm text-center">
           <div className="text-2xl font-bold text-green-600">{deliveredProducts}</div>
           <div className="text-[11px] text-sb-ink/50 uppercase tracking-wider mt-1 font-bold">Delivered</div>
         </div>
      </div>

      {/* Main Workspace Split */}
      <WorkflowSplit
        main={
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-sb-ink flex items-center justify-between">
              Product Fulfillment
            </h2>
            <div className="space-y-2">
              {(order.items as any[]).map((item: any) => {
                const lineDefaultType = lineDefaultDeliveryType(item);
                const draft = lineDrafts[item._id] || {
                  vendorId: "",
                  deliveryType: lineDefaultType,
                  reason: "",
                };
                const vo = order.vendorOrders?.find((v: any) => v._id === item.vendorOrderId);
                const voDetail = vo ? voDetailById[vo._id] : undefined;
                return (
                  <ProductCard
                    key={item._id}
                    item={item}
                    order={order}
                    draft={draft}
                    approvedVendors={approvedVendors}
                    savingLines={savingLines}
                    setLineDrafts={setLineDrafts}
                    saveLineFulfillment={saveLineFulfillment}
                    vo={vo}
                    voDetail={voDetail}
                    saveDeliveryType={saveDeliveryType}
                    logisticsDraft={logisticsDraft}
                    setLogisticsDraft={setLogisticsDraft}
                    saveStructbayLogistics={saveStructbayLogistics}
                    labelRefreshKey={labelRefreshKey}
                    openConfirmPaymentModal={openConfirmPaymentModal}
                    apiFetch={apiFetch}
                    adminToast={adminToast}
                    loadOrder={loadOrder}
                    setInputModal={setInputModal}
                  />
                );
              })}
            </div>
          </div>
        }
        aside={
          <div className="space-y-6">
            {/* Global Actions */}
            {approvedVendors.length > 0 && (
              <WorkflowCard title="Assign All" variant="accent">
                <p className="text-xs text-sb-ink/50 -mt-1 mb-3">Assign one vendor to all {totalProducts} products.</p>
                <DeliveryTypeSelector
                  name="assign-delivery-type"
                  value={deliveryTypePick}
                  onChange={setDeliveryTypePick}
                />
                <select
                  value={vendorPick}
                  onChange={(e) => setVendorPick(e.target.value)}
                  className="wf-field__input w-full mt-2"
                >
                  <option value="">— Select vendor —</option>
                  {approvedVendors.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.referenceNumber || (v.companyName || v.name || "Vendor").trim()}
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
                  className="wf-btn wf-btn--primary w-full justify-center mt-3"
                >
                  Assign all to one vendor
                </button>
              </WorkflowCard>
            )}

            {/* Tracking Notes */}
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
          </div>
        }
      />



      <div className="space-y-5">


        <OrderStep
          step={1}
          id="step-status"
          title="Order status"
          description="Master order status."
        >
          <WorkflowSplit
            main={
              <WorkflowCard title="Status">
                <div className="flex flex-wrap gap-4">
                  <select
                    className="wf-field__input flex-1 min-w-[200px]"
                    value={statusDraft.status}
                    onChange={(e) => setStatusDraft((p) => ({ ...p, status: e.target.value as any }))}
                  >
                    {ALL_ORDER_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <input
                    className="wf-field__input flex-1 min-w-[200px]"
                    placeholder="Status note (optional)"
                    value={statusDraft.note}
                    onChange={(e) => setStatusDraft((p) => ({ ...p, note: e.target.value }))}
                  />
                  <button
                    type="button"
                    disabled={statusSaving}
                    onClick={() => void saveStatus()}
                    className="wf-btn wf-btn--primary"
                  >
                    {statusSaving ? "Saving…" : "Update master status"}
                  </button>
                </div>
              </WorkflowCard>
            }
            aside={
              <WorkflowCard title="Summary" variant="muted">
                <div className="space-y-2 text-sm">
                  <p><span className="text-sb-ink/50">Current</span><br /><strong>{formatStatusText(order.status)}</strong></p>
                  <p><span className="text-sb-ink/50">Payment</span><br /><strong>{formatPaymentStatus(order.paymentStatus)}</strong></p>
                  <p><span className="text-sb-ink/50">Total</span><br /><strong>{order.grandTotal != null ? `₹${Number(order.grandTotal).toLocaleString("en-IN")}` : "—"}</strong></p>
                </div>
              </WorkflowCard>
            }
          />
        </OrderStep>

        <OrderStep
          step={2}
          id="step-timeline"
          title="Activity Timeline"
          description="Log of order status changes and vendor actions."
        >
          <WorkflowSplit
            main={
              <WorkflowCard title="Recent Activity">
                <div className="relative border-l border-sb-orange/20 ml-3 pl-4 space-y-6 pb-2">
                  {combinedTimeline.map((sh: any, i: number) => (
                    <div key={`ms-${i}`} className="relative">
                      <div className="absolute -left-[1.35rem] top-1 w-2.5 h-2.5 rounded-full bg-sb-orange"></div>
                      <p className="text-xs text-sb-ink/50 mb-0.5">{new Date(sh.timestamp).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                      })}</p>
                      <p className="text-sm text-sb-ink">
                        <span className="font-semibold">{sh.source === 'Order' ? formatStatusText(sh.status) : sh.source + ' - ' + formatStatusText(sh.status)}</span>
                        {sh.note && <span className="text-sb-ink/70"> - {sh.note}</span>}
                      </p>
                    </div>
                  ))}
                  {combinedTimeline.length === 0 && (
                    <p className="text-sm text-sb-ink/50">No recent activity.</p>
                  )}
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
