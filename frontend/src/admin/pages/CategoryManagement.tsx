import { useState, useEffect, useCallback } from "react";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Plus, Edit, Trash2, ToggleLeft, ToggleRight,
  FolderTree, Loader2, Save, RefreshCw, Search, Upload, SlidersHorizontal,
} from "lucide-react";
import { BulkImportCsvModal } from "../components/BulkImportCsvModal";
import { AdminBulkToolbar } from "../components/AdminBulkToolbar";
import { AdminDeleteConfirmModal } from "../components/AdminDeleteConfirmModal";
import { useAdminDeleteFlow } from "../hooks/useAdminDeleteFlow";
import { adminToast } from "../lib/adminToast";
import { CATEGORY_BULK_TEMPLATE, parseCategoryBulkCsv } from "../lib/adminBulkCsvParsers";
import { adminFetch as apiFetch, adminUploadImage } from "../../lib/adminApi";

function Spinner() {
  return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-sb-orange" /></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10">
          <h3 className="font-bold text-sb-ink">{title}</h3>
          <button onClick={onClose} className="text-sb-ink/55 hover:text-sb-ink text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const emptyForm = {
  name: "",
  description: "",
  icon: "",
  sortOrder: 0,
  status: "ACTIVE",
  image: null as null | { url: string; publicId: string },
};

type FilterRowForm = {
  label: string;
  key: string;
  type: "SELECT" | "MULTI_SELECT" | "RANGE" | "TEXT";
  optionsText: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyFilterRow = (): FilterRowForm => ({
  label: "",
  key: "",
  type: "MULTI_SELECT",
  optionsText: "",
  sortOrder: 0,
  isActive: true,
});

function filtersToForm(filters: any[] | undefined): FilterRowForm[] {
  if (!Array.isArray(filters) || filters.length === 0) return [emptyFilterRow()];
  return filters.map((f) => ({
    label: f.label || "",
    key: f.key || "",
    type: f.type || "MULTI_SELECT",
    optionsText: Array.isArray(f.options)
      ? f.options.map((o: any) => (o.label && o.value ? `${o.label}:${o.value}` : o.value || o.label || "")).join(", ")
      : "",
    sortOrder: Number(f.sortOrder) || 0,
    isActive: f.isActive !== false,
  }));
}

function filtersFromForm(rows: FilterRowForm[]) {
  return rows
    .filter((r) => r.label.trim() && r.key.trim())
    .map((r) => ({
      label: r.label.trim(),
      key: r.key.trim().toLowerCase(),
      type: r.type,
      options: r.optionsText
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const [label, value] = part.includes(":") ? part.split(":").map((s) => s.trim()) : [part, part];
          return { label: label || value, value: value || label };
        }),
      sortOrder: Number(r.sortOrder) || 0,
      isActive: r.isActive,
    }));
}

export function CategoryManagement() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, active: 0, pages: 1, page: 1 });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [filterModal, setFilterModal] = useState<{ open: boolean; category: any | null }>({ open: false, category: null });
  const [filterRows, setFilterRows] = useState<FilterRowForm[]>([emptyFilterRow()]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterSaving, setFilterSaving] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const deleteFlow = useAdminDeleteFlow();

  const deleteOneCategory = async (id: string) => {
    await apiFetch(`/categories/${id}`, { method: "DELETE" });
  };

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "100",
        sortBy: "sortOrder",
        sortOrder: "asc",
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const d = await apiFetch(`/categories?${params}`);
      let rows = d.data || [];
      const pag = d.pagination || { total: rows.length, pages: 1, page: 1 };

      // Fetch remaining pages so admin always sees the full catalogue
      if (pag.pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: pag.pages - 1 }, (_, i) => {
            const p = new URLSearchParams(params);
            p.set("page", String(i + 2));
            return apiFetch(`/categories?${p}`).then((r) => r.data || []);
          })
        );
        rows = rows.concat(...rest);
      }

      setCategories(rows);
      setPagination({
        total: Number(pag.total) || rows.length,
        active: typeof pag.active === "number" ? pag.active : rows.filter((c: { status?: string }) => c.status === "ACTIVE").length,
        pages: 1,
        page: 1,
      });
      setSelected({});
    } catch {
      setCategories([]);
      setPagination({ total: 0, active: 0, pages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm); setModal({ open: true, data: null }); };
  const openEdit = (c: any) => {
    setForm({
      name: c.name,
      description: c.description || "",
      icon: c.icon || "",
      sortOrder: c.sortOrder,
      status: c.status,
      image: c.image?.url ? { url: c.image.url, publicId: c.image.publicId || "" } : null,
    });
    setModal({ open: true, data: c });
  };

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...form };
      if (!form.image?.url) body.image = null;
      if (modal.data) await apiFetch(`/categories/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await apiFetch("/categories", { method: "POST", body: JSON.stringify(body) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { adminToast.error(e.message || "Could not save category"); }
    setSaving(false);
  };

  const onPickCategoryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingImage(true);
    try {
      const { url, publicId } = await adminUploadImage("/upload/category-image", file);
      setForm(f => ({ ...f, image: { url, publicId } }));
    } catch (err) {
      adminToast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const toggle = async (id: string) => {
    try {
      await apiFetch(`/categories/${id}/toggle`, { method: "PATCH" });
      adminToast.success("Category status updated");
      load();
    } catch (e: any) {
      adminToast.error(e.message || "Could not update status");
    }
  };

  const selectedIds = categories.filter((c) => selected[String(c._id)]).map((c) => String(c._id));
  const allSelected = categories.length > 0 && selectedIds.length === categories.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    categories.forEach((c) => {
      next[String(c._id)] = true;
    });
    setSelected(next);
  };

  const remove = (id: string, name: string) => {
    deleteFlow.requestDelete({ kind: "single", ids: [id], label: name });
  };

  const openFilters = async (category: any) => {
    setFilterModal({ open: true, category });
    setFilterLoading(true);
    setFilterRows([emptyFilterRow()]);
    try {
      const d = await apiFetch(`/category-filters/${category._id}`);
      const filters = d.data?.filters;
      setFilterRows(filtersToForm(filters));
    } catch {
      setFilterRows([emptyFilterRow()]);
    } finally {
      setFilterLoading(false);
    }
  };

  const saveFilters = async () => {
    if (!filterModal.category?._id) return;
    setFilterSaving(true);
    try {
      await apiFetch(`/category-filters/${filterModal.category._id}`, {
        method: "PUT",
        body: JSON.stringify({ filters: filtersFromForm(filterRows) }),
      });
      setFilterModal({ open: false, category: null });
    } catch (e: any) {
      alert(e.message || "Could not save filters");
    } finally {
      setFilterSaving(false);
    }
  };

  return (
    <div className="p-6 min-h-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="admin-page-title text-sb-ink">Category Management</h1>
          <p className="text-sb-ink/55 text-sm mt-1">
            Changes reflect in Customer Panel, Vendor Panel, RFQ Forms, Search Filters & Homepage.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button type="button" variant="outline" onClick={() => setBulkOpen(true)} className="border-sb-ink/20">
            <Upload className="h-4 w-4 mr-2" /> Bulk CSV
          </Button>
          <Button onClick={openCreate} className="bg-sb-orange hover:bg-sb-orange-hover text-black">
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sb-ink/45" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories..."
            className="pl-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-sb-cream-secondary border border-sb-ink/15 rounded-md px-3 py-2 text-sm text-sb-ink">
          <option value="">All Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => load()} className="shrink-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-5 text-sm text-sb-ink/55">
        <span>{pagination.total || 0} total categories</span>
        <span>{pagination.active} active</span>
      </div>

      <AdminBulkToolbar
        totalCount={categories.length}
        selectedCount={selectedIds.length}
        allSelected={allSelected}
        onToggleAll={toggleAll}
        onDeleteSelected={() =>
          deleteFlow.requestDelete({
            kind: "bulk",
            ids: selectedIds,
            label: `${selectedIds.length} categories`,
          })
        }
        onDeleteAll={() =>
          deleteFlow.requestDelete({
            kind: "bulk",
            ids: categories.map((c) => String(c._id)),
            label: `all ${categories.length} visible categories`,
          })
        }
        itemLabel="categories"
        disabled={deleteFlow.busy || loading}
      />

      {loading ? <Spinner /> : categories.length === 0 ? (
        <div className="text-center py-16">
          <FolderTree className="h-12 w-12 text-sb-ink/20 mx-auto mb-3" />
          <p className="text-sb-ink/45">No categories found. Create your first category.</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {categories.map(c => (
            <div key={c._id} className="bg-sb-cream-secondary border border-sb-ink/10 rounded-lg p-3 hover:border-sb-orange/35 transition-colors flex flex-col min-h-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 shrink-0 rounded border-sb-ink/25 accent-sb-orange"
                    checked={!!selected[String(c._id)]}
                    onChange={() =>
                      setSelected((s) => ({ ...s, [String(c._id)]: !s[String(c._id)] }))
                    }
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                  {c.image?.url ? (
                    <img src={c.image.url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0 border border-sb-ink/10" />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-sb-orange/15 flex items-center justify-center shrink-0">
                      <FolderTree className="h-3.5 w-3.5 text-sb-orange" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sb-ink text-xs leading-tight line-clamp-2">{c.name}</p>
                    <p className="text-[10px] text-sb-ink/50 truncate">/{c.slug}</p>
                  </div>
                </div>
                </label>
                <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${c.status === "ACTIVE" ? "bg-sb-orange/12 text-sb-orange border-sb-orange/22" : "bg-sb-cream-secondary text-sb-ink/55"}`}>
                  {c.status}
                </Badge>
              </div>

              {c.description && (
                <p className="text-[10px] text-sb-ink/55 mb-2 line-clamp-2 leading-snug flex-1">{c.description}</p>
              )}

              <div className="text-[10px] text-sb-ink/45 mb-2">Sort: {c.sortOrder}</div>

              <div className="flex gap-1.5 mt-auto flex-wrap">
                <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="flex-1 h-8 text-xs px-2 min-w-[4.5rem]">
                  <Edit className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => void openFilters(c)} title="Category filters" className="h-8 w-8 p-0">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggle(c._id)} title={c.status === "ACTIVE" ? "Disable" : "Enable"} className="h-8 w-8 p-0">
                  {c.status === "ACTIVE"
                    ? <ToggleRight className="h-3.5 w-3.5 text-sb-orange" />
                    : <ToggleLeft className="h-3.5 w-3.5 text-sb-ink/45" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(c._id, c.name)} className="h-8 w-8 p-0 text-sb-ink/55 border-sb-ink/18 hover:bg-sb-cream-secondary">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination — all pages merged; show count only */}
      {categories.length > 0 && (
        <p className="text-center text-xs text-sb-ink/45 mt-5">
          Showing all {categories.length} categor{categories.length === 1 ? "y" : "ies"}
        </p>
      )}

      <AdminDeleteConfirmModal
        open={!!deleteFlow.pending}
        title={deleteFlow.modalTitle}
        description={deleteFlow.modalDescription}
        busy={deleteFlow.busy}
        onCancel={deleteFlow.cancelDelete}
        onConfirm={() =>
          void deleteFlow.executeDelete(deleteOneCategory, () => {
            setSelected({});
            load();
          })
        }
      />

      {/* Modal */}
      <BulkImportCsvModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk import categories (CSV)"
        instructions={`Up to 200 rows. Required column: name.\nOptional: description, icon, sortOrder, status (ACTIVE|INACTIVE).\nCustomer-facing images are not in CSV — add them via Edit after import.`}
        templateCsv={CATEGORY_BULK_TEMPLATE}
        templateFileName="structbay-categories-bulk-template.csv"
        apiPath="/categories/bulk-import"
        parseRows={parseCategoryBulkCsv}
        onSuccess={() => load(pagination.page)}
      />

      {modal.open && (
        <Modal title={modal.data ? `Edit — ${modal.data.name}` : "Create Category"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Category Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Civil Construction" />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Description</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Customer-facing image</label>
              <p className="text-[10px] text-sb-ink/45 mb-2">Shown on category tiles and listings (JPEG/PNG/WebP, max 5MB).</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-sb-ink/15 bg-sb-cream text-xs text-sb-ink hover:border-sb-orange/50">
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/jpg" className="hidden" onChange={onPickCategoryImage} disabled={uploadingImage} />
                  {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {uploadingImage ? "Uploading…" : "Choose image"}
                </label>
                {form.image?.url && (
                  <>
                    <img src={form.image.url} alt="" className="h-14 w-14 rounded-lg object-cover border border-sb-ink/10" />
                    <button type="button" className="text-xs text-sb-ink/55 hover:underline" onClick={() => setForm(f => ({ ...f, image: null }))}>
                      Remove image
                    </button>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1 block">Icon (legacy, optional)</label>
              <p className="text-[10px] text-sb-ink/45 mb-1">Not shown on the storefront; use customer-facing image above.</p>
              <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="Optional internal note" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Sort Order</label>
                <Input type="number" min={0} value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-sb-ink/55 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-sb-cream border border-sb-ink/15 rounded-md px-3 py-2 text-sm text-sb-ink">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
            <div className="pt-2 flex gap-2">
              <Button onClick={save} disabled={saving || !form.name} className="bg-sb-orange hover:bg-sb-orange-hover text-black flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {modal.data ? "Update Category" : "Create Category"}
              </Button>
              <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {filterModal.open && filterModal.category && (
        <Modal
          title={`Filters — ${filterModal.category.name}`}
          onClose={() => setFilterModal({ open: false, category: null })}
        >
          {filterLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-sb-ink/50 leading-relaxed">
                Filters appear on the customer category listing. Options: comma-separated <code>Label:value</code> pairs.
              </p>
              {filterRows.map((row, idx) => (
                <div key={idx} className="border border-sb-ink/10 rounded-lg p-3 space-y-2">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Input
                      value={row.label}
                      onChange={(e) => setFilterRows((rows) => {
                        const next = [...rows];
                        next[idx] = { ...next[idx], label: e.target.value };
                        return next;
                      })}
                      placeholder="Label (e.g. Brand)"
                    />
                    <Input
                      value={row.key}
                      onChange={(e) => setFilterRows((rows) => {
                        const next = [...rows];
                        next[idx] = { ...next[idx], key: e.target.value };
                        return next;
                      })}
                      placeholder="Key (e.g. brand)"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <select
                      value={row.type}
                      onChange={(e) => setFilterRows((rows) => {
                        const next = [...rows];
                        next[idx] = { ...next[idx], type: e.target.value as FilterRowForm["type"] };
                        return next;
                      })}
                      className="bg-sb-cream border border-sb-ink/15 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="MULTI_SELECT">Multi select</option>
                      <option value="SELECT">Select</option>
                      <option value="RANGE">Range</option>
                      <option value="TEXT">Text</option>
                    </select>
                    <Input
                      type="number"
                      value={row.sortOrder}
                      onChange={(e) => setFilterRows((rows) => {
                        const next = [...rows];
                        next[idx] = { ...next[idx], sortOrder: +e.target.value };
                        return next;
                      })}
                      placeholder="Sort order"
                    />
                  </div>
                  <Input
                    value={row.optionsText}
                    onChange={(e) => setFilterRows((rows) => {
                      const next = [...rows];
                      next[idx] = { ...next[idx], optionsText: e.target.value };
                      return next;
                    })}
                    placeholder="Options: UltraTech:ultratech, ACC:acc"
                  />
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(e) => setFilterRows((rows) => {
                        const next = [...rows];
                        next[idx] = { ...next[idx], isActive: e.target.checked };
                        return next;
                      })}
                    />
                    Active
                  </label>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilterRows((rows) => [...rows, { ...emptyFilterRow(), sortOrder: rows.length }])}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add filter
              </Button>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => void saveFilters()} disabled={filterSaving} className="bg-sb-orange hover:bg-sb-orange-hover text-black flex-1">
                  {filterSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save filters
                </Button>
                <Button variant="outline" onClick={() => setFilterModal({ open: false, category: null })}>Cancel</Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
