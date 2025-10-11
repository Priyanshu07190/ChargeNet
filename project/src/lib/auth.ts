import { apiService } from './apiService';

export interface User {
  _id: string;
  email: string;
  name: string;
  phone: string;
  user_type: 'driver' | 'host' | 'passenger';
  has_ev: boolean;
  vehicle_category?: string;
  vehicle_type?: string;
  vehicle_model?: string;
  vehicle_number?: string;
  charger_type?: string;
  verified: boolean;
  tokens: number;
  eco_miles: number; // Carbon Credits
  avatar?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthSession {
  user: User;
  token: string;
}

class AuthService {
  private currentUser: User | null = null;
  private currentToken: string | null = null;
  private authListeners: ((user: User | null) => void)[] = [];

  async signUp(email: string, password: string, userData: any): Promise<{ user: User | null; error: string | null }> {
    try {
      const response = await apiService.register({
        email,
        password,
        name: userData.name || '',
        phone: userData.phone || '',
        userType: userData.user_type || 'driver',
        hasEv: userData.has_ev || false,
        vehicleCategory: userData.vehicle_category,
        vehicleType: userData.vehicle_type,
        vehicleModel: userData.vehicle_model,
        vehicleNumber: userData.vehicle_number,
        chargerType: userData.charger_type,
      });

      if (response.user && response.token) {
        // Store in memory only - no localStorage
        this.currentToken = response.token;
        this.currentUser = response.user;
        // Update API service with new token
        apiService.setAuthToken(response.token);
        this.notifyListeners();
        return { user: response.user, error: null };
      }

      return { user: null, error: 'Registration failed' };
    } catch (error: any) {
      return { user: null, error: error.message || 'Registration failed' };
    }
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const response = await apiService.login(email, password);

      if (response.user && response.token) {
        // Store in memory only - no localStorage
        this.currentToken = response.token;
        this.currentUser = response.user;
        // Update API service with new token
        apiService.setAuthToken(response.token);
        this.notifyListeners();
        return { user: response.user, error: null };
      }

      return { user: null, error: 'Login failed' };
    } catch (error: any) {
      return { user: null, error: error.message || 'Invalid credentials' };
    }
  }

  async signOut(): Promise<void> {
    try {
      // Call logout API to destroy server-side session
      if (this.currentToken) {
        await apiService.logout();
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear memory
      this.currentUser = null;
      this.currentToken = null;
      // Clear API service token
      apiService.setAuthToken(null);
      this.notifyListeners();
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }

  async getSession(): Promise<{ user: User | null }> {
    // First try to restore from server session (cookies)
    try {
      console.log('🔄 Attempting to restore session from cookies...');
      const response = await apiService.restoreSession();
      if (response.user && response.token) {
        console.log('✅ Session restored successfully:', response.user.email);
        this.currentUser = response.user;
        this.currentToken = response.token;
        // Update API service with restored token
        apiService.setAuthToken(response.token);
        return { user: this.currentUser };
      } else {
        console.log('⚠️ No valid session found in cookies');
      }
    } catch (error) {
      console.log('❌ Session restoration failed:', error);
    }

    // If we have a token in memory, verify it with server
    if (this.currentToken) {
      try {
        console.log('🔄 Verifying existing token with server...');
        // Set token in API service for the request
        apiService.setAuthToken(this.currentToken);
        const response = await apiService.getCurrentUser();
        if (response.user) {
          console.log('✅ Token verification successful:', response.user.email);
          this.currentUser = response.user;
          return { user: this.currentUser };
        }
      } catch (error) {
        console.log('❌ Token verification failed:', error);
        // Session expired or invalid, clear memory
        this.currentUser = null;
        this.currentToken = null;
        apiService.setAuthToken(null);
      }
    }
    
    console.log('❌ No valid session found');
    return { user: null };
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.authListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.authListeners = this.authListeners.filter(listener => listener !== callback);
    };
  }

  private notifyListeners() {
    this.authListeners.forEach(listener => listener(this.currentUser));
  }
}

export const authService = new AuthService();
