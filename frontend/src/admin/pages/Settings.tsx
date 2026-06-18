import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Switch } from "@shared/components/ui/switch";

export function Settings() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="admin-page-title text-sb-ink">Settings</h1>
        <p className="text-sb-ink/55">Configure system settings and preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input id="siteName" defaultValue="StructBay" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input id="supportEmail" defaultValue="support@structbay.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportPhone">Support Phone</Label>
                <Input id="supportPhone" defaultValue="+91 1800 123 4567" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input id="smtpHost" placeholder="smtp.gmail.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input id="smtpPort" placeholder="587" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpUser">SMTP Username</Label>
                <Input id="smtpUser" placeholder="your-email@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPass">SMTP Password</Label>
                <Input id="smtpPass" type="password" placeholder="••••••••" />
              </div>
              <Button>Save Configuration</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sb-ink">Order Notifications</p>
                  <p className="text-sm text-sb-ink/55">Get notified when new orders arrive</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sb-ink">Low Stock Alerts</p>
                  <p className="text-sm text-sb-ink/55">Alerts when inventory is running low</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sb-ink">RFQ Notifications</p>
                  <p className="text-sm text-sb-ink/55">Get notified about new RFQ requests</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sb-ink">Daily Reports</p>
                  <p className="text-sm text-sb-ink/55">Receive daily business summary</p>
                </div>
                <Switch />
              </div>
              <Button>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateway Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="razorpayKey">Razorpay API Key</Label>
                <Input id="razorpayKey" placeholder="rzp_test_..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="razorpaySecret">Razorpay Secret Key</Label>
                <Input id="razorpaySecret" type="password" placeholder="••••••••" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sb-ink">Test Mode</p>
                  <p className="text-sm text-sb-ink/55">Use test credentials</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input id="gstNumber" placeholder="29XXXXXXXXXXXZX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="panNumber">PAN Number</Label>
                <Input id="panNumber" placeholder="XXXXX9999X" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sb-ink">GST Inclusive Pricing</p>
                  <p className="text-sm text-sb-ink/55">Show prices inclusive of GST</p>
                </div>
                <Switch />
              </div>
              <Button>Save Tax Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
