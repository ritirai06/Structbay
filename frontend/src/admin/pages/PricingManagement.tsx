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
import { Edit } from "lucide-react";

const pricingData = [
  {
    id: 1,
    product: "Cement PPC 53 Grade",
    city: "Bengaluru",
    mrp: 450,
    salePrice: 420,
    wholesaleSlabs: [
      { qty: "10+", price: 410 },
      { qty: "50+", price: 395 },
      { qty: "100+", price: 380 },
    ],
    gst: 18,
    status: "Active",
  },
  {
    id: 2,
    product: "TMT Steel Bars 16mm",
    city: "Bengaluru",
    mrp: 65,
    salePrice: 62,
    wholesaleSlabs: [
      { qty: "100+", price: 60 },
      { qty: "500+", price: 58 },
      { qty: "1000+", price: 55 },
    ],
    gst: 18,
    status: "Active",
  },
  {
    id: 3,
    product: "Ready Mix Concrete M30",
    city: "Hyderabad",
    mrp: 5500,
    salePrice: 5200,
    wholesaleSlabs: [
      { qty: "10+", price: 5100 },
      { qty: "25+", price: 5000 },
    ],
    gst: 18,
    status: "Active",
  },
];

export function PricingManagement() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Pricing Management</h1>
        <p className="text-gray-500">Manage city-wise product pricing and wholesale slabs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>City</TableHead>
                <TableHead>MRP</TableHead>
                <TableHead>Sale Price</TableHead>
                <TableHead>Wholesale Slabs</TableHead>
                <TableHead>GST %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricingData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product}</TableCell>
                  <TableCell>{item.city}</TableCell>
                  <TableCell>₹{item.mrp}</TableCell>
                  <TableCell className="font-medium text-green-600">
                    ₹{item.salePrice}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {item.wholesaleSlabs.map((slab, idx) => (
                        <div key={idx} className="text-xs">
                          <span className="text-gray-600">{slab.qty}:</span>{" "}
                          <span className="font-medium">₹{slab.price}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{item.gst}%</TableCell>
                  <TableCell>
                    <Badge variant="default">{item.status}</Badge>
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
