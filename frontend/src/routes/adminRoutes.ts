import type { RouteObject } from "react-router";

/** Admin portal — loaded only when visiting `/admin/*` (keeps customer bundle small). */
export const adminRoutes: RouteObject[] = [
  {
    path: "/admin/login",
    lazy: async () => {
      const { LoginPage } = await import("../admin/pages/LoginPage");
      return { Component: LoginPage };
    },
  },
  {
    path: "/admin",
    lazy: async () => {
      await import("@shared/styles/admin.css");
      await import("@shared/styles/workflow.css");
      const { DashboardLayout } = await import("../admin/components/DashboardLayout");
      return { Component: DashboardLayout };
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const { Dashboard } = await import("../admin/pages/Dashboard");
          return { Component: Dashboard };
        },
      },
      {
        path: "dashboard",
        lazy: async () => {
          const { Dashboard } = await import("../admin/pages/Dashboard");
          return { Component: Dashboard };
        },
      },
      {
        path: "products",
        lazy: async () => {
          const { ProductList } = await import("../admin/pages/ProductList");
          return { Component: ProductList };
        },
      },
      {
        path: "products/create",
        lazy: async () => {
          const { AddProduct } = await import("../admin/pages/AddProduct");
          return { Component: AddProduct };
        },
      },
      {
        path: "products/:id/edit",
        lazy: async () => {
          const { AddProduct } = await import("../admin/pages/AddProduct");
          return { Component: AddProduct };
        },
      },
      {
        path: "categories",
        lazy: async () => {
          const { CategoryManagement } = await import("../admin/pages/CategoryManagement");
          return { Component: CategoryManagement };
        },
      },
      {
        path: "brands",
        lazy: async () => {
          const { BrandManagement } = await import("../admin/pages/BrandManagement");
          return { Component: BrandManagement };
        },
      },
      {
        path: "cities",
        lazy: async () => {
          const { CityManagement } = await import("../admin/pages/CityManagement");
          return { Component: CityManagement };
        },
      },
      {
        path: "pricing",
        lazy: async () => {
          const { PricingManagement } = await import("../admin/pages/PricingManagement");
          return { Component: PricingManagement };
        },
      },
      {
        path: "inventory",
        lazy: async () => {
          const { InventoryManagement } = await import("../admin/pages/InventoryManagement");
          return { Component: InventoryManagement };
        },
      },
      {
        path: "vendors",
        lazy: async () => {
          const { VendorManagement } = await import("../admin/pages/VendorManagement");
          return { Component: VendorManagement };
        },
      },
      {
        path: "vendor-assignment",
        lazy: async () => {
          const { VendorManagement } = await import("../admin/pages/VendorManagement");
          return { Component: VendorManagement };
        },
      },
      {
        path: "orders",
        lazy: async () => {
          const { OrderManagement } = await import("../admin/pages/OrderManagement");
          return { Component: OrderManagement };
        },
      },
      {
        path: "orders/:orderId/chat",
        lazy: async () => {
          const { OrderChatPage } = await import("../admin/pages/OrderChatPage");
          return { Component: OrderChatPage };
        },
      },
      {
        path: "orders/:orderId",
        lazy: async () => {
          const { OrderDetailPage } = await import("../admin/pages/OrderDetailPage");
          return { Component: OrderDetailPage };
        },
      },
      {
        path: "dispatch",
        lazy: async () => {
          const { DispatchManagement } = await import("../admin/pages/DispatchManagement");
          return { Component: DispatchManagement };
        },
      },
      {
        path: "invoices",
        lazy: async () => {
          const { InvoiceManagement } = await import("../admin/pages/InvoiceManagement");
          return { Component: InvoiceManagement };
        },
      },
      {
        path: "eway-bills",
        lazy: async () => {
          const { InvoiceManagement } = await import("../admin/pages/InvoiceManagement");
          return { Component: InvoiceManagement };
        },
      },
      {
        path: "shipping-labels",
        lazy: async () => {
          const { InvoiceManagement } = await import("../admin/pages/InvoiceManagement");
          return { Component: InvoiceManagement };
        },
      },
      {
        path: "rfqs",
        lazy: async () => {
          const { RFQManagement } = await import("../admin/pages/RFQManagement");
          return { Component: RFQManagement };
        },
      },
      {
        path: "bulk-enquiries",
        lazy: async () => {
          const { BulkEnquiryManagement } = await import("../admin/pages/BulkEnquiryManagement");
          return { Component: BulkEnquiryManagement };
        },
      },
      {
        path: "replacements",
        lazy: async () => {
          const { ReplacementManagement } = await import("../admin/pages/ReplacementManagement");
          return { Component: ReplacementManagement };
        },
      },
      {
        path: "finance-leads",
        lazy: async () => {
          const { FinanceLeadsManagement } = await import("../admin/pages/FinanceLeadsManagement");
          return { Component: FinanceLeadsManagement };
        },
      },
      {
        path: "customers",
        lazy: async () => {
          const { CustomerManagement } = await import("../admin/pages/CustomerManagement");
          return { Component: CustomerManagement };
        },
      },
      {
        path: "blogs",
        lazy: async () => {
          const { CMSManagement } = await import("../admin/pages/CMSManagement");
          return { Component: CMSManagement };
        },
      },
      {
        path: "landing-pages",
        lazy: async () => {
          const { CMSManagement } = await import("../admin/pages/CMSManagement");
          return { Component: CMSManagement };
        },
      },
      {
        path: "cms",
        lazy: async () => {
          const { CMSManagement } = await import("../admin/pages/CMSManagement");
          return { Component: CMSManagement };
        },
      },
      {
        path: "reports",
        lazy: async () => {
          const { ReportsAnalytics } = await import("../admin/pages/ReportsAnalytics");
          return { Component: ReportsAnalytics };
        },
      },
      {
        path: "audit-logs",
        lazy: async () => {
          const { AuditLogs } = await import("../admin/pages/AuditLogs");
          return { Component: AuditLogs };
        },
      },
      {
        path: "settings",
        lazy: async () => {
          const { Settings } = await import("../admin/pages/Settings");
          return { Component: Settings };
        },
      },
      {
        path: "coupons",
        lazy: async () => {
          const { CouponManagement } = await import("../admin/pages/CouponManagement");
          return { Component: CouponManagement };
        },
      },
      {
        path: "admin-users",
        lazy: async () => {
          const { AdminUsers } = await import("../admin/pages/AdminUsers");
          return { Component: AdminUsers };
        },
      },
    ],
  },
];
