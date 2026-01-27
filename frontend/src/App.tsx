import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { LOGOUT_EVENT } from './services/api';
import Layout from './components/common/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProvidersPage from './pages/ProvidersPage';
import PlaylistsPage from './pages/PlaylistsPage';
import UnifiedPlaylistsPage from './pages/UnifiedPlaylistsPage';
import UnifiedPlaylistEditorPage from './pages/UnifiedPlaylistEditorPage';
import SyncCenterPage from './pages/SyncCenterPage';
import SearchPage from './pages/SearchPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const navigate = useNavigate();

  // Listen for logout events from the API interceptor
  useEffect(() => {
    const handleLogout = () => {
      navigate('/login', { replace: true });
    };

    window.addEventListener(LOGOUT_EVENT, handleLogout);
    return () => {
      window.removeEventListener(LOGOUT_EVENT, handleLogout);
    };
  }, [navigate]);

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="playlists" element={<PlaylistsPage />} />
        <Route path="unified" element={<UnifiedPlaylistsPage />} />
        <Route path="unified/:id" element={<UnifiedPlaylistEditorPage />} />
        <Route path="sync" element={<SyncCenterPage />} />
        <Route path="search" element={<SearchPage />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
