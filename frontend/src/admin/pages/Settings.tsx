import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Switch } from "@shared/components/ui/switch";
import { adminFetch } from "../../lib/adminApi";

export function Settings() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Commerce
  const [minimumOrderValue, setMinimumOrderValue] = useState<string>("2000");

  // General
  const [siteName, setSiteName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");

  // Email
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");

  // Notifications
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [rfqNotifications, setRfqNotifications] = useState(true);
  const [dailyReports, setDailyReports] = useState(false);

  // Payment
  const [razorpayKey, setRazorpayKey] = useState("");
  const [razorpaySecret, setRazorpaySecret] = useState("");
  const [testMode, setTestMode] = useState(true);

  // Tax
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [inclusivePricing, setInclusivePricing] = useState(false);

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
    
    const fetchGlobalSettings = async () => {
      try {
        const data = await adminFetch<any>('/admin/settings');
        if (data.success && data.data) {
          const s = data.data;
          setSiteName(s.siteName || "");
          setSupportEmail(s.supportEmail || "");
          setSupportPhone(s.supportPhone || "");
          setSmtpHost(s.smtpHost || "");
          setSmtpPort(s.smtpPort || "");
          setSmtpUser(s.smtpUser || "");
          setSmtpPass(s.smtpPass || "");
          setOrderNotifications(s.orderNotifications ?? true);
          setLowStockAlerts(s.lowStockAlerts ?? true);
          setRfqNotifications(s.rfqNotifications ?? true);
          setDailyReports(s.dailyReports ?? false);
          setRazorpayKey(s.razorpayKey || "");
          setRazorpaySecret(s.razorpaySecret || "");
          setTestMode(s.testMode ?? true);
          setGstNumber(s.gstNumber || "");
          setPanNumber(s.panNumber || "");
          setInclusivePricing(s.inclusivePricing ?? false);
        }
      } catch (error) {
        console.error('Failed to fetch global settings:', error);
      }
    };

    fetchCommerceSettings();
    fetchGlobalSettings();
  }, []);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveCommerceSettings = async () => {
    setLoading(true);
    try {
      const value = parseInt(minimumOrderValue, 10);
      if (isNaN(value) || value < 0) {
        showMsg('error', 'Please enter a valid positive number.');
        setLoading(false);
        return;
      }
      const data = await adminFetch('/admin/cms/commerce-settings', {
        method: 'PUT',
        body: JSON.stringify({ minimumOrderValue: value }),
      });
      if (data.success) showMsg('success', 'Commerce settings saved successfully.');
      else showMsg('error', 'Failed to save settings.');
    } catch (error: any) {
      showMsg('error', error.message || 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGlobalSettings = async () => {
    setLoading(true);
    try {
      const payload = {
        siteName, supportEmail, supportPhone,
        smtpHost, smtpPort, smtpUser, smtpPass,
        orderNotifications, lowStockAlerts, rfqNotifications, dailyReports,
        razorpayKey, razorpaySecret, testMode,
        gstNumber, panNumber, inclusivePricing
      };
      
      const data = await adminFetch('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (data.success) showMsg('success', 'Settings saved successfully.');
      else showMsg('error', 'Failed to save settings.');
    } catch (error: any) {
      showMsg('error', error.message || 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="admin-page-title text-sb-ink">Settings</h1>
          <p className="text-sb-ink/55">Configure system settings and preferences</p>
        </div>
      </div>
      
      {message && (
        <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

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
                <Input id="siteName" value={siteName} onChange={e => setSiteName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input id="supportEmail" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportPhone">Support Phone</Label>
                <Input id="supportPhone" value={supportPhone} onChange={e => setSupportPhone(e.target.value)} />
              </div>
              <Button onClick={handleSaveGlobalSettings} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
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
              <Button onClick={handleSaveCommerceSettings} disabled={loading}>
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
                <Input id="smtpHost" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input id="smtpPort" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpUser">SMTP Username</Label>
                <Input id="smtpUser" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="your-email@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPass">SMTP Password</Label>
                <Input id="smtpPass" type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="••••••••" />
              </div>
              <Button onClick={handleSaveGlobalSettings} disabled={loading}>
                {loading ? 'Saving...' : 'Save Configuration'}
              </Button>
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
                <Switch checked={orderNotifications} onCheckedChange={setOrderNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sb-ink">Low Stock Alerts</p>
                  <p className="text-sm text-sb-ink/55">Alerts when inventory is running low</p>
                </div>
                <Switch checked={lowStockAlerts} onCheckedChange={setLowStockAlerts} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sb-ink">RFQ Notifications</p>
                  <p className="text-sm text-sb-ink/55">Get notified about new RFQ requests</p>
                </div>
                <Switch checked={rfqNotifications} onCheckedChange={setRfqNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sb-ink">Daily Reports</p>
                  <p className="text-sm text-sb-ink/55">Receive daily business summary</p>
                </div>
                <Switch checked={dailyReports} onCheckedChange={setDailyReports} />
              </div>
              <Button onClick={handleSaveGlobalSettings} disabled={loading}>
                {loading ? 'Saving...' : 'Save Preferences'}
              </Button>
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
                <Input id="razorpayKey" value={razorpayKey} onChange={e => setRazorpayKey(e.target.value)} placeholder="rzp_test_..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="razorpaySecret">Razorpay Secret Key</Label>
                <Input id="razorpaySecret" type="password" value={razorpaySecret} onChange={e => setRazorpaySecret(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sb-ink">Test Mode</p>
                  <p className="text-sm text-sb-ink/55">Use test credentials</p>
                </div>
                <Switch checked={testMode} onCheckedChange={setTestMode} />
              </div>
              <Button onClick={handleSaveGlobalSettings} disabled={loading}>
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
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
                <Input id="gstNumber" value={gstNumber} onChange={e => setGstNumber(e.target.value)} placeholder="29XXXXXXXXXXXZX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="panNumber">PAN Number</Label>
                <Input id="panNumber" value={panNumber} onChange={e => setPanNumber(e.target.value)} placeholder="XXXXX9999X" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sb-ink">GST Inclusive Pricing</p>
                  <p className="text-sm text-sb-ink/55">Show prices inclusive of GST</p>
                </div>
                <Switch checked={inclusivePricing} onCheckedChange={setInclusivePricing} />
              </div>
              <Button onClick={handleSaveGlobalSettings} disabled={loading}>
                {loading ? 'Saving...' : 'Save Tax Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
