import { useEffect } from "react";
import { useBulkEnquiryModal } from "../context/BulkEnquiryModalContext";

/** Route shell — opens the bulk enquiry pop-out modal; content lives in `BulkEnquiryModal`. */
export function BulkEnquiry() {
  const { openBulkEnquiry } = useBulkEnquiryModal();

  useEffect(() => {
    openBulkEnquiry();
  }, [openBulkEnquiry]);

  return null;
}
