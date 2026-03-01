import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import GenniePro from './components/GenniePro';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import HostDashboard from './pages/HostDashboard';
import ChargerMap from './pages/ChargerMap';
import Booking from './pages/Booking';
import Profile from './pages/Profile';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChargerProvider } from './contexts/ChargerContext';
import socketService from './lib/socketService';
import './styles/animations.css';

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Initialize WebSocket connection globally when app loads
  useEffect(() => {
    if (user) {
      console.log('🔌 Initializing global WebSocket connection for user:', user.name);
      socketService.connect();
      
      // Join user-specific rooms
      if (user._id) {
        socketService.joinUserRoom(user._id);
        if (user.user_type === 'host') {
          socketService.joinHostRoom(user._id);
        }
      }
    }

    return () => {
      // Don't disconnect - keep connection alive for all pages
    };
  }, [user]);

  // Persist the last visited route so a hard refresh returns to the same page
  // Includes query and hash to fully restore stateful URLs
  useEffect(() => {
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    try {
      localStorage.setItem('lastRoute', fullPath);
    } catch (_) {
      // ignore storage errors (private mode, etc.)
    }
  }, [location]);

  if (loading) {
    return (
      <div className="app-page-bg flex items-center justify-center px-4">
        <div className="surface-panel w-full max-w-sm p-8 text-center">
          <div className="relative mx-auto mb-5 h-16 w-16">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-blue-600 text-white text-xl">
              ⚡
            </div>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-1">ChargeNet</h2>
          <p className="text-sm text-slate-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page-bg">
      {user && <Navbar />}
      {user && <GenniePro />}
      
      <Routes>
        {/* Root path: restore last visited route if available to keep user on the same page after refresh */}
        <Route
          path="/"
          element={<LastLocationRedirect />}
        />
        <Route path="/login" element={user ? (user.user_type === 'host' ? <Navigate to="/host-dashboard" replace /> : <Navigate to="/dashboard" replace />) : <Login />} />
        <Route path="/register" element={user ? (user.user_type === 'host' ? <Navigate to="/host-dashboard" replace /> : <Navigate to="/dashboard" replace />) : <Register />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/dashboard/:tab" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/host-dashboard" element={user?.user_type === 'host' ? <HostDashboard /> : <Navigate to="/dashboard" replace />} />
        <Route path="/host-dashboard/:tab" element={user?.user_type === 'host' ? <HostDashboard /> : <Navigate to="/dashboard" replace />} />
        <Route path="/chargers" element={user ? <ChargerMap /> : <Navigate to="/login" replace />} />
        <Route path="/map" element={user ? <ChargerMap /> : <Navigate to="/login" replace />} />
        <Route path="/bookings" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/booking/:chargerId" element={user ? <Booking /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

// Redirect component that prefers last visited route, otherwise falls back to role-based landing
function LastLocationRedirect() {
  const { user } = useAuth();
  let last = '';
  try {
    last = localStorage.getItem('lastRoute') || '';
  } catch (_) {
    last = '';
  }

  if (last && last !== '/') {
    return <Navigate to={last} replace />;
  }

  // Fallback to existing logic when no stored route is present
  if (user) {
    return user.user_type === 'host' ? <Navigate to="/host-dashboard" replace /> : <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
      <ChargerProvider>
        <Router>
          <AppContent />
        </Router>
      </ChargerProvider>
    </AuthProvider>
  );
}

export default App;