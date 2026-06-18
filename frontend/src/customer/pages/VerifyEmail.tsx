import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { getApiV1Base } from "../../lib/apiBase";
import { CustomerAuthLayout } from "../components/CustomerAuthLayout";
import { Button } from "@shared/components/ui/button";

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token")?.trim() || "";
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("err");
      setMessage("Verification link is missing. Use the link from your email.");
      return;
    }
    const base = getApiV1Base().replace(/\/$/, "");
    fetch(`${base}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async res => {
        const text = await res.text();
        let json: Record<string, unknown> = {};
        if (text) {
          try {
            json = JSON.parse(text) as Record<string, unknown>;
          } catch {
            setStatus("err");
            setMessage("Invalid response from server.");
            return;
          }
        }
        if (!res.ok || json.success === false) {
          setStatus("err");
          setMessage(typeof json.message === "string" ? json.message : "Verification failed.");
          return;
        }
        setStatus("ok");
        setMessage(typeof json.message === "string" ? json.message : "Email verified. You can sign in.");
      })
      .catch(() => {
        setStatus("err");
        setMessage("Network error. Try again from the email link.");
      });
  }, [token]);

  return (
    <CustomerAuthLayout visualVariant="login">
      <div className="flex flex-col items-center text-center">
        {status === "loading" && (
          <>
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#E85A00]" />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Verifying your email</h2>
            <p className="mt-2 text-sm text-[#1A1A1A]/60">Please wait…</p>
          </>
        )}
        {status === "ok" && (
          <>
            <CheckCircle2 className="mb-4 h-12 w-12 text-[#E85A00]" strokeWidth={1.75} />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Email verified</h2>
            <p className="mt-2 text-sm text-[#1A1A1A]/65">{message}</p>
            <Button className="mt-8 h-11 px-8 font-semibold" onClick={() => navigate("/login", { replace: true })}>
              Continue to sign in
            </Button>
          </>
        )}
        {status === "err" && (
          <>
            <XCircle className="mb-4 h-12 w-12 text-[#1A1A1A]/50" strokeWidth={1.5} />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Could not verify</h2>
            <p className="mt-2 text-sm text-[#1A1A1A]/65">{message}</p>
            <p className="mt-6 text-sm text-[#1A1A1A]/55">
              <Link to="/login" className="font-semibold text-[#E85A00] hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </CustomerAuthLayout>
  );
}
