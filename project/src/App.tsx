import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-white font-bold text-2xl">⚡</span>
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">ChargeNet</h2>
          <p className="text-gray-600 animate-pulse">Powering your EV journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {user && <Navbar />}
      
      <Routes>
        {/* Root path: restore last visited route if available to keep user on the same page after refresh */}
        <Route
          path="/"
          element={<LastLocationRedirect />}
        />
        <Route path="/login" element={user ? (user.user_type === 'host' ? <Navigate to="/host-dashboard" replace /> : <Navigate to="/dashboard" replace />) : <Login />} />
        <Route path="/register" element={user ? (user.user_type === 'host' ? <Navigate to="/host-dashboard" replace /> : <Navigate to="/dashboard" replace />) : <Register />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/host-dashboard" element={user?.user_type === 'host' ? <HostDashboard /> : <Navigate to="/dashboard" replace />} />
        <Route path="/map" element={user ? <ChargerMap /> : <Navigate to="/login" replace />} />
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