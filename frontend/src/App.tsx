import { Suspense, useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { createBrowserRouter, RouterProvider, Outlet, useLocation, Navigate, useParams, useNavigate } from "react-router";
import { Toaster } from "sonner";
import { AppProvider } from "./customer/context/AppContext";
import { BulkEnquiryModalProvider } from "./customer/context/BulkEnquiryModalContext";
import { Header as CustomerHeader } from "./customer/components/Header";
import { SandAggregatesQuoteModal } from "./customer/components/SandAggregatesQuoteModal";
import { ConcreteRFQModal } from "./customer/components/ConcreteRFQModal";
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
import { About } from "./customer/pages/About";
import { Contact } from "./customer/pages/Contact";
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
  const [sandQuoteOpen, setSandQuoteOpen] = useState(false);
  const [concreteRFQOpen, setConcreteRFQOpen] = useState(false);
  const navigate = useNavigate();

  const isFullscreen = FULLSCREEN_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith("/account")
  );

  useEffect(() => {
    const isConcreteHref = (path: string) => {
      const decoded = decodeURIComponent(path).toLowerCase().replace(/-/g, " ").replace(/\+/g, " ");
      return (
        decoded.includes("/category/ready mix concrete") ||
        decoded.includes("/category/ready mix") ||
        decoded.includes("/category/readymix") ||
        (decoded.includes("/category/") &&
          decoded.includes("concrete") &&
          !decoded.includes("block") &&
          !decoded.includes("cement"))
      );
    };

    const handleGlobalClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      while (target && target !== document.body) {
        if (target.tagName === "A") {
          const href = target.getAttribute("href");
          if (href) {
            const path = href.toLowerCase();
            if (
              path.includes("/category/m-sand-and-aggregates") ||
              path.includes("/category/m_sand-and-aggregates") ||
              path.includes("/category/m%20sand%20and%20aggregates")
            ) {
              e.preventDefault();
              e.stopPropagation();
              setSandQuoteOpen(true);
              break;
            }
            if (isConcreteHref(href)) {
              e.preventDefault();
              e.stopPropagation();
              setConcreteRFQOpen(true);
              break;
            }
          }
        }
        target = target.parentElement;
      }
    };

    document.addEventListener("click", handleGlobalClick, true);
    return () => {
      document.removeEventListener("click", handleGlobalClick, true);
    };
  }, []);

  useEffect(() => {
    const openQuote = () => setSandQuoteOpen(true);
    window.addEventListener("structbay:open-sand-aggregates-quote", openQuote);
    return () => window.removeEventListener("structbay:open-sand-aggregates-quote", openQuote);
  }, []);

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

        <SandAggregatesQuoteModal open={sandQuoteOpen} onClose={() => setSandQuoteOpen(false)} />
        <ConcreteRFQModal open={concreteRFQOpen} onClose={() => setConcreteRFQOpen(false)} />

        <a
          href="https://wa.me/917090570505"
          target="_blank"
          rel="noopener noreferrer"
          className="group fixed bottom-[4.75rem] right-5 z-40 bg-[#25D366] text-white p-2.5 rounded-[12px] shadow-lg hover:bg-[#20ba5a] transition-all hover:scale-110 active:scale-95 flex items-center justify-center w-12 h-12"
          aria-label="Chat on WhatsApp"
        >
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
            <path fill="#ffffff" d="M12.004 2c-5.51 0-9.99 4.49-9.99 10 0 1.91.53 3.69 1.46 5.23L2.1 22l5.02-1.32c1.47.8 3.14 1.25 4.88 1.25 5.51 0 9.99-4.49 9.99-10s-4.48-10-9.99-10z" />
            <path className="text-[#25D366] group-hover:text-[#20ba5a] transition-colors" fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
          </svg>
        </a>
      </div>
    </BulkEnquiryModalProvider>
  );
}

function RootLayout() {
  const location = useLocation();
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

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
          { path: "about", Component: About },
          { path: "contact", Component: Contact },
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
    <>
      <Toaster position="top-right" richColors closeButton duration={4000} />
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      <Suspense fallback={<RouteFallback />}>
        <RouterProvider router={router} />
      </Suspense>
    </>
  );
}
