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
  WorkflowSubsection,
  buildLogisticsDraft,
  vendorUserId,
} from "../components/order/orderDetailShared";

const STEPS = [
  { id: "step-overview", label: "Overview" },
  { id: "step-vendor", label: "Vendor" },
  { id: "step-fulfillment", label: "Fulfillment" },
  { id: "step-status", label: "Status" },
] as const;

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [logisticsDraft, setLogisticsDraft] = useState<Record<string, { pickupScheduledText: string; companyName: string; driverContactDetails: string }>>({});
  const [approvedVendors, setApprovedVendors] = useState<VendorRow[]>([]);
  const [vendorPick, setVendorPick] = useState("");
  const [deliveryTypePick, setDeliveryTypePick] = useState<"vendor_delivery" | "structbay_delivery">("vendor_delivery");
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [voDetailById, setVoDetailById] = useState<Record<string, any>>({});

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
    await apiFetch(`/orders/${order._id}/status`, { method: "PATCH", body: JSON.stringify({ status, note }) }).catch((e) => alert(e.message));
    await loadOrder();
  };

  const assignVendor = async (vendorId: string, deliveryType: "vendor_delivery" | "structbay_delivery") => {
    if (!order?._id) return;
    try {
      await apiFetch(`/orders/${order._id}/assign-vendor`, {
        method: "PATCH",
        body: JSON.stringify({ vendorId, deliveryType }),
      });
      await loadOrder();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Assign failed");
    }
  };

  const saveDeliveryType = async (voId: string, deliveryType: "vendor_delivery" | "structbay_delivery") => {
    try {
      await apiFetch(`/admin/vendor-orders/${voId}`, {
        method: "PUT",
        body: JSON.stringify({ deliveryType }),
      });
      await loadOrder();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not save delivery type");
    }
  };

  const saveStructbayLogistics = async (voId: string) => {
    const body = logisticsDraft[voId];
    if (!body) return;
    await apiFetch(`/admin/vendor-orders/${voId}`, {
      method: "PUT",
      body: JSON.stringify({ structbayLogistics: body }),
    }).catch((e: Error) => alert(e.message));
    await loadOrder();
  };

  const confirmPayment = async (paymentStatus: "PAID" | "FAILED") => {
    if (!order?._id) return;
    const note =
      paymentStatus === "PAID"
        ? window.prompt("Payment confirmation note (optional)", "Payment received and verified") ?? undefined
        : undefined;
    try {
      await apiFetch(`/orders/${order._id}/payment`, {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus, note }),
      });
      await loadOrder();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Payment update failed");
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
    <div className="admin-page max-w-5xl">
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
          description="Customer, payment, line items, and delivery notes for tracking."
        >
          <div className="space-y-4">
            <div className="wf-info-grid wf-info-grid--3">
              <InfoTile label="Customer" value={order.customer?.name} sub={order.customer?.phone} />
              <InfoTile label="Delivery city" value={order.city?.name} sub={`₹${order.grandTotal?.toLocaleString()}`} />
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
                Customer milestone: <strong>{order.customerVendorFulfillmentMilestone}</strong>
              </div>
            )}

            <WorkflowSubsection title="Line items">
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
                        <td>{item.name}</td>
                        <td className="text-right text-sb-ink/55">×{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </WorkflowSubsection>

            <WorkflowSubsection title="Customer tracking notes">
              <div className="wf-field">
                <label className="wf-field__label">Visible on customer order tracking</label>
                <textarea
                  className="wf-field__input min-h-[80px] resize-y"
                  placeholder="Pickup window, driver contact, partial delivery…"
                  value={order.deliveryDetails ?? ""}
                  onChange={(e) => setOrder((p: any) => ({ ...p, deliveryDetails: e.target.value }))}
                />
              </div>
              <div className="wf-form-footer">
                {order.paymentStatus === "PENDING" && (
                  <button type="button" onClick={() => void confirmPayment("PAID")} className="wf-btn wf-btn--secondary">
                    Confirm payment
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`/orders/${order._id}/edit`, {
                      method: "PATCH",
                      body: JSON.stringify({ deliveryDetails: order.deliveryDetails ?? "" }),
                    }).catch((e: Error) => alert(e.message));
                  }}
                  className="wf-btn wf-btn--primary"
                >
                  Save notes
                </button>
                <Link to={adminPath("orders", order._id, "chat")} className="wf-btn wf-btn--secondary no-underline">
                  <MessageCircle className="w-4 h-4" /> Chat
                </Link>
              </div>
            </WorkflowSubsection>
          </div>
        </OrderStep>

        <OrderStep
          step={2}
          id="step-vendor"
          title="Assign vendor"
          description="Pick an approved vendor and delivery type (Type A vendor / Type B StructBay)."
        >
          <div className="space-y-4">
            <WorkflowSubsection title="Delivery model">
              <DeliveryTypeSelector
                name="assign-delivery-type"
                value={deliveryTypePick}
                onChange={setDeliveryTypePick}
              />
            </WorkflowSubsection>

            <WorkflowSubsection title="Approved vendor">
              {vendorsLoading ? (
                <div className="flex items-center gap-2 text-sm text-sb-ink/50 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-sb-orange" /> Loading vendors…
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={vendorPick}
                      onChange={(e) => setVendorPick(e.target.value)}
                      className="wf-field__input flex-1"
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
                      disabled={
                        !vendorPick ||
                        (vendorPick === vendorUserId(order.assignedVendor) &&
                          deliveryTypePick === (order.vendorOrders?.[0]?.deliveryType ?? "vendor_delivery"))
                      }
                      onClick={() => {
                        if (!vendorPick) return;
                        void assignVendor(vendorPick, deliveryTypePick);
                      }}
                      className="wf-btn wf-btn--primary shrink-0"
                    >
                      {order.assignedVendor ? "Update assignment" : "Assign vendor"}
                    </button>
                  </div>
                  {!approvedVendors.length && (
                    <p className="text-xs text-sb-ink/45 mt-2">No approved vendors. Approve vendors under Vendors first.</p>
                  )}
                  {order.assignedVendor && (
                    <p className="text-xs text-sb-ink/55 mt-2">
                      Currently assigned: <strong className="text-sb-ink">{order.assignedVendor.companyName || order.assignedVendor.name}</strong>
                    </p>
                  )}
                </>
              )}
            </WorkflowSubsection>
          </div>
        </OrderStep>

        {hasFulfillment && (
          <OrderStep
            step={3}
            id="step-fulfillment"
            title="Fulfillment & sub-orders"
            description="StructBay logistics, workflow actions, and vendor documents per sub-order."
          >
            <div className="space-y-4">
              {order.vendorOrders.map((vo: any) => {
                const workflowLocked = ["DISPATCH_APPROVED", "VENDOR_INVOICE_SUBMITTED", "SB_INVOICE_SENT", "DISPATCHED", "DELIVERED", "COMPLETED"].includes(vo.status);
                const deliveryTypeLocked = workflowLocked || Boolean(order.assignedVendor) || Boolean(vo?._id);
                const typeLabel = vo.deliveryType === "structbay_delivery" ? "Type B" : "Type A";
                return (
                  <div key={vo._id} className="wf-suborder-card">
                    <div className="wf-suborder-card__head">
                      <span className="wf-suborder-card__id">{vo.orderNumber}</span>
                      <span className="wf-suborder-card__status">{typeLabel} · {vo.status}</span>
                    </div>
                    <div className="wf-suborder-card__body">
                      <WorkflowSubsection title="Delivery type">
                        <DeliveryTypeSelector
                          name={`dt-${vo._id}`}
                          value={vo.deliveryType === "structbay_delivery" ? "structbay_delivery" : "vendor_delivery"}
                          onChange={(v) => void saveDeliveryType(vo._id, v)}
                          disabled={deliveryTypeLocked}
                        />
                        {deliveryTypeLocked && (
                          <p className="text-[11px] text-sb-ink/45 mt-2">
                            {workflowLocked
                              ? "Locked after dispatch approval."
                              : "Set at vendor assignment — change delivery model in step 2 (Assign vendor) if needed."}
                          </p>
                        )}
                      </WorkflowSubsection>

                      {vo.deliveryType === "structbay_delivery" && (
                        <WorkflowSubsection title="StructBay logistics (customer delivery)">
                          {(vo.structbayLogistics?.pickupContactName || vo.structbayLogistics?.pickupContactPhone) && (
                            <p className="text-xs text-sb-ink/65 bg-sb-cream border border-sb-ink/8 rounded-lg px-3 py-2 mb-3">
                              Vendor pickup: <strong>{vo.structbayLogistics.pickupContactName || "—"}</strong>
                              {vo.structbayLogistics.pickupContactPhone ? ` · ${vo.structbayLogistics.pickupContactPhone}` : ""}
                            </p>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                                placeholder="Porter / Delhivery / …"
                                value={logisticsDraft[vo._id]?.companyName ?? ""}
                                onChange={(e) => setLogisticsDraft((prev) => ({
                                  ...prev,
                                  [vo._id]: { ...prev[vo._id], companyName: e.target.value, pickupScheduledText: prev[vo._id]?.pickupScheduledText ?? "", driverContactDetails: prev[vo._id]?.driverContactDetails ?? "" },
                                }))}
                              />
                            </div>
                            <div className="wf-field">
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
                          <div className="wf-form-footer">
                            <button type="button" onClick={() => saveStructbayLogistics(vo._id)} className="wf-btn wf-btn--primary">
                              Save logistics
                            </button>
                          </div>
                        </WorkflowSubsection>
                      )}

                      {vo.workflowVersion === 2 && (
                        <>
                          {(vo.status === "READY_FOR_DISPATCH" || vo.status === "DELIVERED" || vo.status === "VENDOR_INVOICE_SUBMITTED" || vo.deliveryType === "structbay_delivery") && (
                            <WorkflowSubsection title="Admin actions">
                              <div className="wf-action-bar">
                                {vo.status === "READY_FOR_DISPATCH" && (
                                  <>
                                    <button
                                      type="button"
                                      className="wf-btn wf-btn--primary"
                                      onClick={async () => {
                                        try {
                                          await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/approve-dispatch`, { method: "POST" });
                                          await loadOrder();
                                        } catch (e) {
                                          alert(e instanceof Error ? e.message : "Approve dispatch failed");
                                        }
                                      }}
                                    >
                                      Approve dispatch
                                    </button>
                                    <button
                                      type="button"
                                      className="wf-btn wf-btn--secondary"
                                      onClick={async () => {
                                        const note = window.prompt("Change request note for vendor");
                                        if (!note) return;
                                        try {
                                          await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/request-changes`, {
                                            method: "POST",
                                            body: JSON.stringify({ note }),
                                          });
                                          await loadOrder();
                                        } catch (e) {
                                          alert(e instanceof Error ? e.message : "Request failed");
                                        }
                                      }}
                                    >
                                      Request changes
                                    </button>
                                  </>
                                )}
                                {vo.status === "DELIVERED" && (
                                  <button
                                    type="button"
                                    className="wf-btn wf-btn--primary"
                                    onClick={async () => {
                                      try {
                                        await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/confirm-delivery`, { method: "POST" });
                                        await loadOrder();
                                      } catch (e) {
                                        alert(e instanceof Error ? e.message : "Confirm delivery failed");
                                      }
                                    }}
                                  >
                                    Confirm delivery
                                  </button>
                                )}
                                {vo.deliveryType === "structbay_delivery" && vo.status === "SB_INVOICE_SENT" && (
                                  <button
                                    type="button"
                                    className="wf-btn wf-btn--primary"
                                    onClick={async () => {
                                      try {
                                        await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/mark-sb-dispatched`, { method: "POST" });
                                        await loadOrder();
                                      } catch (e) {
                                        alert(e instanceof Error ? e.message : "Mark out for delivery failed");
                                      }
                                    }}
                                  >
                                    Mark out for delivery
                                  </button>
                                )}
                                {vo.deliveryType === "structbay_delivery" && vo.status === "DISPATCHED" && (
                                  <button
                                    type="button"
                                    className="wf-btn wf-btn--primary"
                                    onClick={async () => {
                                      const note = window.prompt("Delivery note (optional)", "Delivered to customer") ?? undefined;
                                      try {
                                        await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/mark-sb-delivered`, {
                                          method: "POST",
                                          body: JSON.stringify({ note }),
                                        });
                                        await loadOrder();
                                      } catch (e) {
                                        alert(e instanceof Error ? e.message : "Mark delivered failed");
                                      }
                                    }}
                                  >
                                    Mark delivered
                                  </button>
                                )}
                              </div>
                            </WorkflowSubsection>
                          )}

                          {vo.status === "VENDOR_INVOICE_SUBMITTED" && (
                            <WorkflowSubsection title="Upload StructBay invoice & e-way">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <WorkflowFileUpload label="StructBay invoice (PDF)" accept=".pdf,application/pdf" name={`sb-inv-${vo._id}`} />
                                <WorkflowFileUpload label="E-way bill (PDF)" accept=".pdf,application/pdf" name={`sb-ew-${vo._id}`} />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                <div className="wf-field">
                                  <label className="wf-field__label">SB invoice number</label>
                                  <input id={`sb-${vo._id}-inum`} className="wf-field__input" placeholder="INV-…" />
                                </div>
                                <div className="wf-field">
                                  <label className="wf-field__label">E-way bill number</label>
                                  <input id={`sb-${vo._id}-enum`} className="wf-field__input" placeholder="EWB-…" />
                                </div>
                              </div>
                              <div className="wf-form-footer">
                                <button
                                  type="button"
                                  className="wf-btn wf-btn--primary"
                                  onClick={async () => {
                                    const invEl = document.querySelector(`input[name="sb-inv-${vo._id}"]`) as HTMLInputElement | null;
                                    const ewEl = document.querySelector(`input[name="sb-ew-${vo._id}"]`) as HTMLInputElement | null;
                                    const inum = (document.getElementById(`sb-${vo._id}-inum`) as HTMLInputElement | null)?.value;
                                    const enumv = (document.getElementById(`sb-${vo._id}-enum`) as HTMLInputElement | null)?.value;
                                    if (!invEl?.files?.[0] || !ewEl?.files?.[0] || !inum || !enumv) {
                                      alert("Both PDFs and both numbers are required.");
                                      return;
                                    }
                                    const fd = new FormData();
                                    fd.append("sbInvoice", invEl.files[0]);
                                    fd.append("ewayBill", ewEl.files[0]);
                                    fd.append("invoice_number", inum);
                                    fd.append("eway_bill_number", enumv);
                                    await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/sb-docs`, { method: "POST", body: fd }).catch((e) => alert(e.message));
                                    await loadOrder();
                                  }}
                                >
                                  Send SB documents to vendor
                                </button>
                              </div>
                            </WorkflowSubsection>
                          )}

                          {voDetailById[vo._id]?.statusAudits?.length > 0 && (
                            <details className="text-xs text-sb-ink/55 rounded-lg border border-sb-ink/10 px-3 py-2">
                              <summary className="cursor-pointer font-medium py-1">Event history ({voDetailById[vo._id].statusAudits.length})</summary>
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
                          <VendorWorkflowSubmissions detail={voDetailById[vo._id]} />
                        </>
                      )}
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
          description="Update the master order status when the workflow moves forward."
        >
          <WorkflowSubsection title="Master order status">
            <div className="wf-field max-w-md">
              <label className="wf-field__label">Status shown to customer & reports</label>
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
          </WorkflowSubsection>
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
    </div>
  );
}
