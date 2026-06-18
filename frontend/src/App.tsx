import { Suspense } from "react";
import { createBrowserRouter, RouterProvider, Outlet, useLocation, Navigate, useParams } from "react-router";
import { AppProvider } from "./customer/context/AppContext";
import { BulkEnquiryModalProvider } from "./customer/context/BulkEnquiryModalContext";
import { Header as CustomerHeader } from "./customer/components/Header";
import { Footer as CustomerFooter } from "./customer/components/Footer";
import { SplashScreen } from "./customer/pages/SplashScreen";
import { CitySelection } from "./customer/pages/CitySelection";
import { Homepage } from "./customer/pages/Homepage";
import { CategoryListing } from "./customer/pages/CategoryListing";
import { Cart } from "./customer/pages/Cart";
import { OrderSuccess } from "./customer/pages/OrderSuccess";
import { OrderTracking } from "./customer/pages/OrderTracking";
import { TrackOrder } from "./customer/pages/TrackOrder";
import { LandingPage } from "./customer/pages/LandingPage";
import { Login as CustomerLogin } from "./customer/pages/Login";
import { Register } from "./customer/pages/Register";
import { VerifyEmail } from "./customer/pages/VerifyEmail";
import { RFQ } from "./customer/pages/RFQ";
import { BulkEnquiry } from "./customer/pages/BulkEnquiry";
import { ToolsQuantityEstimator } from "./customer/pages/ToolsQuantityEstimator";
import { Finance } from "./customer/pages/Finance";
import { BlogListing, BlogDetails } from "./customer/pages/Blog";
import { SearchResults } from "./customer/pages/SearchResults";
import { BrandLanding } from "./customer/pages/BrandLanding";
import {
  PrivacyPolicyPage,
  TermsPage,
  ReturnsPolicyPage,
  ShippingPolicyPage,
  DynamicPolicyPage,
} from "./customer/pages/PolicyPage";
import { adminRoutes } from "./routes/adminRoutes";
import { vendorRoutes } from "./routes/vendorRoutes";

const FULLSCREEN_ROUTES = [
  "/city-selection",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/account",
];

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center bg-white" role="status" aria-label="Loading">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-sb-orange border-t-transparent" />
    </div>
  );
}

function LegacyBlogSlugRedirect() {
  const { slug } = useParams();
  if (!slug) return <Navigate to="/blogs" replace />;
  return <Navigate to={`/blogs/${encodeURIComponent(slug)}`} replace />;
}

function MarketplaceLayout() {
  const location = useLocation();
  const isFullscreen = FULLSCREEN_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith("/account")
  );

  if (isFullscreen) {
    return (
      <div className="sb-storefront min-h-screen">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </div>
    );
  }

  return (
    <BulkEnquiryModalProvider>
      <div className="sb-storefront min-h-screen flex flex-col">
        <CustomerHeader />
        <main className="flex-1">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
        <CustomerFooter />
      </div>
    </BulkEnquiryModalProvider>
  );
}

function RootLayout() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
}

const router = createBrowserRouter([
  {
    id: "root",
    Component: RootLayout,
    children: [
      { path: "/splash", Component: SplashScreen },
      ...adminRoutes,
      ...vendorRoutes,
      {
        path: "/",
        Component: MarketplaceLayout,
        children: [
          { index: true, Component: Homepage },
          { path: "city-selection", Component: CitySelection },
          { path: "login", Component: CustomerLogin },
          { path: "register", Component: Register },
          { path: "forgot-password", Component: CustomerLogin },
          { path: "reset-password", Component: CustomerLogin },
          { path: "verify-email", Component: VerifyEmail },

          { path: "shop", Component: CategoryListing },
          { path: "category/:category", Component: CategoryListing },
          { path: "categories/:category", Component: CategoryListing },
          { path: "products", Component: CategoryListing },
          {
            path: "products/:slug",
            lazy: async () => {
              const { ProductDetails } = await import("./customer/pages/ProductDetails");
              return { Component: ProductDetails };
            },
          },
          {
            path: "product/:slug",
            lazy: async () => {
              const { ProductDetails } = await import("./customer/pages/ProductDetails");
              return { Component: ProductDetails };
            },
          },
          { path: "brands", Component: BrandLanding },
          { path: "brands/:slug", Component: BrandLanding },
          { path: "search", Component: SearchResults },
          { path: "cart", Component: Cart },
          {
            path: "checkout",
            lazy: async () => {
              const { Checkout } = await import("./customer/pages/Checkout");
              return { Component: Checkout };
            },
          },
          { path: "order-success", Component: OrderSuccess },
          { path: "orders/:id", Component: OrderTracking },
          { path: "rfq", Component: RFQ },
          { path: "bulk-enquiry", Component: BulkEnquiry },
          { path: "finance", Component: Finance },
          { path: "blogs", Component: BlogListing },
          { path: "blogs/:slug", Component: BlogDetails },
          { path: "privacy", Component: PrivacyPolicyPage },
          { path: "terms", Component: TermsPage },
          { path: "returns", Component: ReturnsPolicyPage },
          { path: "shipping", Component: ShippingPolicyPage },
          { path: "policy/:slug", Component: DynamicPolicyPage },
          { path: "lp/:slug", Component: LandingPage },
          { path: "tools/cement-calculator", Component: ToolsQuantityEstimator },
          { path: "tools/cement-estimator", element: <Navigate to="/tools/cement-calculator" replace /> },

          {
            path: "account",
            lazy: async () => {
              const { Dashboard } = await import("./customer/pages/Dashboard");
              return { Component: Dashboard };
            },
          },
          {
            path: "account/orders",
            lazy: async () => {
              const { Dashboard } = await import("./customer/pages/Dashboard");
              return { Component: Dashboard };
            },
          },
          {
            path: "account/orders/:id",
            lazy: async () => {
              const { Dashboard } = await import("./customer/pages/Dashboard");
              return { Component: Dashboard };
            },
          },
          {
            path: "account/invoices",
            lazy: async () => {
              const { Dashboard } = await import("./customer/pages/Dashboard");
              return { Component: Dashboard };
            },
          },
          {
            path: "account/addresses",
            lazy: async () => {
              const { Dashboard } = await import("./customer/pages/Dashboard");
              return { Component: Dashboard };
            },
          },
          {
            path: "account/profile",
            lazy: async () => {
              const { Dashboard } = await import("./customer/pages/Dashboard");
              return { Component: Dashboard };
            },
          },
          {
            path: "account/notifications",
            lazy: async () => {
              const { Dashboard } = await import("./customer/pages/Dashboard");
              return { Component: Dashboard };
            },
          },
          {
            path: "account/rfqs",
            lazy: async () => {
              const { Dashboard } = await import("./customer/pages/Dashboard");
              return { Component: Dashboard };
            },
          },
          {
            path: "account/enquiries",
            lazy: async () => {
              const { Dashboard } = await import("./customer/pages/Dashboard");
              return { Component: Dashboard };
            },
          },
          {
            path: "account/finance",
            lazy: async () => {
              const { Dashboard } = await import("./customer/pages/Dashboard");
              return { Component: Dashboard };
            },
          },

          { path: "city", element: <Navigate to="/city-selection" replace /> },
          { path: "blog", element: <Navigate to="/blogs" replace /> },
          { path: "blog/:slug", element: <LegacyBlogSlugRedirect /> },
          { path: "bulk", element: <Navigate to="/bulk-enquiry" replace /> },
          { path: "track", Component: TrackOrder },
          { path: "dashboard", element: <Navigate to="/account" replace /> },
          { path: "dashboard/:section", element: <Navigate to="/account" replace /> },

          { path: "*", Component: Homepage },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
