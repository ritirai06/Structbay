import { useState } from "react";
import { Outlet, Navigate } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../context/AuthContext';
import { Menu, X } from 'lucide-react';

export function Layout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sb-bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--sb-orange)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/vendor/login" replace />;

  return (
    <div className="vendor-portal flex h-screen" style={{ background: 'var(--sb-bg)' }}>
      {/* Mobile sidebar overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar — normal flex child, always visible on lg+ */}
      <div className="hidden lg:flex lg:flex-col lg:shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Mobile sidebar — fixed slide-in overlay, only rendered on small screens */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 ease-in-out lg:hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile hamburger bar — only visible on mobile */}
        <div
          className="flex items-center lg:hidden shrink-0 border-b px-4 h-[72px]"
          style={{ background: 'var(--chrome-black, #000)', borderColor: 'var(--sb-border-on-dark)' }}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 mr-3"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-white font-semibold text-sm">Vendor Portal</span>
        </div>

        {/* Desktop header — only visible on lg+ */}
        <div className="hidden lg:block">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6" style={{ background: 'var(--sb-bg)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
