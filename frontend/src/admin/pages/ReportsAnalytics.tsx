import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Download, FileSpreadsheet, Loader2, RefreshCw } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { adminFetch, getAdminToken } from "../../lib/adminApi";
import { getApiV1Base } from "../../lib/apiBase";

function money(n: number) {
  return `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
}

async function downloadCsv(path: string, filename: string) {
  const base = getApiV1Base().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${getAdminToken()}` } });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ReportsAnalytics() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [vendorSummary, setVendorSummary] = useState<any>(null);
  const [vendorRank, setVendorRank] = useState<any[]>([]);
  const [gstRows, setGstRows] = useState<any[]>([]);
  const [paySummary, setPaySummary] = useState<any>(null);
  const [invoiceAgg, setInvoiceAgg] = useState<any[]>([]);
  const [delivery, setDelivery] = useState<any>(null);
  const [orderSummary, setOrderSummary] = useState<any>(null);
  const [invoiceStatusRows, setInvoiceStatusRows] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const appendRange = useCallback((path: string) => {
    if (!dateFrom && !dateTo) return path;
    const p = new URLSearchParams();
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    return `${path}${path.includes("?") ? "&" : "?"}${p.toString()}`;
  }, [dateFrom, dateTo]);

  const rangeQs = useMemo(() => {
    const p = new URLSearchParams();
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    const s = p.toString();
    return s ? `&${s}` : "";
  }, [dateFrom, dateTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [
        kpiRes,
        sumRes,
        trendRes,
        prodRes,
        brandRes,
        catRes,
        cityRes,
        vsumRes,
        vrankRes,
        gstRes,
        payRes,
        invRes,
        delRes,
        ordSumRes,
        invStatRes,
      ] = await Promise.all([
        adminFetch("/analytics/kpi"),
        adminFetch(appendRange("/analytics/sales/summary")),
        adminFetch("/analytics/sales/trend?period=monthly"),
        adminFetch(appendRange("/analytics/sales/top-products?limit=10")),
        adminFetch(appendRange("/analytics/brands?limit=12")),
        adminFetch(appendRange("/analytics/categories?limit=12")),
        adminFetch(appendRange("/analytics/cities")),
        adminFetch("/analytics/vendors/summary"),
        adminFetch(appendRange("/analytics/vendors/ranking?limit=10")),
        adminFetch("/analytics/payments/gst?period=monthly"),
        adminFetch(appendRange("/analytics/payments/summary")),
        adminFetch("/analytics/payments/invoices"),
        adminFetch("/analytics/delivery/summary"),
        adminFetch(appendRange("/reports/orders/summary")),
        adminFetch("/reports/orders/invoice-status"),
      ]);
      setKpi(kpiRes.data);
      setSalesSummary(sumRes.data);
      setTrend(Array.isArray(trendRes.data) ? trendRes.data : []);
      setTopProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      setBrands(Array.isArray(brandRes.data) ? brandRes.data : []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setCities(Array.isArray(cityRes.data) ? cityRes.data : []);
      setVendorSummary(vsumRes.data);
      setVendorRank(Array.isArray(vrankRes.data) ? vrankRes.data : []);
      setGstRows(Array.isArray(gstRes.data) ? gstRes.data : []);
      setPaySummary(payRes.data);
      setInvoiceAgg(Array.isArray(invRes.data) ? invRes.data : []);
      setDelivery(delRes.data);
      setOrderSummary(ordSumRes.data);
      setInvoiceStatusRows(Array.isArray(invStatRes.data) ? invStatRes.data : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [appendRange]);

  useEffect(() => { load(); }, [load]);

  const trendChart = trend.map((r: any) => ({
    label: r._id?.month && r._id?.year ? `${r._id.month}/${String(r._id.year).slice(-2)}` : "—",
    revenue: Math.round(r.revenue || 0),
  }));

  return (
    <div className="admin-page">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="admin-page-title text-sb-ink">Reports</h1>
          <p className="text-sb-ink/55 text-sm mt-1">
            Live data from analytics APIs: sales, GST, payments, invoices, delivery, vendors, brands, categories, and cities.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-[10px] text-sb-ink/50 uppercase font-semibold block mb-1">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="bg-sb-cream-secondary border border-sb-ink/10 rounded-lg px-2 py-1.5 text-sm text-sb-ink" />
          </div>
          <div>
            <label className="text-[10px] text-sb-ink/50 uppercase font-semibold block mb-1">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="bg-sb-cream-secondary border border-sb-ink/10 rounded-lg px-2 py-1.5 text-sm text-sb-ink" />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCsv(`/analytics/export/orders?format=csv${rangeQs}`, "orders.csv")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Orders CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCsv(`/analytics/export/vendor-orders?format=csv${rangeQs}`, "vendor-orders.csv")}>
            <Download className="mr-2 h-4 w-4" /> Vendor orders CSV
          </Button>
          <Link to="/admin/invoices" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-sb-ink/10 bg-sb-cream-secondary text-sm text-sb-orange hover:underline">
            Invoice reports →
          </Link>
        </div>
      </div>

      {err && (
        <div className="mb-4 text-sm text-sb-ink/55 border border-sb-ink/18 rounded-xl px-4 py-3 bg-sb-cream-secondary">{err}</div>
      )}

      {loading && !kpi ? (
        <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-sb-orange" /></div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-sb-cream-secondary p-1 rounded-xl border border-sb-ink/10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales & products</TabsTrigger>
            <TabsTrigger value="dimensions">Brand / category / city</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="gst">GST & payments</TabsTrigger>
            <TabsTrigger value="ops">Dispatch & invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-sb-ink/55">Total sales revenue (paid orders, all time)</CardTitle></CardHeader>
                <CardContent><div className="admin-stat-value text-sb-ink">{money(kpi?.totalRevenue)}</div></CardContent>
              </Card>
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-sb-ink/55">Pending master orders</CardTitle></CardHeader>
                <CardContent><div className="admin-stat-value text-sb-orange">{kpi?.pendingOrders ?? "—"}</div></CardContent>
              </Card>
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-sb-ink/55">Vendor sub-orders assigned</CardTitle></CardHeader>
                <CardContent><div className="admin-stat-value text-sb-ink">{kpi?.vendorOrdersAssigned ?? "—"}</div></CardContent>
              </Card>
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-sb-ink/55">Shipments pending pickup</CardTitle></CardHeader>
                <CardContent><div className="admin-stat-value text-sb-ink">{delivery?.pending ?? "—"}</div></CardContent>
              </Card>
            </div>
            <Card className="border-sb-ink/10 bg-sb-cream-secondary">
              <CardHeader><CardTitle className="text-sb-ink">Paid revenue trend (monthly)</CardTitle></CardHeader>
              <CardContent className="h-[320px]">
                {trendChart.length === 0 ? (
                  <p className="text-sm text-sb-ink/50">No trend data for the selected window.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="label" tick={{ fill: "rgba(34,34,34,0.5)", fontSize: 11 }} />
                      <YAxis tick={{ fill: "rgba(34,34,34,0.5)", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                      <Line type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-sb-ink/55">Revenue (range filter default)</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold">{money(salesSummary?.revenue)}</div><p className="text-xs text-sb-ink/50 mt-1">{salesSummary?.orders ?? 0} orders</p></CardContent>
              </Card>
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-sb-ink/55">GST on orders</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold">{money(salesSummary?.gstTotal)}</div></CardContent>
              </Card>
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-sb-ink/55">Avg order value</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold">{money(salesSummary?.avgOrderValue)}</div></CardContent>
              </Card>
            </div>
            <Card className="border-sb-ink/10 bg-sb-cream-secondary">
              <CardHeader><CardTitle className="text-sb-ink">Top products by line revenue</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts.slice(0, 8).map((p: any) => ({ name: (p.name || "Product").slice(0, 18), revenue: Math.round(p.revenue || 0) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" tick={{ fill: "rgba(34,34,34,0.5)", fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
                    <YAxis tick={{ fill: "rgba(34,34,34,0.5)", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                    <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dimensions" className="grid md:grid-cols-3 gap-4">
            <Card className="border-sb-ink/10 bg-sb-cream-secondary">
              <CardHeader><CardTitle className="text-sb-ink text-sm">Brand-wise sales</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto text-sm">
                {brands.map((b: any) => (
                  <div key={String(b._id)} className="flex justify-between gap-2 border-b border-sb-ink/8 pb-2">
                    <span className="text-sb-ink/70 truncate">{b.brand?.name || "—"}</span>
                    <span className="text-sb-ink font-semibold shrink-0">{money(b.revenue)}</span>
                  </div>
                ))}
                {brands.length === 0 && <p className="text-sb-ink/50 text-xs">No brand data.</p>}
              </CardContent>
            </Card>
            <Card className="border-sb-ink/10 bg-sb-cream-secondary">
              <CardHeader><CardTitle className="text-sb-ink text-sm">Category-wise sales</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto text-sm">
                {categories.map((c: any) => (
                  <div key={String(c._id)} className="flex justify-between gap-2 border-b border-sb-ink/8 pb-2">
                    <span className="text-sb-ink/70 truncate">{c.category?.name || "—"}</span>
                    <span className="text-sb-ink font-semibold shrink-0">{money(c.revenue)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-sb-ink/10 bg-sb-cream-secondary">
              <CardHeader><CardTitle className="text-sb-ink text-sm">City-wise sales</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto text-sm">
                {cities.map((c: any) => (
                  <div key={String(c._id)} className="flex justify-between gap-2 border-b border-sb-ink/8 pb-2">
                    <span className="text-sb-ink/70 truncate">{c.city?.name || "—"}</span>
                    <span className="text-sb-ink font-semibold shrink-0">{money(c.revenue)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader><CardTitle className="text-sm text-sb-ink/55">Vendor directory</CardTitle></CardHeader>
                <CardContent className="text-sm text-sb-ink/70 space-y-2">
                  <p>Total: <strong className="text-sb-ink">{vendorSummary?.total ?? 0}</strong></p>
                  <p>Active: <strong className="text-sb-ink">{vendorSummary?.active ?? 0}</strong></p>
                  <p>Pending verification: <strong className="text-sb-orange">{vendorSummary?.pending ?? 0}</strong></p>
                  <p>Inactive: <strong className="text-sb-ink">{vendorSummary?.inactive ?? 0}</strong></p>
                </CardContent>
              </Card>
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader><CardTitle className="text-sm text-sb-ink">Top vendors</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm max-h-80 overflow-y-auto">
                  {vendorRank.map((v: any, i: number) => (
                    <div key={i} className="flex justify-between border-b border-sb-ink/8 pb-2">
                      <span className="text-sb-ink/70">{v.vendor?.companyName || v.vendor?.contactPerson || "—"}</span>
                      <span className="text-sb-ink font-medium">{money(v.revenue)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="gst" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader><CardTitle className="text-sm text-sb-ink">GST accrual by period (from paid orders)</CardTitle></CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gstRows.slice(-12).map((r: any) => ({
                      label: r._id?.month ? `M${r._id.month}` : "—",
                      gst: Math.round(r.gst || 0),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="label" tick={{ fill: "rgba(34,34,34,0.5)", fontSize: 10 }} />
                      <YAxis tick={{ fill: "rgba(34,34,34,0.5)", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                      <Bar dataKey="gst" fill="#E85A00" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader><CardTitle className="text-sm text-sb-ink">Payment gateway summary</CardTitle></CardHeader>
                <CardContent className="text-sm text-sb-ink/70 space-y-2">
                  <p>Paid: <strong className="text-sb-ink">{money(paySummary?.totalCollected)}</strong> ({paySummary?.countPaid ?? 0} txns)</p>
                  <p>Pending: <strong className="text-sb-ink">{money(paySummary?.totalPending)}</strong></p>
                  <p>Failed: <strong className="text-sb-ink">{money(paySummary?.totalFailed)}</strong></p>
                  <p>Refunded: <strong className="text-sb-ink">{money(paySummary?.totalRefunded)}</strong></p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ops" className="space-y-4">
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader><CardTitle className="text-sm text-sb-ink">Pending orders</CardTitle></CardHeader>
                <CardContent className="text-sm text-sb-ink/70 space-y-1">
                  <p className="admin-stat-value text-sb-orange tabular-nums">
                    {(orderSummary?.byStatus?.PENDING ?? 0) + (orderSummary?.byStatus?.VENDOR_ASSIGNMENT_PENDING ?? 0) + (orderSummary?.byStatus?.PROCESSING ?? 0)}
                  </p>
                  <p>PENDING: <strong>{orderSummary?.byStatus?.PENDING ?? 0}</strong></p>
                  <p>VENDOR_ASSIGNMENT: <strong>{orderSummary?.byStatus?.VENDOR_ASSIGNMENT_PENDING ?? 0}</strong></p>
                  <p>PROCESSING: <strong>{orderSummary?.byStatus?.PROCESSING ?? 0}</strong></p>
                  <Link to="/admin/orders" className="text-xs text-sb-orange hover:underline inline-block mt-2">Open order management →</Link>
                </CardContent>
              </Card>
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader><CardTitle className="text-sm text-sb-ink">Pending dispatch</CardTitle></CardHeader>
                <CardContent className="text-sm text-sb-ink/70 space-y-1">
                  <p className="admin-stat-value text-sb-orange tabular-nums">{delivery?.pending ?? 0}</p>
                  <p>Ready for dispatch: <strong>{orderSummary?.byStatus?.READY_FOR_DISPATCH ?? 0}</strong></p>
                  <p>Partially dispatched: <strong>{orderSummary?.byStatus?.PARTIALLY_DISPATCHED ?? 0}</strong></p>
                  <Link to="/admin/dispatch" className="text-xs text-sb-orange hover:underline inline-block mt-2">Open dispatch →</Link>
                </CardContent>
              </Card>
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader><CardTitle className="text-sm text-sb-ink">Delivery / dispatch</CardTitle></CardHeader>
                <CardContent className="text-sm text-sb-ink/70 space-y-1">
                  <p>Total shipments: <strong className="text-sb-ink">{delivery?.total ?? 0}</strong></p>
                  <p>In transit: <strong className="text-sb-ink">{delivery?.inTransit ?? 0}</strong></p>
                  <p>Delivered: <strong className="text-sb-orange">{delivery?.delivered ?? 0}</strong></p>
                </CardContent>
              </Card>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader><CardTitle className="text-sm text-sb-ink">Vendor invoice status</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2 max-h-56 overflow-y-auto">
                  {invoiceStatusRows.length === 0 ? <p className="text-sb-ink/50">No data.</p> : invoiceStatusRows.map((row: any) => (
                    <div key={String(row._id)} className="flex justify-between border-b border-sb-ink/8 pb-2">
                      <span className="text-sb-ink/70 capitalize">{String(row._id || "unknown").toLowerCase()}</span>
                      <span className="font-semibold text-sb-ink">{row.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-sb-ink/10 bg-sb-cream-secondary">
                <CardHeader><CardTitle className="text-sm text-sb-ink">Uploaded documents (invoices / e-way)</CardTitle></CardHeader>
                <CardContent className="text-xs font-mono text-sb-ink/65 max-h-56 overflow-y-auto">
                  {invoiceAgg.length === 0 ? <p>No document aggregates.</p> : invoiceAgg.map((row: any, i: number) => (
                    <div key={i} className="border-b border-sb-ink/8 py-1">{JSON.stringify(row._id)} → {row.count}</div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
