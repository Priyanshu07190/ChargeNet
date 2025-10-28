// Use environment variable for API URL (supports both dev and production)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🔗 API Base URL:', API_BASE_URL);

class ApiService {
  private authToken: string | null = null;
  // Cache preferred endpoints and skip unsupported ones to avoid noisy 404s
  private preferredProfileEndpoint: { path: string; method: 'PUT' | 'PATCH' } | null = null;
  private unsupportedEndpoints = new Set<string>(); // key format: `${method} ${path}`

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  private getAuthHeader(): { Authorization?: string } {
    // Send Authorization header as backup to cookies
    const hasToken = !!this.authToken;
    console.log('🔑 Auth token available:', hasToken);
    if (hasToken) {
      console.log('📤 Sending Authorization header with token');
    } else {
      console.log('🍪 Relying on cookie authentication');
    }
    return this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {};
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      credentials: 'include', // Include cookies in requests
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers,
      },
      ...options,
    };
    const suppress404Log = (options as any)?.suppress404Log === true;

    // Log the actual request being sent
    console.log('🔍 Request config:', {
      url,
      method: config.method || 'GET',
      headers: config.headers,
      body: config.body,
      credentials: config.credentials
    });

    try {
      // Enhanced color-coded logging for requests
      const method = config.method || 'GET';
      const timestamp = new Date().toISOString();
      console.log(
        `%c[API Request] ${timestamp} ==> ${method} ${url}`, 
        'color: #2563eb; font-weight: bold; background: #dbeafe; padding: 2px 8px; border-radius: 4px;',
        {
          headers: config.headers,
          body: config.body ? JSON.parse(config.body as string) : null
        }
      );
      
      const response = await fetch(url, config);
      const responseTime = new Date().toISOString();

      // Parse JSON response
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        data = { error: 'Invalid response from server' };
      }

      if (!response.ok) {
        // Optionally suppress 404 logs for fallback attempts
        if (!(response.status === 404 && suppress404Log)) {
          console.error(
            `%c[API Error] ${responseTime} <== ${response.status} ${url}`, 
            'color: #dc2626; font-weight: bold; background: #fef2f2; padding: 2px 8px; border-radius: 4px;', 
            { error: data, requestData: config.body ? JSON.parse(config.body as string) : null }
          );
        }
        const err: any = new Error(data?.error || `Request failed with status ${response.status}`);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      console.log(
        `%c[API Success] ${responseTime} <== ${response.status} ${url}`, 
        'color: #16a34a; font-weight: bold; background: #f0fdf4; padding: 2px 8px; border-radius: 4px;', 
        data
      );
      return data;
    } catch (error: any) {
      // If the error already had a status, it was handled above; avoid double logging
      if (!(error && typeof error === 'object' && 'status' in error)) {
        console.error(
          `%c[API Exception] ${endpoint}`, 
          'color: #dc2626; font-weight: bold; background: #fef2f2; padding: 2px 8px; border-radius: 4px;', 
          error
        );
      } else if (error.status === 404 && suppress404Log) {
        // Suppress logging for intended fallback 404s
      }
      throw error;
    }
  }

  // Auth methods
  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async restoreSession() {
    return this.request('/auth/session');
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async logoutAll() {
    return this.request('/auth/logout-all', {
      method: 'POST',
    });
  }

  async updateProfile(profileData: any, userId?: string) {
    // Build attempts, preferring a previously successful endpoint
    const baseAttempts: Array<{ path: string; method: 'PUT' | 'PATCH' }> = [
      // Known working route on your backend (per latest logs)
      { path: '/auth/update-profile', method: 'PUT' },
      { path: '/auth/update-profile', method: 'PATCH' },
      // Alternatives
      { path: '/auth/profile', method: 'PUT' },
      { path: '/auth/profile', method: 'PATCH' },
      ...(userId ? [{ path: `/users/${userId}`, method: 'PUT' } as const] : []),
      ...(userId ? [{ path: `/users/${userId}`, method: 'PATCH' } as const] : []),
      // Least preferred — often not present
      { path: '/auth/me', method: 'PATCH' },
      { path: '/auth/me', method: 'PUT' },
    ];

    // If we have a preferred endpoint, try it first
    const attempts = [
      ...(this.preferredProfileEndpoint ? [this.preferredProfileEndpoint] : []),
      ...baseAttempts
    ];

    let lastError: any = null;
    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      const key = `${attempt.method} ${attempt.path}`;
      if (this.unsupportedEndpoints.has(key)) continue; // skip known-404 routes

      try {
        const result = await this.request(attempt.path, {
          method: attempt.method,
          body: JSON.stringify(profileData),
          // Suppress error logs for intermediate 404 fallbacks
          ...(i < attempts.length - 1 ? { suppress404Log: true } as any : {}),
        });
        // Cache preferred endpoint on success
        this.preferredProfileEndpoint = { path: attempt.path, method: attempt.method };
        return result;
      } catch (err: any) {
        lastError = err;
        if (err?.status === 404) {
          // Mark as unsupported to avoid future attempts/log noise
          this.unsupportedEndpoints.add(key);
          // If the preferred one failed, clear it so we can discover a working one
          if (this.preferredProfileEndpoint && key === `${this.preferredProfileEndpoint.method} ${this.preferredProfileEndpoint.path}`) {
            this.preferredProfileEndpoint = null;
          }
          continue;
        }
        // For other errors (401/403/500), stop and bubble up
        throw err;
      }
    }

    // If all attempts failed, throw the last error (likely 404 Route not found)
    throw lastError || new Error('Profile update failed');
  }

  // Charger methods
  async getChargers() {
    return this.request('/chargers');
  }

  async createCharger(chargerData: any) {
    return this.request('/chargers', {
      method: 'POST',
      body: JSON.stringify(chargerData),
    });
  }

  async updateCharger(chargerId: string, chargerData: any) {
    return this.request(`/chargers/${chargerId}`, {
      method: 'PUT',
      body: JSON.stringify(chargerData),
    });
  }

  async deleteCharger(chargerId: string) {
    return this.request(`/chargers/${chargerId}`, {
      method: 'DELETE',
    });
  }

  async toggleChargerAvailability(chargerId: string) {
    console.log('🔄 Toggling charger availability for:', chargerId);
    return this.request(`/chargers/${chargerId}/toggle-availability`, {
      method: 'PATCH',
    });
  }

  async getHostChargers() {
    return this.request('/chargers/host');
  }

  // Booking methods
  async createBooking(bookingData: any) {
    // Ensure we have proper authentication before making the request
    console.log('📝 Preparing to create booking');
    console.log('🔑 Current auth token status:', !!this.authToken);
    if (!this.authToken) {
      console.log('⚠️ No auth token available, attempting session restoration...');
      try {
        const sessionData = await this.restoreSession();
        if (sessionData.token) {
          this.setAuthToken(sessionData.token);
          console.log('✅ Session restored with token for booking creation');
        }
      } catch (error) {
        console.warn('❌ Session restoration failed:', error);
      }
    }
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getBookings() {
    return this.request('/bookings');
  }

  async getDriverBookings() {
    return this.request('/bookings/driver');
  }

  async getHostPersonalBookings() {
    return this.request('/bookings/host-personal');
  }

  async getHostBookings() {
    return this.request('/bookings/host');
  }

  async getDriverProfile(driverId: string) {
    return this.request(`/users/${driverId}`);
  }

  async getUserProfile(userId: string) {
    return this.request(`/auth/user/${userId}`);
  }

  async updateBookingStatus(bookingId: string, status: string) {
    console.log('🔄 Updating booking status:', { bookingId, status });
    console.log('🔑 Auth token available:', !!this.authToken);
    console.log('🍪 Request will include cookies:', true);
    
    return this.request(`/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async cancelBooking(bookingId: string) {
    // Ensure we have proper authentication before making the request
    console.log('🔄 Preparing to cancel booking:', bookingId);
    console.log('🔑 Current auth token status:', !!this.authToken);
    
    // If no token, try to restore session first
    if (!this.authToken) {
      console.log('⚠️ No auth token available, attempting session restoration...');
      try {
        const sessionData = await this.restoreSession();
        if (sessionData.token) {
          this.setAuthToken(sessionData.token);
          console.log('✅ Session restored with token for cancellation');
        }
      } catch (error) {
        console.warn('❌ Session restoration failed:', error);
      }
    }
    
    return this.updateBookingStatus(bookingId, 'cancelled');
  }

  // Debug methods
  async getBookingsDebug() {
    return this.request('/bookings/debug');
  }

  async migrateBookingContext() {
    return this.request('/bookings/migrate-context', {
      method: 'POST',
    });
  }

  // Initialize sample data
  async initSampleData() {
    return this.request('/init-sample-data', {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();
