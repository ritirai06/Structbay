import { adminFetch, adminDownloadBlob } from "../../lib/adminApi";

export type CatalogJobRow = {
  _id: string;
  status: string;
  format: string;
  catalogName?: string | null;
  scopeType?: string;
  productCount?: number;
  fileSizeBytes?: number | null;
  createdAt?: string;
  errorMessage?: string | null;
  archived?: boolean;
};

function extForFormat(f: string) {
  const x = String(f || "pdf").toLowerCase();
  if (x === "pdf") return "pdf";
  if (x === "xlsx") return "xlsx";
  if (x === "html") return "html";
  return "csv";
}

function safeFileBase(name: string) {
  const t = name.replace(/[^\w\s\-().]/g, "").trim();
  return t.slice(0, 80) || "structbay-catalog";
}

export async function pollCatalogJob(
  id: string,
  opts: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<CatalogJobRow> {
  const intervalMs = opts.intervalMs ?? 1200;
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Catalog generation timed out. Try Excel/CSV for very large catalogs, or retry.");
    }
    const r = await adminFetch<CatalogJobRow>(`/admin/catalog/jobs/${id}`);
    const job = r.data as CatalogJobRow;
    if (!job) throw new Error("Invalid catalog job response");
    if (job.status === "COMPLETED" || job.status === "FAILED") return job;
    await new Promise((res) => setTimeout(res, intervalMs));
  }
}

export async function createAndDownloadCatalog(body: Record<string, unknown>): Promise<CatalogJobRow> {
  const created = await adminFetch<{ id: string }>("/admin/catalog/jobs", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const id = (created.data as { id?: string } | undefined)?.id;
  if (!id) throw new Error("No catalog job id returned");

  const job = await pollCatalogJob(id);
  if (job.status === "FAILED") {
    throw new Error(job.errorMessage || "Catalog generation failed");
  }

  const ext = extForFormat(job.format);
  const fname = `${safeFileBase(String(job.catalogName || "structbay-catalog"))}.${ext}`;
  await adminDownloadBlob(`/admin/catalog/jobs/${id}/download`, fname);
  return job;
}

export async function regenerateAndDownload(jobId: string): Promise<void> {
  const r = await adminFetch<{ id: string }>(`/admin/catalog/jobs/${jobId}/regenerate`, { method: "POST" });
  const id = (r.data as { id?: string } | undefined)?.id;
  if (!id) throw new Error("No catalog job id returned");
  const job = await pollCatalogJob(id);
  if (job.status === "FAILED") throw new Error(job.errorMessage || "Catalog regeneration failed");
  const ext = extForFormat(job.format);
  const fname = `${safeFileBase(String(job.catalogName || "structbay-catalog"))}.${ext}`;
  await adminDownloadBlob(`/admin/catalog/jobs/${id}/download`, fname);
}

export async function downloadCompletedJob(job: CatalogJobRow): Promise<void> {
  const ext = extForFormat(job.format);
  const fname = `${safeFileBase(String(job.catalogName || "structbay-catalog"))}.${ext}`;
  await adminDownloadBlob(`/admin/catalog/jobs/${job._id}/download`, fname);
}
