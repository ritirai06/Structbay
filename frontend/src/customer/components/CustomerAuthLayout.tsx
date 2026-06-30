import type { ReactNode } from "react";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";

export type CustomerAuthVisualVariant = "login" | "register";

type CustomerAuthLayoutProps = {
  children: ReactNode;
  visualVariant?: CustomerAuthVisualVariant;
};

/** Centered auth card — used for customer login, register, forgot/reset password. */
export function CustomerAuthLayout({ children, visualVariant = "login" }: CustomerAuthLayoutProps) {
  const badge = visualVariant === "register" ? "Register" : "Customer";

  return (
    <div className="min-h-screen flex items-center justify-center bg-sb-cream px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-sb-ink/10 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <img src={logoImg} alt="Structbay" className="mx-auto h-52 w-auto object-contain mb-4" />
            <span className="inline-block rounded-full border border-sb-ink/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sb-ink/55">
              {badge}
            </span>
          </div>
          {children}
        </div>
        <p className="text-center text-xs text-sb-ink/45 mt-6">
          © 2025 Structbay Technologies Pvt. Ltd.
        </p>
      </div>
    </div>
  );
}
