import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { OrdersList } from "./pages/OrdersList";
import { OrderDetails } from "./pages/OrderDetails";
import { UploadInvoice } from "./pages/UploadInvoice";
import { WarehouseDetails } from "./pages/WarehouseDetails";
import { ReadyDispatch } from "./pages/ReadyDispatch";
import { DocumentCenter } from "./pages/DocumentCenter";
import { DispatchManagement } from "./pages/DispatchManagement";
import { Notifications } from "./pages/Notifications";
import { Profile } from "./pages/Profile";
import { Support } from "./pages/Support";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "orders", Component: OrdersList },
      { path: "orders/:orderId", Component: OrderDetails },
      { path: "orders/:orderId/invoice", Component: UploadInvoice },
      { path: "orders/:orderId/warehouse", Component: WarehouseDetails },
      { path: "orders/:orderId/ready-dispatch", Component: ReadyDispatch },
      { path: "documents", Component: DocumentCenter },
      { path: "dispatch", Component: DispatchManagement },
      { path: "notifications", Component: Notifications },
      { path: "profile", Component: Profile },
      { path: "support", Component: Support },
    ],
  },
]);
