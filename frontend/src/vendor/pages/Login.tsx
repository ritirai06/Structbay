import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router';
import { LogIn, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-sb-cream px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-sb-ink/10 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <img src={logoImg} alt="StructBay" className="mx-auto h-14 w-auto object-contain mb-4" />
            <span className="inline-block rounded-full border border-sb-ink/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sb-ink/55 mb-3">
              Vendor
            </span>
            <h1 className="text-xl font-semibold text-sb-ink">Sign in</h1>
            <p className="text-sm text-sb-ink/55 mt-1">Access your vendor operations portal</p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sb-ink/55 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sb-ink/40" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vendor@company.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-sb-ink/15 rounded-lg text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange focus:ring-2 focus:ring-sb-orange/20 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-sb-ink/55 mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sb-ink/40" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-sb-ink/15 rounded-lg text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange focus:ring-2 focus:ring-sb-orange/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sb-ink/40 hover:text-sb-ink/70 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-sb-orange hover:bg-sb-orange-hover disabled:opacity-60 active:scale-[0.98] text-white font-semibold py-3 rounded-lg transition-all duration-200 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-sb-ink/55">
            Need help?{' '}
            <Link to="/vendor/support" className="text-sb-orange hover:text-sb-orange-hover font-semibold transition-colors">
              Contact Support
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-sb-ink/45 mt-6">
          © 2025 StructBay Technologies Pvt. Ltd.
        </p>
      </div>
    </div>
  );
}
