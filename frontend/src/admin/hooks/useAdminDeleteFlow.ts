import { useCallback, useState } from "react";
import { adminToast } from "../lib/adminToast";
import { runBulkDelete } from "../lib/bulkDelete";

export type AdminDeleteRequest =
  | { kind: "single"; ids: [string]; label: string }
  | { kind: "bulk"; ids: string[]; label: string };

export function useAdminDeleteFlow() {
  const [pending, setPending] = useState<AdminDeleteRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const requestDelete = useCallback((req: AdminDeleteRequest) => setPending(req), []);
  const cancelDelete = useCallback(() => {
    if (!busy) setPending(null);
  }, [busy]);

  const executeDelete = useCallback(
    async (deleteOne: (id: string) => Promise<void>, onComplete?: () => void) => {
      if (!pending) return;
      setBusy(true);
      try {
        if (pending.kind === "single" || pending.ids.length === 1) {
          const id = pending.ids[0];
          await deleteOne(id);
          adminToast.success("Deleted successfully", pending.label);
        } else {
          const result = await runBulkDelete(pending.ids, deleteOne);
          if (result.failed.length === 0) {
            adminToast.success(`Deleted ${result.succeeded} record(s)`);
          } else if (result.succeeded > 0) {
            adminToast.warning(
              `Deleted ${result.succeeded}; ${result.failed.length} could not be removed`,
              result.failed[0]?.error
            );
          } else {
            adminToast.error("Delete failed", result.failed[0]?.error || "No records were removed");
          }
        }
        setPending(null);
        onComplete?.();
      } catch (e) {
        adminToast.error("Delete failed", e instanceof Error ? e.message : undefined);
      } finally {
        setBusy(false);
      }
    },
    [pending]
  );

  const modalTitle =
    pending?.kind === "bulk" && (pending?.ids.length ?? 0) > 1
      ? `Delete ${pending.ids.length} items?`
      : "Delete this record?";

  const modalDescription = pending
    ? pending.kind === "bulk" && pending.ids.length > 1
      ? `You are about to permanently delete ${pending.ids.length} items (${pending.label}). This cannot be undone.`
      : `You are about to delete "${pending.label}". This action cannot be undone.`
    : "";

  return {
    pending,
    busy,
    requestDelete,
    cancelDelete,
    executeDelete,
    modalTitle,
    modalDescription,
  };
}
