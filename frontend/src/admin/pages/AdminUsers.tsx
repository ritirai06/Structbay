import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, Shield, Plus, Edit2, Trash2, Lock, Eye, EyeOff } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";

type AdminRow = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  lastLogin?: string;
  phone?: string;
  createdAt?: string;
};

type FormData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: string;
  status: string;
};

export function AdminUsers() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "ADMIN",
    status: "ACTIVE",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch("/admin/admins?limit=100")
      .then((res) => {
        const list = (res.data || []) as AdminRow[];
        setAdmins(list);
      })
      .catch((e: Error) => {
        setAdmins([]);
        setError(e.message || "Could not load admin users");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    if (!formData.password.trim()) errors.password = "Password is required";
    if (!formData.confirmPassword.trim()) errors.confirmPassword = "Confirm password is required";

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email address";
    }

    if (formData.password && formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const response = await apiFetch("/admin/admins", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (response.success) {
        setSuccessMessage("Admin account created successfully!");
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          role: "ADMIN",
          status: "ACTIVE",
        });
        setShowModal(false);
        load();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setFormErrors({
        submit: err instanceof Error ? err.message : "Failed to create admin",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete admin "${name}"?`)) return;

    try {
      await apiFetch(`/admin/admins/${id}`, { method: "DELETE" });
      setSuccessMessage("Admin deleted successfully!");
      load();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete admin");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await apiFetch(`/admin/admins/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      setSuccessMessage("Admin status updated!");
      load();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  return (
    <div className="admin-page">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="admin-page-title text-sb-ink">Admin Users</h1>
          <p className="admin-page-desc">
            Manage admin accounts with role <span className="text-sb-orange">ADMIN</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sb-orange text-white rounded-lg text-sm font-medium hover:bg-sb-orange/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Admin
          </button>
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 border border-sb-ink/10 rounded-lg text-sm text-sb-ink/65 hover:border-sb-ink/20 hover:text-sb-ink transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-sb-orange/25 bg-sb-orange/10 px-4 py-3 text-sm text-sb-ink">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="rounded-xl border border-sb-ink/10 bg-sb-cream-secondary overflow-hidden">
        <div className="px-5 py-4 border-b border-sb-ink/10 flex items-center gap-2">
          <Shield className="w-4 h-4 text-sb-orange" />
          <h2 className="font-semibold text-sb-ink text-sm">ADMIN ACCOUNTS</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-sb-orange" />
          </div>
        ) : admins.length === 0 ? (
          <div className="py-14 text-center text-sb-ink/50 text-sm px-4">
            No admin accounts found. Click <strong>"+ Add Admin"</strong> to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sb-ink/10">
                  {["Name", "Email", "Phone", "Status", "Last Login", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-sb-ink/50"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin._id} className="border-b border-sb-ink/8 hover:bg-sb-cream-secondary/90">
                    <td className="py-3 px-4 font-medium text-sb-ink">{admin.name || "—"}</td>
                    <td className="py-3 px-4 text-sb-ink/70">{admin.email || "—"}</td>
                    <td className="py-3 px-4 text-sb-ink/65">{admin.phone || "—"}</td>
                    <td className="py-3 px-4">
                      <select
                        value={admin.status || "ACTIVE"}
                        onChange={(e) => handleStatusChange(admin._id, e.target.value)}
                        className="px-2 py-1 text-xs rounded border border-sb-ink/20 bg-white text-sb-ink"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-sb-ink/50 text-xs">
                      {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : "Never"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteAdmin(admin._id, admin.name || "Admin")}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Admin Modal - Fixed Scrollbar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] flex flex-col">
            {/* Header - No scroll */}
            <div className="bg-white border-b border-sb-ink/10 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold text-sb-ink">Create Admin Account</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormErrors({});
                }}
                className="text-sb-ink/50 hover:text-sb-ink"
              >
                ✕
              </button>
            </div>

            {/* Form - Scrollable */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formErrors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {formErrors.submit}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-sb-ink mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-orange ${
                    formErrors.name ? "border-red-500" : "border-sb-ink/20"
                  }`}
                  placeholder="John Doe"
                />
                {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-sb-ink mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-orange ${
                    formErrors.email ? "border-red-500" : "border-sb-ink/20"
                  }`}
                  placeholder="admin@example.com"
                />
                {formErrors.email && <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-sb-ink mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-sb-ink/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-orange"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-sb-ink mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-orange pr-10 ${
                      formErrors.password ? "border-red-500" : "border-sb-ink/20"
                    }`}
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sb-ink/50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-xs text-red-600 mt-1">{formErrors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-sb-ink mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-orange pr-10 ${
                      formErrors.confirmPassword ? "border-red-500" : "border-sb-ink/20"
                    }`}
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sb-ink/50"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.confirmPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-sb-ink mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-sb-ink/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-orange"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </form>

            {/* Footer - No scroll */}
            <div className="bg-white border-t border-sb-ink/10 px-6 py-4 flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setFormErrors({});
                }}
                className="flex-1 px-4 py-2 border border-sb-ink/20 text-sb-ink rounded-lg text-sm font-medium hover:bg-sb-ink/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-sb-orange text-white rounded-lg text-sm font-medium hover:bg-sb-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Admin"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
