import { useState } from "react";
import { useNavigate } from "react-router";
import { Lock, Mail, Eye, EyeOff, ShieldCheck } from "lucide-react";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between flex-1 bg-[#171717] border-r border-white/8 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #F4E9D8 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FE5E00]/5 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <img src={logoImg} alt="StructBay" className="h-16 w-auto object-contain" />
          <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-[#D4C4A8]/40 border border-white/10 px-2 py-0.5 rounded-full">Admin</span>
        </div>

        {/* Central content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-black text-[#F4E9D8] leading-tight mb-3">
              Enterprise<br />
              <span className="text-[#FE5E00]">Control Center</span>
            </h1>
            <p className="text-[#D4C4A8]/60 text-base leading-relaxed max-w-xs">
              Full visibility and control over your B2B construction marketplace operations.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Manage 450+ products across 3 cities",
              "Assign & track vendor fulfillment",
              "Monitor revenue, RFQs & orders in real-time",
              "CMS, blogs, pricing & inventory control",
            ].map(feat => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#FE5E00]/20 border border-[#FE5E00]/30 flex items-center justify-center shrink-0">
                  <span className="text-[#FE5E00] text-[10px] font-bold">✓</span>
                </div>
                <span className="text-[#D4C4A8]/70 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 flex gap-8 pt-8 border-t border-white/8">
          {[["₹67K+", "Monthly Revenue"], ["180", "Active Orders"], ["38", "Vendors"]].map(([val, lbl]) => (
            <div key={lbl}>
              <p className="font-black text-lg text-[#FE5E00]">{val}</p>
              <p className="text-xs text-[#D4C4A8]/50 mt-0.5">{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#0D0D0D]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <img src={logoImg} alt="StructBay" className="h-14 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-[#F4E9D8] mb-1.5">Admin Sign In</h2>
            <p className="text-[#D4C4A8]/60 text-sm">Enter your credentials to access the dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/70 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4C4A8]/40" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@structbay.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#222222] border border-white/12 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/35 focus:outline-none focus:border-[#FE5E00] focus:ring-2 focus:ring-[#FE5E00]/15 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/70">Password</label>
                <a href="#" className="text-xs text-[#FE5E00] hover:text-[#E05200] transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4C4A8]/40" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-[#222222] border border-white/12 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/35 focus:outline-none focus:border-[#FE5E00] focus:ring-2 focus:ring-[#FE5E00]/15 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4C4A8]/40 hover:text-[#D4C4A8] transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2.5">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-[#222222] accent-[#FE5E00]"
              />
              <label htmlFor="remember" className="text-sm text-[#D4C4A8]/70 cursor-pointer">
                Keep me signed in
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-[#FE5E00] hover:bg-[#E05200] active:scale-[0.98] text-[#0D0D0D] font-bold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(254,94,0,0.25)] mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Sign In to Admin Panel
            </button>
          </form>

          <p className="text-center text-xs text-[#D4C4A8]/30 mt-8">
            © 2025 StructBay Technologies Pvt. Ltd.
          </p>
        </div>
      </div>
    </div>
  );
}
