/** Customer checkout payment option ids → display labels */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  online: "Online (UPI / Card / NetBanking)",
  credit: "Buy on Credit (30 days)",
  cod: "Cash on Delivery",
};

export function formatPaymentMethod(method?: string | null): string {
  if (!method) return "—";
  const key = String(method).toLowerCase();
  return PAYMENT_METHOD_LABELS[key] || method;
}

export function formatPaymentStatus(status?: string | null): string {
  if (!status) return "—";
  return String(status).replace(/_/g, " ");
}
