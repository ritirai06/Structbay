import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, MapPin, Loader2, Save, RefreshCw, Search, Copy, Check, X, Upload, ListPlus, Download } from "lucide-react";
import { BulkImportCsvModal } from "../components/BulkImportCsvModal";
import { CITY_BULK_TEMPLATE, CITY_PIN_BULK_TEMPLATE, parseCityBulkCsv } from "../lib/adminBulkCsvParsers";
import { adminFetch as apiFetch } from "../../lib/adminApi";

const emptyForm = { name: "", state: "", status: "ACTIVE", isServiceable: true, priority: 0, sortOrder: 0, pincodes: "" };

const inp = "w-full bg-sb-cream border border-sb-ink/10 rounded-lg px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange transition-colors";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10">
          <h3 className="font-bold text-sb-ink">{title}</h3>
          <button onClick={onClose} className="text-sb-ink/55 hover:text-sb-ink text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function CopyCityId({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(id).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    });
  };
  return (
    <button
      type="button"
      title={`City MongoDB id — click to copy full value\n${id}`}
      onClick={copy}
      className="inline-flex items-center gap-1 font-mono text-[10px] text-sb-ink/50 hover:text-sb-orange max-w-[9rem] truncate"
    >
      {id.slice(0, 10)}…
      {done ? <Check className="w-3 h-3 shrink-0 text-sb-orange" /> : <Copy className="w-3 h-3 shrink-0 opacity-60" />}
    </button>
  );
}

export function CityManagement() {
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [pinModal, setPinModal] = useState<{ open: boolean; city: any | null }>({ open: false, city: null });
  const [pinRaw, setPinRaw] = useState("");
  const [pinMode, setPinMode] = useState<"append" | "replace">("append");
  const [pinSaving, setPinSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/cities?limit=200`)
      .then(d => { setCities(d.data || []); setPagination(d.pagination || {}); })
      .catch(() => { setCities([]); setPagination({ total: 0, pages: 1, page: 1 }); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm); setModal({ open: true, data: null }); };
  const openEdit = (c: any) => {
    const pins = Array.isArray(c.pincodes) ? c.pincodes.join(", ") : "";
    setForm({ name: c.name, state: c.state, status: c.status, isServiceable: c.isServiceable, priority: c.priority, sortOrder: c.sortOrder, pincodes: pins });
    setModal({ open: true, data: c });
  };

  const save = async () => {
    if (!form.name || !form.state) return alert("Name and state are required.");
    setSaving(true);
    try {
      if (modal.data) await apiFetch(`/cities/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(form) });
      else await apiFetch("/cities", { method: "POST", body: JSON.stringify(form) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const toggle = async (id: string) => {
    await apiFetch(`/cities/${id}/toggle`, { method: "PATCH" }).catch(e => alert(e.message));
    load();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await apiFetch(`/cities/${id}`, { method: "DELETE" }).catch(e => alert(e.message));
    load();
  };

  const downloadPinTemplate = () => {
    const blob = new Blob([CITY_PIN_BULK_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "structbay-city-pins-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openPinBulk = (c: any) => {
    setPinRaw("");
    setPinMode("append");
    setPinModal({ open: true, city: c });
  };

  const submitPinBulk = async () => {
    if (!pinModal.city?._id || !pinRaw.trim()) {
      alert("Paste PINs or choose a file first.");
      return;
    }
    setPinSaving(true);
    try {
      const env = await apiFetch<{ totalPincodes?: number; parsedIncoming?: number; mode?: string }>(
        `/cities/${pinModal.city._id}/pins/bulk-import`,
        { method: "POST", body: JSON.stringify({ raw: pinRaw, mode: pinMode }) }
      );
      const d = env.data as { totalPincodes?: number; parsedIncoming?: number } | undefined;
      alert(
        `Done. Parsed ${d?.parsedIncoming ?? "?"} PINs in this file/paste. This city now has ${d?.totalPincodes ?? "?"} total PINs (${pinMode}).`
      );
      setPinModal({ open: false, city: null });
      setPinRaw("");
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPinSaving(false);
    }
  };

  const filtered = cities.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.state.toLowerCase().includes(search.toLowerCase()));
  const active = filtered.filter(c => c.status === "ACTIVE").length;

  return (
    <div className="p-6 bg-sb-cream min-h-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-sb-ink">City Management</h1>
          <p className="text-sb-ink/55 text-sm mt-1">{active} active / {filtered.length} total cities</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-2 border border-sb-ink/15 bg-sb-cream-secondary hover:border-sb-orange/40 text-sb-ink font-bold px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            <Upload className="w-4 h-4 text-sb-orange" /> Bulk cities (CSV)
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 bg-sb-orange hover:bg-sb-orange-hover text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors">
            <Plus className="w-4 h-4" /> Add City
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Cities", value: pagination.total || filtered.length, color: "text-sb-ink" },
          { label: "Active Cities", value: cities.filter(c => c.status === "ACTIVE").length, color: "text-sb-orange" },
          { label: "Serviceable", value: cities.filter(c => c.isServiceable).length, color: "text-sb-orange" },
        ].map(s => (
          <div key={s.label} className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4 text-center">
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-sb-ink/50 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sb-ink/45" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cities or states..."
            className="w-full pl-9 pr-4 py-2 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange transition-colors" />
        </div>
        <button onClick={load} className="p-2 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-sb-orange" /></div>
      ) : (
        <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sb-ink/10">
                {["City", "City ID", "State", "PINs", "Priority", "Sort", "Serviceable", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-sb-ink/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c._id} className="border-b border-sb-ink/8 hover:bg-sb-cream-secondary/90 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-sb-orange shrink-0" />
                      <span className="font-semibold text-sb-ink">{c.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 align-top">
                    <CopyCityId id={String(c._id)} />
                  </td>
                  <td className="py-3.5 px-4 text-sb-ink/65">{c.state}</td>
                  <td className="py-3.5 px-4 text-sb-ink/65 tabular-nums">
                    {Array.isArray(c.pincodes) && c.pincodes.length > 0 ? `${c.pincodes.length} PIN${c.pincodes.length === 1 ? "" : "s"}` : "—"}
                  </td>
                  <td className="py-3.5 px-4 text-sb-ink/65">{c.priority}</td>
                  <td className="py-3.5 px-4 text-sb-ink/65">{c.sortOrder}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${c.isServiceable ? "text-sb-orange" : "text-sb-ink/45"}`}>
                      {c.isServiceable ? (
                        <><Check className="w-3.5 h-3.5 shrink-0" aria-hidden /> Yes</>
                      ) : (
                        <><X className="w-3.5 h-3.5 shrink-0" aria-hidden /> No</>
                      )}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.status === "ACTIVE" ? "bg-sb-orange/12 text-sb-orange border-sb-orange/22" : "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/12"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex gap-1.5 justify-end flex-wrap">
                      <button
                        type="button"
                        title="Bulk import PIN codes for this city (Bengaluru / etc.)"
                        onClick={() => openPinBulk(c)}
                        className="p-1.5 border border-sb-orange/35 rounded-lg text-sb-orange hover:bg-sb-orange/10 transition-colors"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(c)} className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink hover:border-sb-ink/20 transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggle(c._id)} title={c.status === "ACTIVE" ? "Disable" : "Enable"}
                        className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:border-sb-ink/20 transition-colors">
                        {c.status === "ACTIVE" ? <ToggleRight className="w-3.5 h-3.5 text-sb-orange" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => remove(c._id, c.name)}
                        className="p-1.5 border border-sb-ink/18 rounded-lg text-sb-ink/55 hover:bg-sb-cream-secondary transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-sb-ink/45">
              <MapPin className="w-10 h-10 mx-auto mb-3 text-sb-ink/20" />
              No cities found.
            </div>
          )}
        </div>
      )}

      <BulkImportCsvModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk import cities (CSV)"
        instructions={`Up to 200 rows — each row is one city.\nRequired: name (or city), state.\nOptional: pincodes (comma or newline, 6-digit), status, isServiceable, priority, sortOrder.\n\nFor many PINs on one city (e.g. Bengaluru), use the orange “+” button on that city’s row — PIN bulk import.`}
        templateCsv={CITY_BULK_TEMPLATE}
        templateFileName="structbay-cities-bulk-template.csv"
        apiPath="/cities/bulk-import"
        parseRows={parseCityBulkCsv}
        onSuccess={() => load()}
      />

      {modal.open && (
        <Modal title={modal.data ? `Edit — ${modal.data.name}` : "Add City"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            {modal.data && (
              <div className="rounded-lg border border-sb-ink/10 bg-sb-cream px-3 py-2">
                <p className="text-[10px] text-sb-ink/50 uppercase tracking-wider mb-1">
                  City ID (use in Pricing / Inventory APIs)
                </p>
                <p className="font-mono text-xs text-sb-orange break-all">{modal.data._id}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">City Name *</label>
                <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Bengaluru" />
              </div>
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">State *</label>
                <input className={inp} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="e.g. Karnataka" />
              </div>
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Service PIN codes (6-digit)</label>
              <textarea
                className={`${inp} min-h-[88px] resize-y`}
                value={form.pincodes}
                onChange={e => setForm(f => ({ ...f, pincodes: e.target.value }))}
                placeholder={"560001, 560002\nOne per line or comma-separated. Only these PINs are treated as in-service for this city."}
              />
              <p className="text-[10px] text-sb-ink/45 mt-1 leading-relaxed">
                Har jagah jahan deliver karte ho, wahan ke 6-digit PIN yahan add karein (comma / newline). Ek hi city ke liye hazaron PIN: row par <strong className="text-sb-ink">+</strong> se bulk import karein.
                Leave empty only if you rely on region rules without a PIN list.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Priority</label>
                <input type="number" className={inp} min={0} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Sort Order</label>
                <input type="number" className={inp} min={0} value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Status</label>
                <select className={`${inp} cursor-pointer`} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Serviceable</label>
                <select className={`${inp} cursor-pointer`} value={form.isServiceable ? "true" : "false"} onChange={e => setForm(f => ({ ...f, isServiceable: e.target.value === "true" }))}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            <div className="pt-2 flex gap-2">
              <button onClick={save} disabled={saving || !form.name || !form.state}
                className="flex items-center gap-2 bg-sb-orange hover:bg-sb-orange-hover text-white font-bold px-4 py-2 rounded-lg text-sm flex-1 justify-center disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {modal.data ? "Update City" : "Add City"}
              </button>
              <button onClick={() => setModal({ open: false, data: null })}
                className="px-4 py-2 border border-sb-ink/15 rounded-lg text-sm text-sb-ink/60 hover:border-sb-ink/25 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {pinModal.open && pinModal.city && (
        <Modal
          title={`Bulk PIN import — ${pinModal.city.name}`}
          onClose={() => {
            if (!pinSaving) {
              setPinModal({ open: false, city: null });
              setPinRaw("");
            }
          }}
        >
          <div className="space-y-3">
            <p className="text-xs text-sb-ink/60 leading-relaxed">
              <strong>Append:</strong> new PINs merge into the existing list (duplicates removed).
              <span className="mx-1.5" />
              <strong>Replace all:</strong> clears the old list and keeps only what you paste here.
              A PIN cannot belong to two cities — you will get an error if another city already has it.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="text-xs font-semibold text-sb-ink/70">Mode</label>
              <select
                className={`${inp} w-auto py-1.5 cursor-pointer`}
                value={pinMode}
                onChange={e => setPinMode(e.target.value as "append" | "replace")}
                disabled={pinSaving}
              >
                <option value="append">Append (merge)</option>
                <option value="replace">Replace all PINs</option>
              </select>
              <button
                type="button"
                onClick={downloadPinTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sb-orange border border-sb-orange/40 rounded-lg px-3 py-1.5 hover:bg-sb-orange/10"
              >
                <Download className="w-3.5 h-3.5" /> PIN CSV template
              </button>
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Paste PINs or CSV contents</label>
              <textarea
                className={`${inp} min-h-[160px] font-mono text-xs`}
                value={pinRaw}
                onChange={e => setPinRaw(e.target.value)}
                disabled={pinSaving}
                placeholder={"560001\n560002\n560003\n…or comma-separated"}
              />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Or upload .txt / .csv</label>
              <input
                type="file"
                accept=".csv,.txt,text/plain,text/csv"
                disabled={pinSaving}
                className="text-xs text-sb-ink w-full"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const t = String(reader.result || "");
                    setPinRaw(prev => (prev.trim() ? `${prev.trim()}\n${t}` : t));
                  };
                  reader.readAsText(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={pinSaving || !pinRaw.trim()}
                onClick={() => void submitPinBulk()}
                className="flex-1 flex items-center justify-center gap-2 bg-sb-orange hover:bg-sb-orange-hover text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {pinSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import PINs
              </button>
              <button
                type="button"
                disabled={pinSaving}
                onClick={() => { setPinModal({ open: false, city: null }); setPinRaw(""); }}
                className="px-4 py-2 border border-sb-ink/15 rounded-lg text-sm text-sb-ink/60"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
