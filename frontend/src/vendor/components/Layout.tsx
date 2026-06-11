import { Outlet, Navigate } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sb-bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--sb-orange)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/vendor/login" replace />;

  return (
    <div className="flex h-screen" style={{ background: 'var(--sb-bg)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--sb-bg)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
