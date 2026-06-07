import { useState } from "react";
import { Plus, Edit, Trash2, Loader2, Save, DollarSign, Search } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const getToken = () => localStorage.getItem("adminToken") || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...opts.headers },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "API Error");
  return data;
}

const DEMO = [
  { _id: "1", product: { name: "Cement PPC 53 Grade", sku: "CEM-PPC-53" }, city: { name: "Bengaluru" }, regularPrice: 450, salePrice: 420, isVisible: true, wholesaleSlabs: [{ minQty: 10, maxQty: 49, price: 410 }, { minQty: 50, maxQty: 99, price: 395 }, { minQty: 100, price: 380 }] },
  { _id: "2", product: { name: "TMT Steel Bars 16mm", sku: "STL-TMT-16" }, city: { name: "Bengaluru" }, regularPrice: 65, salePrice: 62, isVisible: true, wholesaleSlabs: [{ minQty: 100, maxQty: 499, price: 60 }, { minQty: 500, price: 58 }] },
  { _id: "3", product: { name: "Ready Mix Concrete M30", sku: "RMC-M30" }, city: { name: "Hyderabad" }, regularPrice: 5500, salePrice: 5200, isVisible: true, wholesaleSlabs: [{ minQty: 10, maxQty: 24, price: 5100 }, { minQty: 25, price: 5000 }] },
];

const EMPTY_SLAB = { minQty: 0, maxQty: null as null | number, price: 0 };
const emptyForm = { product: "", variation: "", city: "", regularPrice: 0, salePrice: null as null | number, wholesaleSlabs: [] as any[], isVisible: true };

const inp = "w-full bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#1A1A1A]">
          <h3 className="font-bold text-[#F4E9D8]">{title}</h3>
          <button onClick={onClose} className="text-[#D4C4A8]/60 hover:text-[#F4E9D8] text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function PricingManagement() {
  const [items, setItems] = useState<any[]>(DEMO);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModal(true); };
  const openEdit = (item: any) => {
    setForm({
      product: item.product?._id || item.product,
      variation: item.variation || "",
      city: item.city?._id || item.city,
      regularPrice: item.regularPrice,
      salePrice: item.salePrice ?? null,
      wholesaleSlabs: item.wholesaleSlabs || [],
      isVisible: item.isVisible,
    });
    setEditId(item._id);
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch("/pricing", { method: "POST", body: JSON.stringify(form) });
      setModal(false);
      // reload data
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const addSlab = () => setForm((f: any) => ({ ...f, wholesaleSlabs: [...f.wholesaleSlabs, { ...EMPTY_SLAB }] }));
  const removeSlab = (i: number) => setForm((f: any) => ({ ...f, wholesaleSlabs: f.wholesaleSlabs.filter((_: any, j: number) => j !== i) }));
  const setSlab = (i: number, key: string, val: any) => setForm((f: any) => {
    const slabs = [...f.wholesaleSlabs]; slabs[i] = { ...slabs[i], [key]: val }; return { ...f, wholesaleSlabs: slabs };
  });

  const filtered = items.filter(i => !search || i.product?.name?.toLowerCase().includes(search.toLowerCase()) || i.city?.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F4E9D8]">Pricing Engine</h1>
          <p className="text-[#D4C4A8]/60 text-sm mt-1">City-wise pricing with up to 5 wholesale slabs per product</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold px-4 py-2.5 rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" /> Set Pricing
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4C4A8]/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product or city..."
            className="w-full pl-9 pr-4 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors" />
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                {["Product", "City", "Regular Price", "Sale Price", "Wholesale Slabs", "Visible", ""].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-[#F4E9D8]">{item.product?.name}</p>
                    <p className="text-xs text-[#D4C4A8]/50 font-mono">{item.product?.sku}</p>
                  </td>
                  <td className="py-3.5 px-4 text-[#D4C4A8]/70">{item.city?.name}</td>
                  <td className="py-3.5 px-4 font-semibold text-[#F4E9D8]">₹{item.regularPrice?.toLocaleString()}</td>
                  <td className="py-3.5 px-4 font-semibold text-green-400">
                    {item.salePrice ? `₹${item.salePrice?.toLocaleString()}` : <span className="text-[#D4C4A8]/40 font-normal">—</span>}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      {item.wholesaleSlabs?.map((s: any, i: number) => (
                        <div key={i} className="text-xs text-[#D4C4A8]/70">
                          <span className="text-[#D4C4A8]/50">{s.minQty}+ qty:</span>{" "}
                          <span className="font-semibold text-[#F4E9D8]">₹{s.price}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-xs font-medium ${item.isVisible ? "text-green-400" : "text-[#D4C4A8]/40"}`}>
                      {item.isVisible ? "✓ Visible" : "Hidden"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button onClick={() => openEdit(item)} className="p-1.5 border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] hover:border-white/20 transition-colors">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <DollarSign className="w-10 h-10 mx-auto mb-3 text-[#D4C4A8]/20" />
              <p className="text-[#D4C4A8]/40 text-sm">No pricing records found.</p>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Modal title={editId ? "Edit Pricing" : "Set Pricing"} onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div className="p-3 bg-[#0D0D0D] border border-[#FE5E00]/20 rounded-lg text-xs text-[#D4C4A8]/70">
              💡 Enter product ID and city ID. In production, these will be searchable dropdowns connected to the API.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Product ID *</label>
                <input className={inp} value={form.product} onChange={e => setForm((f: any) => ({ ...f, product: e.target.value }))} placeholder="Product ObjectId" />
              </div>
              <div>
                <label className="text-xs text-[#D4C4A8]/60 mb-1 block">City ID *</label>
                <input className={inp} value={form.city} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value }))} placeholder="City ObjectId" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Regular Price (₹) *</label>
                <input type="number" className={inp} min={0} value={form.regularPrice} onChange={e => setForm((f: any) => ({ ...f, regularPrice: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Sale Price (₹)</label>
                <input type="number" className={inp} min={0} value={form.salePrice ?? ""} onChange={e => setForm((f: any) => ({ ...f, salePrice: e.target.value ? +e.target.value : null }))} placeholder="Optional" />
              </div>
            </div>

            {/* Wholesale Slabs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-[#D4C4A8]/60 font-medium uppercase tracking-wider">Wholesale Slabs (max 5)</label>
                {form.wholesaleSlabs.length < 5 && (
                  <button onClick={addSlab} className="text-xs text-[#FE5E00] hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Slab
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {form.wholesaleSlabs.map((s: any, i: number) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-center">
                    <div>
                      <label className="text-[10px] text-[#D4C4A8]/40 mb-0.5 block">Min Qty</label>
                      <input type="number" className={inp} min={0} value={s.minQty} onChange={e => setSlab(i, "minQty", +e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#D4C4A8]/40 mb-0.5 block">Max Qty</label>
                      <input type="number" className={inp} min={0} value={s.maxQty ?? ""} onChange={e => setSlab(i, "maxQty", e.target.value ? +e.target.value : null)} placeholder="∞" />
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1">
                        <label className="text-[10px] text-[#D4C4A8]/40 mb-0.5 block">Price (₹)</label>
                        <input type="number" className={inp} min={0} value={s.price} onChange={e => setSlab(i, "price", +e.target.value)} />
                      </div>
                      <button onClick={() => removeSlab(i)} className="mt-5 p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isVisible} onChange={e => setForm((f: any) => ({ ...f, isVisible: e.target.checked }))}
                  className="w-4 h-4 accent-[#FE5E00]" />
                <span className="text-sm text-[#D4C4A8]/70">Visible in this city</span>
              </label>
            </div>

            <div className="pt-2 flex gap-2">
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold px-4 py-2 rounded-lg text-sm flex-1 justify-center disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Pricing
              </button>
              <button onClick={() => setModal(false)}
                className="px-4 py-2 border border-white/15 rounded-lg text-sm text-[#D4C4A8] hover:border-white/30 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
