import { Trash2 } from "lucide-react";
import { AdminBulkToolbar } from "./AdminBulkToolbar";
import { AdminDeleteConfirmModal } from "./AdminDeleteConfirmModal";
import type { useAdminListDelete } from "../hooks/useAdminListDelete";

type DeleteHook = ReturnType<typeof useAdminListDelete>;

type Props = {
  deleteHook: DeleteHook;
  visibleIds: string[];
  disabled?: boolean;
  /** Override hook.itemLabel for toolbar */
  itemLabel?: string;
};

/** Bulk toolbar + confirm modal — pair with row/header checkboxes from this module. */
export function AdminListDeleteControls({ deleteHook, visibleIds, disabled, itemLabel }: Props) {
  const label = itemLabel || deleteHook.itemLabel;
  const allSelected = deleteHook.allVisibleSelected(visibleIds);

  return (
    <>
      <AdminBulkToolbar
        totalCount={visibleIds.length}
        selectedCount={deleteHook.selectedIds.length}
        allSelected={allSelected}
        onToggleAll={() => deleteHook.toggleAllVisible(visibleIds)}
        onDeleteSelected={() =>
          deleteHook.requestDelete(deleteHook.selectedIds, `${deleteHook.selectedIds.length} ${label}`)
        }
        onDeleteAll={() =>
          deleteHook.requestDelete(visibleIds, `all ${visibleIds.length} visible ${label}`)
        }
        itemLabel={label}
        disabled={disabled || deleteHook.busy}
      />
      <AdminDeleteConfirmModal
        open={!!deleteHook.pending}
        title={deleteHook.modalTitle}
        description={deleteHook.modalDescription}
        confirmLabel="Delete"
        busy={deleteHook.busy}
        onCancel={deleteHook.cancelDelete}
        onConfirm={() => void deleteHook.confirmDelete()}
      />
    </>
  );
}

export function AdminTableSelectHeader({
  checked,
  onChange,
  ariaLabel = "Select all rows",
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <th className="w-10 py-3 px-2">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-sb-ink/25 accent-sb-orange"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
      />
    </th>
  );
}

export function AdminTableSelectCell({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <td className="py-3.5 px-2">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-sb-ink/25 accent-sb-orange"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
      />
    </td>
  );
}

export function AdminRowDeleteButton({
  onClick,
  title = "Delete",
  disabled,
}: {
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="p-1.5 bg-red-50 border border-red-200 rounded-lg text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
