// Analytics Service for Enhanced Monitoring
class AnalyticsService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  private getAuthToken(): string | null {
    const apiService = require('./apiService').apiService;
    return apiService.getAuthToken();
  }

  // Session Analytics
  async createSessionAnalytics(sessionData: {
    booking_id: string;
    charger_id: string;
    session_start: Date;
    session_end?: Date;
    energy_delivered?: number;
    peak_power_usage?: number;
    average_power_usage?: number;
    charging_efficiency?: number;
    temperature_data?: {
      ambient_temp?: number;
      charger_temp?: number;
      battery_temp?: number;
    };
    location_data?: {
      latitude?: number;
      longitude?: number;
      address?: string;
    };
    vehicle_data?: {
      initial_soc?: number;
      final_soc?: number;
      battery_capacity?: number;
      vehicle_model?: string;
    };
    payment_data: {
      amount_paid: number;
      payment_method?: string;
      transaction_id?: string;
      currency?: string;
    };
    environmental_impact?: {
      co2_saved?: number;
      green_energy_used?: boolean;
      carbon_credits_earned?: number;
    };
    quality_metrics?: {
      session_rating?: number;
      charger_rating?: number;
      host_rating?: number;
      issues_reported?: string[];
      session_interrupted?: boolean;
    };
  }) {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/analytics/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sessionData)
      });

      if (!response.ok) {
        throw new Error('Failed to create session analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Analytics Service - Create Session Error:', error);
      throw error;
    }
  }

  async getSessionAnalytics(bookingId: string) {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/analytics/session/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get session analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Analytics Service - Get Session Error:', error);
      throw error;
    }
  }

  // User Activity Tracking
  async trackUserActivity(activityData: {
    session_id: string;
    activity_type: 'login' | 'logout' | 'page_view' | 'feature_use' | 'search' | 'booking' | 'payment' | 'error';
    page_url?: string;
    feature_used?: string;
    action_details?: {
      search_query?: string;
      filters_applied?: string[];
      results_count?: number;
      interaction_time?: number;
      clicks_count?: number;
      scroll_depth?: number;
    };
    device_info?: {
      device_type?: string;
      browser?: string;
      os?: string;
      screen_resolution?: string;
    };
    location_data?: {
      country?: string;
      city?: string;
      timezone?: string;
    };
    performance_metrics?: {
      page_load_time?: number;
      api_response_time?: number;
      error_occurred?: boolean;
      error_message?: string;
    };
  }) {
    try {
      const token = this.getAuthToken();
      
      // Enhance device info with browser data
      const enhancedDeviceInfo = {
        ...activityData.device_info,
        device_type: this.getDeviceType(),
        browser: this.getBrowserInfo(),
        os: this.getOSInfo(),
        screen_resolution: `${window.screen.width}x${window.screen.height}`
      };

      const response = await fetch(`${this.baseUrl}/analytics/track-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...activityData,
          device_info: enhancedDeviceInfo,
          location_data: {
            ...activityData.location_data,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to track user activity');
      }

      return await response.json();
    } catch (error) {
      console.error('Analytics Service - Track Activity Error:', error);
      // Don't throw errors for tracking to avoid disrupting user experience
    }
  }

  async getUserActivity(filters?: {
    startDate?: string;
    endDate?: string;
    activityType?: string;
    limit?: number;
  }) {
    try {
      const token = this.getAuthToken();
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/analytics/user-activity?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get user activity');
      }

      return await response.json();
    } catch (error) {
      console.error('Analytics Service - Get User Activity Error:', error);
      throw error;
    }
  }

  // Business Metrics
  async getBusinessMetrics(filters?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate?: string;
    endDate?: string;
  }) {
    try {
      const token = this.getAuthToken();
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/analytics/business-metrics?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get business metrics');
      }

      return await response.json();
    } catch (error) {
      console.error('Analytics Service - Get Business Metrics Error:', error);
      throw error;
    }
  }

  // Dashboard Summary
  async getDashboardSummary() {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/analytics/dashboard-summary`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get dashboard summary');
      }

      return await response.json();
    } catch (error) {
      console.error('Analytics Service - Get Dashboard Summary Error:', error);
      throw error;
    }
  }

  // System Performance
  async getSystemPerformance(filters?: {
    startDate?: string;
    endDate?: string;
    endpoint?: string;
    statusCode?: number;
    limit?: number;
  }) {
    try {
      const token = this.getAuthToken();
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/analytics/system-performance?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get system performance');
      }

      return await response.json();
    } catch (error) {
      console.error('Analytics Service - Get System Performance Error:', error);
      throw error;
    }
  }

  // Utility methods for device detection
  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private getBrowserInfo(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  private getOSInfo(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  // Page tracking helper
  trackPageView(pageName: string, additionalData?: any) {
    const sessionId = this.getOrCreateSessionId();
    const startTime = Date.now();

    this.trackUserActivity({
      session_id: sessionId,
      activity_type: 'page_view',
      page_url: window.location.pathname,
      feature_used: pageName,
      action_details: {
        ...additionalData,
        interaction_time: 0
      },
      performance_metrics: {
        page_load_time: performance.now()
      }
    });

    // Return a function to track page exit
    return () => {
      this.trackUserActivity({
        session_id: sessionId,
        activity_type: 'page_view',
        page_url: window.location.pathname,
        feature_used: `${pageName}_exit`,
        action_details: {
          interaction_time: Date.now() - startTime
        }
      });
    };
  }

  // Feature usage tracking helper
  trackFeatureUsage(featureName: string, additionalData?: any) {
    const sessionId = this.getOrCreateSessionId();

    this.trackUserActivity({
      session_id: sessionId,
      activity_type: 'feature_use',
      feature_used: featureName,
      action_details: additionalData
    });
  }

  // Error tracking helper
  trackError(error: Error, context?: string) {
    const sessionId = this.getOrCreateSessionId();

    this.trackUserActivity({
      session_id: sessionId,
      activity_type: 'error',
      feature_used: context || 'unknown',
      performance_metrics: {
        error_occurred: true,
        error_message: error.message
      }
    });
  }

  // Session management
  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }
}

export const analyticsService = new AnalyticsService();
