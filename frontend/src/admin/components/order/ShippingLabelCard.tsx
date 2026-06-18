import { useCallback, useEffect, useState } from "react";
import { Download, Eye, Loader2, Printer, RefreshCw, Send, ShieldOff } from "lucide-react";
import { adminFetch as apiFetch, adminDownloadBlob, adminFetchBlob } from "../../../lib/adminApi";
import { WorkflowSubsection } from "./orderDetailShared";

type ShippingLabelData = {
  id?: string;
  shipmentId?: string;
  trackingNumber?: string;
  generatedAt?: string;
  generatedBy?: { name?: string };
  status?: string;
  labelUrl?: string;
  labelGenerated?: boolean;
  deliveryType?: "vendor_delivery" | "structbay_delivery";
  sharedWithVendor?: boolean;
  shipping_label_shared_with_vendor?: boolean;
  sharedAt?: string | null;
  sharedBy?: { name?: string };
};

type Props = {
  orderId: string;
  vendorOrderId: string;
  vendorOrderNumber: string;
  deliveryType: "vendor_delivery" | "structbay_delivery";
  disabled?: boolean;
  refreshKey?: number;
};

function labelStatusText(label: ShippingLabelData | null) {
  if (!label?.labelGenerated && !label?.shipmentId) return "Not generated";
  if (label.status === "REGENERATED") return "Regenerated";
  return "Generated";
}

function vendorShareStatus(label: ShippingLabelData | null, typeB: boolean) {
  if (!label?.labelGenerated && !label?.shipmentId) return null;
  if (typeB) return "Internal only (Type B — not shared with vendor)";
  if (label.sharedWithVendor || label.shipping_label_shared_with_vendor) return "Shared with vendor";
  return "Not shared with vendor";
}

export function ShippingLabelCard({
  orderId,
  vendorOrderId,
  vendorOrderNumber,
  deliveryType,
  disabled,
  refreshKey = 0,
}: Props) {
  const [label, setLabel] = useState<ShippingLabelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const typeB = deliveryType === "structbay_delivery";
  const qs = `vendorOrderId=${encodeURIComponent(vendorOrderId)}`;

  const loadLabel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await apiFetch(`/orders/${orderId}/shipping-label?${qs}`);
      setLabel(d.data ?? null);
    } catch (e) {
      if (e instanceof Error && /not found/i.test(e.message)) {
        setLabel(null);
      } else {
        setError(e instanceof Error ? e.message : "Failed to load shipping label.");
      }
    } finally {
      setLoading(false);
    }
  }, [orderId, qs]);

  useEffect(() => {
    void loadLabel();
  }, [loadLabel, refreshKey]);

  const generate = async (regenerate = false) => {
    setBusy(regenerate ? "regenerate" : "generate");
    setError(null);
    try {
      const path = regenerate
        ? `/orders/${orderId}/regenerate-shipping-label`
        : `/orders/${orderId}/generate-shipping-label`;
      const d = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify({ vendorOrderId }),
      });
      setLabel(d.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Label generation failed.");
    } finally {
      setBusy(null);
    }
  };

  const shareWithVendor = async () => {
    setBusy("share");
    setError(null);
    try {
      const d = await apiFetch(`/orders/${orderId}/shipping-label/share`, {
        method: "POST",
        body: JSON.stringify({ vendorOrderId }),
      });
      setLabel(d.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not share label with vendor.");
    } finally {
      setBusy(null);
    }
  };

  const revokeFromVendor = async () => {
    if (!window.confirm("Revoke vendor access to this shipping label?")) return;
    setBusy("revoke");
    setError(null);
    try {
      const d = await apiFetch(`/orders/${orderId}/shipping-label/revoke`, {
        method: "POST",
        body: JSON.stringify({ vendorOrderId }),
      });
      setLabel(d.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revoke vendor access.");
    } finally {
      setBusy(null);
    }
  };

  const previewPdf = async () => {
    setBusy("preview");
    setError(null);
    try {
      const blob = await adminFetchBlob(`/orders/${orderId}/shipping-label/preview?${qs}`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed.");
    } finally {
      setBusy(null);
    }
  };

  const downloadPdf = async () => {
    setBusy("download");
    setError(null);
    try {
      const fileName = `shipping-label-${label?.shipmentId || vendorOrderNumber}.pdf`;
      await adminDownloadBlob(`/orders/${orderId}/shipping-label/download?${qs}`, fileName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  };

  const printLabel = async () => {
    setBusy("print");
    setError(null);
    try {
      const blob = await adminFetchBlob(`/orders/${orderId}/shipping-label/preview?${qs}`);
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (w) {
        w.addEventListener("load", () => {
          try {
            w.print();
          } catch {
            /* manual print */
          }
        });
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Print failed.");
    } finally {
      setBusy(null);
    }
  };

  const hasLabel = Boolean(label?.shipmentId || label?.labelGenerated);
  const isShared = Boolean(label?.sharedWithVendor || label?.shipping_label_shared_with_vendor);
  const shareStatus = vendorShareStatus(label, typeB);

  return (
    <WorkflowSubsection title="Shipping label (optional)">
      <p className="text-[11px] text-sb-ink/50 mb-3">
        {typeB
          ? "Type B — StructBay delivery. Labels stay internal; vendors never see customer delivery labels."
          : "Type A — Vendor delivery. Generate when needed, then use Send to vendor only if the vendor requires a parcel label."}
        {" "}
        Sub-order {vendorOrderNumber}.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-sb-ink/55 py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading label…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border border-sb-ink/10 bg-white px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-sb-ink/45">Label status</div>
              <div className="text-sm font-medium text-sb-ink mt-0.5">{labelStatusText(label)}</div>
            </div>
            {shareStatus && (
              <div className="rounded-lg border border-sb-ink/10 bg-white px-3 py-2 sm:col-span-2">
                <div className="text-[10px] uppercase tracking-wide text-sb-ink/45">Vendor visibility</div>
                <div className="text-sm font-medium text-sb-ink mt-0.5">{shareStatus}</div>
                {isShared && label?.sharedAt && (
                  <div className="text-[11px] text-sb-ink/50 mt-0.5">
                    Shared {new Date(label.sharedAt).toLocaleString()}
                    {label.sharedBy?.name ? ` by ${label.sharedBy.name}` : ""}
                  </div>
                )}
              </div>
            )}
            <div className="rounded-lg border border-sb-ink/10 bg-white px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-sb-ink/45">Shipment ID</div>
              <div className="text-sm font-medium text-sb-ink mt-0.5 font-mono">{label?.shipmentId || "—"}</div>
            </div>
            <div className="rounded-lg border border-sb-ink/10 bg-white px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-sb-ink/45">Tracking #</div>
              <div className="text-sm font-medium text-sb-ink mt-0.5 font-mono">{label?.trackingNumber || "—"}</div>
            </div>
            <div className="rounded-lg border border-sb-ink/10 bg-white px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-sb-ink/45">Generated on</div>
              <div className="text-sm font-medium text-sb-ink mt-0.5">
                {label?.generatedAt ? new Date(label.generatedAt).toLocaleString() : "—"}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</p>
          )}

          <div className="wf-action-bar flex-wrap">
            {!hasLabel ? (
              <button
                type="button"
                className="wf-btn wf-btn--primary"
                disabled={disabled || busy !== null}
                onClick={() => void generate(false)}
              >
                {busy === "generate" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Generate label
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="wf-btn wf-btn--secondary"
                  disabled={disabled || busy !== null}
                  onClick={() => void generate(true)}
                >
                  {busy === "regenerate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Regenerate
                </button>
                <button
                  type="button"
                  className="wf-btn wf-btn--secondary"
                  disabled={busy !== null}
                  onClick={() => void previewPdf()}
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  type="button"
                  className="wf-btn wf-btn--secondary"
                  disabled={busy !== null}
                  onClick={() => void downloadPdf()}
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  type="button"
                  className="wf-btn wf-btn--secondary"
                  disabled={busy !== null}
                  onClick={() => void printLabel()}
                >
                  <Printer className="w-4 h-4" />
                  Print label
                </button>
                {!typeB && !isShared && (
                  <button
                    type="button"
                    className="wf-btn wf-btn--primary"
                    disabled={busy !== null}
                    onClick={() => void shareWithVendor()}
                  >
                    {busy === "share" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send to vendor
                  </button>
                )}
                {!typeB && isShared && (
                  <button
                    type="button"
                    className="wf-btn wf-btn--secondary"
                    disabled={busy !== null}
                    onClick={() => void revokeFromVendor()}
                  >
                    {busy === "revoke" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                    Revoke access
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </WorkflowSubsection>
  );
}
