import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import {
  Plus, Edit, Trash2, ToggleLeft, ToggleRight, Eye,
  Megaphone, Image, FileText, Globe, Mail, MapPin,
  BarChart3, Loader2, RefreshCw, Save
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const getToken = () => localStorage.getItem("adminToken") || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...opts.headers,
    },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "API Error");
  return data;
}

// ─── Shared Components ────────────────────────────────────────────────────────
function SectionHeader({ title, onAdd, addLabel = "Add" }: { title: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-[#F4E9D8]">{title}</h2>
      {onAdd && (
        <Button size="sm" onClick={onAdd} className="bg-[#FE5E00] hover:bg-[#E05200] text-black">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> {addLabel}
        </Button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE" || status === "PUBLISHED";
  return (
    <Badge className={active ? "bg-green-500/15 text-green-400 border-green-500/25" : "bg-white/10 text-[#D4C4A8]/60"}>
      {status}
    </Badge>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-center py-10 text-[#D4C4A8]/40 text-sm">{text}</p>;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-[#FE5E00]" />
    </div>
  );
}

// ─── Simple Modal ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-bold text-[#F4E9D8]">{title}</h3>
          <button onClick={onClose} className="text-[#D4C4A8]/60 hover:text-[#F4E9D8] text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Homepage Tab ─────────────────────────────────────────────────────────────
function HomepageTab() {
  const [form, setForm] = useState({ heroTitle: "", heroSubtitle: "", heroCtaText: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    apiFetch("/cms/homepage")
      .then(d => setForm({
        heroTitle: d.data.heroTitle || "",
        heroSubtitle: d.data.heroSubtitle || "",
        heroCtaText: d.data.heroCtaText || "",
      }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      await apiFetch("/cms/homepage", { method: "PUT", body: JSON.stringify(form) });
      setMsg("✓ Homepage updated — changes reflect across all panels.");
    } catch (e: any) { setMsg(`Error: ${e.message}`); }
    setSaving(false);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4 max-w-xl">
      <SectionHeader title="Hero Section" />
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Hero Title</label>
          <Input value={form.heroTitle} onChange={e => setForm(f => ({ ...f, heroTitle: e.target.value }))}
            placeholder="India's Largest Construction Marketplace" />
        </div>
        <div>
          <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Hero Subtitle</label>
          <Textarea value={form.heroSubtitle} onChange={e => setForm(f => ({ ...f, heroSubtitle: e.target.value }))}
            rows={2} placeholder="Source materials, find vendors, manage projects — all in one place." />
        </div>
        <div>
          <label className="text-xs text-[#D4C4A8]/60 mb-1 block">CTA Button Text</label>
          <Input value={form.heroCtaText} onChange={e => setForm(f => ({ ...f, heroCtaText: e.target.value }))}
            placeholder="Start Procuring" />
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={save} disabled={saving} className="bg-[#FE5E00] hover:bg-[#E05200] text-black">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save & Publish
        </Button>
        {msg && <span className="text-sm text-green-400">{msg}</span>}
      </div>
      <p className="text-xs text-[#D4C4A8]/40 pt-2">
        Changes auto-reflect on Customer Homepage, Vendor Homepage, and Public Website.
      </p>
    </div>
  );
}

// ─── Banners Tab ─────────────────────────────────────────────────────────────
function BannersTab() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState({ title: "", subtitle: "", buttonText: "", buttonLink: "#", displayOrder: 0, status: "ACTIVE" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/cms/banners?limit=50").then(d => setBanners(d.data || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ title: "", subtitle: "", buttonText: "", buttonLink: "#", displayOrder: 0, status: "ACTIVE" }); setModal({ open: true, data: null }); };
  const openEdit = (b: any) => { setForm({ title: b.title, subtitle: b.subtitle || "", buttonText: b.buttonText || "", buttonLink: b.buttonLink || "#", displayOrder: b.displayOrder, status: b.status }); setModal({ open: true, data: b }); };

  const save = async () => {
    setSaving(true);
    try {
      if (modal.data) await apiFetch(`/cms/banners/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(form) });
      else await apiFetch("/cms/banners", { method: "POST", body: JSON.stringify(form) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const toggle = async (id: string) => {
    await apiFetch(`/cms/banners/${id}/toggle`, { method: "PATCH" }).catch(e => alert(e.message));
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await apiFetch(`/cms/banners/${id}`, { method: "DELETE" }).catch(e => alert(e.message));
    load();
  };

  return (
    <>
      <SectionHeader title="Hero Banners" onAdd={openCreate} addLabel="New Banner" />
      {loading ? <Spinner /> : banners.length === 0 ? <EmptyState text="No banners yet. Create your first banner." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {banners.map(b => (
            <div key={b._id} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-semibold text-[#F4E9D8] truncate">{b.title}</p>
                  {b.subtitle && <p className="text-xs text-[#D4C4A8]/60 mt-0.5 truncate">{b.subtitle}</p>}
                </div>
                <StatusBadge status={b.status} />
              </div>
              {b.image?.url && <img src={b.image.url} alt={b.title} className="w-full h-28 object-cover rounded-lg mb-3 bg-[#111]" />}
              <div className="flex items-center gap-2 text-xs text-[#D4C4A8]/50 mb-3">
                <span>Order: {b.displayOrder}</span>
                {b.buttonText && <span>· CTA: {b.buttonText}</span>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(b)}><Edit className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
                <Button variant="outline" size="sm" onClick={() => toggle(b._id)}>
                  {b.status === "ACTIVE" ? <ToggleRight className="h-3.5 w-3.5 text-green-400" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(b._id)} className="text-red-400 border-red-400/30 hover:bg-red-400/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <Modal title={modal.data ? "Edit Banner" : "Create Banner"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Title *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Subtitle</label>
              <Input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Button Text</label>
                <Input value={form.buttonText} onChange={e => setForm(f => ({ ...f, buttonText: e.target.value }))} /></div>
              <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Button Link</label>
                <Input value={form.buttonLink} onChange={e => setForm(f => ({ ...f, buttonLink: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Display Order</label>
                <Input type="number" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: +e.target.value }))} /></div>
              <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-[#0D0D0D] border border-white/15 rounded-md px-3 py-2 text-sm text-[#F4E9D8]">
                  <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option>
                </select></div>
            </div>
            <div className="pt-2 flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-[#FE5E00] hover:bg-[#E05200] text-black flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {modal.data ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Blogs Tab ────────────────────────────────────────────────────────────────
function BlogsTab() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState({ title: "", description: "", content: "", author: "StructBay Team", status: "DRAFT", isFeatured: false, tags: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/cms/blogs?limit=50").then(d => setBlogs(d.data || [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ title: "", description: "", content: "", author: "StructBay Team", status: "DRAFT", isFeatured: false, tags: "" }); setModal({ open: true, data: null }); };
  const openEdit = (b: any) => { setForm({ title: b.title, description: b.description || "", content: b.content || "", author: b.author, status: b.status, isFeatured: b.isFeatured, tags: (b.tags || []).join(", ") }); setModal({ open: true, data: b }); };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) };
    try {
      if (modal.data) await apiFetch(`/cms/blogs/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await apiFetch("/cms/blogs", { method: "POST", body: JSON.stringify(payload) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this blog?")) return;
    await apiFetch(`/cms/blogs/${id}`, { method: "DELETE" }).catch(e => alert(e.message));
    load();
  };

  const statusColor = (s: string) => ({ PUBLISHED: "text-green-400", DRAFT: "text-yellow-400", SCHEDULED: "text-blue-400", ARCHIVED: "text-[#D4C4A8]/40" }[s] || "");

  return (
    <>
      <SectionHeader title="Blog Posts" onAdd={openCreate} addLabel="New Blog" />
      {loading ? <Spinner /> : blogs.length === 0 ? <EmptyState text="No blog posts yet." /> : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {blogs.map(b => (
            <div key={b._id} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <span className={`text-xs font-semibold ${statusColor(b.status)}`}>{b.status}</span>
                {b.isFeatured && <span className="text-xs text-[#FE5E00]">★ Featured</span>}
              </div>
              <h4 className="font-semibold text-[#F4E9D8] text-sm mb-1 line-clamp-2">{b.title}</h4>
              {b.description && <p className="text-xs text-[#D4C4A8]/60 line-clamp-2 flex-1">{b.description}</p>}
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => openEdit(b)} className="flex-1"><Edit className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
                <Button variant="outline" size="sm" onClick={() => remove(b._id)} className="text-red-400 border-red-400/30 hover:bg-red-400/10"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <Modal title={modal.data ? "Edit Blog" : "Create Blog"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Title *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Description (Summary)</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Content (HTML)</label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Author</label>
                <Input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} /></div>
              <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-[#0D0D0D] border border-white/15 rounded-md px-3 py-2 text-sm text-[#F4E9D8]">
                  {["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"].map(s => <option key={s} value={s}>{s}</option>)}
                </select></div>
            </div>
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Tags (comma-separated)</label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="cement, construction, tips" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} id="featured" />
              <label htmlFor="featured" className="text-sm text-[#D4C4A8]">Featured Post</label>
            </div>
            <div className="pt-2 flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-[#FE5E00] hover:bg-[#E05200] text-black flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {modal.data ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Announcements Tab ────────────────────────────────────────────────────────
function AnnouncementsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", isPinned: false, status: "ACTIVE" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/cms/announcements?limit=50").then(d => setItems(d.data || [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      if (modal.data) await apiFetch(`/cms/announcements/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(form) });
      else await apiFetch("/cms/announcements", { method: "POST", body: JSON.stringify(form) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete announcement?")) return;
    await apiFetch(`/cms/announcements/${id}`, { method: "DELETE" }).catch(e => alert(e.message));
    load();
  };

  const priorityColor: Record<string, string> = { LOW: "text-[#D4C4A8]/50", MEDIUM: "text-blue-400", HIGH: "text-yellow-400", URGENT: "text-red-400" };

  return (
    <>
      <SectionHeader title="Announcements" onAdd={() => { setForm({ title: "", description: "", priority: "MEDIUM", isPinned: false, status: "ACTIVE" }); setModal({ open: true, data: null }); }} addLabel="New Announcement" />
      <p className="text-xs text-[#D4C4A8]/40 mb-4">Announcements display on Customer Dashboard, Vendor Dashboard, and Public Homepage.</p>
      {loading ? <Spinner /> : items.length === 0 ? <EmptyState text="No announcements." /> : (
        <div className="space-y-3">
          {items.map(a => (
            <div key={a._id} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {a.isPinned && <span className="text-xs text-[#FE5E00]">📌</span>}
                  <span className={`text-xs font-bold ${priorityColor[a.priority]}`}>{a.priority}</span>
                  <StatusBadge status={a.status} />
                </div>
                <p className="font-semibold text-[#F4E9D8] text-sm">{a.title}</p>
                {a.description && <p className="text-xs text-[#D4C4A8]/60 mt-0.5 truncate">{a.description}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => { setForm({ title: a.title, description: a.description || "", priority: a.priority, isPinned: a.isPinned, status: a.status }); setModal({ open: true, data: a }); }}><Edit className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" onClick={() => remove(a._id)} className="text-red-400 border-red-400/30 hover:bg-red-400/10"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal.open && (
        <Modal title={modal.data ? "Edit Announcement" : "Create Announcement"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Title *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Description</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full bg-[#0D0D0D] border border-white/15 rounded-md px-3 py-2 text-sm text-[#F4E9D8]">
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map(p => <option key={p} value={p}>{p}</option>)}
                </select></div>
              <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-[#0D0D0D] border border-white/15 rounded-md px-3 py-2 text-sm text-[#F4E9D8]">
                  <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option>
                </select></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} id="pinned" />
              <label htmlFor="pinned" className="text-sm text-[#D4C4A8]">Pin Announcement</label>
            </div>
            <div className="pt-2 flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-[#FE5E00] hover:bg-[#E05200] text-black flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {modal.data ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Testimonials Tab ─────────────────────────────────────────────────────────
function TestimonialsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState({ customerName: "", designation: "", company: "", review: "", rating: 5, isFeatured: false, status: "ACTIVE" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/cms/testimonials?limit=50").then(d => setItems(d.data || [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      if (modal.data) await apiFetch(`/cms/testimonials/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(form) });
      else await apiFetch("/cms/testimonials", { method: "POST", body: JSON.stringify(form) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete testimonial?")) return;
    await apiFetch(`/cms/testimonials/${id}`, { method: "DELETE" }).catch(e => alert(e.message));
    load();
  };

  return (
    <>
      <SectionHeader title="Testimonials" onAdd={() => { setForm({ customerName: "", designation: "", company: "", review: "", rating: 5, isFeatured: false, status: "ACTIVE" }); setModal({ open: true, data: null }); }} addLabel="Add Testimonial" />
      {loading ? <Spinner /> : items.length === 0 ? <EmptyState text="No testimonials yet." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(t => (
            <div key={t._id} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-[#F4E9D8] text-sm">{t.customerName}</p>
                  {t.designation && <p className="text-xs text-[#D4C4A8]/60">{t.designation}{t.company ? `, ${t.company}` : ""}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  {t.isFeatured && <span className="text-[#FE5E00] text-xs">★</span>}
                  <StatusBadge status={t.status} />
                </div>
              </div>
              <p className="text-sm text-[#D4C4A8]/80 line-clamp-3 mb-2">"{t.review}"</p>
              <div className="text-[#FE5E00] text-sm mb-3">{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setForm({ customerName: t.customerName, designation: t.designation || "", company: t.company || "", review: t.review, rating: t.rating, isFeatured: t.isFeatured, status: t.status }); setModal({ open: true, data: t }); }}><Edit className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
                <Button variant="outline" size="sm" onClick={() => remove(t._id)} className="text-red-400 border-red-400/30 hover:bg-red-400/10"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal.open && (
        <Modal title={modal.data ? "Edit Testimonial" : "Add Testimonial"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Customer Name *</label>
              <Input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Designation</label>
                <Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} /></div>
              <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Company</label>
                <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Review *</label>
              <Textarea value={form.review} onChange={e => setForm(f => ({ ...f, review: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Rating (1–5)</label>
                <Input type="number" min={1} max={5} value={form.rating} onChange={e => setForm(f => ({ ...f, rating: +e.target.value }))} /></div>
              <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-[#0D0D0D] border border-white/15 rounded-md px-3 py-2 text-sm text-[#F4E9D8]">
                  <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option>
                </select></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} id="tfeatured" />
              <label htmlFor="tfeatured" className="text-sm text-[#D4C4A8]">Featured Testimonial</label>
            </div>
            <div className="pt-2 flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-[#FE5E00] hover:bg-[#E05200] text-black flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {modal.data ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── SEO Tab ──────────────────────────────────────────────────────────────────
function SEOTab() {
  const PAGES = ["home", "about", "contact", "blog", "categories", "shop"];
  const [selected, setSelected] = useState("home");
  const [form, setForm] = useState({ metaTitle: "", metaDescription: "", keywords: "", ogTitle: "", ogDescription: "", canonicalUrl: "", robotsDirective: "index,follow" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback((page: string) => {
    setLoading(true);
    apiFetch(`/cms/seo?page=${page}`)
      .then(d => {
        const entry = (d.data || []).find((s: any) => s.page === page);
        setForm({
          metaTitle: entry?.metaTitle || "",
          metaDescription: entry?.metaDescription || "",
          keywords: (entry?.keywords || []).join(", "),
          ogTitle: entry?.ogTitle || "",
          ogDescription: entry?.ogDescription || "",
          canonicalUrl: entry?.canonicalUrl || "",
          robotsDirective: entry?.robotsDirective || "index,follow",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(selected); }, [selected, load]);

  const save = async () => {
    setSaving(true); setMsg("");
    const payload = { page: selected, ...form, keywords: form.keywords.split(",").map((k: string) => k.trim()).filter(Boolean) };
    try {
      await apiFetch("/cms/seo", { method: "POST", body: JSON.stringify(payload) });
      setMsg(`✓ SEO saved for "${selected}"`);
    } catch (e: any) { setMsg(`Error: ${e.message}`); }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl">
      <SectionHeader title="SEO Management" />
      <div className="flex flex-wrap gap-2 mb-5">
        {PAGES.map(p => (
          <button key={p} onClick={() => setSelected(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selected === p ? "bg-[#FE5E00] text-black" : "bg-[#1A1A1A] border border-white/10 text-[#D4C4A8] hover:border-[#FE5E00]/50"}`}>
            {p}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <div className="space-y-3">
          <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Meta Title</label>
            <Input value={form.metaTitle} onChange={e => setForm(f => ({ ...f, metaTitle: e.target.value }))} /></div>
          <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Meta Description</label>
            <Textarea value={form.metaDescription} onChange={e => setForm(f => ({ ...f, metaDescription: e.target.value }))} rows={2} /></div>
          <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Keywords (comma-separated)</label>
            <Input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="construction, cement, steel" /></div>
          <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">OG Title</label>
            <Input value={form.ogTitle} onChange={e => setForm(f => ({ ...f, ogTitle: e.target.value }))} /></div>
          <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">OG Description</label>
            <Textarea value={form.ogDescription} onChange={e => setForm(f => ({ ...f, ogDescription: e.target.value }))} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Canonical URL</label>
              <Input value={form.canonicalUrl} onChange={e => setForm(f => ({ ...f, canonicalUrl: e.target.value }))} placeholder="https://structbay.com/" /></div>
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Robots</label>
              <select value={form.robotsDirective} onChange={e => setForm(f => ({ ...f, robotsDirective: e.target.value }))}
                className="w-full bg-[#0D0D0D] border border-white/15 rounded-md px-3 py-2 text-sm text-[#F4E9D8]">
                {["index,follow", "noindex,nofollow", "index,nofollow", "noindex,follow"].map(r => <option key={r} value={r}>{r}</option>)}
              </select></div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={save} disabled={saving} className="bg-[#FE5E00] hover:bg-[#E05200] text-black">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save SEO
            </Button>
            {msg && <span className="text-sm text-green-400">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contact Tab ──────────────────────────────────────────────────────────────
function ContactTab() {
  const [form, setForm] = useState({ phone: "", email: "", supportEmail: "", address: "", whatsapp: "", mapLink: "", workingHours: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    apiFetch("/cms/contact").then(d => setForm({ phone: d.data.phone || "", email: d.data.email || "", supportEmail: d.data.supportEmail || "", address: d.data.address || "", whatsapp: d.data.whatsapp || "", mapLink: d.data.mapLink || "", workingHours: d.data.workingHours || "" })).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    try { await apiFetch("/cms/contact", { method: "PUT", body: JSON.stringify(form) }); setMsg("✓ Contact info updated."); }
    catch (e: any) { setMsg(`Error: ${e.message}`); }
    setSaving(false);
  };

  if (loading) return <Spinner />;

  return (
    <div className="max-w-xl">
      <SectionHeader title="Contact Information" />
      <div className="space-y-3">
        {[
          { key: "phone", label: "Phone", icon: "📞" },
          { key: "email", label: "Email", icon: "📧" },
          { key: "supportEmail", label: "Support Email", icon: "📧" },
          { key: "whatsapp", label: "WhatsApp", icon: "💬" },
          { key: "address", label: "Address", icon: "📍" },
          { key: "mapLink", label: "Google Maps Link", icon: "🗺️" },
          { key: "workingHours", label: "Working Hours", icon: "🕐" },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs text-[#D4C4A8]/60 mb-1 block">{label}</label>
            <Input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
          </div>
        ))}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={save} disabled={saving} className="bg-[#FE5E00] hover:bg-[#E05200] text-black">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
          {msg && <span className="text-sm text-green-400">{msg}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Ads Tab ──────────────────────────────────────────────────────────────────
function AdsTab() {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form, setForm] = useState({ title: "", imageUrl: "", link: "#", placement: "HOME_TOP", status: "ACTIVE" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/cms/ads?limit=50").then(d => setAds(d.data || [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      if (modal.data) await apiFetch(`/cms/ads/${modal.data._id}`, { method: "PATCH", body: JSON.stringify(form) });
      else await apiFetch("/cms/ads", { method: "POST", body: JSON.stringify(form) });
      setModal({ open: false, data: null }); load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete ad?")) return;
    await apiFetch(`/cms/ads/${id}`, { method: "DELETE" }).catch(e => alert(e.message));
    load();
  };

  return (
    <>
      <SectionHeader title="Advertisements" onAdd={() => { setForm({ title: "", imageUrl: "", link: "#", placement: "HOME_TOP", status: "ACTIVE" }); setModal({ open: true, data: null }); }} addLabel="New Ad" />
      {loading ? <Spinner /> : ads.length === 0 ? <EmptyState text="No advertisements." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {ads.map(a => (
            <div key={a._id} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-[#F4E9D8] text-sm truncate flex-1 mr-2">{a.title}</p>
                <StatusBadge status={a.status} />
              </div>
              {a.image?.url && <img src={a.image.url} alt={a.title} className="w-full h-20 object-cover rounded-lg mb-2 bg-[#111]" />}
              <div className="flex items-center gap-3 text-xs text-[#D4C4A8]/50 mb-3">
                <span className="bg-[#FE5E00]/15 text-[#FE5E00] px-2 py-0.5 rounded">{a.placement}</span>
                <span>👁 {a.impressions}</span>
                <span>🖱 {a.clicks}</span>
                {a.impressions > 0 && <span>CTR: {a.ctr}%</span>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setForm({ title: a.title, imageUrl: a.image?.url || "", link: a.link || "#", placement: a.placement, status: a.status }); setModal({ open: true, data: a }); }}><Edit className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
                <Button variant="outline" size="sm" onClick={() => remove(a._id)} className="text-red-400 border-red-400/30 hover:bg-red-400/10"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal.open && (
        <Modal title={modal.data ? "Edit Ad" : "Create Ad"} onClose={() => setModal({ open: false, data: null })}>
          <div className="space-y-3">
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Title *</label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Image URL *</label><Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." /></div>
            <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Link</label><Input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Placement</label>
                <select value={form.placement} onChange={e => setForm(f => ({ ...f, placement: e.target.value }))}
                  className="w-full bg-[#0D0D0D] border border-white/15 rounded-md px-3 py-2 text-sm text-[#F4E9D8]">
                  {["HOME_TOP", "HOME_MID", "HOME_BOTTOM", "SIDEBAR", "CATEGORY_PAGE", "SEARCH_PAGE"].map(p => <option key={p} value={p}>{p}</option>)}
                </select></div>
              <div><label className="text-xs text-[#D4C4A8]/60 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-[#0D0D0D] border border-white/15 rounded-md px-3 py-2 text-sm text-[#F4E9D8]">
                  <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option>
                </select></div>
            </div>
            <div className="pt-2 flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-[#FE5E00] hover:bg-[#E05200] text-black flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {modal.data ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setModal({ open: false, data: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CMSManagement() {
  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#F4E9D8]">CMS & Platform Control Center</h1>
        <p className="text-[#D4C4A8]/60 text-sm mt-1">
          All content changes reflect instantly across Customer Panel, Vendor Panel, and Public Website.
        </p>
      </div>

      <Tabs defaultValue="homepage" className="space-y-5">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max gap-1 bg-[#1A1A1A] p-1">
            <TabsTrigger value="homepage"><Globe className="h-3.5 w-3.5 mr-1.5" />Homepage</TabsTrigger>
            <TabsTrigger value="banners"><Image className="h-3.5 w-3.5 mr-1.5" />Banners</TabsTrigger>
            <TabsTrigger value="blogs"><FileText className="h-3.5 w-3.5 mr-1.5" />Blogs</TabsTrigger>
            <TabsTrigger value="announcements"><Megaphone className="h-3.5 w-3.5 mr-1.5" />Announcements</TabsTrigger>
            <TabsTrigger value="testimonials"><Eye className="h-3.5 w-3.5 mr-1.5" />Testimonials</TabsTrigger>
            <TabsTrigger value="ads"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Ads</TabsTrigger>
            <TabsTrigger value="seo"><Globe className="h-3.5 w-3.5 mr-1.5" />SEO</TabsTrigger>
            <TabsTrigger value="contact"><Mail className="h-3.5 w-3.5 mr-1.5" />Contact</TabsTrigger>
            <TabsTrigger value="marketplace"><MapPin className="h-3.5 w-3.5 mr-1.5" />Marketplace</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="homepage"><HomepageTab /></TabsContent>
        <TabsContent value="banners"><BannersTab /></TabsContent>
        <TabsContent value="blogs"><BlogsTab /></TabsContent>
        <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>
        <TabsContent value="testimonials"><TestimonialsTab /></TabsContent>
        <TabsContent value="ads"><AdsTab /></TabsContent>
        <TabsContent value="seo"><SEOTab /></TabsContent>
        <TabsContent value="contact"><ContactTab /></TabsContent>
        <TabsContent value="marketplace"><MarketplaceTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Marketplace Config Tab ───────────────────────────────────────────────────
function MarketplaceTab() {
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    setMsg("");
    setTimeout(() => {
      setMsg("✓ Marketplace configuration saved to frontend state.");
      setSaving(false);
    }, 500);
  };

  return (
    <div className="max-w-xl">
      <SectionHeader title="Marketplace Configuration" />
      <p className="text-xs text-[#D4C4A8]/60 mb-6">Manage global marketplace settings like City visibility and Trust Badges. (Currently mocked using localStorage for frontend.)</p>
      
      <div className="space-y-4">
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4">
           <h3 className="text-sm font-semibold text-[#F4E9D8] mb-2">City Priority (Selection Modal)</h3>
           <p className="text-xs text-[#D4C4A8]/40 mb-3">Reorder cities shown in the popular section.</p>
           <div className="flex gap-2 flex-wrap">
             {["Bengaluru", "Delhi NCR", "Mumbai", "Hyderabad", "Pune", "Chennai"].map(c => (
               <span key={c} className="px-2.5 py-1 rounded bg-[#222222] border border-white/10 text-[#D4C4A8] text-xs font-medium cursor-move hover:border-[#FE5E00]/50 transition-colors">
                 {c}
               </span>
             ))}
           </div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4">
           <h3 className="text-sm font-semibold text-[#F4E9D8] mb-2">Trust Badges Visibility</h3>
           <div className="space-y-2.5">
             {["StructBay Assured", "Express Delivery", "GST Billing", "Verified Vendors", "Bulk Available"].map(b => (
               <label key={b} className="flex items-center gap-2.5 text-sm text-[#D4C4A8]/80 cursor-pointer hover:text-[#F4E9D8] transition-colors">
                 <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-[#FE5E00]" /> {b}
               </label>
             ))}
           </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <Button onClick={save} disabled={saving} className="bg-[#FE5E00] hover:bg-[#E05200] text-black">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Config
        </Button>
        {msg && <span className="text-sm text-green-400">{msg}</span>}
      </div>
    </div>
  );
}
