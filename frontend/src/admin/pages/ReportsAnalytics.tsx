import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const revenueData = [
  { month: "Jan", revenue: 45000 },
  { month: "Feb", revenue: 52000 },
  { month: "Mar", revenue: 48000 },
  { month: "Apr", revenue: 61000 },
  { month: "May", revenue: 55000 },
  { month: "Jun", revenue: 67000 },
];

const categoryData = [
  { category: "Cement", sales: 28000 },
  { category: "Steel", sales: 22000 },
  { category: "Concrete", sales: 17000 },
  { category: "Bricks", sales: 12000 },
];

export function ReportsAnalytics() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-[#F4E9D8]">Reports & Analytics</h1>
        <p className="text-[#D4C4A8]/60">Comprehensive business insights and reports</p>
      </div>

      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="gst">GST</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹67,000</div>
                <p className="text-sm text-green-400">+12.5% vs last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
                  Average Order Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹37,222</div>
                <p className="text-sm text-[#D4C4A8]/60">180 orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
                  Best Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">June 2026</div>
                <p className="text-sm text-[#D4C4A8]/60">₹67,000</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "Cement PPC 53 Grade", sales: 145 },
                    { name: "TMT Steel Bars 16mm", sales: 98 },
                    { name: "Ready Mix Concrete M30", sales: 67 },
                  ].map((product, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-sm">{product.name}</span>
                      <span className="font-medium">{product.sales} units</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Low Stock Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "TMT Steel Bars 16mm", stock: 40 },
                    { name: "Cement OPC 43 Grade", stock: 28 },
                    { name: "Ready Mix Concrete M30", stock: 0 },
                  ].map((product, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-sm">{product.name}</span>
                      <span
                        className={`font-medium ${
                          product.stock === 0 ? "text-red-400" : "text-[#F97316]"
                        }`}
                      >
                        {product.stock} units
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "ABC Suppliers Pvt Ltd", orders: 145, rating: 4.5, revenue: "₹18.5L" },
                  { name: "XYZ Distributors", orders: 98, rating: 4.2, revenue: "₹12.8L" },
                  { name: "PQR Materials Ltd", orders: 67, rating: 4.8, revenue: "₹9.2L" },
                ].map((vendor, i) => (
                  <div key={i} className="border-b pb-3 last:border-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{vendor.name}</h4>
                        <p className="text-sm text-[#D4C4A8]/60">Rating: {vendor.rating}/5</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{vendor.revenue}</p>
                        <p className="text-sm text-[#D4C4A8]/60">{vendor.orders} orders</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gst" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download GST Report
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
                  Total GST Collected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹12.06L</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
                  GST @ 18%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹10.8L</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
                  GST @ 12%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹1.26L</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
