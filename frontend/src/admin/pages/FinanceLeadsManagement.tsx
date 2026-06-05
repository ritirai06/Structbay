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

const financeLeads = [
  {
    id: "FIN-001",
    builder: "Skyline Developers",
    projectValue: "₹50 Cr",
    loanAmount: "₹30 Cr",
    location: "Bengaluru",
    assignedTo: null,
    status: "New",
    date: "2026-06-04",
  },
  {
    id: "FIN-002",
    builder: "Prime Constructions",
    projectValue: "₹75 Cr",
    loanAmount: "₹45 Cr",
    location: "Hyderabad",
    assignedTo: "Suresh Kumar",
    status: "In Progress",
    date: "2026-06-02",
  },
  {
    id: "FIN-003",
    builder: "Urban Homes Ltd",
    projectValue: "₹35 Cr",
    loanAmount: "₹20 Cr",
    location: "Chennai",
    assignedTo: "Deepa Nair",
    status: "Approved",
    date: "2026-05-28",
  },
];

export function FinanceLeadsManagement() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Finance Leads Management</h1>
        <p className="text-gray-500">Manage builder finance and loan requests</p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              New Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">8</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">18</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">19</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finance Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead ID</TableHead>
                <TableHead>Builder</TableHead>
                <TableHead>Project Value</TableHead>
                <TableHead>Loan Amount</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financeLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-mono font-medium">{lead.id}</TableCell>
                  <TableCell className="font-medium">{lead.builder}</TableCell>
                  <TableCell className="font-medium text-blue-600">
                    {lead.projectValue}
                  </TableCell>
                  <TableCell className="font-medium text-green-600">
                    {lead.loanAmount}
                  </TableCell>
                  <TableCell>{lead.location}</TableCell>
                  <TableCell>
                    {lead.assignedTo ? (
                      <span className="text-sm">{lead.assignedTo}</span>
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
                        lead.status === "Approved"
                          ? "default"
                          : lead.status === "New"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{lead.date}</TableCell>
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
