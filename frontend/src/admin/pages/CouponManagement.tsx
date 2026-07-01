import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Ticket, Check, X } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";

type Coupon = {
  _id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxDiscount: number | null;
  minCartValue: number;
  usageLimit: number | null;
  usageCount: number;
  validFrom: string;
  expiryDate: string | null;
  isActive: boolean;
};

export function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Coupon>>({
    code: "",
    type: "PERCENTAGE",
    discountValue: 0,
    minCartValue: 0,
    isActive: true,
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any>("/admin/coupons");
      if (data?.success) {
        setCoupons(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const openModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingId(coupon._id);
      setForm({
        ...coupon,
        validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().split('T')[0] : "",
        expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : "",
      });
    } else {
      setEditingId(null);
      setForm({
        code: "",
        type: "PERCENTAGE",
        discountValue: 0,
        minCartValue: 0,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm({});
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        maxDiscount: form.maxDiscount || null,
        usageLimit: form.usageLimit || null,
        expiryDate: form.expiryDate || null,
        validFrom: form.validFrom || new Date().toISOString(),
      };
      
      if (editingId) {
        await apiFetch(`/admin/coupons/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/admin/coupons", { method: "POST", body: JSON.stringify(payload) });
      }
      fetchCoupons();
      closeModal();
    } catch (err: any) {
      alert(err.message || "Failed to save coupon");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this coupon?")) {
      try {
        await apiFetch(`/admin/coupons/${id}`, { method: "DELETE" });
        fetchCoupons();
      } catch (err: any) {
        alert(err.message || "Failed to delete coupon");
      }
    }
  };

  const toggleStatus = async (coupon: Coupon) => {
    try {
      await apiFetch(`/admin/coupons/${coupon._id}`, { method: "PUT", body: JSON.stringify({ isActive: !coupon.isActive }) });
      fetchCoupons();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-sb-ink">Coupons</h1>
          <p className="text-sm text-sb-ink-muted mt-1">Manage discount coupons for customers.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="sb-btn sb-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sb-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sb-ink-muted">Loading...</div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-sb-ink-muted">
            <Ticket className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No coupons found. Create one to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-sb-ink-muted uppercase bg-gray-50 border-b border-sb-border">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Discount</th>
                <th className="px-6 py-4">Usage</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Expiry</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sb-border">
              {coupons.map((coupon) => (
                <tr key={coupon._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-sb-ink">{coupon.code}</td>
                  <td className="px-6 py-4">
                    {coupon.type === "PERCENTAGE" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                    {coupon.type === "PERCENTAGE" && coupon.maxDiscount && (
                      <span className="text-xs text-gray-500 block">Up to ₹{coupon.maxDiscount}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {coupon.usageCount} / {coupon.usageLimit ? coupon.usageLimit : "∞"}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(coupon)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${
                        coupon.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {coupon.isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {coupon.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sb-ink-muted">
                    {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openModal(coupon)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold">{editingId ? "Edit Coupon" : "Create Coupon"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full border rounded-lg p-2 uppercase"
                    placeholder="e.g. WELCOME10"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Discount Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.discountValue || ""}
                    onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>

                {form.type === "PERCENTAGE" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.maxDiscount || ""}
                      onChange={(e) => setForm({ ...form, maxDiscount: Number(e.target.value) })}
                      className="w-full border rounded-lg p-2"
                      placeholder="Optional"
                    />
                  </div>
                )}
                
                <div className={form.type === "PERCENTAGE" ? "" : "col-span-2"}>
                  <label className="block text-sm font-medium mb-1">Min. Cart Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.minCartValue || ""}
                    onChange={(e) => setForm({ ...form, minCartValue: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={form.usageLimit || ""}
                    onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2"
                    placeholder="Unlimited"
                  />
                </div>

                <div></div>

                <div>
                  <label className="block text-sm font-medium mb-1">Valid From</label>
                  <input
                    type="date"
                    value={form.validFrom as string || ""}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiryDate as string || ""}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 text-sb-orange"
                />
                <label htmlFor="isActive" className="text-sm font-medium">Coupon is Active</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="sb-btn sb-btn-primary">
                  {editingId ? "Update Coupon" : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
