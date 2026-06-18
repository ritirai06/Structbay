import { useCallback, useMemo, useState } from "react";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import { adminToast } from "../lib/adminToast";

export type AdminListDeleteConfig = {
  /** e.g. `(id) => \`/orders/${id}\`` */
  singleDeleteUrl: (id: string) => string;
  /** e.g. `/orders/bulk-delete` — POST `{ ids: string[] }` */
  bulkDeleteUrl: string;
  onSuccess: () => void;
  itemLabel?: string;
};

export function useAdminListDelete(config: AdminListDeleteConfig) {
  const { singleDeleteUrl, bulkDeleteUrl, onSuccess, itemLabel = "items" } = config;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pending, setPending] = useState<{ ids: string[]; label: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const isSelected = useCallback((id: string) => selectedSet.has(id), [selectedSet]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const allVisibleSelected = useCallback(
    (visibleIds: string[]) => visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id)),
    [selectedSet]
  );

  const toggleAllVisible = useCallback((visibleIds: string[]) => {
    setSelectedIds((prev) => {
      const every = visibleIds.length > 0 && visibleIds.every((id) => prev.includes(id));
      if (every) return prev.filter((id) => !visibleIds.includes(id));
      return [...new Set([...prev, ...visibleIds])];
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const requestDelete = useCallback((ids: string[], label: string) => {
    if (!ids.length) return;
    setPending({ ids, label });
  }, []);

  const cancelDelete = useCallback(() => {
    if (!busy) setPending(null);
  }, [busy]);

  const confirmDelete = useCallback(async () => {
    if (!pending?.ids.length) return;
    setBusy(true);
    try {
      const ids = pending.ids;
      if (ids.length === 1) {
        await apiFetch(singleDeleteUrl(ids[0]), { method: "DELETE" });
        adminToast.success("Deleted successfully", pending.label);
      } else {
        const env = await apiFetch<{ succeeded?: number; failed?: number; errors?: { message?: string }[] }>(
          bulkDeleteUrl,
          { method: "POST", body: JSON.stringify({ ids }) }
        );
        const d = env.data;
        const ok = d?.succeeded ?? ids.length;
        const fail = d?.failed ?? 0;
        if (fail === 0) {
          adminToast.success(`Deleted ${ok} ${itemLabel}`);
        } else if (ok > 0) {
          adminToast.warning(`Deleted ${ok}; ${fail} could not be removed`, d?.errors?.[0]?.message);
        } else {
          adminToast.error("Delete failed", d?.errors?.[0]?.message || "No records were removed");
        }
      }
      const removed = new Set(pending.ids);
      setSelectedIds((prev) => prev.filter((id) => !removed.has(id)));
      setPending(null);
      onSuccess();
    } catch (e) {
      adminToast.error("Delete failed", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }, [pending, singleDeleteUrl, bulkDeleteUrl, onSuccess, itemLabel]);

  const modalTitle =
    pending && pending.ids.length > 1
      ? `Delete ${pending.ids.length} ${itemLabel}?`
      : "Delete this record?";

  const modalDescription = pending
    ? pending.ids.length > 1
      ? `You are about to remove ${pending.ids.length} ${itemLabel} (${pending.label}). This hides them from admin lists.`
      : `Remove "${pending.label}" from admin lists. This cannot be undone easily.`
    : "";

  return {
    selectedIds,
    selectedSet,
    isSelected,
    toggleRow,
    allVisibleSelected,
    toggleAllVisible,
    clearSelection,
    requestDelete,
    cancelDelete,
    confirmDelete,
    pending,
    busy,
    modalTitle,
    modalDescription,
    itemLabel,
  };
}
