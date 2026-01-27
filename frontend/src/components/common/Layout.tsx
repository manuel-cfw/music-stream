import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { usePlayerStore } from '../../store/player.store';
import PlayerBar from '../player/PlayerBar';
import {
  Home,
  Link,
  ListMusic,
  Layers,
  RefreshCw,
  Search,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { currentTrack } = usePlayerStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/providers', icon: Link, label: 'Providers' },
    { to: '/playlists', icon: ListMusic, label: 'Playlists' },
    { to: '/unified', icon: Layers, label: 'Unified' },
    { to: '/sync', icon: RefreshCw, label: 'Sync Center' },
    { to: '/search', icon: Search, label: 'Search' },
  ];

  return (
    <div className="flex h-screen bg-neutral-900">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-neutral-800 text-white"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-neutral-950 border-r border-neutral-800
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="text-spotify-green" />
              Unified Playlist
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-spotify-green text-white'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`
                }
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-neutral-800">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-white font-medium">
                {user?.displayName?.[0] || user?.email?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.displayName || 'User'}
                </p>
                <p className="text-xs text-neutral-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-2 flex items-center gap-3 px-4 py-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </div>

        {/* Player bar */}
        {currentTrack && <PlayerBar />}
      </main>
    </div>
  );
}
