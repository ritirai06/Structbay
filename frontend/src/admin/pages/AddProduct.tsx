import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import { Checkbox } from "@shared/components/ui/checkbox";
import { ArrowLeft, Upload } from "lucide-react";

export function AddProduct() {
  const navigate = useNavigate();
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/products")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
        <h1 className="text-3xl font-black text-[#F4E9D8]">Add Product</h1>
        <p className="text-[#D4C4A8]/60">Create a new product in your catalog</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productName">Product Name *</Label>
                <Input
                  id="productName"
                  placeholder="e.g., Cement PPC 53 Grade"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    placeholder="e.g., CEM-PPC-53-001"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gst">GST Percentage *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select GST" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="28">28%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cement">Cement</SelectItem>
                      <SelectItem value="steel">Steel</SelectItem>
                      <SelectItem value="concrete">Concrete</SelectItem>
                      <SelectItem value="bricks">Bricks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">Brand *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ultratech">UltraTech</SelectItem>
                      <SelectItem value="acc">ACC</SelectItem>
                      <SelectItem value="ambuja">Ambuja</SelectItem>
                      <SelectItem value="tata">TATA Steel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description</Label>
                <Textarea
                  id="shortDescription"
                  placeholder="Brief product description (max 200 characters)"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Full Description</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed product description, features, and specifications"
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Product Images</Label>
                <div className="border-2 border-dashed border-white/15 rounded-lg p-8 text-center hover:border-[#F97316]/40 transition-colors">
                  <Upload className="mx-auto h-12 w-12 text-[#D4C4A8]/30 mb-4" />
                  <p className="text-sm text-[#D4C4A8]/60 mb-2">
                    Drop images here or click to upload
                  </p>
                  <Button variant="outline" size="sm">
                    Choose Files
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Documents (PDF)</Label>
                <div className="border-2 border-dashed border-white/15 rounded-lg p-6 text-center hover:border-[#F97316]/40 transition-colors">
                  <Button variant="outline" size="sm">
                    Upload Documents
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Relationships</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cross-Sell Products</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select related products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">TMT Steel Bars</SelectItem>
                    <SelectItem value="2">Ready Mix Concrete</SelectItem>
                    <SelectItem value="3">Red Clay Bricks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Upsell Products</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select premium alternatives" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Premium Cement PPC 53 Grade</SelectItem>
                    <SelectItem value="2">High-Grade TMT Bars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Product Status</Label>
                <Select defaultValue="draft">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="assured" />
                <label
                  htmlFor="assured"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  StructBay Assured
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="express" />
                <label
                  htmlFor="express"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  StructBay Express
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>FAQs</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Add FAQ
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button className="w-full">Publish Product</Button>
            <Button variant="outline" className="w-full">
              Save as Draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
