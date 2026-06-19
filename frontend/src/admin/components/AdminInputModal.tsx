import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  confirmLabel?: string;
  busy?: boolean;
  multiline?: boolean;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

/** Replaces window.prompt with an in-app modal. */
export function AdminInputModal({
  open,
  title,
  description,
  label,
  defaultValue = "",
  placeholder,
  required = false,
  confirmLabel = "Continue",
  busy = false,
  multiline = false,
  onCancel,
  onConfirm,
}: Props) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  if (!open) return null;

  const submit = () => {
    const trimmed = value.trim();
    if (required && !trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div className="sb-modal-overlay z-[60]">
      <div role="dialog" aria-modal="true" className="sb-modal w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-sb-ink">{title}</h2>
        {description ? <p className="mt-2 text-sm text-sb-ink/70">{description}</p> : null}
        <div className="mt-4">
          {label ? <label className="block text-xs font-semibold text-sb-ink/55 mb-1.5">{label}</label> : null}
          {multiline ? (
            <textarea
              className="wf-field__input min-h-[88px] resize-y w-full"
              value={value}
              placeholder={placeholder}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          ) : (
            <input
              className="wf-field__input w-full"
              value={value}
              placeholder={placeholder}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              autoFocus
            />
          )}
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
            disabled={busy || (required && !value.trim())}
            onClick={submit}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sb-orange px-4 py-2.5 text-sm font-bold text-white hover:bg-sb-orange-hover disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
