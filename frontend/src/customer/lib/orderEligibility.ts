/**
 * PRD eligibility for customer order actions.
 * - Cancel: only before Ready for Dispatch (vendor has not submitted dispatch prep).
 * - Replacement: only after delivery (wrong or damaged product).
 */

export const CUSTOMER_CANCELLABLE_ORDER_STATUSES = new Set([
  "PENDING",
  "PAID",
  "VENDOR_ASSIGNMENT_PENDING",
]);

export const CUSTOMER_REPLACEMENT_ORDER_STATUSES = new Set([
  "DELIVERED",
  "PARTIALLY_DELIVERED",
  "COMPLETED",
]);

export function canCustomerCancelOrder(apiStatus: string): boolean {
  return CUSTOMER_CANCELLABLE_ORDER_STATUSES.has(apiStatus);
}

export function canCustomerRequestReplacement(apiStatus: string): boolean {
  return CUSTOMER_REPLACEMENT_ORDER_STATUSES.has(apiStatus);
}

export const CANCEL_POLICY_HINT =
  "You can cancel only before the vendor marks the order Ready for Dispatch. After that, contact StructBay support.";

export const REPLACEMENT_POLICY_HINT =
  "Replacement requests apply only after delivery when the wrong or damaged product was received.";
