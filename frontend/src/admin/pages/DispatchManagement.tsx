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
import { Button } from "@shared/components/ui/button";
import { Eye, Truck } from "lucide-react";

const dispatches = [
  {
    id: "DSP-001",
    orderId: "ORD-1236",
    customer: "PQR Developers",
    driver: "Rajesh Kumar",
    vehicle: "KA-01-AB-1234",
    status: "Out for Delivery",
    eta: "2026-06-04 16:00",
  },
  {
    id: "DSP-002",
    orderId: "ORD-1235",
    customer: "XYZ Construction",
    driver: "Suresh Reddy",
    vehicle: "TS-09-CD-5678",
    status: "Ready for Dispatch",
    eta: "2026-06-05 10:00",
  },
];

export function DispatchManagement() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dispatch Management</h1>
        <p className="text-gray-500">Track deliveries and dispatch operations</p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ready for Dispatch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Out for Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">30</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Delivered Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">45</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Dispatches</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dispatch ID</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dispatches.map((dispatch) => (
                <TableRow key={dispatch.id}>
                  <TableCell className="font-mono font-medium">{dispatch.id}</TableCell>
                  <TableCell className="font-mono">{dispatch.orderId}</TableCell>
                  <TableCell>{dispatch.customer}</TableCell>
                  <TableCell>{dispatch.driver}</TableCell>
                  <TableCell className="font-mono text-sm">{dispatch.vehicle}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        dispatch.status === "Out for Delivery" ? "default" : "secondary"
                      }
                    >
                      <Truck className="mr-1 h-3 w-3" />
                      {dispatch.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{dispatch.eta}</TableCell>
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
