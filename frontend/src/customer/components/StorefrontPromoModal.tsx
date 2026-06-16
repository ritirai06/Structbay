import { useEffect } from "react";
import { X, Check, ShoppingCart, Lock } from "lucide-react";

export type StorefrontPromoConfig = {
  modalEnabled?: boolean;
  modalTitle?: string;
  modalSubtitle?: string;
  modalHeroImageUrl?: string | null;
  modalBackgroundImageUrl?: string | null;
  modalBadgeLeft?: string;
  modalBadgeRight?: string;
  modalFooterNote?: string;
  modalSuppressDays?: number;
};

const LS_KEY = "structbay_storefront_promo_suppressed_until";

function shouldShow(promo: StorefrontPromoConfig | null | undefined): boolean {
  if (!promo?.modalEnabled || !String(promo.modalTitle || "").trim()) return false;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return true;
    const until = parseInt(raw, 10);
    if (Number.isNaN(until)) return true;
    return Date.now() > until;
  } catch {
    return true;
  }
}

function suppress(promo: StorefrontPromoConfig | null | undefined) {
  const days = Math.max(0, Number(promo?.modalSuppressDays ?? 1));
  const ms = (days <= 0 ? 12 : days * 24) * 60 * 60 * 1000;
  try {
    localStorage.setItem(LS_KEY, String(Date.now() + ms));
  } catch {
    /* ignore */
  }
}

export function StorefrontPromoModal({
  promo,
  open,
  onClose,
}: {
  promo: StorefrontPromoConfig | null | undefined;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !promo) return null;

  const title = String(promo.modalTitle || "").trim();
  const subtitle = String(promo.modalSubtitle || "").trim();
  const bgUrl = promo.modalBackgroundImageUrl || "";
  const heroUrl = promo.modalHeroImageUrl || "";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sb-promo-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close promotion"
        onClick={() => {
          suppress(promo);
          onClose();
        }}
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-neutral-200/90 overflow-hidden transition-all duration-200 scale-100">
        <button
          type="button"
          onClick={() => {
            suppress(promo);
            onClose();
          }}
          className="absolute right-3 top-3 z-20 rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Decorative clouds */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-24 overflow-hidden">
          <div className="absolute -top-6 -left-8 w-28 h-16 rounded-full bg-white/90 blur-[1px] shadow-sm" />
          <div className="absolute -top-4 -right-6 w-32 h-18 rounded-full bg-white/90 blur-[1px] shadow-sm" />
        </div>

        <div className="relative px-5 pt-8 pb-5 text-center">
          <h2
            id="sb-promo-title"
            className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#15803d]"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm sm:text-base font-medium text-neutral-900">{subtitle}</p>
          )}
        </div>

        <div className="relative px-4 pb-5">
          <div
            className="relative rounded-xl overflow-hidden min-h-[200px] border border-[#15803d]/25 bg-gradient-to-b from-amber-50/90 to-amber-100/80"
            style={
              bgUrl
                ? {
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.88), rgba(255,250,235,0.75)), url(${bgUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div className="relative flex flex-col items-center justify-end min-h-[200px] py-6 px-4 gap-4">
              {heroUrl ? (
                <img
                  src={heroUrl}
                  alt=""
                  className="max-h-[140px] w-auto object-contain drop-shadow-lg"
                />
              ) : (
                <div className="h-28 w-44 rounded-lg bg-gradient-to-br from-[#FE5E00]/20 to-[#FE5E00]/5 border border-[#FE5E00]/30 flex items-center justify-center text-xs font-semibold text-[#FE5E00] px-2 text-center">
                  Upload a hero image in Admin → CMS → Homepage
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 rounded-xl border-2 border-[#15803d]/40 bg-white/95 px-3 py-2.5 text-left">
              <Check className="w-5 h-5 text-[#15803d] shrink-0 mt-0.5" strokeWidth={2.5} />
              <span className="text-sm font-semibold text-neutral-800 leading-snug">
                {promo.modalBadgeLeft || "Auto applied on checkout"}
              </span>
            </div>
            <div className="flex items-start gap-2 rounded-xl border-2 border-[#15803d]/40 bg-white/95 px-3 py-2.5 text-left">
              <ShoppingCart className="w-5 h-5 text-[#15803d] shrink-0 mt-0.5" strokeWidth={2.5} />
              <span className="text-sm font-semibold text-neutral-800 leading-snug">
                {promo.modalBadgeRight || "Minimum order value ₹500"}
              </span>
            </div>
          </div>

          {(promo.modalFooterNote || "").trim() && (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500 text-center px-2">
              <Lock className="w-3.5 h-3.5 text-[#15803d]" />
              {promo.modalFooterNote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export { shouldShow as shouldShowStorefrontPromoModal, suppress as suppressStorefrontPromoModal };
