import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router';
import { LogIn, Mail, Lock, Eye, EyeOff, Truck, CheckCircle, AlertCircle } from 'lucide-react';
import logoImg from '/shared/assets/logos/Structbay-Logo-F-1.png';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex">
      {/* Left branding */}
      <div className="hidden lg:flex flex-col justify-between flex-1 bg-[#171717] border-r border-white/8 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #F4E9D8 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FE5E00]/5 rounded-full blur-3xl" />

        <div className="flex items-center gap-3 relative z-10">
          <img src={logoImg} alt="StructBay" className="h-16 w-auto object-contain" />
          <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-[#D4C4A8]/40 border border-white/10 px-2 py-0.5 rounded-full">Vendor</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-black text-[#F4E9D8] leading-tight mb-3">
              Vendor<br /><span className="text-[#FE5E00]">Operations Portal</span>
            </h2>
            <p className="text-[#D4C4A8]/60 text-base leading-relaxed max-w-xs">
              Manage assigned orders, upload invoices, coordinate dispatch, and download documents — all in one place.
            </p>
          </div>
          <div className="space-y-3">
            {[
              'View and manage assigned orders only',
              'Upload vendor invoices instantly',
              'Track dispatch and delivery status',
              'Download e-way bills and shipping labels',
            ].map(feat => (
              <div key={feat} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-[#FE5E00] shrink-0" />
                <span className="text-[#D4C4A8]/70 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex gap-8 pt-8 border-t border-white/8">
          {[['Fulfillment Only', 'No product control'], ['Assigned Orders', 'StructBay managed'], ['Secure Portal', 'JWT protected']].map(([val, lbl]) => (
            <div key={lbl}>
              <p className="font-black text-sm text-[#FE5E00]">{val}</p>
              <p className="text-xs text-[#D4C4A8]/50 mt-0.5">{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#0D0D0D]">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <img src={logoImg} alt="StructBay" className="h-14 w-auto object-contain" />
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#FE5E00]/15 border border-[#FE5E00]/20 flex items-center justify-center">
              <Truck className="w-7 h-7 text-[#FE5E00]" />
            </div>
          </div>

          <div className="mb-8 text-center">
            <h2 className="text-2xl font-black text-[#F4E9D8] mb-1.5">Vendor Sign In</h2>
            <p className="text-[#D4C4A8]/60 text-sm">Access your operations portal</p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171' }}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/70 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4C4A8]/40" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="vendor@company.com" required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#222222] border border-white/12 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/35 focus:outline-none focus:border-[#FE5E00] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/70 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4C4A8]/40" />
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" required
                  className="w-full pl-10 pr-10 py-2.5 bg-[#222222] border border-white/12 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/35 focus:outline-none focus:border-[#FE5E00] transition-colors"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4C4A8]/40 hover:text-[#D4C4A8] transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] disabled:opacity-60 active:scale-[0.98] text-[#0D0D0D] font-bold py-3 rounded-lg transition-all duration-200 shadow-[0_4px_16px_rgba(254,94,0,0.25)] mt-2"
            >
              {loading ? <div className="w-4 h-4 rounded-full border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? 'Signing in...' : 'Login to Portal'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#D4C4A8]/50">
              Need help?{' '}
              <Link to="/support" className="text-[#FE5E00] hover:text-[#E05200] font-semibold transition-colors">Contact Support</Link>
            </p>
          </div>

          <p className="text-center text-xs text-[#D4C4A8]/25 mt-6">© 2025 StructBay Technologies Pvt. Ltd.</p>
        </div>
      </div>
    </div>
  );
}
