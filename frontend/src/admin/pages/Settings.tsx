import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Switch } from "@shared/components/ui/switch";
import { getApiV1Base } from "../../lib/apiBase";
import { getAdminToken, adminFetch } from "../../lib/adminApi";

export function Settings() {
  const [minimumOrderValue, setMinimumOrderValue] = useState<string>("2000");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Fetch commerce settings on mount
  useEffect(() => {
    const fetchCommerceSettings = async () => {
      try {
        const data = await adminFetch<{ minimumOrderValue: number }>('/admin/cms/commerce-settings');
        if (data.success && data.data) {
          setMinimumOrderValue(data.data.minimumOrderValue.toString());
        }
      } catch (error) {
        console.error('Failed to fetch commerce settings:', error);
      }
    };
    fetchCommerceSettings();
  }, []);

  const handleSaveCommerceSettings = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const value = parseInt(minimumOrderValue, 10);
      if (isNaN(value) || value < 0) {
        setMessage({ type: 'error', text: 'Please enter a valid positive number.' });
        setLoading(false);
        return;
      }
      const data = await adminFetch('/admin/cms/commerce-settings', {
        method: 'PUT',
        body: JSON.stringify({ minimumOrderValue: value }),
      });
      if (data.success) {
        setMessage({ type: 'success', text: 'Commerce settings saved successfully.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="admin-page-title text-sb-ink">Settings</h1>
        <p className="text-sb-ink/55">Configure system settings and preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="commerce">Commerce</TabsTrigger>
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
                <Input id="siteName" defaultValue="Structbay" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input id="supportEmail" defaultValue="support@structbay.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportPhone">Support Phone</Label>
                <Input id="supportPhone" defaultValue="+91 70905 70505" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commerce" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Commerce Settings</CardTitle>
              <CardDescription>Configure order and checkout rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {message && (
                <div className={`p-3 rounded-md text-sm ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {message.text}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="minimumOrderValue">Minimum Order Value (₹)</Label>
                <Input 
                  id="minimumOrderValue" 
                  type="number"
                  min="0"
                  step="100"
                  value={minimumOrderValue}
                  onChange={(e) => setMinimumOrderValue(e.target.value)}
                  placeholder="2000"
                />
                <p className="text-sm text-sb-ink/55">
                  Customers cannot checkout until their cart total reaches this amount.
                </p>
              </div>
              <Button 
                onClick={handleSaveCommerceSettings} 
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Commerce Settings'}
              </Button>
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
