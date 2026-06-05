import { useState } from "react";
import { Link } from "react-router";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import { Search, Plus, MoreVertical, Edit, Trash2, Copy, Archive } from "lucide-react";

const products = [
  { id: 1, image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=100&h=100&fit=crop", name: "Cement PPC 53 Grade",    sku: "CEM-PPC-53-001", category: "Cement",   brand: "UltraTech",   status: "Active", inventory: 450,  date: "2026-05-15" },
  { id: 2, image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=100&h=100&fit=crop", name: "TMT Steel Bars 16mm",    sku: "STL-TMT-16-001", category: "Steel",    brand: "TATA Steel",  status: "Active", inventory: 320,  date: "2026-05-10" },
  { id: 3, image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=100&h=100&fit=crop", name: "Ready Mix Concrete M30", sku: "RMC-M30-001",    category: "Concrete", brand: "ACC",         status: "Active", inventory: 0,    date: "2026-05-05" },
  { id: 4, image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=100&h=100&fit=crop", name: "Red Clay Bricks",       sku: "BRK-RCL-001",   category: "Bricks",   brand: "Brickworks",  status: "Active", inventory: 5000, date: "2026-04-28" },
  { id: 5, image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop", name: "Cement OPC 43 Grade",   sku: "CEM-OPC-43-001", category: "Cement",   brand: "Ambuja",      status: "Draft",  inventory: 280,  date: "2026-04-20" },
];

const CATEGORIES = ["All Categories", "Cement", "Steel", "Concrete", "Bricks"];
const STATUSES   = ["All Status", "Active", "Draft", "Archived"];

const statusBadge = (status: string) =>
  status === "Active"
    ? "bg-green-500/15 text-green-400 border border-green-500/20"
    : "bg-white/8 text-[#D4C4A8]/60 border border-white/12";

const inventoryColor = (inv: number) =>
  inv === 0 ? "text-red-400 font-semibold"
  : inv < 100 ? "text-[#FE5E00] font-semibold"
  : "text-[#F4E9D8]";

export function ProductList() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat    = category === "All Categories" || p.category === category;
    const matchStatus = statusFilter === "All Status" || p.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#F4E9D8]">Product Management</h1>
          <p className="text-[#D4C4A8]/60 text-sm mt-0.5">Manage your complete product catalog</p>
        </div>
        <Link
          to="/products/add"
          className="flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold px-4 py-2.5 rounded-lg text-sm transition-colors shadow-[0_4px_12px_rgba(254,94,0,0.2)]"
        >
          <Plus className="w-4 h-4" /> Add Product
        </Link>
      </div>

      {/* Filter bar */}
      <div className="bg-[#222222] border border-white/10 rounded-xl p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4C4A8]/40" />
          <input
            placeholder="Search products or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#171717] border border-white/10 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/35 focus:outline-none focus:border-[#FE5E00] focus:ring-1 focus:ring-[#FE5E00]/20 transition-colors"
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-[#171717] border border-white/10 rounded-lg text-sm text-[#F4E9D8] px-3 py-2 focus:outline-none focus:border-[#FE5E00] transition-colors cursor-pointer min-w-[150px]"
        >
          {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#222222]">{c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#171717] border border-white/10 rounded-lg text-sm text-[#F4E9D8] px-3 py-2 focus:outline-none focus:border-[#FE5E00] transition-colors cursor-pointer min-w-[130px]"
        >
          {STATUSES.map(s => <option key={s} value={s} className="bg-[#222222]">{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#222222] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <h3 className="font-semibold text-[#F4E9D8] text-sm">
            Products <span className="text-[#D4C4A8]/40 font-normal ml-1">({filtered.length})</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                {["Product", "SKU", "Category", "Brand", "Status", "Inventory", "Created", ""].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/50">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(product => (
                <tr key={product.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0" />
                      <span className="font-medium text-[#F4E9D8] text-sm">{product.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-[#D4C4A8]/60">{product.sku}</td>
                  <td className="py-3.5 px-4 text-[#D4C4A8]/70">{product.category}</td>
                  <td className="py-3.5 px-4 text-[#D4C4A8]/70">{product.brand}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(product.status)}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className={`py-3.5 px-4 ${inventoryColor(product.inventory)}`}>
                    {product.inventory === 0 ? "Out of Stock" : product.inventory.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-[#D4C4A8]/50 text-xs">{product.date}</td>
                  <td className="py-3.5 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg text-[#D4C4A8]/50 hover:text-[#F4E9D8] hover:bg-[#2A2A2A] transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#222222] border border-white/15 text-[#F4E9D8] min-w-[140px]">
                        <DropdownMenuItem className="hover:bg-[#2A2A2A] cursor-pointer text-[#F4E9D8] text-sm gap-2">
                          <Edit className="w-3.5 h-3.5 text-[#D4C4A8]/60" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-[#2A2A2A] cursor-pointer text-[#F4E9D8] text-sm gap-2">
                          <Copy className="w-3.5 h-3.5 text-[#D4C4A8]/60" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-[#2A2A2A] cursor-pointer text-[#F4E9D8] text-sm gap-2">
                          <Archive className="w-3.5 h-3.5 text-[#D4C4A8]/60" /> Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-red-500/10 cursor-pointer text-red-400 text-sm gap-2">
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
        {filtered.length === 0 && (
          <div className="py-16 text-center text-[#D4C4A8]/40 text-sm">
            No products match your filters
          </div>
        )}
      </div>
    </div>
  );
}
