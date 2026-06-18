import { Trash2 } from "lucide-react";

type Props = {
  totalCount: number;
  selectedCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onDeleteSelected: () => void;
  onDeleteAll: () => void;
  itemLabel?: string;
  disabled?: boolean;
};

export function AdminBulkToolbar({
  totalCount,
  selectedCount,
  allSelected,
  onToggleAll,
  onDeleteSelected,
  onDeleteAll,
  itemLabel = "items",
  disabled = false,
}: Props) {
  if (totalCount === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-sb-ink/10 bg-sb-cream-secondary px-4 py-3">
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-sb-ink/80">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-sb-ink/25 accent-sb-orange"
          checked={allSelected}
          disabled={disabled}
          onChange={onToggleAll}
        />
        <span>
          Select all <span className="text-sb-ink/50">({totalCount} {itemLabel})</span>
        </span>
      </label>

      {selectedCount > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={onDeleteSelected}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete selected ({selectedCount})
        </button>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={onDeleteAll}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete all visible
      </button>
    </div>
  );
}
