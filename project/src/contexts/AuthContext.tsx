import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, User } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  loading: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
  userType: 'driver' | 'host';
  hasEv?: boolean;
  vehicleNumber?: string;
  vehicleCategory?: string;
  vehicleType?: string;
  vehicleModel?: string;
  chargerType?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { user: sessionUser } = await authService.getSession();
        setUser(sessionUser);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { user: loggedInUser, error } = await authService.signIn(email.trim(), password);

      if (error) {
        return { 
          success: false, 
          error: error.includes('Invalid credentials') 
            ? 'Incorrect email or password' 
            : error 
        };
      }

      if (loggedInUser) {
        setUser(loggedInUser);
        return { success: true, user: loggedInUser };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      
      const { user: newUser, error } = await authService.signUp(
        userData.email.trim(), 
        userData.password,
        {
          name: userData.name,
          phone: userData.phone,
          user_type: userData.userType,
          has_ev: userData.hasEv || false,
          vehicle_category: userData.vehicleCategory,
          vehicle_type: userData.vehicleType,
          vehicle_model: userData.vehicleModel,
          vehicle_number: userData.vehicleNumber,
          charger_type: userData.chargerType,
        }
      );

      if (error) {
        if (error.includes('already exists')) {
          return { success: false, error: 'User already exists with this email' };
        }
        return { success: false, error };
      }

      if (newUser) {
        setUser(newUser);
        return { success: true };
      }

      return { success: false, error: 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prevUser => prevUser ? { ...prevUser, ...userData } : null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};