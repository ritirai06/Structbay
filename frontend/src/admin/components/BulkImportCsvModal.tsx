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
      <div className={`bg-[#1A1A1A] border border-white/10 rounded-xl w-full ${panelClassName}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-bold text-[#F4E9D8]">{title}</h3>
          <button type="button" onClick={close} className="text-[#D4C4A8]/60 hover:text-[#F4E9D8] text-xl leading-none">
            ×
          </button>
        </div>
        <div className="p-5">
          <p className="text-xs text-[#D4C4A8]/55 mb-4 leading-relaxed whitespace-pre-line">{instructions}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-[#0D0D0D] border border-white/12 text-[#F4E9D8] hover:border-[#FE5E00]/40 transition-colors"
            >
              <Download className="w-4 h-4 text-[#FE5E00]" />
              Download template
            </button>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Choose CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            </label>
            {fileName && (
              <span className="text-xs text-[#D4C4A8]/60 self-center">
                File: <span className="text-[#F4E9D8]/90 font-mono">{fileName}</span>
              </span>
            )}
          </div>
          {parseError && (
            <div className="mb-3 text-sm text-red-400/95 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2">{parseError}</div>
          )}
          {result && (
            <div
              className={`mb-3 text-sm rounded-lg px-3 py-2 border ${
                result.failed > 0
                  ? "text-amber-200/95 bg-amber-500/10 border-amber-500/25"
                  : "text-green-300/95 bg-green-500/10 border-green-500/25"
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
            <div className="mb-4 max-h-56 overflow-auto rounded-lg border border-white/10">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#0D0D0D] border-b border-white/10">
                  <tr>
                    {previewKeys.map((h) => (
                      <th key={h} className="text-left py-2 px-2 text-[#D4C4A8]/55 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {previewKeys.map((k) => (
                        <td key={k} className="py-1.5 px-2 text-[#F4E9D8]/90 truncate max-w-[10rem]">
                          {row[k] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <p className="text-[#D4C4A8]/45 text-xs px-2 py-2 border-t border-white/5">Showing first 20 of {rows.length} rows.</p>
              )}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={submitting || rows.length === 0}
              onClick={() => void submit()}
              className="flex-1 flex items-center justify-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold px-4 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import {rows.length > 0 ? `(${rows.length})` : ""}
            </button>
            <button
              type="button"
              onClick={close}
              className="px-4 py-2.5 border border-white/15 rounded-lg text-sm text-[#D4C4A8] hover:border-white/30 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
