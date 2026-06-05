import { Button } from "@shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { Switch } from "@shared/components/ui/switch";
import { MapPin, Plus } from "lucide-react";

const cities = [
  {
    id: 1,
    name: "Bengaluru",
    state: "Karnataka",
    active: true,
    vendors: 18,
    products: 450,
    orders: 1250,
  },
  {
    id: 2,
    name: "Hyderabad",
    state: "Telangana",
    active: true,
    vendors: 12,
    products: 420,
    orders: 980,
  },
  {
    id: 3,
    name: "Chennai",
    state: "Tamil Nadu",
    active: true,
    vendors: 8,
    products: 380,
    orders: 750,
  },
];

export function CityManagement() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#F4E9D8]">City Management</h1>
          <p className="text-[#D4C4A8]/60">Manage serviceable cities and operations</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add City
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cities.map((city) => (
          <Card key={city.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#F97316]" />
                  <CardTitle>{city.name}</CardTitle>
                </div>
                <Switch checked={city.active} />
              </div>
              <p className="text-sm text-[#D4C4A8]/60">{city.state}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#D4C4A8]/60">Status</span>
                  <Badge variant={city.active ? "default" : "secondary"}>
                    {city.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="text-center">
                    <p className="text-xl font-bold">{city.vendors}</p>
                    <p className="text-xs text-[#D4C4A8]/50">Vendors</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">{city.products}</p>
                    <p className="text-xs text-[#D4C4A8]/50">Products</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">{city.orders}</p>
                    <p className="text-xs text-[#D4C4A8]/50">Orders</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  Manage City
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
