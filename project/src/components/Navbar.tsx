import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Zap, Menu, X, User, Map, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link ${isActive ? 'nav-link-active' : ''}`;

  return (
    <nav className="sticky top-0 z-50 border-b border-emerald-900/10 bg-white/85 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-950">
                ChargeNet
            </span>
          </Link>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <NavLink to="/map" className={linkClass}>
            <Map className="h-4 w-4" />
            <span>Find Chargers</span>
          </NavLink>

          <NavLink to={user?.user_type === 'host' ? '/host-dashboard' : '/dashboard'} className={linkClass}>
            <Calendar className="h-4 w-4" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/profile" className={linkClass}>
            <User className="h-4 w-4" />
            <span className="max-w-[10rem] truncate">{user?.name}</span>
          </NavLink>

          <button onClick={handleLogout} className="btn-secondary ml-2 gap-2">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>

        <div className="flex items-center md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="surface-panel space-y-1 p-2">
            <NavLink to="/map" className={linkClass} onClick={() => setIsOpen(false)}>
              <Map className="h-4 w-4" />
              <span>Find Chargers</span>
            </NavLink>

            <NavLink
              to={user?.user_type === 'host' ? '/host-dashboard' : '/dashboard'}
              className={linkClass}
              onClick={() => setIsOpen(false)}
            >
              <Calendar className="h-4 w-4" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink to="/profile" className={linkClass} onClick={() => setIsOpen(false)}>
              <User className="h-4 w-4" />
              <span>{user?.name}</span>
            </NavLink>

            <button
              onClick={handleLogout}
              className="btn-secondary mt-2 w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
