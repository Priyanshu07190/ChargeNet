import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Zap, Menu, X, User, Map, Calendar } from 'lucide-react';
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
    <nav className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
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

          <button onClick={handleLogout} className="btn-secondary ml-2">
            Logout
          </button>
        </div>

        <div className="flex items-center md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
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
              className="btn-secondary mt-2 w-full"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;