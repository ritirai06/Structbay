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
import { Eye, UserPlus } from "lucide-react";

const rfqs = [
  {
    id: "RFQ-001",
    customer: "ABC Builders",
    grade: "M30",
    quantity: "50 cu.m",
    location: "Whitefield, Bengaluru",
    status: "Pending",
    assignedTo: null,
    date: "2026-06-04",
  },
  {
    id: "RFQ-002",
    customer: "XYZ Construction",
    grade: "M25",
    quantity: "30 cu.m",
    location: "Hitech City, Hyderabad",
    status: "In Progress",
    assignedTo: "Rajesh Kumar",
    date: "2026-06-03",
  },
  {
    id: "RFQ-003",
    customer: "PQR Developers",
    grade: "M40",
    quantity: "75 cu.m",
    location: "OMR, Chennai",
    status: "Quoted",
    assignedTo: "Priya Sharma",
    date: "2026-06-02",
  },
];

export function RFQManagement() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">RFQ Management</h1>
        <p className="text-gray-500">Manage ready-mix concrete quotation requests</p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total RFQs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">23</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">45</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Converted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">88</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Concrete RFQ Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfqs.map((rfq) => (
                <TableRow key={rfq.id}>
                  <TableCell className="font-mono font-medium">{rfq.id}</TableCell>
                  <TableCell>{rfq.customer}</TableCell>
                  <TableCell className="font-medium">{rfq.grade}</TableCell>
                  <TableCell>{rfq.quantity}</TableCell>
                  <TableCell className="text-sm">{rfq.location}</TableCell>
                  <TableCell>
                    {rfq.assignedTo ? (
                      <span className="text-sm">{rfq.assignedTo}</span>
                    ) : (
                      <Button variant="outline" size="sm">
                        <UserPlus className="mr-2 h-3 w-3" />
                        Assign
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        rfq.status === "Quoted"
                          ? "default"
                          : rfq.status === "Pending"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {rfq.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{rfq.date}</TableCell>
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
