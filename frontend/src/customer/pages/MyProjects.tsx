import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Building2, Plus, ArrowRight, Package, TrendingUp, Search } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";

type Project = {
  _id: string;
  name: string;
  description?: string;
  location?: string;
  budget?: number;
  status: string;
  totalOrders: number;
  totalSpend: number;
  totalProducts: number;
};

export default function MyProjects() {
  const { isLoggedIn, user } = useApp();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", location: "", budget: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    loadProjects();
  }, [isLoggedIn, navigate]);

  const loadProjects = () => {
    setLoading(true);
    api.getProjects()
      .then((res: any) => {
        setProjects(res.data || []);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await api.createProject({
        name: form.name,
        description: form.description,
        location: form.location,
        budget: form.budget ? Number(form.budget) : undefined,
      });
      setShowCreate(false);
      setForm({ name: "", description: "", location: "", budget: "" });
      loadProjects();
    } catch (err: any) {
      alert(err.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/dashboard" className="hover:text-black">Dashboard</Link>
          <ArrowRight className="w-4 h-4" />
          <span className="text-black font-medium">My Projects</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-black flex items-center gap-3">
              <Building2 className="w-6 h-6 text-[#E85A00]" />
              My Projects
            </h1>
            <p className="text-gray-500 mt-1">Organize orders and track spending by project or site location.</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center justify-center gap-2 bg-[#E85A00] hover:bg-[#CC4E00] text-white font-semibold rounded-xl px-4 py-2.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Project
          </button>
        </div>

        {showCreate && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-8">
            <h2 className="text-lg font-bold mb-4">New Project Details</h2>
            <form onSubmit={handleCreate} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#E85A00]" placeholder="e.g., Phase 1 Villa Construction" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#E85A00]" placeholder="Brief details about the project" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location (Optional)</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#E85A00]" placeholder="City or area" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget (₹) (Optional)</label>
                  <input type="number" min="0" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#E85A00]" placeholder="Estimated budget" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating} className="bg-[#E85A00] hover:bg-[#CC4E00] text-white font-semibold rounded-xl px-6 py-2.5 transition-colors disabled:opacity-60">
                  {creating ? "Creating..." : "Save Project"}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="bg-white border border-gray-200 text-gray-600 rounded-xl px-6 py-2.5 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {projects.length > 0 && (
          <div className="mb-6 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#E85A00]"
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading your projects...</div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-black mb-2">No projects yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">Create a project to start organizing your orders and tracking material expenses per site.</p>
            <button onClick={() => setShowCreate(true)} className="bg-[#E85A00] text-white font-semibold rounded-xl px-6 py-2.5">
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(p => (
              <Link key={p._id} to={`/projects/${p._id}`} className="block bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-[#E85A00]/30 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#E85A00]/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-[#E85A00]" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                    p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    p.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-black mb-1 group-hover:text-[#E85A00] transition-colors line-clamp-1">{p.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px]">{p.description || "No description provided."}</p>
                
                <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Total Orders</p>
                    <p className="font-bold flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-gray-400" /> {p.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Total Spend</p>
                    <p className="font-bold flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-gray-400" /> ₹{(p.totalSpend || 0).toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
