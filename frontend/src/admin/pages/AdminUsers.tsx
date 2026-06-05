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
import { Plus, Edit, Shield } from "lucide-react";

const adminUsers = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@structbay.com",
    role: "Super Admin",
    status: "Active",
    lastLogin: "2026-06-04 14:30",
  },
  {
    id: 2,
    name: "Rajesh Kumar",
    email: "rajesh@structbay.com",
    role: "Operations Manager",
    status: "Active",
    lastLogin: "2026-06-04 12:15",
  },
  {
    id: 3,
    name: "Priya Sharma",
    email: "priya@structbay.com",
    role: "Sales Manager",
    status: "Active",
    lastLogin: "2026-06-04 09:45",
  },
  {
    id: 4,
    name: "Amit Singh",
    email: "amit@structbay.com",
    role: "Inventory Manager",
    status: "Active",
    lastLogin: "2026-06-03 18:20",
  },
];

const roles = [
  {
    name: "Super Admin",
    permissions: "Full system access",
    users: 1,
  },
  {
    name: "Operations Manager",
    permissions: "Orders, Vendors, Dispatch",
    users: 3,
  },
  {
    name: "Inventory Manager",
    permissions: "Inventory, Pricing",
    users: 2,
  },
  {
    name: "Sales Manager",
    permissions: "Orders, Customers, RFQs",
    users: 4,
  },
];

export function AdminUsers() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-[#F4E9D8]">Admin User Management</h1>
        <p className="text-[#D4C4A8]/60">Manage admin users and permissions</p>
      </div>

      <div className="space-y-6">
        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Admin Users</CardTitle>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{user.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{user.lastLogin}</TableCell>
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

        {/* Roles & Permissions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Roles & Permissions</CardTitle>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Role
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {roles.map((role, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-[#F97316]" />
                        <CardTitle className="text-base">{role.name}</CardTitle>
                      </div>
                      <Badge variant="secondary">{role.users} users</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[#D4C4A8]/60 mb-3">{role.permissions}</p>
                    <Button variant="outline" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Permissions
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
