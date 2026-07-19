import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react";
import { WorkflowCard, DeliveryTypeSelector, VendorWorkflowSubmissions, lineDefaultDeliveryType } from "./orderDetailShared";
import { ShippingLabelCard } from "./ShippingLabelCard";
import { WorkflowFileUpload, WorkflowFilePreview } from "@shared/components/workflow/WorkflowFileUpload";

type DeliveryType = "vendor_delivery" | "structbay_delivery";

export function ProductCard({
  item,
  order,
  draft,
  approvedVendors,
  savingLines,
  setLineDrafts,
  saveLineFulfillment,
  vo,
  voDetail,
  saveDeliveryType,
  logisticsDraft,
  setLogisticsDraft,
  saveStructbayLogistics,
  labelRefreshKey,
  openConfirmPaymentModal,
  apiFetch,
  adminToast,
  loadOrder,
  setInputModal,
}: {
  item: any;
  order: any;
  draft: any;
  approvedVendors: any[];
  savingLines: boolean;
  setLineDrafts: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  saveLineFulfillment: (itemId: string) => Promise<void>;
  vo?: any;
  voDetail?: any;
  saveDeliveryType: (voId: string, deliveryType: string) => void;
  logisticsDraft: Record<string, any>;
  setLogisticsDraft: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  saveStructbayLogistics: (voId: string) => Promise<void>;
  labelRefreshKey: number;
  openConfirmPaymentModal?: () => void;
  apiFetch: any;
  adminToast: any;
  loadOrder: () => Promise<void>;
  setInputModal: React.Dispatch<React.SetStateAction<any>>;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasAdminActions = vo && ["READY_FOR_DISPATCH", "DISPATCHED", "DELIVERED", "SB_INVOICE_SENT"].includes(vo.status);

  const assignedVendor = item.assignedVendorUser?.companyName || item.assignedVendorUser?.name;
  const lineDefaultType = lineDefaultDeliveryType(item);
  const defaultTypeLabel = lineDefaultType === "structbay_delivery" ? "Type B" : "Type A";
  const hasFulfillment = !!vo;

  // Calculate progress steps
  const isAssigned = !!assignedVendor;
  const isAccepted = vo && ["ACCEPTED", "READY_FOR_DISPATCH", "PARTIALLY_DISPATCHED", "DISPATCHED", "DELIVERED", "COMPLETED"].includes(vo.status);
  const isInvoiceUploaded = vo && ["UPLOADED", "APPROVED"].includes(vo.invoiceStatus);
  const isDispatch = vo && ["DISPATCHED", "DELIVERED", "COMPLETED"].includes(vo.status);
  const isDelivered = vo && ["DELIVERED", "COMPLETED"].includes(vo.status);

  const ProgressStep = ({ label, done }: { label: string; done: boolean }) => (
    <div className="flex items-center gap-1.5">
      {done ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Circle className="w-3.5 h-3.5 text-sb-ink/20" />}
      <span className={`text-[11px] font-medium ${done ? "text-green-700" : "text-sb-ink/40"}`}>{label}</span>
    </div>
  );

  const formatStatusText = (s: string) => {
    if (!s) return '—';
    return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className={`mb-4 border rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200 ${expanded ? "border-sb-orange ring-1 ring-sb-orange/20" : "border-sb-ink/10 hover:border-sb-ink/20"}`}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="w-full flex flex-col lg:flex-row lg:items-center justify-between p-4 text-left cursor-pointer focus:outline-none focus-visible:bg-sb-cream"
      >
        <div className="flex items-start gap-4 flex-1">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-sb-ink mb-1 flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isDelivered ? "bg-green-500" : isAssigned ? "bg-blue-500" : "bg-orange-500"}`} />
              {item.name}
            </h3>
            <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-x-4 gap-y-1 text-xs text-sb-ink/60">
              {(item.variationLabel || item.sku) && <span><span className="lg:hidden font-semibold text-sb-ink/40 mr-2 uppercase">SKU</span>{item.variationLabel || item.sku}</span>}
              <span><span className="lg:hidden font-semibold text-sb-ink/40 mr-2 uppercase">Qty</span>{item.quantity}</span>
              <span><span className="lg:hidden font-semibold text-sb-ink/40 mr-2 uppercase">Price</span>₹{Number(item.lineTotal).toLocaleString("en-IN")}</span>
              <span><span className="lg:hidden font-semibold text-sb-ink/40 mr-2 uppercase">Default</span>{defaultTypeLabel}</span>
            </div>
            
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-sb-ink/40">Vendor</span>
                {assignedVendor ? (
                  <span className="text-xs font-medium text-sb-ink bg-sb-cream border border-sb-ink/10 px-2 py-0.5 rounded">
                    {assignedVendor}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                    Pending
                  </span>
                )}
              </div>

              {vo && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-sb-ink/40">Status</span>
                  <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    {formatStatusText(vo.status)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col lg:items-end gap-3 min-w-[200px]">
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-3">
            <ProgressStep label="Assign" done={isAssigned} />
            <ProgressStep label="Accept" done={isAccepted} />
            <ProgressStep label="Invoice" done={isInvoiceUploaded} />
            <ProgressStep label="Dispatch" done={isDispatch} />
          </div>
          <div className="hidden lg:flex text-sb-orange text-xs font-medium items-center gap-1 bg-sb-orange/10 px-2.5 py-1 rounded-full hover:bg-sb-orange/20 transition-colors">
            {expanded ? (
              <>Collapse <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>Expand Workflow <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Body (Always visible on mobile, toggleable on desktop) */}
      <div className={`border-t border-sb-ink/10 bg-gray-50/50 p-4 sm:p-6 ${expanded ? "block" : "block lg:hidden"}`}>
          
          <div className="space-y-6">
            {/* Vendor Assignment Block */}
            <WorkflowCard title="1. Vendor Assignment">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="wf-field">
                  <label className="wf-field__label">Vendor</label>
                  <select
                    className="wf-field__input w-full"
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
                </div>
                <div className="wf-field">
                  <label className="wf-field__label">Delivery Type</label>
                  <select
                    className="wf-field__input w-full"
                    value={draft.deliveryType}
                    onChange={(e) =>
                      setLineDrafts((prev) => ({
                        ...prev,
                        [item._id]: { ...draft, deliveryType: e.target.value as DeliveryType },
                      }))
                    }
                  >
                    <option value="vendor_delivery">Type A (Vendor)</option>
                    <option value="structbay_delivery">Type B (Structbay)</option>
                  </select>
                </div>
                <div className="wf-field">
                  <button
                    type="button"
                    disabled={savingLines || !draft.vendorId}
                    onClick={() => void saveLineFulfillment(item._id)}
                    className="wf-btn wf-btn--secondary w-full"
                  >
                    {savingLines ? "Saving…" : "Save Assignment"}
                  </button>
                </div>
              </div>
            </WorkflowCard>

            {/* Fulfillment UI (Only if VendorOrder exists) */}
            {hasFulfillment && vo && (
              <div className="mt-8 space-y-6">
                <h4 className="text-sm font-bold text-sb-ink border-b border-sb-ink/10 pb-2 flex items-center gap-2">
                  <span className="bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px]">2</span>
                  Fulfillment Workflow
                </h4>

                <div className="wf-auto-grid">
                  <WorkflowCard title="Delivery type override (Post-assignment)">
                          <DeliveryTypeSelector
                            name={`dt-${item._id}`}
                            value={vo.deliveryType === "structbay_delivery" ? "structbay_delivery" : "vendor_delivery"}
                            onChange={(v) => void saveDeliveryType(vo._id, v)}
                            disabled={["DISPATCH_APPROVED", "VENDOR_INVOICE_SUBMITTED", "SB_INVOICE_SENT", "DISPATCHED", "DELIVERED", "COMPLETED"].includes(vo.status)}
                          />
                  </WorkflowCard>

                  {vo.deliveryType === "structbay_delivery" && (
                    <WorkflowCard title="Structbay logistics">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="wf-field">
                                <label className="wf-field__label">Pickup window</label>
                                <input
                                  className="wf-field__input"
                                  value={logisticsDraft[vo._id]?.pickupScheduledText ?? ""}
                                  onChange={(e) => setLogisticsDraft((prev) => ({
                                    ...prev,
                                    [vo._id]: { ...prev[vo._id], pickupScheduledText: e.target.value },
                                  }))}
                                />
                              </div>
                              <div className="wf-field">
                                <label className="wf-field__label">Logistics partner</label>
                                <input
                                  className="wf-field__input"
                                  value={logisticsDraft[vo._id]?.companyName ?? ""}
                                  onChange={(e) => setLogisticsDraft((prev) => ({
                                    ...prev,
                                    [vo._id]: { ...prev[vo._id], companyName: e.target.value },
                                  }))}
                                />
                              </div>
                              <div className="wf-field sm:col-span-2">
                                <label className="wf-field__label">Driver / coordinator</label>
                                <input
                                  className="wf-field__input"
                                  value={logisticsDraft[vo._id]?.driverContactDetails ?? ""}
                                  onChange={(e) => setLogisticsDraft((prev) => ({
                                    ...prev,
                                    [vo._id]: { ...prev[vo._id], driverContactDetails: e.target.value },
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

                  <ShippingLabelCard
                    orderId={order._id}
                          vendorOrderId={vo._id}
                          vendorOrderNumber={vo.orderNumber}
                          deliveryType={vo.deliveryType === "structbay_delivery" ? "structbay_delivery" : "vendor_delivery"}
                    refreshKey={labelRefreshKey}
                  />

                  {vo.workflowVersion === 2 && (
                    <VendorWorkflowSubmissions detail={voDetail} />
                  )}

                  {vo.vendorInvoice?.invoicePdfUrl && (
                    <WorkflowCard title="Uploaded vendor invoice">
                      <div className="space-y-3">
                        <div className="text-xs text-sb-ink/65 space-y-1">
                          {vo.vendorInvoice.invoiceNumber && (
                            <p>Invoice # · <strong>{vo.vendorInvoice.invoiceNumber}</strong></p>
                          )}
                          {vo.vendorInvoice.uploadedAt && (
                            <p>Uploaded · <strong>{new Date(vo.vendorInvoice.uploadedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></p>
                          )}
                        </div>
                        <WorkflowFilePreview files={[{ url: vo.vendorInvoice.invoicePdfUrl, label: 'Vendor invoice' }]} />
                      </div>
                    </WorkflowCard>
                  )}

                  {vo.workflowVersion === 2 && vo.status === "VENDOR_INVOICE_SUBMITTED" && (
                    <WorkflowCard title="StructBay invoice & e-way" variant="accent">
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
                          Send SB documents to vendor
                        </button>
                      </div>
                    </WorkflowCard>
                  )}

                  {/* Actions */}
                  {vo.workflowVersion === 2 && hasAdminActions && (
                    <WorkflowCard title="Actions" variant="accent">
                          <div className="flex flex-col gap-3 items-stretch">
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
                                  className="wf-btn wf-btn--secondary w-full justify-center text-red-600 border-red-200 hover:border-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setInputModal({
                                      title: "Request changes",
                                      label: "Reason",
                                      required: true,
                                      confirmLabel: "Reject dispatch",
                                      onConfirm: async (reason: string) => {
                                        try {
                                          await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/reject-dispatch`, {
                                            method: "POST",
                                            body: JSON.stringify({ reason }),
                                          });
                                          await loadOrder();
                                          adminToast.success("Dispatch rejected");
                                        } catch (e) {
                                          adminToast.error(e instanceof Error ? e.message : "Reject failed");
                                        }
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
                                    confirmLabel: "Confirm delivery",
                                    onConfirm: async (note: string) => {
                                      try {
                                        await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/mark-sb-delivered`, {
                                          method: "POST",
                                          body: JSON.stringify({ note }),
                                        });
                                        await loadOrder();
                                        adminToast.success("Order marked delivered");
                                      } catch (e) {
                                        adminToast.error(e instanceof Error ? e.message : "Delivery update failed");
                                      }
                                    },
                                  });
                                }}
                              >
                                Mark delivered
                              </button>
                            )}
                          </div>
                    </WorkflowCard>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
    </div>
  );
}
