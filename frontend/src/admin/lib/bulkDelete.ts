export type BulkDeleteResult = {
  succeeded: number;
  failed: { id: string; error: string }[];
};

/** Delete many records one-by-one (works without a bulk API). */
export async function runBulkDelete(
  ids: string[],
  deleteOne: (id: string) => Promise<void>
): Promise<BulkDeleteResult> {
  const failed: { id: string; error: string }[] = [];
  let succeeded = 0;
  for (const id of ids) {
    try {
      await deleteOne(id);
      succeeded += 1;
    } catch (e) {
      failed.push({
        id,
        error: e instanceof Error ? e.message : "Delete failed",
      });
    }
  }
  return { succeeded, failed };
}
