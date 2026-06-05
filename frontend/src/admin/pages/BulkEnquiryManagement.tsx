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
import { Eye, FileText, UserPlus } from "lucide-react";

const enquiries = [
  {
    id: "BLK-001",
    customer: "Metro Construction Ltd",
    requirement: "Bulk cement and steel for metro project",
    files: 3,
    assignedTo: null,
    status: "New",
    date: "2026-06-04",
  },
  {
    id: "BLK-002",
    customer: "Smart City Developers",
    requirement: "Complete material supply for township",
    files: 5,
    assignedTo: "Amit Singh",
    status: "In Progress",
    date: "2026-06-03",
  },
  {
    id: "BLK-003",
    customer: "Highway Projects Inc",
    requirement: "Road construction materials",
    files: 2,
    assignedTo: "Priya Sharma",
    status: "Quoted",
    date: "2026-06-01",
  },
];

export function BulkEnquiryManagement() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-[#F4E9D8]">Bulk Enquiry Management</h1>
        <p className="text-[#D4C4A8]/60">Manage large-scale project enquiries</p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
              Total Enquiries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
              New Enquiries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#F97316]">15</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#C9A227]">32</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#D4C4A8]/60">
              Converted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-green-400">31</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Enquiries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enquiry ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead>Files</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquiries.map((enquiry) => (
                <TableRow key={enquiry.id}>
                  <TableCell className="font-mono font-medium">{enquiry.id}</TableCell>
                  <TableCell className="font-medium">{enquiry.customer}</TableCell>
                  <TableCell className="max-w-xs truncate">{enquiry.requirement}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4 text-[#D4C4A8]/40" />
                      <span>{enquiry.files}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {enquiry.assignedTo ? (
                      <span className="text-sm">{enquiry.assignedTo}</span>
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
                        enquiry.status === "Quoted"
                          ? "default"
                          : enquiry.status === "New"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {enquiry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{enquiry.date}</TableCell>
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
