import type { ReactNode } from "react";
import { WorkflowFilePreview } from "@shared/components/workflow/WorkflowFileUpload";
import "@shared/styles/workflow.css";

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-sb-orange/12 text-sb-orange border-sb-orange/25",
  PAID: "bg-sb-cream-secondary text-sb-ink border-sb-ink/12",
  VENDOR_ASSIGNMENT_PENDING: "bg-sb-orange/10 text-sb-orange border-sb-orange/22",
  PROCESSING: "bg-sb-orange/15 text-sb-orange border-sb-orange/28",
  READY_FOR_DISPATCH: "bg-sb-cream-secondary text-sb-ink border-sb-ink/12",
  PARTIALLY_DISPATCHED: "bg-sb-cream text-sb-ink border-sb-orange/30",
  DISPATCHED: "bg-sb-orange/12 text-sb-orange border-sb-orange/25",
  PARTIALLY_DELIVERED: "bg-sb-cream-secondary text-sb-ink border-sb-orange/25",
  DELIVERED: "bg-sb-cream-secondary text-sb-ink border-sb-ink/15",
  COMPLETED: "bg-sb-cream-secondary text-sb-ink border-sb-ink/15",
  CANCELLED: "bg-sb-cream-secondary text-sb-ink/60 border-sb-ink/15",
  RETURNED: "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/12",
};

export const PAY_COLORS: Record<string, string> = {
  PENDING: "text-sb-orange",
  PAID: "text-sb-ink",
  FAILED: "text-sb-ink/55",
  REFUNDED: "text-sb-orange",
};

export const ALL_ORDER_STATUSES = [
  "PENDING", "PAID", "VENDOR_ASSIGNMENT_PENDING", "PROCESSING", "READY_FOR_DISPATCH",
  "PARTIALLY_DISPATCHED", "DISPATCHED", "PARTIALLY_DELIVERED", "DELIVERED", "COMPLETED",
  "CANCELLED", "RETURNED",
];

export type VendorRow = { _id: string; companyName?: string; name?: string; email?: string };

export function vendorUserId(v: unknown): string {
  if (!v) return "";
  if (typeof v === "object" && v !== null && "_id" in v) return String((v as { _id: string })._id);
  return String(v);
}

export function fmtDate(d: unknown) {
  if (!d) return "—";
  try {
    return new Date(String(d)).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(d);
  }
}

export function buildLogisticsDraft(vos: any[] | undefined) {
  const m: Record<string, { pickupScheduledText: string; companyName: string; driverContactDetails: string }> = {};
  if (!vos) return m;
  for (const vo of vos) {
    m[vo._id] = {
      pickupScheduledText: vo.structbayLogistics?.pickupScheduledText ?? "",
      companyName: vo.structbayLogistics?.companyName ?? "",
      driverContactDetails: vo.structbayLogistics?.driverContactDetails ?? "",
    };
  }
  return m;
}

export function OrderStep({
  step,
  title,
  description,
  id,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="wf-section scroll-mt-[7.5rem]">
      <div className="wf-section__head">
        <span className="wf-section__badge">{step}</span>
        <div className="min-w-0">
          <h2 className="wf-section__title">{title}</h2>
          {description ? <p className="wf-section__desc">{description}</p> : null}
        </div>
      </div>
      <div className="wf-section__body">{children}</div>
    </section>
  );
}

export function InfoTile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="wf-info-tile">
      <p className="wf-info-tile__label">{label}</p>
      <p className="wf-info-tile__value">{value}</p>
      {sub ? <p className="wf-info-tile__sub">{sub}</p> : null}
    </div>
  );
}

export function DeliveryTypeSelector({
  name,
  value,
  onChange,
  disabled,
}: {
  name: string;
  value: "vendor_delivery" | "structbay_delivery";
  onChange: (v: "vendor_delivery" | "structbay_delivery") => void;
  disabled?: boolean;
}) {
  const options = [
    {
      id: "vendor_delivery" as const,
      title: "Type A — Vendor delivery",
      hint: "Vendor ships directly to the customer site.",
    },
    {
      id: "structbay_delivery" as const,
      title: "Type B — StructBay delivery",
      hint: "StructBay books Porter/Delhivery after vendor invoice.",
    },
  ];

  return (
    <div className="wf-delivery-type" role="radiogroup" aria-label="Delivery type">
      {options.map((opt) => (
        <label
          key={opt.id}
          className={`wf-delivery-type__option${value === opt.id ? " wf-delivery-type__option--active" : ""}${disabled ? " opacity-60 cursor-not-allowed" : ""}`}
        >
          <input
            type="radio"
            name={name}
            checked={value === opt.id}
            disabled={disabled}
            onChange={() => onChange(opt.id)}
          />
          <div>
            <p className="wf-delivery-type__label">{opt.title}</p>
            <p className="wf-delivery-type__hint">{opt.hint}</p>
          </div>
        </label>
      ))}
    </div>
  );
}

export function WorkflowSubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="wf-subsection">
      <p className="wf-subsection__title">{title}</p>
      {children}
    </div>
  );
}

export function VendorWorkflowSubmissions({ detail }: { detail: any }) {
  if (!detail) return null;
  const pre = detail.preDispatch;
  const ship = detail.shipmentDispatch;
  const pod = detail.deliveryProof;
  const hasPre =
    pre?.remarks ||
    pre?.invoiceFileUrl ||
    (Array.isArray(pre?.packingFiles) && pre.packingFiles.length > 0) ||
    detail.expectedDispatchDate;
  const hasShip =
    ship?.transporterName || ship?.lrNumber || ship?.vehicleNumber || ship?.proofUrl || ship?.dispatchDate;
  const hasPod = pod?.podUrl || pod?.deliveryDate;
  if (!hasPre && !hasShip && !hasPod) return null;

  const packingFiles = Array.isArray(pre?.packingFiles)
    ? pre.packingFiles
        .filter((f: { url?: string }) => f?.url)
        .map((f: { url: string; name?: string }, i: number) => ({
          url: f.url,
          name: f.name || `Packing file ${i + 1}`,
          label: f.name ? `Packing: ${f.name}` : `Packing file ${i + 1}`,
        }))
    : [];

  return (
    <WorkflowSubsection title="Vendor submitted documents">
      <div className="space-y-3">
        {hasPre && (
          <div className="rounded-lg border border-sb-ink/10 bg-sb-cream/50 p-3 space-y-2">
            <p className="text-sm font-semibold text-sb-ink">Ready for dispatch</p>
            {detail.expectedDispatchDate && (
              <p className="text-xs text-sb-ink/60">
                <span className="font-medium">Est. dispatch:</span> {fmtDate(detail.expectedDispatchDate)}
              </p>
            )}
            {pre?.remarks && (
              <p className="text-xs text-sb-ink/60">
                <span className="font-medium">Remarks:</span> {pre.remarks}
              </p>
            )}
            <WorkflowFilePreview
              files={[
                ...(pre?.invoiceFileUrl
                  ? [{ url: pre.invoiceFileUrl, label: "Pre-dispatch invoice" }]
                  : []),
                ...packingFiles,
              ]}
            />
          </div>
        )}
        {hasShip && (
          <div className="rounded-lg border border-sb-ink/10 bg-sb-cream/50 p-3 space-y-2">
            <p className="text-sm font-semibold text-sb-ink">Dispatch details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-sb-ink/65">
              <p>Transporter: <strong>{ship?.transporterName || "—"}</strong></p>
              <p>LR: <strong>{ship?.lrNumber || "—"}</strong></p>
              <p>Vehicle: <strong>{ship?.vehicleNumber || "—"}</strong></p>
              {ship?.trackingNumber && <p>Tracking: <strong>{ship.trackingNumber}</strong></p>}
              {ship?.dispatchDate && <p>Date: <strong>{fmtDate(ship.dispatchDate)}</strong></p>}
            </div>
            {ship?.proofUrl && (
              <WorkflowFilePreview files={[{ url: ship.proofUrl, label: "Dispatch proof" }]} />
            )}
          </div>
        )}
        {hasPod && (
          <div className="rounded-lg border border-sb-ink/10 bg-sb-cream/50 p-3 space-y-2">
            <p className="text-sm font-semibold text-sb-ink">Delivery (POD)</p>
            {pod?.deliveryDate && (
              <p className="text-xs text-sb-ink/60">Date: {fmtDate(pod.deliveryDate)}</p>
            )}
            {pod?.podUrl && (
              <WorkflowFilePreview files={[{ url: pod.podUrl, label: "Proof of delivery" }]} />
            )}
          </div>
        )}
      </div>
    </WorkflowSubsection>
  );
}
