import { useCallback } from "react";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import { useAdminDeleteFlow } from "./useAdminDeleteFlow";

/** Delete hook for a REST collection (`/categories`, `/cms/banners`, etc.). */
export function useAdminResourceDelete(resourcePath: string, onComplete: () => void) {
  const flow = useAdminDeleteFlow();

  const deleteOne = useCallback(
    async (id: string) => {
      const base = resourcePath.replace(/\/$/, "");
      await apiFetch(`${base}/${id}`, { method: "DELETE" });
    },
    [resourcePath]
  );

  const removeOne = useCallback(
    (id: string, label: string) => {
      flow.requestDelete({ kind: "single", ids: [id], label });
    },
    [flow]
  );

  const removeMany = useCallback(
    (ids: string[], label: string) => {
      flow.requestDelete({ kind: "bulk", ids, label });
    },
    [flow]
  );

  const confirm = useCallback(() => {
    void flow.executeDelete(deleteOne, onComplete);
  }, [flow, deleteOne, onComplete]);

  return {
    pending: flow.pending,
    busy: flow.busy,
    modalTitle: flow.modalTitle,
    modalDescription: flow.modalDescription,
    cancelDelete: flow.cancelDelete,
    removeOne,
    removeMany,
    confirm,
  };
}
