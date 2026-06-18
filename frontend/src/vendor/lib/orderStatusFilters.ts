/** Vendor assigned-orders status filter values (API `status` query). */
export const VENDOR_ORDER_STATUS_FILTERS = [
  { value: '', label: 'All Status' },
  { value: '__PENDING_ACTIVE__', label: 'Pending / active' },
  { value: 'NEW_ASSIGNED,ASSIGNED', label: 'Assigned' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'READY_FOR_DISPATCH', label: 'Ready for dispatch' },
  { value: 'CHANGES_REQUESTED', label: 'Changes requested' },
  { value: 'DISPATCH_APPROVED', label: 'Dispatch approved' },
  { value: 'VENDOR_INVOICE_SUBMITTED', label: 'Vendor invoice' },
  { value: 'SB_INVOICE_SENT', label: 'SB docs sent' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ASSIGNED', label: 'Legacy: New' },
  { value: 'INVOICE_UPLOADED', label: 'Legacy: Invoice' },
  { value: 'DISPATCH_CONFIRMED', label: 'Legacy: Dispatch OK' },
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
] as const;

export const PENDING_ACTIVE_STATUS_QUERY = 'NEW_ASSIGNED,ASSIGNED,ACCEPTED,READY_FOR_DISPATCH';

/** Map UI filter value to API `status` param. */
export function vendorStatusFilterToApi(value: string): string {
  if (!value) return '';
  if (value === '__PENDING_ACTIVE__') return PENDING_ACTIVE_STATUS_QUERY;
  return value;
}
