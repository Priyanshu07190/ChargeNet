import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  return (
    <nav className="bg-white/90 backdrop-blur-lg shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Zap className="h-8 w-8 text-blue-500" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                ChargeNet
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/map" className="text-gray-700 hover:text-blue-600 transition-colors flex items-center space-x-1">
              <Map className="h-4 w-4" />
              <span>Find Chargers</span>
            </Link>
            
            <Link to={user?.user_type === 'host' ? '/host-dashboard' : '/dashboard'} className="text-gray-700 hover:text-blue-600 transition-colors flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link to="/profile" className="text-gray-700 hover:text-blue-600 transition-colors flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span>{user?.name}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              Logout
            </button>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white/95 backdrop-blur-lg">
              <Link to="/map" className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors">
                Find Chargers
              </Link>
              <Link to={user?.user_type === 'host' ? '/host-dashboard' : '/dashboard'} className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
              <Link to="/profile" className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors">
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;