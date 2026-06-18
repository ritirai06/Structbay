import { useState } from "react";
import { Loader2, Upload, Download } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";

export type BulkImportResult = {
  batchId?: string;
  total?: number;
  succeeded: number;
  failed: number;
  errors: { row: number; message: string }[];
  categoriesCreated?: number;
  autoCreateCategories?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  instructions: string;
  templateCsv: string;
  templateFileName: string;
  /** POST path under admin API, e.g. `/categories/bulk-import` */
  apiPath: string;
  parseRows: (csvText: string) => Record<string, string>[];
  onSuccess: () => void;
  panelClassName?: string;
};

export function BulkImportCsvModal({
  open,
  onClose,
  title,
  instructions,
  templateCsv,
  templateFileName,
  apiPath,
  parseRows,
  onSuccess,
  panelClassName = "max-w-3xl",
}: Props) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  if (!open) return null;

  const downloadTemplate = () => {
    const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setParseError(null);
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const parsed = parseRows(text);
        if (parsed.length === 0) {
          setParseError("No valid data rows. Check the header row and add at least one row.");
          setRows([]);
        } else {
          setRows(parsed);
        }
      } catch (err) {
        setParseError(err instanceof Error ? err.message : String(err));
        setRows([]);
      }
    };
    reader.readAsText(f, "UTF-8");
  };

  const submit = async () => {
    if (rows.length === 0) return alert("Choose a CSV with at least one valid row.");
    setSubmitting(true);
    setResult(null);
    try {
      const env = await apiFetch<BulkImportResult>(apiPath, {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      const d = env.data;
      if (d && typeof d === "object" && "succeeded" in d) {
        setResult(d as BulkImportResult);
      }
      onSuccess();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Bulk import failed");
    }
    setSubmitting(false);
  };

  const close = () => {
    setParseError(null);
    setResult(null);
    setRows([]);
    setFileName(null);
    onClose();
  };

  const previewKeys = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className={`bg-sb-cream-secondary border border-sb-ink/10 rounded-xl w-full ${panelClassName}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10">
          <h3 className="font-bold text-sb-ink">{title}</h3>
          <button type="button" onClick={close} className="text-sb-ink/55 hover:text-sb-ink text-xl leading-none">
            ×
          </button>
        </div>
        <div className="p-5">
          <p className="text-xs text-sb-ink/50 mb-4 leading-relaxed whitespace-pre-line">{instructions}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-sb-cream border border-sb-ink/12 text-sb-ink hover:border-sb-orange/40 transition-colors"
            >
              <Download className="w-4 h-4 text-sb-orange" />
              Download template
            </button>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-sb-orange hover:bg-sb-orange-hover text-white cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Choose CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            </label>
            {fileName && (
              <span className="text-xs text-sb-ink/55 self-center">
                File: <span className="text-sb-ink/90 font-mono">{fileName}</span>
              </span>
            )}
          </div>
          {parseError && (
            <div className="mb-3 text-sm text-sb-ink bg-sb-cream-secondary border border-sb-ink/15 rounded-lg px-3 py-2">{parseError}</div>
          )}
          {result && (
            <div
              className={`mb-3 text-sm rounded-lg px-3 py-2 border ${
                result.failed > 0
                  ? "text-sb-ink/80 bg-sb-orange/10 border-sb-orange/25"
                  : "text-sb-ink/80 bg-sb-orange/10 border-sb-orange/22"
              }`}
            >
              Processed {result.total ?? rows.length} row(s): <strong>{result.succeeded}</strong> succeeded,{" "}
              <strong>{result.failed}</strong> failed.
              {typeof result.categoriesCreated === "number" && result.categoriesCreated > 0 && (
                <span className="block mt-1">
                  Categories auto-created: <strong>{result.categoriesCreated}</strong>
                </span>
              )}
              {result.errors?.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-y-auto text-xs font-mono space-y-1">
                  {result.errors.slice(0, 40).map((er, ix) => (
                    <li key={`${er.row}-${ix}`}>
                      Row {er.row}: {er.message}
                    </li>
                  ))}
                  {result.errors.length > 40 && <li>…and {result.errors.length - 40} more</li>}
                </ul>
              )}
            </div>
          )}
          {rows.length > 0 && previewKeys.length > 0 && (
            <div className="mb-4 max-h-56 overflow-auto rounded-lg border border-sb-ink/10">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-[1] border-b border-gray-200 bg-gray-50 text-gray-500">
                  <tr>
                    {previewKeys.map((h) => (
                      <th key={h} className="text-left py-2 px-2 text-sb-ink/50 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-b border-sb-ink/8">
                      {previewKeys.map((k) => (
                        <td key={k} className="py-1.5 px-2 text-sb-ink/90 truncate max-w-[10rem]">
                          {row[k] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <p className="text-sb-ink/45 text-xs px-2 py-2 border-t border-sb-ink/8">Showing first 20 of {rows.length} rows.</p>
              )}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={submitting || rows.length === 0}
              onClick={() => void submit()}
              className="flex-1 flex items-center justify-center gap-2 bg-sb-orange hover:bg-sb-orange-hover text-white font-bold px-4 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import {rows.length > 0 ? `(${rows.length})` : ""}
            </button>
            <button
              type="button"
              onClick={close}
              className="px-4 py-2.5 border border-sb-ink/15 rounded-lg text-sm text-sb-ink/60 hover:border-sb-ink/25 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
