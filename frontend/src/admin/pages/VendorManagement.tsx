import { Button } from "@shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import { Badge } from "@shared/components/ui/badge";
import { Plus, Eye, Star } from "lucide-react";

const vendors = [
  {
    id: 1,
    name: "ABC Suppliers Pvt Ltd",
    city: "Bengaluru",
    category: "Cement",
    rating: 4.5,
    totalOrders: 145,
    status: "Active",
    phone: "+91 98765 43210",
  },
  {
    id: 2,
    name: "XYZ Distributors",
    city: "Hyderabad",
    category: "Steel",
    rating: 4.2,
    totalOrders: 98,
    status: "Active",
    phone: "+91 98765 43211",
  },
  {
    id: 3,
    name: "PQR Materials Ltd",
    city: "Chennai",
    category: "Concrete",
    rating: 4.8,
    totalOrders: 67,
    status: "Active",
    phone: "+91 98765 43212",
  },
  {
    id: 4,
    name: "LMN Enterprises",
    city: "Bengaluru",
    category: "Bricks",
    rating: 3.9,
    totalOrders: 54,
    status: "Inactive",
    phone: "+91 98765 43213",
  },
];

export function VendorManagement() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#F4E9D8]">Vendor Management</h1>
          <p className="text-[#D4C4A8]/60">Manage suppliers and vendor partnerships</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
              Total Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">38</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
              Active Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-green-400">35</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              4.3 <Star className="h-5 w-5 fill-[#C9A227] text-[#C9A227]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">364</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>{vendor.city}</TableCell>
                  <TableCell>{vendor.category}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-[#C9A227] text-[#C9A227]" />
                      <span className="font-medium">{vendor.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell>{vendor.totalOrders}</TableCell>
                  <TableCell className="text-sm">{vendor.phone}</TableCell>
                  <TableCell>
                    <Badge
                      variant={vendor.status === "Active" ? "default" : "secondary"}
                    >
                      {vendor.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
