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

  if (user) return <Navigate to="/vendor" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/vendor');
    } catch (err: any) {
      setError(err.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vendor-portal min-h-screen bg-white flex">
      {/* Left branding */}
      <div className="hidden lg:flex flex-col justify-between flex-1 bg-black border-r border-black/10 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#E85A00]/5 rounded-full blur-3xl" />

        <div className="flex items-center gap-3 relative z-10">
          <img src={logoImg} alt="StructBay" className="h-16 w-auto object-contain" />
          <span className="vendor-portal-badge ml-1 uppercase text-white/50 border border-white/15 px-2 py-0.5 rounded-full">Vendor</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-white leading-snug mb-3">
              Vendor<br /><span className="text-[#E85A00]">Operations Portal</span>
            </h2>
            <p className="text-white/65 text-sm leading-relaxed max-w-xs">
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
                <CheckCircle className="w-4 h-4 text-[#E85A00] shrink-0" />
                <span className="text-white/70 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex gap-8 pt-8 border-t border-white/8">
          {[['Fulfillment Only', 'No product control'], ['Assigned Orders', 'StructBay managed'], ['Secure Portal', 'JWT protected']].map(([val, lbl]) => (
            <div key={lbl}>
              <p className="font-semibold text-sm text-[#E85A00]">{val}</p>
              <p className="text-xs text-white/50 mt-0.5">{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <img src={logoImg} alt="StructBay" className="h-14 w-auto object-contain" />
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#E85A00]/12 border border-[#E85A00]/25 flex items-center justify-center">
              <Truck className="w-7 h-7 text-[#E85A00]" />
            </div>
          </div>

          <div className="mb-8 text-center">
            <h2 className="text-xl font-semibold text-black mb-1.5">Vendor Sign In</h2>
            <p className="text-gray-500 text-sm">Access your operations portal</p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl text-sm bg-red-50 border border-red-200 text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="vendor@company.com" required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-[#E85A00] focus:ring-2 focus:ring-[#E85A00]/15 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" required
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-[#E85A00] focus:ring-2 focus:ring-[#E85A00]/15 transition-colors"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#E85A00] hover:bg-[#CC4E00] disabled:opacity-60 active:scale-[0.98] text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-[0_4px_16px_rgba(232, 90, 0,0.25)] mt-2"
            >
              {loading ? <div className="w-4 h-4 rounded-full border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? 'Signing in...' : 'Login to Portal'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <Link to="/vendor/support" className="text-[#E85A00] hover:text-[#CC4E00] font-semibold transition-colors">Contact Support</Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">© 2025 StructBay Technologies Pvt. Ltd.</p>
        </div>
      </div>
    </div>
  );
}
