import { createBrowserRouter } from "react-router";
import { LoginPage } from "./pages/LoginPage";
import { DashboardLayout } from "./components/DashboardLayout";
import { Dashboard } from "./pages/Dashboard";
import { ProductList } from "./pages/ProductList";
import { AddProduct } from "./pages/AddProduct";
import { CategoryManagement } from "./pages/CategoryManagement";
import { BrandManagement } from "./pages/BrandManagement";
import { CityManagement } from "./pages/CityManagement";
import { PricingManagement } from "./pages/PricingManagement";
import { InventoryManagement } from "./pages/InventoryManagement";
import { VendorManagement } from "./pages/VendorManagement";
import { VendorDetails } from "./pages/VendorDetails";
import { OrderManagement } from "./pages/OrderManagement";
import { DispatchManagement } from "./pages/DispatchManagement";
import { InvoiceManagement } from "./pages/InvoiceManagement";
import { RFQManagement } from "./pages/RFQManagement";
import { BulkEnquiryManagement } from "./pages/BulkEnquiryManagement";
import { FinanceLeadsManagement } from "./pages/FinanceLeadsManagement";
import { CustomerManagement } from "./pages/CustomerManagement";
import { CMSManagement } from "./pages/CMSManagement";
import { ReportsAnalytics } from "./pages/ReportsAnalytics";
import { AuditLogs } from "./pages/AuditLogs";
import { Settings } from "./pages/Settings";
import { AdminUsers } from "./pages/AdminUsers";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    Component: DashboardLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "products", Component: ProductList },
      { path: "products/add", Component: AddProduct },
      { path: "products/edit/:id", Component: AddProduct },
      { path: "categories", Component: CategoryManagement },
      { path: "brands", Component: BrandManagement },
      { path: "cities", Component: CityManagement },
      { path: "pricing", Component: PricingManagement },
      { path: "inventory", Component: InventoryManagement },
      { path: "vendors", Component: VendorManagement },
      { path: "vendors/:id", Component: VendorDetails },
      { path: "orders", Component: OrderManagement },
      { path: "dispatch", Component: DispatchManagement },
      { path: "invoices", Component: InvoiceManagement },
      { path: "rfqs", Component: RFQManagement },
      { path: "bulk-enquiries", Component: BulkEnquiryManagement },
      { path: "finance-leads", Component: FinanceLeadsManagement },
      { path: "customers", Component: CustomerManagement },
      { path: "cms", Component: CMSManagement },
      { path: "reports", Component: ReportsAnalytics },
      { path: "audit-logs", Component: AuditLogs },
      { path: "settings", Component: Settings },
      { path: "admin-users", Component: AdminUsers },
    ],
  },
]);
