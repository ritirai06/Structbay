import { createBrowserRouter, RouterProvider, Outlet, useLocation, Navigate } from "react-router";

// --- CUSTOMER PORTAL ---
import { AppProvider } from "./customer/context/AppContext";
import { Header as CustomerHeader } from "./customer/components/Header";
import { Footer as CustomerFooter } from "./customer/components/Footer";
import { SplashScreen } from "./customer/pages/SplashScreen";
import { CitySelection } from "./customer/pages/CitySelection";
import { Homepage } from "./customer/pages/Homepage";
import { CategoryListing } from "./customer/pages/CategoryListing";
import { ProductDetails } from "./customer/pages/ProductDetails";
import { Cart } from "./customer/pages/Cart";
import { Checkout } from "./customer/pages/Checkout";
import { OrderSuccess } from "./customer/pages/OrderSuccess";
import { OrderTracking } from "./customer/pages/OrderTracking";
import { Login as CustomerLogin } from "./customer/pages/Login";
import { Register } from "./customer/pages/Register";
import { Dashboard as CustomerDashboard } from "./customer/pages/Dashboard";
import { RFQ } from "./customer/pages/RFQ";
import { BulkEnquiry } from "./customer/pages/BulkEnquiry";
import { Finance } from "./customer/pages/Finance";
import { BlogListing, BlogDetails } from "./customer/pages/Blog";
import { SearchResults } from "./customer/pages/SearchResults";
import { BrandLanding } from "./customer/pages/BrandLanding";

// --- ADMIN PORTAL ---
import { LoginPage as AdminLogin } from "./admin/pages/LoginPage";
import { DashboardLayout as AdminLayout } from "./admin/components/DashboardLayout";
import { Dashboard as AdminDashboard } from "./admin/pages/Dashboard";
import { ProductList as AdminProductList } from "./admin/pages/ProductList";
import { AddProduct as AdminAddProduct } from "./admin/pages/AddProduct";
import { CategoryManagement as AdminCategories } from "./admin/pages/CategoryManagement";
import { BrandManagement as AdminBrands } from "./admin/pages/BrandManagement";
import { CityManagement as AdminCities } from "./admin/pages/CityManagement";
import { PricingManagement as AdminPricing } from "./admin/pages/PricingManagement";
import { InventoryManagement as AdminInventory } from "./admin/pages/InventoryManagement";
import { VendorManagement as AdminVendors } from "./admin/pages/VendorManagement";
import { OrderManagement as AdminOrders } from "./admin/pages/OrderManagement";
import { DispatchManagement as AdminDispatch } from "./admin/pages/DispatchManagement";
import { InvoiceManagement as AdminInvoices } from "./admin/pages/InvoiceManagement";
import { RFQManagement as AdminRFQs } from "./admin/pages/RFQManagement";
import { BulkEnquiryManagement as AdminBulkEnquiries } from "./admin/pages/BulkEnquiryManagement";
import { FinanceLeadsManagement as AdminFinanceLeads } from "./admin/pages/FinanceLeadsManagement";
import { CustomerManagement as AdminCustomers } from "./admin/pages/CustomerManagement";
import { CMSManagement as AdminCMS } from "./admin/pages/CMSManagement";
import { ReportsAnalytics as AdminReports } from "./admin/pages/ReportsAnalytics";
import { AuditLogs as AdminAuditLogs } from "./admin/pages/AuditLogs";
import { Settings as AdminSettings } from "./admin/pages/Settings";
import { AdminUsers as AdminUsersPage } from "./admin/pages/AdminUsers";

// --- VENDOR PORTAL ---
import { Login as VendorLogin } from "./vendor/pages/Login";
import { Layout as VendorLayout } from "./vendor/components/Layout";
import { Dashboard as VendorDashboard } from "./vendor/pages/Dashboard";
import { OrdersList as VendorOrders } from "./vendor/pages/OrdersList";
import { OrderDetails as VendorOrderDetails } from "./vendor/pages/OrderDetails";
import { UploadInvoice as VendorUploadInvoice } from "./vendor/pages/UploadInvoice";
import { WarehouseDetails as VendorWarehouse } from "./vendor/pages/WarehouseDetails";
import { ReadyDispatch as VendorReadyDispatch } from "./vendor/pages/ReadyDispatch";
import { DocumentCenter as VendorDocuments } from "./vendor/pages/DocumentCenter";
import { DispatchManagement as VendorDispatch } from "./vendor/pages/DispatchManagement";
import { Notifications as VendorNotifications } from "./vendor/pages/Notifications";
import { Profile as VendorProfile } from "./vendor/pages/Profile";
import { Support as VendorSupport } from "./vendor/pages/Support";

// --- FULLSCREEN routes (no header/footer) ---
const FULLSCREEN_ROUTES = [
  "/city-selection",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/account",
];

function MarketplaceLayout() {
  const location = useLocation();
  const isFullscreen = FULLSCREEN_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith("/account")
  );

  if (isFullscreen) return <Outlet />;

  return (
    <div className="min-h-screen flex flex-col">
      <CustomerHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <CustomerFooter />
    </div>
  );
}

const router = createBrowserRouter([
  // ─── SPLASH ───────────────────────────────────────────────
  { path: "/splash", Component: SplashScreen },

  // ─── ADMIN ────────────────────────────────────────────────
  { path: "/admin/login", Component: AdminLogin },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "dashboard", Component: AdminDashboard },
      // Products
      { path: "products", Component: AdminProductList },
      { path: "products/create", Component: AdminAddProduct },
      { path: "products/:id/edit", Component: AdminAddProduct },
      // Catalogue
      { path: "categories", Component: AdminCategories },
      { path: "brands", Component: AdminBrands },
      // Operations
      { path: "cities", Component: AdminCities },
      { path: "pricing", Component: AdminPricing },
      { path: "inventory", Component: AdminInventory },
      // Vendors
      { path: "vendors", Component: AdminVendors },
      { path: "vendor-assignment", Component: AdminVendors },
      // Orders & Fulfillment
      { path: "orders", Component: AdminOrders },
      { path: "orders/:id", Component: AdminOrders },
      { path: "dispatch", Component: AdminDispatch },
      // Documents
      { path: "invoices", Component: AdminInvoices },
      { path: "eway-bills", Component: AdminInvoices },
      { path: "shipping-labels", Component: AdminInvoices },
      // Enquiries
      { path: "rfqs", Component: AdminRFQs },
      { path: "bulk-enquiries", Component: AdminBulkEnquiries },
      { path: "finance-leads", Component: AdminFinanceLeads },
      // CRM
      { path: "customers", Component: AdminCustomers },
      // Content
      { path: "blogs", Component: AdminCMS },
      { path: "landing-pages", Component: AdminCMS },
      { path: "cms", Component: AdminCMS },
      // System
      { path: "reports", Component: AdminReports },
      { path: "audit-logs", Component: AdminAuditLogs },
      { path: "settings", Component: AdminSettings },
      { path: "admin-users", Component: AdminUsersPage },
    ],
  },

  // ─── VENDOR ───────────────────────────────────────────────
  { path: "/vendor/login", Component: VendorLogin },
  {
    path: "/vendor",
    Component: VendorLayout,
    children: [
      { index: true, Component: VendorDashboard },
      { path: "dashboard", Component: VendorDashboard },
      { path: "orders", Component: VendorOrders },
      { path: "orders/:id", Component: VendorOrderDetails },
      { path: "invoices", Component: VendorUploadInvoice },
      { path: "warehouse", Component: VendorWarehouse },
      { path: "dispatch", Component: VendorDispatch },
      { path: "documents", Component: VendorDocuments },
      { path: "notifications", Component: VendorNotifications },
      { path: "profile", Component: VendorProfile },
      { path: "support", Component: VendorSupport },
    ],
  },

  // ─── MARKETPLACE (Customer) ───────────────────────────────
  {
    path: "/",
    Component: MarketplaceLayout,
    children: [
      // Public
      { index: true, Component: Homepage },
      { path: "city-selection", Component: CitySelection },
      { path: "login", Component: CustomerLogin },
      { path: "register", Component: Register },
      { path: "forgot-password", Component: CustomerLogin },
      { path: "reset-password", Component: CustomerLogin },

      // Marketplace
      { path: "shop", Component: CategoryListing },
      { path: "category/:category", Component: CategoryListing },
      { path: "categories/:category", Component: CategoryListing }, // legacy
      { path: "products", Component: CategoryListing },
      { path: "products/:slug", Component: ProductDetails },
      { path: "brands", Component: BrandLanding },
      { path: "brands/:slug", Component: BrandLanding },
      { path: "search", Component: SearchResults },
      { path: "cart", Component: Cart },
      { path: "checkout", Component: Checkout },
      { path: "order-success", Component: OrderSuccess },
      { path: "orders/:id", Component: OrderTracking },
      { path: "rfq", Component: RFQ },
      { path: "bulk-enquiry", Component: BulkEnquiry },
      { path: "finance", Component: Finance },
      { path: "blogs", Component: BlogListing },
      { path: "blogs/:slug", Component: BlogDetails },

      // Customer Dashboard (account)
      { path: "account", Component: CustomerDashboard },
      { path: "account/orders", Component: CustomerDashboard },
      { path: "account/orders/:id", Component: CustomerDashboard },
      { path: "account/invoices", Component: CustomerDashboard },
      { path: "account/addresses", Component: CustomerDashboard },
      { path: "account/profile", Component: CustomerDashboard },
      { path: "account/notifications", Component: CustomerDashboard },
      { path: "account/rfqs", Component: CustomerDashboard },
      { path: "account/enquiries", Component: CustomerDashboard },
      { path: "account/finance", Component: CustomerDashboard },

      // Legacy redirects
      { path: "city", element: <Navigate to="/city-selection" replace /> },
      { path: "blog", element: <Navigate to="/blogs" replace /> },
      { path: "blog/:id", element: <Navigate to="/blogs" replace /> },
      { path: "bulk", element: <Navigate to="/bulk-enquiry" replace /> },
      { path: "track", element: <Navigate to="/" replace /> },
      { path: "dashboard", element: <Navigate to="/account" replace /> },
      { path: "dashboard/:section", element: <Navigate to="/account" replace /> },

      { path: "*", Component: Homepage },
    ],
  },
]);

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}
