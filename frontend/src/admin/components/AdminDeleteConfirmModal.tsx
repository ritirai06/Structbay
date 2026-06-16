import type { ReactNode } from "react";
import { Loader2, Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
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
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-delete-title"
        className="w-full max-w-md rounded-2xl border border-sb-ink/15 bg-sb-cream-secondary p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-700">
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
