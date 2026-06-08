import { Bell, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getNotifications('unread', 1)
      .then(r => setUnread(r.data?.unreadCount ?? 0))
      .catch(() => {});
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) navigate(`/orders?search=${encodeURIComponent(search.trim())}`);
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const initials = (user?.name ?? user?.companyName ?? 'V').charAt(0).toUpperCase();

  return (
    <header
      className="px-6 py-3 shrink-0 flex items-center justify-between gap-4"
      style={{ background: 'var(--sb-nav)', borderBottom: '1px solid var(--sb-border)' }}
    >
      <form onSubmit={handleSearch} className="flex-1 max-w-sm relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sb-text-faint)' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search orders..."
          className="w-full pl-9 pr-4 py-2 rounded-xl text-sm transition-all"
          style={{ background: 'var(--sb-card)', border: '1px solid var(--sb-border)', color: 'var(--sb-text-primary)' }}
        />
      </form>

      <div className="flex items-center gap-2">
        <Link to="/notifications" className="relative p-2 rounded-xl transition-colors" style={{ color: 'var(--sb-text-muted)' }}>
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-white flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--sb-orange)' }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2.5 pl-3" style={{ borderLeft: '1px solid var(--sb-border)' }}>
          {user?.profileImage?.url
            ? <img src={user.profileImage.url} className="w-8 h-8 rounded-full object-cover" alt="" />
            : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm" style={{ background: 'var(--sb-orange)' }}>{initials}</div>
          }
          <div className="hidden md:block">
            <p className="text-sm font-semibold" style={{ color: 'var(--sb-text-primary)' }}>
              {user?.companyName ?? user?.name ?? 'Vendor'}
            </p>
            <p className="text-xs" style={{ color: 'var(--sb-text-faint)' }}>{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="hidden md:block ml-1 text-xs px-2 py-1 rounded-lg transition-colors"
            style={{ color: 'var(--sb-text-faint)', border: '1px solid var(--sb-border)' }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
