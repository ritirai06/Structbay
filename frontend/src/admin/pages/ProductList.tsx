import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { Search, Plus, MoreVertical, Edit, Trash2, Archive, ToggleRight, ToggleLeft, Loader2, RefreshCw, Shield, Zap, Star, TrendingUp } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";

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

const statusBadge = (status: string) =>
  status === "ACTIVE"
    ? "bg-green-500/15 text-green-400 border border-green-500/20"
    : "bg-white/8 text-[#D4C4A8]/60 border border-white/12";

const inventoryColor = (inv: number) =>
  inv === 0 ? "text-red-400 font-semibold" : inv < 100 ? "text-[#FE5E00] font-semibold" : "text-[#F4E9D8]";

function Spinner() {
  return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#FE5E00]" /></div>;
}

export function ProductList() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "24" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    apiFetch(`/products?${params}`)
      .then(d => { setProducts(d.data || []); setPagination(d.pagination || {}); })
      .catch(() => {
        // fallback to demo data when API not connected
        setProducts([
          { _id: "1", images: [{ url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=80&h=80&fit=crop" }], name: "Cement PPC 53 Grade", sku: "CEM-PPC-53-001", category: { name: "Cement" }, brand: { name: "UltraTech" }, status: "ACTIVE", isAssured: true, isExpress: false, isFeatured: true, displayOrder: 1, createdAt: "2026-05-15" },
          { _id: "2", images: [{ url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=80&h=80&fit=crop" }], name: "TMT Steel Bars 16mm", sku: "STL-TMT-16-001", category: { name: "Steel" }, brand: { name: "TATA Steel" }, status: "ACTIVE", isAssured: false, isExpress: true, isFeatured: false, displayOrder: 2, createdAt: "2026-05-10" },
          { _id: "3", images: [{ url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=80&h=80&fit=crop" }], name: "Ready Mix Concrete M30", sku: "RMC-M30-001", category: { name: "Concrete" }, brand: { name: "ACC" }, status: "DRAFT", isAssured: true, isExpress: true, isFeatured: true, displayOrder: 3, createdAt: "2026-05-05" },
          { _id: "4", images: [{ url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=80&h=80&fit=crop" }], name: "Red Clay Bricks", sku: "BRK-RCL-001", category: { name: "Bricks" }, brand: { name: "Brickworks" }, status: "ACTIVE", isAssured: false, isExpress: false, isFeatured: false, displayOrder: 4, createdAt: "2026-04-28" },
          { _id: "5", images: [], name: "Cement OPC 43 Grade", sku: "CEM-OPC-43-001", category: { name: "Cement" }, brand: { name: "Ambuja" }, status: "ARCHIVED", isAssured: false, isExpress: false, isFeatured: false, displayOrder: 5, createdAt: "2026-04-20" },
        ]);
        setPagination({ total: 5, pages: 1, page: 1 });
      })
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await apiFetch(`/products/${id}`, { method: "DELETE" }).catch(e => alert(e.message));
    load();
  };

  const filtered = products.filter(p => {
    if (!search && !statusFilter) return true;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#F4E9D8]">Product Management</h1>
          <p className="text-[#D4C4A8]/60 text-sm mt-0.5">
            {pagination.total || filtered.length} products — Admin-only catalog control
          </p>
        </div>
        <Link to="/products/add"
          className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold px-4 py-2.5 rounded-lg text-sm transition-colors shadow-[0_4px_12px_rgba(254,94,0,0.2)]">
          <Plus className="w-4 h-4" /> Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-[#222222] border border-white/10 rounded-xl p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4C4A8]/40" />
          <input placeholder="Search products or SKU..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#171717] border border-white/10 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/35 focus:outline-none focus:border-[#FE5E00] focus:ring-1 focus:ring-[#FE5E00]/20 transition-colors" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#171717] border border-white/10 rounded-lg text-sm text-[#F4E9D8] px-3 py-2 focus:outline-none focus:border-[#FE5E00] transition-colors cursor-pointer min-w-[130px]">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button onClick={() => load()} className="p-2 bg-[#171717] border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] hover:border-[#FE5E00]/50 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#222222] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <h3 className="font-semibold text-[#F4E9D8] text-sm">
            Products <span className="text-[#D4C4A8]/40 font-normal ml-1">({filtered.length})</span>
          </h3>
        </div>

        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  {["Product", "SKU", "Category", "Brand", "Badges", "Status", "Order", ""].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {p.images?.[0]?.url
                          ? <img src={p.images[0].url} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0" />
                          : <div className="w-10 h-10 rounded-lg bg-[#2A2A2A] border border-white/10 shrink-0 flex items-center justify-center text-[#D4C4A8]/30 text-xs">IMG</div>
                        }
                        <div>
                          <span className="font-medium text-[#F4E9D8] text-sm">{p.name}</span>
                          {p.isFeatured && <span className="ml-2 text-[10px] font-bold text-[#C9A227] uppercase tracking-wide">Featured</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#D4C4A8]/60">{p.sku}</td>
                    <td className="py-3.5 px-4 text-[#D4C4A8]/70">{p.category?.name || "—"}</td>
                    <td className="py-3.5 px-4 text-[#D4C4A8]/70">{p.brand?.name || "—"}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex gap-1">
                        {p.isAssured && (
                          <span title="StructBay Assured" className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                            <Shield className="w-2.5 h-2.5" /> Assured
                          </span>
                        )}
                        {p.isExpress && (
                          <span title="StructBay Express" className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FE5E00]/15 text-[#FE5E00] border border-[#FE5E00]/20">
                            <Zap className="w-2.5 h-2.5" /> Express
                          </span>
                        )}
                        {p.isTopSelling && (
                          <span title="Top Selling" className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C9A227]/15 text-[#C9A227] border border-[#C9A227]/20">
                            <TrendingUp className="w-2.5 h-2.5" /> Top
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#D4C4A8]/50 text-xs">{p.displayOrder}</td>
                    <td className="py-3.5 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg text-[#D4C4A8]/50 hover:text-[#F4E9D8] hover:bg-[#2A2A2A] transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#222222] border border-white/15 text-[#F4E9D8] min-w-[150px]">
                          <DropdownMenuItem asChild className="hover:bg-[#2A2A2A] cursor-pointer text-sm gap-2">
                            <Link to={`/products/edit/${p._id}`}><Edit className="w-3.5 h-3.5 text-[#D4C4A8]/60" /> Edit Product</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="hover:bg-[#2A2A2A] cursor-pointer text-sm gap-2">
                            <Link to={`/pricing?product=${p._id}`}><Star className="w-3.5 h-3.5 text-[#D4C4A8]/60" /> Manage Pricing</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="hover:bg-[#2A2A2A] cursor-pointer text-sm gap-2">
                            <Link to={`/inventory?product=${p._id}`}><Archive className="w-3.5 h-3.5 text-[#D4C4A8]/60" /> Manage Inventory</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => remove(p._id, p.name)} className="hover:bg-red-500/10 cursor-pointer text-red-400 text-sm gap-2">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-[#D4C4A8]/40 text-sm">No products match your filters</div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => load(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${p === pagination.page ? "bg-[#FE5E00] text-black" : "bg-[#222222] border border-white/10 text-[#D4C4A8] hover:border-[#FE5E00]/50"}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
