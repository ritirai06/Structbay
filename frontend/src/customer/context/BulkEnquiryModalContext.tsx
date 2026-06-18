import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { BulkEnquiryModal } from "../components/BulkEnquiryModal";

type BulkEnquiryModalContextValue = {
  openBulkEnquiry: () => void;
  closeBulkEnquiry: () => void;
  isBulkEnquiryOpen: boolean;
};

const BulkEnquiryModalContext = createContext<BulkEnquiryModalContextValue | null>(null);

export function BulkEnquiryModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const closeBulkEnquiry = useCallback(() => {
    setOpen(false);
    if (location.pathname === "/bulk-enquiry" || location.pathname === "/bulk") {
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from || "/", { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  const openBulkEnquiry = useCallback(() => setOpen(true), []);

  return (
    <BulkEnquiryModalContext.Provider
      value={{ openBulkEnquiry, closeBulkEnquiry, isBulkEnquiryOpen: open }}
    >
      {children}
      <BulkEnquiryModal open={open} onClose={closeBulkEnquiry} />
    </BulkEnquiryModalContext.Provider>
  );
}

export function useBulkEnquiryModal() {
  const ctx = useContext(BulkEnquiryModalContext);
  if (!ctx) {
    throw new Error("useBulkEnquiryModal must be used within BulkEnquiryModalProvider");
  }
  return ctx;
}
