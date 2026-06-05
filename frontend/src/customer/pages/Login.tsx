import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Package, Eye, EyeOff, Phone, Mail, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { useApp } from "../context/AppContext";

export function Login() {
  const { setIsLoggedIn, setUser } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
    setUser({ name: "Rajesh Kumar", company: "Kumar Constructions", email: email || "rajesh@kumarconstructions.com" });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex bg-[#0D0D0D]">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between flex-1 bg-[#171717] border-r border-white/8 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #F4E9D8 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FE5E00]/5 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-[#FE5E00] flex items-center justify-center">
            <Package className="w-5 h-5 text-[#0D0D0D]" />
          </div>
          <span className="font-black text-xl text-[#F4E9D8]">Struct<span className="text-[#FE5E00]">Bay</span></span>
        </div>

        {/* Central content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-black text-[#F4E9D8] leading-tight mb-3">
              Welcome back to<br />
              <span className="text-[#FE5E00]">StructBay</span>
            </h2>
            <p className="text-[#D4C4A8]/60 text-base leading-relaxed max-w-xs">
              India's premier B2B construction marketplace. Sign in to manage orders, invoices, and procurement.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Track 100+ orders at once",
              "Download GST-compliant invoices instantly",
              "Get exclusive bulk pricing",
              "Express delivery across South India",
            ].map(feat => (
              <div key={feat} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-[#FE5E00] shrink-0" />
                <span className="text-[#D4C4A8]/70 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div className="relative z-10 flex items-center gap-3 bg-[#222222] border border-white/8 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-[#FE5E00] flex items-center justify-center text-[#0D0D0D] font-black text-xs shrink-0">R</div>
          <div>
            <p className="text-xs font-semibold text-[#F4E9D8]">"StructBay saved us 15% on material costs"</p>
            <p className="text-[10px] text-[#D4C4A8]/50 mt-0.5">Rajesh Kumar · Kumar Constructions, Bengaluru</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#0D0D0D]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#FE5E00] flex items-center justify-center">
              <Package className="w-5 h-5 text-[#0D0D0D]" />
            </div>
            <span className="font-black text-xl text-[#F4E9D8]">Struct<span className="text-[#FE5E00]">Bay</span></span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-black text-[#F4E9D8] mb-1">Sign in to your account</h2>
            <p className="text-[#D4C4A8]/60 text-sm">
              Don't have an account?{" "}
              <Link to="/register" className="text-[#FE5E00] hover:text-[#E05200] font-semibold transition-colors">Register here</Link>
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-[#222222] border border-white/10 rounded-xl p-1 mb-6">
            {(["email", "otp"] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-[#FE5E00] text-[#0D0D0D] shadow"
                    : "text-[#D4C4A8]/60 hover:text-[#F4E9D8]"
                }`}
              >
                {m === "email" ? <><Mail className="w-3.5 h-3.5" /> Email</> : <><Phone className="w-3.5 h-3.5" /> OTP</>}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {mode === "email" ? (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/70 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4C4A8]/40" />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="email@company.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#222222] border border-white/12 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/35 focus:outline-none focus:border-[#FE5E00] focus:ring-2 focus:ring-[#FE5E00]/15 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/70">Password</label>
                    <a href="#" className="text-xs text-[#FE5E00] hover:text-[#E05200] transition-colors">Forgot password?</a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4C4A8]/40" />
                    <input
                      type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 bg-[#222222] border border-white/12 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/35 focus:outline-none focus:border-[#FE5E00] focus:ring-2 focus:ring-[#FE5E00]/15 transition-colors"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4C4A8]/40 hover:text-[#D4C4A8] transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/70 mb-1.5">Mobile Number</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4C4A8]/40" />
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210"
                        className="w-full pl-10 pr-4 py-2.5 bg-[#222222] border border-white/12 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/35 focus:outline-none focus:border-[#FE5E00] transition-colors" />
                    </div>
                    <button type="button" onClick={() => setOtpSent(true)}
                      className="px-3 py-2.5 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] text-xs font-bold rounded-lg shrink-0 transition-colors">
                      {otpSent ? "Resend" : "Send OTP"}
                    </button>
                  </div>
                </div>
                {otpSent && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/70 mb-1.5">Enter OTP</label>
                    <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6}
                      className="w-full px-4 py-2.5 bg-[#222222] border border-white/12 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/35 focus:outline-none focus:border-[#FE5E00] tracking-widest text-center transition-colors" />
                  </div>
                )}
              </>
            )}

            <button type="submit"
              className="w-full flex items-center justify-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] active:scale-[0.98] text-[#0D0D0D] font-bold py-3 rounded-lg transition-all duration-200 shadow-[0_4px_16px_rgba(254,94,0,0.25)] mt-2">
              {mode === "otp" && !otpSent ? "Send OTP" : "Sign In"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-xs text-[#D4C4A8]/30 mt-8">
            By signing in, you agree to our{" "}
            <a href="#" className="text-[#D4C4A8]/50 hover:text-[#FE5E00] underline transition-colors">Terms</a> and{" "}
            <a href="#" className="text-[#D4C4A8]/50 hover:text-[#FE5E00] underline transition-colors">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
