import { Download, Eye, FileText, Clock, CheckCircle } from 'lucide-react';

const SB = {
  color: 'var(--sb-text-primary)',
  muted: 'var(--sb-text-muted)',
  faint: 'var(--sb-text-faint)',
  orange: 'var(--sb-orange)',
  card: 'var(--sb-card)',
  border: 'var(--sb-border)',
  bg: 'var(--sb-bg-section)',
};

export type VendorOrderDocumentsPayload = {
  invoice_url?: string;
  invoice_number?: string;
  eway_bill_url?: string;
  eway_bill_number?: string;
  shipping_label_url?: string;
  shipment_id?: string;
  sent_at?: string | null;
  has_any?: boolean;
  has_all?: boolean;
};

function openDocument(url: string) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function DocButton({
  label,
  url,
  hint,
}: {
  label: string;
  url: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl" style={{ background: SB.bg, border: `1px solid ${SB.border}` }}>
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <FileText className="w-4 h-4 mt-0.5 shrink-0" style={{ color: SB.orange }} />
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: SB.color }}>{label}</p>
          {hint ? <p className="text-xs truncate" style={{ color: SB.faint }}>{hint}</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <button
          type="button"
          onClick={() => openDocument(url)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: SB.card, border: `1px solid ${SB.border}`, color: SB.color }}
        >
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
        <button
          type="button"
          onClick={() => openDocument(url)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}
        >
          <Download className="w-3.5 h-3.5" /> Download
        </button>
      </div>
    </div>
  );
}

function PendingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: SB.bg, border: `1px dashed ${SB.border}` }}>
      <Clock className="w-4 h-4 shrink-0" style={{ color: SB.faint }} />
      <span className="text-sm" style={{ color: SB.muted }}>{label}</span>
    </div>
  );
}

export function VendorOrderDocuments({ documents }: { documents?: VendorOrderDocumentsPayload | null }) {
  const docs = documents || {};
  const hasInvoice = Boolean(docs.invoice_url);
  const hasEway = Boolean(docs.eway_bill_url);
  const hasLabel = Boolean(docs.shipping_label_url);
  const hasAny = hasInvoice || hasEway || hasLabel;

  if (!hasAny) {
    return (
      <div className="rounded-xl p-4" style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid var(--sb-orange-border)' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: SB.orange }}>
          Documents not yet generated
        </p>
        <p className="text-sm" style={{ color: SB.muted }}>
          Awaiting Structbay invoice &amp; e-way generation. Download buttons will appear here once Structbay uploads your documents.
        </p>
      </div>
    );
  }

  const allCore = hasInvoice && hasEway;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4" style={{ color: allCore ? '#22C55E' : SB.orange }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: SB.muted }}>
          Available documents
        </p>
      </div>

      {hasInvoice ? (
        <DocButton
          label="Structbay Invoice"
          url={docs.invoice_url!}
          hint={docs.invoice_number ? `Ref: ${docs.invoice_number}` : undefined}
        />
      ) : (
        <PendingRow label="Structbay Invoice — pending" />
      )}

      {hasEway ? (
        <DocButton
          label="E-Way Bill"
          url={docs.eway_bill_url!}
          hint={docs.eway_bill_number ? `Ref: ${docs.eway_bill_number}` : undefined}
        />
      ) : (
        <PendingRow label="E-Way Bill — pending" />
      )}

      {hasLabel ? (
        <DocButton
          label="Shipping Label (optional)"
          url={docs.shipping_label_url!}
          hint={docs.shipment_id ? `Shipment: ${docs.shipment_id}` : undefined}
        />
      ) : null}

      {docs.sent_at && (
        <p className="text-xs pt-1" style={{ color: SB.faint }}>
          Structbay documents sent {new Date(docs.sent_at).toLocaleString('en-IN')}
        </p>
      )}
    </div>
  );
}
