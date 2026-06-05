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
import { AlertCircle, Edit } from "lucide-react";

const inventoryData = [
  {
    id: 1,
    product: "Cement PPC 53 Grade",
    city: "Bengaluru",
    currentStock: 450,
    reservedStock: 80,
    availableStock: 370,
    status: "In Stock",
  },
  {
    id: 2,
    product: "TMT Steel Bars 16mm",
    city: "Bengaluru",
    currentStock: 85,
    reservedStock: 45,
    availableStock: 40,
    status: "Low Stock",
  },
  {
    id: 3,
    product: "Ready Mix Concrete M30",
    city: "Hyderabad",
    currentStock: 0,
    reservedStock: 0,
    availableStock: 0,
    status: "Out of Stock",
  },
  {
    id: 4,
    product: "Red Clay Bricks",
    city: "Chennai",
    currentStock: 5000,
    reservedStock: 1200,
    availableStock: 3800,
    status: "In Stock",
  },
];

export function InventoryManagement() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-[#F4E9D8]">Inventory Management</h1>
        <p className="text-[#D4C4A8]/60">City-wise inventory tracking and stock management</p>
      </div>

      {/* Stock Alerts */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">450</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#F97316]">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-400">3</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product}</TableCell>
                  <TableCell>{item.city}</TableCell>
                  <TableCell>{item.currentStock}</TableCell>
                  <TableCell className="text-[#D4C4A8]/60">{item.reservedStock}</TableCell>
                  <TableCell className="font-medium">{item.availableStock}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === "Out of Stock"
                          ? "destructive"
                          : item.status === "Low Stock"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {item.status === "Out of Stock" && (
                        <AlertCircle className="mr-1 h-3 w-3" />
                      )}
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
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
