import { Button } from "@shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { Plus, Edit, Award } from "lucide-react";

const brands = [
  {
    id: 1,
    name: "UltraTech",
    logo: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100&h=100&fit=crop",
    products: 48,
    categories: ["Cement", "Concrete"],
    status: "Active",
  },
  {
    id: 2,
    name: "TATA Steel",
    logo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop",
    products: 32,
    categories: ["Steel"],
    status: "Active",
  },
  {
    id: 3,
    name: "ACC",
    logo: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=100&h=100&fit=crop",
    products: 25,
    categories: ["Cement"],
    status: "Active",
  },
  {
    id: 4,
    name: "Ambuja",
    logo: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=100&h=100&fit=crop",
    products: 18,
    categories: ["Cement"],
    status: "Active",
  },
];

export function BrandManagement() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#F4E9D8]">Brand Management</h1>
          <p className="text-[#D4C4A8]/60">Manage product brands and manufacturers</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Brand
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {brands.map((brand) => (
          <Card key={brand.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="h-12 w-12 rounded object-cover"
                />
                <div className="flex-1">
                  <CardTitle className="text-base">{brand.name}</CardTitle>
                  <Badge variant="outline" className="mt-1">
                    {brand.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-[#D4C4A8]/60">Products</p>
                  <p className="text-lg font-semibold">{brand.products}</p>
                </div>
                <div>
                  <p className="text-sm text-[#D4C4A8]/60 mb-1">Categories</p>
                  <div className="flex flex-wrap gap-1">
                    {brand.categories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Brand
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
