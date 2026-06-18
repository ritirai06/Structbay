import type { RouteObject } from "react-router";
import { Outlet } from "react-router";

async function loadVendorAuthRoot() {
  await import("@shared/styles/vendor.css");
  await import("@shared/styles/workflow.css");
  const { AuthProvider } = await import("../vendor/context/AuthContext");

  function Shell() {
    return (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    );
  }

  return { Component: Shell };
}

/** Vendor portal — loaded only when visiting `/vendor/*`. */
export const vendorRoutes: RouteObject[] = [
  {
    path: "/vendor",
    lazy: loadVendorAuthRoot,
    children: [
      {
        path: "login",
        lazy: async () => {
          const { Login } = await import("../vendor/pages/Login");
          return { Component: Login };
        },
      },
      {
        path: "",
        lazy: async () => {
          const { Layout } = await import("../vendor/components/Layout");
          return { Component: Layout };
        },
        children: [
          {
            index: true,
            lazy: async () => {
              const { Dashboard } = await import("../vendor/pages/Dashboard");
              return { Component: Dashboard };
            },
          },
          {
            path: "dashboard",
            lazy: async () => {
              const { Dashboard } = await import("../vendor/pages/Dashboard");
              return { Component: Dashboard };
            },
          },
          {
            path: "orders",
            lazy: async () => {
              const { OrdersList } = await import("../vendor/pages/OrdersList");
              return { Component: OrdersList };
            },
          },
          {
            path: "orders/:orderId",
            lazy: async () => {
              const { OrderDetails } = await import("../vendor/pages/OrderDetails");
              return { Component: OrderDetails };
            },
          },
          {
            path: "orders/:orderId/invoice",
            lazy: async () => {
              const { UploadInvoice } = await import("../vendor/pages/UploadInvoice");
              return { Component: UploadInvoice };
            },
          },
          {
            path: "orders/:orderId/warehouse",
            lazy: async () => {
              const { WarehouseDetails } = await import("../vendor/pages/WarehouseDetails");
              return { Component: WarehouseDetails };
            },
          },
          {
            path: "orders/:orderId/ready-dispatch",
            lazy: async () => {
              const { ReadyDispatch } = await import("../vendor/pages/ReadyDispatch");
              return { Component: ReadyDispatch };
            },
          },
          {
            path: "dispatch",
            lazy: async () => {
              const { DispatchManagement } = await import("../vendor/pages/DispatchManagement");
              return { Component: DispatchManagement };
            },
          },
          {
            path: "documents",
            lazy: async () => {
              const { DocumentCenter } = await import("../vendor/pages/DocumentCenter");
              return { Component: DocumentCenter };
            },
          },
          {
            path: "notifications",
            lazy: async () => {
              const { Notifications } = await import("../vendor/pages/Notifications");
              return { Component: Notifications };
            },
          },
          {
            path: "history",
            lazy: async () => {
              const { OrderHistory } = await import("../vendor/pages/OrderHistory");
              return { Component: OrderHistory };
            },
          },
          {
            path: "analytics",
            lazy: async () => {
              const { Analytics } = await import("../vendor/pages/Analytics");
              return { Component: Analytics };
            },
          },
          {
            path: "profile",
            lazy: async () => {
              const { Profile } = await import("../vendor/pages/Profile");
              return { Component: Profile };
            },
          },
          {
            path: "support",
            lazy: async () => {
              const { Support } = await import("../vendor/pages/Support");
              return { Component: Support };
            },
          },
        ],
      },
    ],
  },
];
