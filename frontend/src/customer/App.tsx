import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router";
import { AppProvider } from "./context/AppContext";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { SplashScreen } from "./pages/SplashScreen";
import { CitySelection } from "./pages/CitySelection";
import { Homepage } from "./pages/Homepage";
import { CategoryListing } from "./pages/CategoryListing";
import { ProductDetails } from "./pages/ProductDetails";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { OrderSuccess } from "./pages/OrderSuccess";
import { OrderTracking } from "./pages/OrderTracking";
import { TrackOrder } from "./pages/TrackOrder";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { RFQ } from "./pages/RFQ";
import { BulkEnquiry } from "./pages/BulkEnquiry";
import { Finance } from "./pages/Finance";
import { BlogListing, BlogDetails } from "./pages/Blog";
import { SearchResults } from "./pages/SearchResults";
import { BrandLanding } from "./pages/BrandLanding";
import { Shop } from "./pages/Shop";
import {
  PrivacyPolicyPage,
  TermsPage,
  ReturnsPolicyPage,
  ShippingPolicyPage,
  DynamicPolicyPage,
} from "./pages/PolicyPage";
import { About } from "./pages/About";

/* Pages that use full-screen layouts (no shared header/footer) */
const FULLSCREEN_ROUTES = ["/splash", "/city", "/login", "/register", "/dashboard"];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isFullscreen = FULLSCREEN_ROUTES.some(r => location.pathname === r || location.pathname.startsWith("/dashboard"));

  if (isFullscreen) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ScrollToTop />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function AppRoutes() {
  return (
    <Layout>
      {/* MARKER-MAKE-KIT-INVOKED */}
      <Routes>
        <Route path="/splash" element={<SplashScreen />} />
        <Route path="/city" element={<CitySelection />} />
        <Route path="/" element={<Homepage />} />
        <Route path="/category/:category" element={<CategoryListing />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/track" element={<TrackOrder />} />
        <Route path="/orders/:orderId" element={<OrderTracking />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:section" element={<Dashboard />} />
        <Route path="/rfq" element={<RFQ />} />
        <Route path="/bulk" element={<BulkEnquiry />} />
        <Route path="/bulk-enquiry" element={<BulkEnquiry />} />
        <Route path="/finance" element={<Finance />} />
        {/* Blog: plural routes match links across the site; singular kept for old bookmarks */}
        <Route path="/blogs" element={<BlogListing />} />
        <Route path="/blogs/:slug" element={<BlogDetails />} />
        <Route path="/blog" element={<BlogListing />} />
        <Route path="/blog/:slug" element={<BlogDetails />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/brand/:brand" element={<BrandLanding />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/returns" element={<ReturnsPolicyPage />} />
        <Route path="/shipping" element={<ShippingPolicyPage />} />
        <Route path="/policy/:slug" element={<DynamicPolicyPage />} />
        <Route path="/about" element={<About />} />
        {/* Catch-all */}
        <Route path="*" element={<Homepage />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
