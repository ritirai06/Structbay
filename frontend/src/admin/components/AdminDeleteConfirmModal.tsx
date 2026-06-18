import type { ReactNode } from "react";
import { Loader2, Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  /** danger = destructive delete (default); primary = approve / non-destructive confirm */
  tone?: "danger" | "primary";
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Standard destructive confirmation (replaces ad-hoc window.confirm for deletes).
 */
export function AdminDeleteConfirmModal({
  open,
  title = "Delete this record?",
  description = "This action cannot be undone from the list. You may need database or support help to recover data if you delete by mistake.",
  confirmLabel = "Delete",
  busy = false,
  tone = "danger",
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  const iconWrap =
    tone === "primary"
      ? "bg-sb-orange/15 text-sb-orange"
      : "bg-sb-danger/15 text-sb-danger";
  const confirmBtn =
    tone === "primary"
      ? "bg-sb-orange hover:bg-sb-orange-hover"
      : "bg-red-600 hover:bg-red-700";

  return (
    <div className="sb-modal-overlay z-[60]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-delete-title"
        className="sb-modal w-full max-w-md p-6"
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}>
            <Trash2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="admin-delete-title" className="text-lg font-bold text-sb-ink">
              {title}
            </h2>
            <div className="mt-2 text-sm leading-relaxed text-sb-ink/70">{description}</div>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-sb-ink/15 bg-sb-cream px-4 py-2.5 text-sm font-semibold text-sb-ink hover:bg-sb-cream-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${confirmBtn}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
