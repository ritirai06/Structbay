import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Loader2, Package, Search } from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { getCustomerAccessToken } from "../lib/authStorage";
import { UtilityBreadcrumb, UtilityCard, UtilityHero, UtilityPage } from "../components/UtilityPageLayout";

export function TrackOrder() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useApp();
  const [orderRef, setOrderRef] = useState(searchParams.get("orderNumber") || searchParams.get("orderId") || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const directId = searchParams.get("orderId")?.trim() || "";

  useEffect(() => {
    if (directId) {
      navigate(`/orders/${encodeURIComponent(directId)}`, { replace: true });
    }
  }, [directId, navigate]);

  const goTrack = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const ref = orderRef.trim();
    if (!ref) {
      setErr("Enter your order number (e.g. 2606160001).");
      return;
    }
    if (!getCustomerAccessToken() && !isLoggedIn) {
      navigate(`/login?next=${encodeURIComponent(`/orders/${ref}`)}`);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await api.getOrder(ref);
      const id = res?.data?._id;
      if (!id) throw new Error("Order not found.");
      navigate(`/orders/${String(id)}`, { replace: true });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not find that order.");
    } finally {
      setBusy(false);
    }
  };

  if (directId) {
    return (
      <div className="sf-utility-page flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#E85A00]" aria-label="Loading" />
      </div>
    );
  }

  return (
    <UtilityPage width="narrow">
      <UtilityBreadcrumb items={[{ label: "Home", to: "/" }, { label: "Track order" }]} />

      <UtilityHero
        icon={Package}
        title="Track your order"
        description="Sign in with the account used at checkout, then enter your StructBay order number."
      />

      <UtilityCard>
        <form onSubmit={(e) => void goTrack(e)} className="space-y-4">
          <label className="sf-utility-field">
            <span>Order number</span>
            <input
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder="e.g. 2606160001"
            />
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="sf-utility-btn-primary w-full justify-center py-3 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Search className="w-4 h-4" aria-hidden />}
            {busy ? "Looking up…" : "Track order"}
          </button>
        </form>
      </UtilityCard>

      <p className="text-center text-sm text-muted-foreground mt-6">
        {isLoggedIn || getCustomerAccessToken() ? (
          <Link to="/account/orders" className="text-[#E85A00] font-medium hover:underline">
            View all my orders
          </Link>
        ) : (
          <Link to={`/login?next=${encodeURIComponent("/track")}`} className="text-[#E85A00] font-medium hover:underline">
            Sign in to track
          </Link>
        )}
      </p>
    </UtilityPage>
  );
}
